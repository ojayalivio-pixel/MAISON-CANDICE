"""Security regression tests for SEC-002 (static server leak) and SEC-003 (upload type/nosniff)."""
import os
import io
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://538840d1-17d3-4608-a351-90758411007c.preview.emergentagent.com").rstrip("/")
ADMIN = "candice2026"

# ---------- SEC-002: static server allowlist ----------

SECRET_MARKERS = ["MONGO_URL", "EMERGENT_LLM_KEY", "ADMIN_UPLOAD_PASS"]

LEAK_PATHS = [
    "/backend/.env",
    "/backend/server.py",
    "/memory/test_credentials.md",
    "/memory/PRD.md",
    "/frontend/server.js",
    "/.env",
    "/package.json",
    "/admin.js.map",
    "/backend/%2e%2e/.env",
    "/..%2f..%2fbackend/.env",
    "/%2e%2e/backend/.env",
]

@pytest.mark.parametrize("path", LEAK_PATHS)
def test_no_secret_leak(path):
    r = requests.get(BASE + path, timeout=15, allow_redirects=False)
    # Must NOT be a real leak: response body must not contain secrets.
    body = r.text or ""
    assert r.status_code in (200, 400, 404), f"unexpected status {r.status_code} for {path}"
    for marker in SECRET_MARKERS:
        assert marker not in body, f"LEAK: {marker} found in response for {path}"
    # Body must NOT start with MONGO_URL (backend/.env leak check specifically)
    assert not body.lstrip().startswith("MONGO_URL"), f"{path} starts with MONGO_URL"
    # If 200, it should be the fallback HTML
    if r.status_code == 200:
        ct = r.headers.get("Content-Type", "")
        # allowlisted files map to appropriate mime - since these paths aren't in allowlist,
        # they must fall back to index.html (text/html).
        assert "text/html" in ct, f"{path} returned 200 with non-html type {ct}"


# ---------- Regression: allowlisted assets still served ----------

ALLOWED_ASSETS = [
    ("/", "text/html"),
    ("/admin.js", "application/javascript"),
    ("/admin.css", "text/css"),
    ("/favicon.svg", "image/svg+xml"),
    ("/favicon.png", "image/png"),
    ("/og-image.jpg", "image/jpeg"),
]

@pytest.mark.parametrize("path,expected_ct", ALLOWED_ASSETS)
def test_allowed_assets_served(path, expected_ct):
    r = requests.get(BASE + path, timeout=15)
    assert r.status_code == 200, f"{path} -> {r.status_code}"
    assert expected_ct in r.headers.get("Content-Type", ""), f"{path} wrong CT {r.headers.get('Content-Type')}"


# ---------- API regressions ----------

def test_health():
    r = requests.get(f"{BASE}/api/health", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_blocked_countries_public():
    r = requests.get(f"{BASE}/api/blocked-countries", timeout=15)
    assert r.status_code == 200
    assert "countries" in r.json()


def test_stats_requires_auth():
    r = requests.get(f"{BASE}/api/visits/stats", timeout=15)
    assert r.status_code == 401


def test_stats_with_admin():
    r = requests.get(f"{BASE}/api/visits/stats", headers={"X-Admin-Pass": ADMIN}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ("today", "week", "all_time", "countries"):
        assert k in d


def test_bookings_requires_auth():
    r = requests.get(f"{BASE}/api/bookings", timeout=15)
    assert r.status_code == 401


# ---------- SEC-003: upload type restriction + nosniff ----------

def test_upload_init_without_pass():
    r = requests.post(f"{BASE}/api/media/upload/init",
                      json={"filename": "x.html", "content_type": "text/html"}, timeout=15)
    assert r.status_code == 401


def test_upload_init_wrong_pass():
    r = requests.post(f"{BASE}/api/media/upload/init",
                      headers={"X-Admin-Pass": "wrongpass"},
                      json={"filename": "x.html", "content_type": "text/html"}, timeout=15)
    assert r.status_code == 401


def _do_upload(filename, content_type, data: bytes):
    h = {"X-Admin-Pass": ADMIN}
    r = requests.post(f"{BASE}/api/media/upload/init",
                      headers=h,
                      json={"filename": filename, "content_type": content_type}, timeout=15)
    assert r.status_code == 200, r.text
    upload_id = r.json()["upload_id"]
    files = {"chunk": ("chunk0", io.BytesIO(data), "application/octet-stream")}
    r = requests.post(f"{BASE}/api/media/upload/chunk",
                      headers=h,
                      data={"upload_id": upload_id, "index": 0},
                      files=files, timeout=30)
    assert r.status_code == 200, r.text
    r = requests.post(f"{BASE}/api/media/upload/complete",
                      headers=h,
                      json={"upload_id": upload_id, "total_chunks": 1}, timeout=60)
    return r


def test_upload_html_rejected_415():
    r = _do_upload("evil.html", "text/html", b"<script>alert(1)</script>")
    assert r.status_code == 415, f"expected 415 got {r.status_code}: {r.text}"
    assert "image or video" in r.text.lower()


# Minimal valid JPEG bytes (1x1 pixel)
JPEG_1x1 = bytes.fromhex(
    "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707"
    "07090908080a0c14100d0d0c0b0b0d181114110f1d1d1e1f1f1f1e1c1e1f1e1e2321"
    "23252423251e1e222222252525252525252525252525252525252525252525252525"
    "252525252525252525252525252525252525252525ffc0000b080001000101011100"
    "ffc4001f0000010501010101010100000000000000000102030405060708090a0bff"
    "c400b5100002010303020403050504040000017d01020300041105122131410613516"
    "1071322718114328191a1082342b1c11552d1f02433627282090a161718191a25262"
    "728292a3435363738393a434445464748494a535455565758595a636465666768696"
    "a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9a"
    "ab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e"
    "7e8e9eaf1f2f3f4f5f6f7f8f9faffda0008010100003f00fbd0ffd9"
)


def test_upload_image_accepted_and_nosniff():
    r = _do_upload("ok.jpg", "image/jpeg", JPEG_1x1)
    assert r.status_code == 200, f"expected 200 got {r.status_code}: {r.text}"
    data = r.json()
    assert "id" in data and "url" in data
    file_id = data["id"]
    # Fetch and confirm nosniff header
    r2 = requests.get(f"{BASE}/api/media/file/{file_id}", timeout=30)
    assert r2.status_code == 200
    assert r2.headers.get("X-Content-Type-Options", "").lower() == "nosniff"
    assert "sandbox" in r2.headers.get("Content-Security-Policy", "").lower()
    print(f"Uploaded test image id: {file_id}")
