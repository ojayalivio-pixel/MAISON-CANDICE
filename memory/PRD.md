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
- 2026-06: Social sharing preview fix (iteration_5.json — 100% PASS). Root cause: site had ZERO Open Graph/Twitter tags → Messenger spinner. Added full OG set (og:type/site_name/url/title/description/image + image:secure_url/type/width=1200/height=630/alt/locale) + Twitter card (summary_large_image, title, description, image) to index.html <head>. Created optimized branded preview /app/og-image.jpg (1200x630, ~48KB, on-brand dark/gold "CANDICE FERRAGAMO" card — no explicit imagery so crawlers don't reject it). URLs point to https://maisoncandice.com/og-image.jpg?v=1. NOTE for user: after deploy, run FB Sharing Debugger (developers.facebook.com/tools/debug) on production URL to force Messenger to re-scrape. No design/content change.
- 2026-06: (1) Booking form gained Virtual/In Person segmented toggle (data-testids booking-mode-virtual/inperson), sent as `mode`, stored by backend, shown in REQUESTS cards; (2) Nav rebuilt: ABOUT · EXPERIENCES · GALLERY · TRAVEL · BOOK · PAY · FAQ · CONNECT with gold dot separators (.nav-dot), PAY → #payments. Verified via curl + browser
- 2026-06: Booking system (iteration_4.json — 13/13 backend + all frontend PASS): #booking section "Request a session" form (name/channel/handle/experience/preferred/message, data-testids booking-*), POST /api/bookings + GET (X-Admin-Pass) + status update + delete; Backstage REQUESTS tab with unread highlighting, mark-handled, delete, XSS-escaped rendering (esc()). Nav BOOK link added. Travel dates got month labels (JUL 04 — 13 etc.). Regression suite: /app/backend/tests/test_bookings.py
- 2026-06: (1) OnlyFans removed everywhere (hero pill + contact card + admin tip); (2) Hero title-cased "Come Play in / My Private World, / Candice Ferragamo."; (3) "Virtual Dates" → "Virtual Dates & In Person" with updated copy; menu reordered: Live, Private, Virtual/In-Person, BDSM, Findom, Slave Training, then Roleplay/Voice/Tailored; (4) Country Peek — visit ping now sends ipapi country, stats endpoint returns top-10 countries, STATS tab renders name+bar+count. Verified via curl + browser; test visits cleared
- 2026-06: (1) Age gate fully removed (markup + script + body.locked; CSS kept as .age-eyebrow reused by geo-block); (2) "Gifts & Support" renamed "Gifts & Private Arrangements"; (3) Real Telegram set: t.me/privatemaisoncandice (hero + contact card); (4) Visit counter — POST /api/visits (dedupe per vid/day, admin sessions skipped), GET /api/visits/stats (X-Admin-Pass), STATS tab in Backstage (today/7d/all-time). Verified via curl + browser; test visits cleared
- 2026-06: Privacy note rewritten in first person (user-provided text) — screenshot verified
- 2026-06: Three features (iteration_3.json 10/10 PASS): (1) Signature loading veil — red silk curtain + gold C monogram, splits at 1.35s, removed at 2.6s; (2) Social buttons — hero social strip (OnlyFans/Telegram/WhatsApp/Snapchat pills, data-testids hero-*-btn) + OnlyFans & activated Telegram contact cards (PLACEHOLDER handles: candiceferragamo); (3) Editable link hrefs — edit mode click on .pay-btn/.contact-btn/.hs-btn prompts for URL, stored in localStorage candice_links, applied via loadLinks(), included in export boot
- 2026-06: Typography swapped to old-money pairing — Cormorant Garamond (serif display) + Jost (Futura-style sans) across index.html and admin.css; pink accent (--rose #f4c7d4) changed to red (#ff4d5e). Screenshot verified
- 2026-06: "Send Tribute" shiny gold button added to Findom card → anchors to #payments (screenshot verified)
- 2026-06: Password change now syncs to backend (POST /api/admin/password, stored in Mongo settings; check_pass reads DB first, env fallback). curl verified: change → old pass 401, new pass 200, wrong current 401. Default remains candice2026 until user changes it in Settings
- 2026-06: Cloud media storage added — FastAPI backend (/app/backend/server.py) with chunked upload (init/chunk/complete) → Emergent Object Storage, served via /api/media/file/{id}. Admin uploads (photos 15MB, videos 200MB) now cloud-backed, X-Admin-Pass header auth (env ADMIN_UPLOAD_PASS=candice2026). Tested: iteration_2.json 6/6 PASS
- 2026-06: About section rewritten classy/elegant ("Grace, poise & quiet power."), removed "maldita" line; tags updated (Elegant, Commanding)
- 2026-06: Added experience cards: 07 BDSM & Domination, 08 Findom, 09 Slave Training
- 2026-06: Full admin flow verified via testing agent (13/13 PASS, /app/test_reports/iteration_1.json)
- 2026-06: Hero accent line changed from "darling." to "candice ferragamo."
