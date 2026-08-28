"""Backend tests for booking system + regression on visits/stats."""
import os
import pytest
import requests

BASE_URL = "https://538840d1-17d3-4608-a351-90758411007c.preview.emergentagent.com"
ADMIN_PASS = "candice2026"


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def admin_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "X-Admin-Pass": ADMIN_PASS})
    return s


# --- Health ---
def test_health(client):
    r = client.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# --- POST /api/bookings validation ---
class TestBookingCreate:
    def test_create_success(self, client):
        payload = {
            "name": "TEST_Devotee",
            "channel": "Telegram",
            "handle": "@test_devotee",
            "session_type": "BDSM & Domination",
            "preferred": "weekend evenings GMT+8",
            "message": "TEST polite intro",
        }
        r = client.post(f"{BASE_URL}/api/bookings", json=payload)
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": True}

    def test_missing_name(self, client):
        r = client.post(f"{BASE_URL}/api/bookings", json={
            "name": "", "channel": "x", "handle": "@x",
            "session_type": "x", "preferred": "", "message": "m"
        })
        assert r.status_code == 400

    def test_missing_handle(self, client):
        r = client.post(f"{BASE_URL}/api/bookings", json={
            "name": "n", "channel": "x", "handle": "",
            "session_type": "x", "preferred": "", "message": "m"
        })
        assert r.status_code == 400

    def test_missing_message(self, client):
        r = client.post(f"{BASE_URL}/api/bookings", json={
            "name": "n", "channel": "x", "handle": "@x",
            "session_type": "x", "preferred": "", "message": "   "
        })
        assert r.status_code == 400


# --- GET /api/bookings auth + shape ---
class TestBookingList:
    def test_no_auth(self, client):
        r = client.get(f"{BASE_URL}/api/bookings")
        assert r.status_code == 401

    def test_wrong_auth(self, client):
        r = client.get(f"{BASE_URL}/api/bookings", headers={"X-Admin-Pass": "wrong"})
        assert r.status_code == 401

    def test_list_ok(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/bookings")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "new_count" in data
        assert isinstance(data["items"], list)
        assert isinstance(data["new_count"], int)


# --- Status update ---
class TestBookingStatus:
    def test_status_flow(self, client, admin_client):
        # create a booking
        r = client.post(f"{BASE_URL}/api/bookings", json={
            "name": "TEST_StatusUser", "channel": "sig", "handle": "@t",
            "session_type": "x", "preferred": "", "message": "test"
        })
        assert r.status_code == 200
        # find its id
        lst = admin_client.get(f"{BASE_URL}/api/bookings").json()["items"]
        bid = next(b["id"] for b in lst if b["name"] == "TEST_StatusUser")

        # invalid status
        r = admin_client.post(f"{BASE_URL}/api/bookings/{bid}/status", json={"status": "bogus"})
        assert r.status_code == 400

        # valid handled
        r = admin_client.post(f"{BASE_URL}/api/bookings/{bid}/status", json={"status": "handled"})
        assert r.status_code == 200

        # verify persisted
        lst2 = admin_client.get(f"{BASE_URL}/api/bookings").json()["items"]
        assert next(b for b in lst2 if b["id"] == bid)["status"] == "handled"

        # unknown id
        r = admin_client.post(f"{BASE_URL}/api/bookings/nope-nope/status", json={"status": "new"})
        assert r.status_code == 404

        # cleanup
        admin_client.delete(f"{BASE_URL}/api/bookings/{bid}")


# --- Delete ---
class TestBookingDelete:
    def test_delete_flow(self, client, admin_client):
        r = client.post(f"{BASE_URL}/api/bookings", json={
            "name": "TEST_DeleteUser", "channel": "sig", "handle": "@d",
            "session_type": "x", "preferred": "", "message": "del"
        })
        assert r.status_code == 200
        lst = admin_client.get(f"{BASE_URL}/api/bookings").json()["items"]
        bid = next(b["id"] for b in lst if b["name"] == "TEST_DeleteUser")

        r = admin_client.delete(f"{BASE_URL}/api/bookings/{bid}")
        assert r.status_code == 200

        # second delete → 404
        r = admin_client.delete(f"{BASE_URL}/api/bookings/{bid}")
        assert r.status_code == 404


# --- Regression: visits/stats ---
def test_visits_stats(admin_client):
    r = admin_client.get(f"{BASE_URL}/api/visits/stats")
    assert r.status_code == 200
    d = r.json()
    for k in ("today", "week", "all_time", "countries"):
        assert k in d


def test_visits_record(client):
    r = client.post(f"{BASE_URL}/api/visits", json={"vid": "TEST_vid_1", "country": "US"})
    assert r.status_code == 200


# --- Final cleanup: delete all TEST_ prefixed bookings and Smoke Test ---
def test_zzz_cleanup(admin_client):
    lst = admin_client.get(f"{BASE_URL}/api/bookings").json()["items"]
    for b in lst:
        if b["name"].startswith("TEST_") or b["name"] == "Smoke Test" or "<img" in b.get("name", "") or "XSS" in b.get("name", ""):
            admin_client.delete(f"{BASE_URL}/api/bookings/{b['id']}")
    # verify
    lst2 = admin_client.get(f"{BASE_URL}/api/bookings").json()["items"]
    assert not any(b["name"].startswith("TEST_") for b in lst2)
