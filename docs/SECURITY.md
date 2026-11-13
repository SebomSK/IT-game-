# TicketQuest — Security Audit Report

**Date:** 2026-11-13 · **Version:** v0.5.1 · **Scope:** static game and GitHub Pages deployment
**Backup before changes:** `ticketquest_backup_pre-security/`

---

## 1. Architecture overview & threat model

TicketQuest is a **client-side browser game** that can run offline after its local files load:

- Vanilla HTML/CSS/JS, no build step; Three.js r160 is vendored in `js/three.min.js`.
- No application backend, database, API endpoints, user accounts, or payments.
- A local JSON save import exists; files are parsed in the browser and are not uploaded to a server.
- All game state lives in `localStorage` (`ticketquest-save-v2`) on the player's own machine.

**Sensitive assets:** game save data (progress, player-chosen name). No personal data
is sent to an application backend — game state remains in browser `localStorage`.
Because the site is hosted online, GitHub may process ordinary request metadata such
as IP address and browser details under GitHub's privacy terms.

**Threat actors:**

| Actor | Vector | Impact |
|---|---|---|
| Attacker with access to a shared PC | Tampered `localStorage` save (stored XSS payload in player name, prototype pollution) | Script execution in game origin, save corruption |
| The player themselves | Save editing or DevTools | Trivial single-player cheating (accepted by design) |
| Public static hosting | Imported-save content injection, browser-side save tampering | No server-side account or database exists |

## 2. Discovered vulnerabilities & status

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| V-01 | **Stored XSS:** player name from save → `innerHTML` (terminal banner, welcome-back message, Settings) | HIGH | ✅ FIXED AND VERIFIED |
| V-02 | **HTML injection in terminal:** user command output reached HTML sinks | MEDIUM | ✅ FIXED AND VERIFIED (terminal uses text-only rendering) |
| V-03 | **Prototype pollution:** `deepMerge` merged `__proto__`/`constructor`/`prototype` keys from a crafted save | MEDIUM | ✅ FIXED AND VERIFIED |
| V-04 | No input validation on player name (length/characters) | LOW | ✅ FIXED AND VERIFIED (24-char cap, HTML-special chars stripped, login charset-restricted) |
| V-05 | No Content-Security-Policy | MEDIUM | ✅ FIXED (policy loaded and game rendered in browser) |
| V-06 | NPCs / desktop icons not keyboard-accessible (a11y) | LOW | ✅ FIXED (role, tabindex, Enter/Space, focus-visible) |
| V-07 | **Functional crash:** `main.js` referenced removed `#btn-promo-ok` → `addEventListener` on `null` would kill the whole game on load | CRITICAL (functionality) | ✅ FIXED AND VERIFIED (ID cross-check script: all DOM IDs resolved) |
| V-08 | Save tampering = cheating (XP, tickets) | INFO | ✅ NOT APPLICABLE — single-player offline game, accepted by design |

## 3. Implemented fixes (evidence)

1. **`js/state.js`** — `escHtml()` (context-aware HTML escaping helper); save merging skips
   `__proto__`/`constructor`/`prototype`, keeps compatible types, bounds collections and
   strings, validates dynamic maps, and sanitizes player name/login.
2. **`js/cutscene.js`** — name input sanitized at the point of entry (`sanitizeName`).
3. **`js/main.js`** — terminal uses `textContent`; dynamic ticket fields are escaped and SOPs are built with text/code nodes.
4. **`js/apps.js`** — Settings user card escapes the player name.
5. **`js/sim.js`** — terminal output is text-only; command arguments are validated before mutating simulated server state.
6. **`js/night.js`** — unknown-command echo escapes the command.
7. **`index.html`** — added `Content-Security-Policy` meta:
   `default-src 'none'; script-src 'self' file:; style-src 'self' file:; img-src 'self' file: data:; font-src 'self' file:; connect-src 'none'; base-uri 'none'; form-action 'none'`
   — blocks any remote script/style/connection if the game is ever hosted; zero external
   resources exist, so nothing legitimate is blocked. Inline `style=""` attributes were
   removed (CSP-compatible markup).
8. **`css/style.css`** — NPC positions moved from inline styles to classes;
   `:focus-visible` outlines for keyboard users; promo title class.
9. **`index.html` + `js/office.js` + `js/os.js`** — NPCs and desktop icons are now
   keyboard-operable (`role="button"`, `tabindex="0"`, Enter/Space handlers, aria-labels,
   canvas `role="img"` aria-labels).
10. **`js/main.js`** — removed dead listener for removed `#btn-promo-ok` (V-07 crash fix).

## 4. Tests performed

| Test | Result |
|---|---|
| `node --check` on all 17 JS files | PASS (0 syntax errors) |
| Regression smoke test (gameplay: Intern → T1 → T2, tickets, SLA, CV, save) | 22/22 PASS |
| Security regression tests: escHtml, prototype pollution, XSS-payload save sanitization, login charset, name cap, terminal HTML-input robustness | 6/6 PASS |
| **Total** | **28/28 PASS** |
| DOM ID cross-check (all `getElementById` strings vs `index.html`) | PASS (only guarded `avatar-canvas` intentionally absent) |
| Inline `style=` / `onclick=` audit in HTML | PASS (0 remaining) |
| External resource audit (fonts, scripts, audio) | PASS — zero external requests; SFX = WebAudio oscillators |

## 5. Not applicable (with rationale)

- SQL injection, database security, API security, rate limiting, CSRF, SSRF, IDOR,
  broken authentication/sessions, account privilege escalation, server-side uploads,
  payments — **no backend/API/DB/accounts/payments exist** in this architecture.
- HSTS, HTTPS enforcement, secure cookies, server hardening — no server; applies only
  if/when the game is hosted (see recommendations).
- Dependency scanning — no package-manager dependencies or lockfile exist; the one
   runtime library, vendored Three.js r160, includes its MIT SPDX/copyright notice.

## 6. Remaining risks & recommendations before production

1. **FIXED AND BROWSER-VERIFIED:** the CSP meta tag loads the game with no external
   runtime requests. GitHub Pages currently serves HTTPS and HSTS.
2. **REQUIRES A DIFFERENT HOSTING LAYER FOR CUSTOM RESPONSE HEADERS:** GitHub Pages does
   not expose repository-controlled `X-Content-Type-Options`, `Referrer-Policy`, or
   frame-protection headers. The live response was checked and these headers are absent.
3. **IDENTIFIED, ACCEPTED BY DESIGN:** save tampering/cheating — acceptable for an
   offline single-player game. If leaderboards or online accounts are ever added,
   server-side validation of all progression becomes mandatory.
4. **PRIVACY:** a technical notice is provided in `privacy.html`. Game state/name are
   stored locally and are not sent to an application backend; GitHub may process normal
   hosting request metadata. Terms/cookie-consent pages were not generated because no
   business identity, jurisdiction, or legal wording was supplied. No tracking cookies,
   analytics, or advertising SDKs were found. Obtain legal review before adding accounts,
   email collection, IP logging, or analytics.

## 7. Backup & rollback

The previously listed `ticketquest_backup_pre-security/` directory is not present in the current workspace. Audit fixes are isolated on branch `security/audit-hardening`; no commit or push has been made for these audit changes.

## 8. Follow-up audit — 2026-11-13

The earlier report did not cover imported ticket data, the current hosted deployment, or the development server. The following issues were verified and addressed in the current worktree.

| ID | Finding | Severity | Status |
|---|---|---|---|
| V-09 | Stored XSS via imported `dorisTickets` / `grindTickets`: ticket sender, subject, body, and SOP text reached HelpDesk, Mail, and terminal HTML sinks | HIGH | ✅ FIXED AND VERIFIED in browser with inert HTML-like data; zero elements were created |
| V-10 | Save import accepted arbitrary object shapes and unbounded files; malformed values could replace expected state types or break rendering | MEDIUM | ✅ FIXED AND VERIFIED with envelope, type, record, collection, string, nesting, and 2 MB size limits |
| V-11 | Simulated account, mailbox, service, workstation, and ticket-kind dictionaries could resolve inherited JavaScript keys | MEDIUM | ✅ FIXED AND VERIFIED with own-property lookups, identifier validation, and regression tests |
| V-12 | Development server used string-prefix containment and bound on all interfaces | MEDIUM (development only) | ✅ FIXED AND VERIFIED with normalized and real-path containment, hidden-file denial, GET/HEAD-only methods, and loopback binding |
| V-13 | Settings reset used `localStorage.clear()`, which could erase unrelated data stored by other apps on the same origin | LOW | ✅ FIXED to remove only `ticketquest-save-v2` |
| V-14 | Branch test shared mutable simulated server state between random ticket cases, causing a flaky precondition failure | LOW (test reliability) | ✅ FIXED by resetting the simulated server before each case |

### Follow-up architecture and data

- The deployed site is a static client-side game on GitHub Pages. It has no application backend, API, database, accounts, authentication, payment flow, analytics, or third-party tracking code.
- Game name, login label, progress, notes, and settings are stored in browser `localStorage`. They are not sent to an application backend. A player can explicitly export a save file.
- GitHub Pages is confirmed active at `https://sebomsk.github.io/IT-game-/`, returns HTTP 200 over HTTPS, and supplies HSTS. GitHub may process standard request metadata such as visitor IPs in its hosting logs; the game code does not collect or persist visitor IP addresses.
- The CSP meta policy was loaded in the browser and allows no network connections. No external runtime requests were observed.
- The bundled Three.js library reports revision 160 and carries its copyright/SPDX marker; the full MIT terms are preserved in `THIRD_PARTY_NOTICES.md`. There is no npm/pip dependency manifest or package manager lockfile.

### Verification evidence

- `node --check` passed for all JavaScript files.
- `node test/smoke-test.js` passed, including new save-shape, dynamic-map, prototype-key, and dev-server path tests.
- `node test/grind-test.js` passed.
- `node test/branch-test.js` passed after isolating simulated server state for each test case.
- Browser test with imported HTML-like ticket fields found zero injected elements in HelpDesk, Mail, SOP, and terminal renderers; payloads remained text.
- Dev-server integration test: `/` returned 200 with `nosniff`; hidden `.git` paths returned 403; POST returned 405; sibling traversal was rejected.
- Live GitHub Pages response supplied HSTS. `X-Content-Type-Options`, `Referrer-Policy`, and frame-protection response headers were not present.
- A heuristic scan of current tracked files and Git history found no common AWS, GitHub, Stripe live-key, or private-key formats. `gitleaks` is not installed, so this is not an exhaustive secret scan.

### Remaining risks and non-applicable controls

- GitHub Pages does not provide repository-controlled response headers. HSTS is supplied by GitHub; custom `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options` headers require a different hosting layer such as a configured CDN. The HTML CSP is defense-in-depth, not a substitute for server headers.
- There is no login system, password handling, database, API, file upload beyond local JSON save import, or payment flow. Authentication, SQL/API security, rate limiting, MFA, and account recovery therefore remain not applicable. Do not collect or store plaintext passwords or send passwords through Discord. A future account feature requires a backend or managed auth provider and a new security review.
- GitHub Pages HTTPS/HSTS is verified; custom response-header behavior, DDoS controls, availability SLAs, load testing, backup restoration, formal SAST/DAST, and a professional penetration test were not performed.
- A factual technical privacy notice exists at `privacy.html`; no cookie banner was added because the app has no tracking cookies/analytics and uses localStorage for core game progress. Terms/cookie policies still require owner/legal review; publisher identity, jurisdiction, and age audience were not provided.
