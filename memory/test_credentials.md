# Test Credentials

## Admin (Backstage) — static site + FastAPI media backend
- Access: append `#backstage` to URL, or press Ctrl/Cmd+Shift+K
- Password: `candice2026` (user may change it in Backstage → Settings; change syncs to backend via POST /api/admin/password, stored in Mongo `settings` collection — env ADMIN_UPLOAD_PASS is only the fallback default)
- Cloud upload API auth: header `X-Admin-Pass: candice2026` (backend env ADMIN_UPLOAD_PASS)
- Stored in localStorage key `candice_admin_pass` (default hardcoded fallback in admin.js)
- Session flag: sessionStorage `candice_admin_session`

## Age Gate
- Click "I am 18 or older — Enter" button to pass.
