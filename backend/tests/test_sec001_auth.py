"""SEC-001 JWT auth regression tests. Password must remain 'candice2026'."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = "https://538840d1-17d3-4608-a351-90758411007c.preview.emergentagent.com"
ADMIN_PASS = "candice2026"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and isinstance(data["token"], str)
    assert data["token"].count(".") == 2  # JWT format
    assert data.get("expires_in") == 12 * 3600
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- LOGIN ----------
class TestLogin:
    def test_login_success(self, token):
        assert token

    def test_login_wrong_password(self):
        r = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "wrong-" + uuid.uuid4().hex[:8]}, timeout=15)
        assert r.status_code == 401

    def test_login_missing_field(self):
        r = requests.post(f"{BASE_URL}/api/admin/login", json={}, timeout=15)
        assert r.status_code == 422


# ---------- JWT PROTECTION ----------
ADMIN_ENDPOINTS = [
    ("GET", "/api/bookings", None),
    ("GET", "/api/visits/stats", None),
    ("POST", "/api/blocked-countries", {"countries": []}),
    ("POST", "/api/media/upload/init", {"filename": "test.jpg", "content_type": "image/jpeg"}),
]


class TestJwtProtection:
    @pytest.mark.parametrize("method,path,body", ADMIN_ENDPOINTS)
    def test_no_auth_returns_401(self, method, path, body):
        r = requests.request(method, f"{BASE_URL}{path}", json=body, timeout=15)
        assert r.status_code == 401, f"{method} {path} -> {r.status_code}"

    @pytest.mark.parametrize("method,path,body", ADMIN_ENDPOINTS)
    def test_old_scheme_x_admin_pass_returns_401(self, method, path, body):
        r = requests.request(method, f"{BASE_URL}{path}", json=body,
                             headers={"X-Admin-Pass": ADMIN_PASS}, timeout=15)
        assert r.status_code == 401, f"{method} {path} old-scheme -> {r.status_code}"

    @pytest.mark.parametrize("method,path,body", ADMIN_ENDPOINTS)
    def test_garbage_bearer_returns_401(self, method, path, body):
        r = requests.request(method, f"{BASE_URL}{path}", json=body,
                             headers={"Authorization": "Bearer garbage.token.here"}, timeout=15)
        assert r.status_code == 401

    @pytest.mark.parametrize("method,path,body", ADMIN_ENDPOINTS)
    def test_valid_bearer_returns_non_401(self, method, path, body, auth_headers):
        r = requests.request(method, f"{BASE_URL}{path}", json=body, headers=auth_headers, timeout=15)
        assert r.status_code != 401, f"{method} {path} valid-token -> {r.status_code}"
        assert r.status_code < 500, f"{method} {path} -> {r.status_code} {r.text[:200]}"


class TestAdminEndpointsData:
    def test_bookings_list(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/bookings", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "new_count" in d
        assert isinstance(d["items"], list)

    def test_visits_stats(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/visits/stats", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("today", "week", "all_time", "countries"):
            assert k in d

    def test_blocked_countries_set_and_get(self, auth_headers):
        # persist empty (reset)
        r = requests.post(f"{BASE_URL}/api/blocked-countries", json={"countries": []},
                          headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["countries"] == []
        # public get
        r = requests.get(f"{BASE_URL}/api/blocked-countries", timeout=15)
        assert r.status_code == 200
        assert r.json()["countries"] == []


# ---------- CHANGE PASSWORD (wrong-current only, safe) ----------
class TestChangePassword:
    def test_change_pw_requires_bearer(self):
        r = requests.post(f"{BASE_URL}/api/admin/password",
                          json={"current": ADMIN_PASS, "new": "whatever"}, timeout=15)
        assert r.status_code == 401

    def test_change_pw_wrong_current(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/admin/password",
                          json={"current": "definitely-wrong", "new": "abcd1234"},
                          headers=auth_headers, timeout=15)
        assert r.status_code == 401

    def test_change_pw_roundtrip_and_restore(self, auth_headers):
        new_pw = "temp_pw_" + uuid.uuid4().hex[:6]
        # change
        r = requests.post(f"{BASE_URL}/api/admin/password",
                          json={"current": ADMIN_PASS, "new": new_pw},
                          headers=auth_headers, timeout=15)
        assert r.status_code == 200
        # verify new works
        r = requests.post(f"{BASE_URL}/api/admin/login", json={"password": new_pw}, timeout=15)
        assert r.status_code == 200
        new_token = r.json()["token"]
        # restore original
        r = requests.post(f"{BASE_URL}/api/admin/password",
                          json={"current": new_pw, "new": ADMIN_PASS},
                          headers={"Authorization": f"Bearer {new_token}"}, timeout=15)
        assert r.status_code == 200
        # verify original works again
        r = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASS}, timeout=15)
        assert r.status_code == 200


# ---------- PUBLIC ENDPOINTS ----------
class TestPublic:
    def test_blocked_countries_public(self):
        r = requests.get(f"{BASE_URL}/api/blocked-countries", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json().get("countries"), list)

    def test_geo_public(self):
        r = requests.get(f"{BASE_URL}/api/geo", timeout=15)
        assert r.status_code == 200
        assert "country_code" in r.json()

    def test_visits_public(self):
        r = requests.post(f"{BASE_URL}/api/visits",
                          json={"vid": "TEST_" + uuid.uuid4().hex, "country": "US"}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_bookings_public_valid(self, auth_headers):
        # Note: single booking (rate limit test does the 5+ burst separately)
        body = {
            "name": "TEST_public_" + uuid.uuid4().hex[:6],
            "channel": "telegram", "handle": "@t", "session_type": "chat",
            "message": "hi test"
        }
        r = requests.post(f"{BASE_URL}/api/bookings", json=body, timeout=15)
        # May be 200 or 429 if previous run consumed the limit; both are acceptable behaviors
        assert r.status_code in (200, 429)
        # Cleanup: if it created a booking, delete
        if r.status_code == 200:
            lst = requests.get(f"{BASE_URL}/api/bookings", headers=auth_headers, timeout=15).json()
            for b in lst.get("items", []):
                if b["name"] == body["name"]:
                    requests.delete(f"{BASE_URL}/api/bookings/{b['id']}", headers=auth_headers, timeout=15)


# ---------- CLIENT SECRET LEAK ----------
class TestNoSecretInClient:
    def test_admin_js_no_password(self):
        r = requests.get(f"{BASE_URL}/admin.js", timeout=15)
        assert r.status_code == 200
        body = r.text
        assert "candice2026" not in body
        assert "X-Admin-Pass" not in body

    def test_backend_env_not_served(self):
        r = requests.get(f"{BASE_URL}/backend/.env", timeout=15)
        # Should NOT return real env content
        assert "MONGO_URL" not in r.text
        assert "JWT_SECRET" not in r.text
        assert "candice2026" not in r.text


# ---------- BOOKING RATE LIMIT (run near-last within this file) ----------
class TestBookingRateLimit:
    def test_bookings_rate_limit_zzz(self, auth_headers):
        """6 rapid bookings from same IP -> 6th is 429. Cleans up created bookings."""
        created_names = []
        got_429 = False
        for i in range(6):
            name = f"TEST_rl_{uuid.uuid4().hex[:8]}"
            body = {
                "name": name, "channel": "telegram", "handle": "@t",
                "session_type": "chat", "message": "rate limit test"
            }
            r = requests.post(f"{BASE_URL}/api/bookings", json=body, timeout=15)
            if r.status_code == 429:
                got_429 = True
                break
            if r.status_code == 200:
                created_names.append(name)
        # cleanup
        try:
            lst = requests.get(f"{BASE_URL}/api/bookings", headers=auth_headers, timeout=15).json()
            for b in lst.get("items", []):
                if b["name"] in created_names or b["name"].startswith("TEST_rl_") or b["name"].startswith("TEST_public_"):
                    requests.delete(f"{BASE_URL}/api/bookings/{b['id']}", headers=auth_headers, timeout=15)
        except Exception:
            pass
        assert got_429, "Expected a 429 within 6 rapid POST /api/bookings"


# ---------- BRUTE-FORCE LOCKOUT (MUST BE LAST — locks the IP for 15 min) ----------
class TestZzzBruteForceLockout:
    def test_zzz_brute_force_locks_after_5(self):
        # 5 wrong tries
        for i in range(5):
            r = requests.post(f"{BASE_URL}/api/admin/login",
                              json={"password": f"wrong-{i}-{uuid.uuid4().hex[:4]}"}, timeout=15)
            assert r.status_code in (401, 429), f"attempt {i}: {r.status_code}"
        # 6th attempt with CORRECT password should now be blocked
        r = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASS}, timeout=15)
        assert r.status_code == 429, f"expected 429 after 5 fails, got {r.status_code}"
