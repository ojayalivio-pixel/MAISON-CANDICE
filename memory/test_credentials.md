# Test Credentials — Candice Ferragamo site

## Backstage Admin (server-verified JWT auth)
- Open Backstage: press **Ctrl/⌘ + Shift + K** on the site, or add `#backstage` to the URL.
- Password: `candice2026`
- Auth flow: client POSTs `{password}` to `POST /api/admin/login` → receives a JWT → stored in sessionStorage (`candice_admin_token`) → sent as `Authorization: Bearer <token>` on all admin API calls.
- Password is stored server-side as a **bcrypt hash** in Mongo `db.settings` key `admin_pass_hash` (seeded from backend `.env` `ADMIN_UPLOAD_PASS=candice2026` on first startup). The password is NOT present anywhere in client code.
- Brute-force: 5 failed logins per IP / 15 min → HTTP 429 lockout.
- Change password: Backstage → SETTINGS (requires current + new password; verified server-side).

## Backend admin endpoints (require Bearer JWT)
- POST /api/admin/login (public) — get token
- POST /api/admin/password (auth) — change password
- GET /api/bookings, POST /api/bookings/{id}/status, DELETE /api/bookings/{id} (auth)
- GET /api/visits/stats (auth)
- POST /api/blocked-countries (auth); GET /api/blocked-countries (public)
- POST /api/media/upload/init|chunk|complete (auth)
- GET /api/geo (public), POST /api/visits (public, rate-limited via booking limiter n/a)
- POST /api/bookings (public, rate-limited: 5/hour/IP)

## Notes
- `.env` (JWT_SECRET, MONGO_URL, EMERGENT_LLM_KEY, ADMIN_UPLOAD_PASS) is NOT publicly served (static server allowlist).
- Since `.env` was briefly public before the fix, rotate ADMIN_UPLOAD_PASS / change the admin password after deploy.
