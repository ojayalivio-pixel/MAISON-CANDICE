# PRD — Candice Private Portfolio

## Original Problem Statement
Professional, sophisticated yet explicit adult portfolio website. Requirements:
- Premium aesthetics (dark theme, premium typography, micro-animations)
- 18+ age gate
- "Easy to paste" portable — pure static HTML/CSS/JS, no backend
- Hidden admin mode (URL hash `#backstage` or Ctrl/Cmd+Shift+K), invisible to visitors
- Inline WYSIWYG editing of text + swap photos/videos from admin
- IP-based country blocking (ipapi.co, no key required)
- Admin code separated from index.html (admin.css / admin.js), with an Export button that bakes everything into one self-contained index.html

## Architecture
```
/app/index.html   — public site (references admin.css/admin.js)
/app/admin.css    — admin panel styles
/app/admin.js     — admin logic: login, WYSIWYG, media picker, geo-block, export
/app/frontend/    — minimal node static server shim (server.js) so supervisor serves /app on port 3000 (preview only, NOT part of the exported product)
```
State: localStorage keys `candice_admin_pass`, `candice_content`, `candice_media`, `candice_blocked_countries`; session key `candice_admin_session`.

## Implemented (as of June 2026)
- Full premium redesign + age gate — DONE
- Hidden admin login (password `candice2026`, changeable in Settings) — DONE
- WYSIWYG text editing with localStorage persistence — DONE
- Media picker: upload (data URL, ~4MB cap) or paste URL for gallery tiles + video slot — DONE
- Country blocking via ipapi.co with admin exemption — DONE
- Export as single self-contained index.html — DONE
- Static server shim for preview (2026-06) — DONE

## Backlog
- P2: None pending — awaiting user feedback

## Change log
- 2026-06: Typography swapped to old-money pairing — Cormorant Garamond (serif display) + Jost (Futura-style sans) across index.html and admin.css; pink accent (--rose #f4c7d4) changed to red (#ff4d5e). Screenshot verified
- 2026-06: "Send Tribute" shiny gold button added to Findom card → anchors to #payments (screenshot verified)
- 2026-06: Password change now syncs to backend (POST /api/admin/password, stored in Mongo settings; check_pass reads DB first, env fallback). curl verified: change → old pass 401, new pass 200, wrong current 401. Default remains candice2026 until user changes it in Settings
- 2026-06: Cloud media storage added — FastAPI backend (/app/backend/server.py) with chunked upload (init/chunk/complete) → Emergent Object Storage, served via /api/media/file/{id}. Admin uploads (photos 15MB, videos 200MB) now cloud-backed, X-Admin-Pass header auth (env ADMIN_UPLOAD_PASS=candice2026). Tested: iteration_2.json 6/6 PASS
- 2026-06: About section rewritten classy/elegant ("Grace, poise & quiet power."), removed "maldita" line; tags updated (Elegant, Commanding)
- 2026-06: Added experience cards: 07 BDSM & Domination, 08 Findom, 09 Slave Training
- 2026-06: Full admin flow verified via testing agent (13/13 PASS, /app/test_reports/iteration_1.json)
- 2026-06: Hero accent line changed from "darling." to "candice ferragamo."
