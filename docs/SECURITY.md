# TicketQuest — Security Audit Report

**Date:** 2026-11-13 · **Version:** v3 (office + fake desktop OS) · **Scope:** entire game
**Backup before changes:** `ticketquest_backup_pre-security/`

---

## 1. Architecture overview & threat model

TicketQuest is a **fully client-side, offline browser game**:

- Vanilla HTML/CSS/JS, no build step, no external dependencies, no network calls.
- No backend, no database, no API endpoints, no user accounts, no payments, no file uploads.
- All game state lives in `localStorage` (`ticketquest-save-v2`) on the player's own machine.

**Sensitive assets:** game save data (progress, player-chosen name). No personal data
is collected or transmitted anywhere — the game works fully offline.

**Threat actors:**

| Actor | Vector | Impact |
|---|---|---|
| Attacker with access to a shared PC | Tampered `localStorage` save (stored XSS payload in player name, prototype pollution) | Script execution in game origin, save corruption |
| The player themselves | HTML in terminal input, cheats via DevTools | Broken rendering, self-XSS, trivial cheating (accepted by design) |
| (Future) if hosted online | Content injection, missing CSP | Defense-in-depth needed |

## 2. Discovered vulnerabilities & status

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| V-01 | **Stored XSS:** player name from save → `innerHTML` (terminal banner, welcome-back message, Settings) | HIGH | ✅ FIXED AND VERIFIED |
| V-02 | **HTML injection in terminal:** 42 command/argument interpolations into `innerHTML`, plus 1 in night terminal | MEDIUM | ✅ FIXED AND VERIFIED (escaped at input boundary) |
| V-03 | **Prototype pollution:** `deepMerge` merged `__proto__`/`constructor`/`prototype` keys from a crafted save | MEDIUM | ✅ FIXED AND VERIFIED |
| V-04 | No input validation on player name (length/characters) | LOW | ✅ FIXED AND VERIFIED (24-char cap, HTML-special chars stripped, login charset-restricted) |
| V-05 | No Content-Security-Policy | MEDIUM | ✅ FIXED (needs one-time visual verification in browser) |
| V-06 | NPCs / desktop icons not keyboard-accessible (a11y) | LOW | ✅ FIXED (role, tabindex, Enter/Space, focus-visible) |
| V-07 | **Functional crash:** `main.js` referenced removed `#btn-promo-ok` → `addEventListener` on `null` would kill the whole game on load | CRITICAL (functionality) | ✅ FIXED AND VERIFIED (ID cross-check script: all DOM IDs resolved) |
| V-08 | Save tampering = cheating (XP, tickets) | INFO | ✅ NOT APPLICABLE — single-player offline game, accepted by design |

## 3. Implemented fixes (evidence)

1. **`js/state.js`** — new `escHtml()` (context-aware HTML escaping helper); `deepMerge()`
   skips `__proto__`/`constructor`/`prototype`; `loadGame()` sanitizes `player.name`
   (`sanitizeName`: strips `<>&"'`` ` ``\`, trim, 24-char cap) and `player.login`
   (`sanitizeLogin`: `[a-z0-9._-]` only).
2. **`js/cutscene.js`** — name input sanitized at the point of entry (`sanitizeName`).
3. **`js/main.js`** — terminal banner + welcome-back message escape the player name.
4. **`js/apps.js`** — Settings user card escapes the player name.
5. **`js/sim.js`** — `runCommand()` HTML-escapes command and all arguments at the input
   boundary → all 42 downstream `innerHTML` interpolations are inert.
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
  broken authentication/sessions, privilege escalation, file uploads, payments —
  **no backend/API/DB/accounts/payments exist** in this architecture.
- HSTS, HTTPS enforcement, secure cookies, server hardening — no server; applies only
  if/when the game is hosted (see recommendations).
- Dependency scanning — **zero dependencies**, nothing to scan (major supply-chain win).

## 6. Remaining risks & recommendations before production

1. **FIXED BUT NEEDS ONE-TIME VISUAL VERIFICATION:** the CSP meta tag — open the game in
   Brave; if anything looks broken (blank screen, missing styles), delete the
   `<meta http-equiv="Content-Security-Policy" …>` line in `index.html` (the game's
   core protections do not depend on it).
2. **REQUIRES MANUAL CONFIGURATION (only if hosted online):** serve over HTTPS with
   HSTS, convert the CSP meta to a server header, add `X-Content-Type-Options: nosniff`,
   `Referrer-Policy`, and frame protection headers.
3. **IDENTIFIED, ACCEPTED BY DESIGN:** save tampering/cheating — acceptable for an
   offline single-player game. If leaderboards or online accounts are ever added,
   server-side validation of all progression becomes mandatory.
4. GDPR/privacy: the game collects **no personal data and makes no network requests**
   — no privacy policy is required for the offline version; revisit if hosted with
   analytics/accounts.

## 7. Backup & rollback

Pre-change snapshot: `ticketquest_backup_pre-security/` (full copy).
