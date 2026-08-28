import json
import logging
import os
import shutil
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ["EMERGENT_LLM_KEY"]
ADMIN_UPLOAD_PASS = os.environ["ADMIN_UPLOAD_PASS"]
APP_NAME = "candice-portfolio"
TMP_DIR = Path("/tmp/media_uploads")
MAX_SIZE = 200 * 1024 * 1024

storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


class PasswordBody(BaseModel):
    current: str
    new: str


async def get_admin_pass() -> str:
    doc = await db.settings.find_one({"key": "admin_pass"})
    return doc["value"] if doc else ADMIN_UPLOAD_PASS


async def check_pass(x_admin_pass: str):
    if x_admin_pass != await get_admin_pass():
        raise HTTPException(status_code=401, detail="Wrong upload password")


app = FastAPI()
api = APIRouter(prefix="/api")


class InitBody(BaseModel):
    filename: str
    content_type: str


class CompleteBody(BaseModel):
    upload_id: str
    total_chunks: int


class BookingBody(BaseModel):
    name: str
    channel: str
    handle: str
    session_type: str
    mode: str = ""
    preferred: str = ""
    message: str = ""


class BookingStatusBody(BaseModel):
    status: str


@api.post("/bookings")
async def create_booking(body: BookingBody):
    if not body.name.strip() or not body.handle.strip() or not body.message.strip():
        raise HTTPException(status_code=400, detail="Missing required fields")
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip()[:80],
        "channel": body.channel.strip()[:40],
        "handle": body.handle.strip()[:120],
        "session_type": body.session_type.strip()[:60],
        "mode": body.mode.strip()[:20],
        "preferred": body.preferred.strip()[:200],
        "message": body.message.strip()[:1500],
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(doc)
    return {"ok": True}


@api.get("/bookings")
async def list_bookings(x_admin_pass: str = Header(None)):
    await check_pass(x_admin_pass)
    items = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    new_count = await db.bookings.count_documents({"status": "new"})
    return {"items": items, "new_count": new_count}


@api.post("/bookings/{booking_id}/status")
async def update_booking(booking_id: str, body: BookingStatusBody, x_admin_pass: str = Header(None)):
    await check_pass(x_admin_pass)
    if body.status not in ("new", "handled"):
        raise HTTPException(status_code=400, detail="Invalid status")
    r = await db.bookings.update_one({"id": booking_id}, {"$set": {"status": body.status}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, x_admin_pass: str = Header(None)):
    await check_pass(x_admin_pass)
    r = await db.bookings.delete_one({"id": booking_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


class VisitBody(BaseModel):
    vid: str
    country: str | None = None


@api.post("/visits")
async def record_visit(body: VisitBody):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cc = (body.country or "").strip().upper()[:2] or None
    await db.visits.update_one(
        {"vid": body.vid[:64], "date": today},
        {"$setOnInsert": {"ts": datetime.now(timezone.utc).isoformat(), "country": cc}},
        upsert=True,
    )
    return {"ok": True}


@api.get("/visits/stats")
async def visit_stats(x_admin_pass: str = Header(None)):
    await check_pass(x_admin_pass)
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    week = [(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    countries = await db.visits.aggregate([
        {"$match": {"country": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$country", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$limit": 10},
    ]).to_list(10)
    return {
        "today": await db.visits.count_documents({"date": today}),
        "week": await db.visits.count_documents({"date": {"$in": week}}),
        "all_time": await db.visits.count_documents({}),
        "countries": [{"code": c["_id"], "count": c["n"]} for c in countries],
    }


@api.post("/admin/password")
async def change_password(body: PasswordBody):
    if body.current != await get_admin_pass():
        raise HTTPException(status_code=401, detail="Wrong current password")
    if len(body.new.strip()) < 4:
        raise HTTPException(status_code=400, detail="Password too short")
    await db.settings.update_one(
        {"key": "admin_pass"}, {"$set": {"value": body.new.strip()}}, upsert=True
    )
    return {"ok": True}


@api.post("/media/upload/init")
async def upload_init(body: InitBody, x_admin_pass: str = Header(None)):
    await check_pass(x_admin_pass)
    upload_id = str(uuid.uuid4())
    d = TMP_DIR / upload_id
    d.mkdir(parents=True, exist_ok=True)
    (d / "meta.json").write_text(json.dumps({"filename": body.filename, "content_type": body.content_type}))
    return {"upload_id": upload_id}


@api.post("/media/upload/chunk")
async def upload_chunk(
    upload_id: str = Form(...), index: int = Form(...), chunk: UploadFile = File(...),
    x_admin_pass: str = Header(None),
):
    await check_pass(x_admin_pass)
    d = TMP_DIR / upload_id
    if not d.exists():
        raise HTTPException(status_code=404, detail="Unknown upload")
    data = await chunk.read()
    (d / f"{index:06d}.part").write_bytes(data)
    return {"ok": True}


@api.post("/media/upload/complete")
async def upload_complete(body: CompleteBody, x_admin_pass: str = Header(None)):
    await check_pass(x_admin_pass)
    d = TMP_DIR / body.upload_id
    if not d.exists():
        raise HTTPException(status_code=404, detail="Unknown upload")
    meta = json.loads((d / "meta.json").read_text())
    parts = sorted(d.glob("*.part"))
    if len(parts) != body.total_chunks:
        shutil.rmtree(d, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Missing chunks")
    data = b"".join(p.read_bytes() for p in parts)
    shutil.rmtree(d, ignore_errors=True)
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large")

    ext = meta["filename"].split(".")[-1].lower() if "." in meta["filename"] else "bin"
    storage_path = f"{APP_NAME}/uploads/{uuid.uuid4()}.{ext}"
    try:
        result = put_object(storage_path, data, meta["content_type"])
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(status_code=502, detail="Cloud storage upload failed")

    file_id = str(uuid.uuid4())
    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": meta["filename"],
        "content_type": meta["content_type"],
        "size": result["size"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": file_id, "url": f"/api/media/file/{file_id}", "size": result["size"]}


@api.get("/media/file/{file_id}")
async def serve_file(file_id: str):
    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, content_type = get_object(record["storage_path"])
    except Exception as e:
        logger.error(f"Storage fetch failed: {e}")
        raise HTTPException(status_code=502, detail="Cloud storage fetch failed")
    return Response(
        content=data,
        media_type=record.get("content_type", content_type),
        headers={"Cache-Control": "public, max-age=86400", "Accept-Ranges": "bytes"},
    )


@api.get("/health")
async def health():
    return {"status": "ok", "storage_ready": storage_key is not None}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ["CORS_ORIGINS"].split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
