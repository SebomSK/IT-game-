# TicketQuest 🎟️

**Helpdesk \& IT career simulator in the browser** — a story game where you build a real IT career: from intern to SOC analyst. Gain experience before your first IT job.

Inspired by Hack Vantage, but **free, in English, with a story and without a real server** (the entire OS is simulated in the browser).

## Play

[Play TicketQuest in your browser](https://sebomsk.github.io/CyberSecurity-Game/)

[Privacy notice](privacy.html)

## Game in one sentence

Join PIXL Corp, the boss asks for your name, you get tickets, you solve them in a simulated Windows Server, fill out the curriculum in the SOP Binder, progress on the career ladder — and night after night you discover that something is happening in the company...

## How to play

1. Open `index.html` in your browser (no installation needed).
2. **START WORK** → intro cutscene (boss asks for your name) → tutorial with arrow keys.
3. Progress is saved automatically (localStorage). `resetGame()` clears from console.

## Game systems (Phase 1)

|System|What it does|
|-|-|
|📞 Phone tickets|Dialog with user — correct diagnostic questions vs. bad (ticket #1107)|
|🌙 Night mystery|Interactive night terminal: audit, keeper.ps1, who is "k"?|
|📥 Live shifts|Tickets arrive progressively + toast notifications with sound|
|📊 Career + CV|Statistics (SLA %, average time, Doris×) + real downloadable CV (.txt)|
|📋 Performance review|A/B/C evaluation after completing T1 (SLA, notes, escalations) → bonus XP|
|🙃 Doris gag|Repeated lockouts — dynamic tickets generated during gameplay|
|🧑‍💻 Live office|Pixel sprite colleagues with animation (player types on keyboard)|
|🔊 Sounds|Ping new ticket, ding resolve, SLA alarm, blips while typing|
|🎬 Cutscenes|Visual novel style: pixel-art scenes, typewriter, 3rd/1st person POV, blip sounds|
|👤 Player name|Boss asks in intro — then you're called tickets, dialogues, `whoami`, certificates|
|🎓 Tutorial|6 steps with arrow keys: tickets, SOP, terminal, XP|
|📚 SOP Binder|Training Portal: download book, phases + chapters, tick according to progress|
|⏱ SLA|Timers on T1 tickets, "past SLA" = half XP; **Chill mode** in top bar|
|⬆ Escalation|`escalate <ID>` — realistic admission of limits (40% XP)|
|📝 Resolution notes|Note after resolution — good note = +10 XP|
|🎓 A+ quiz|10 questions for promotion to Tier 2 (≥7/10)|
|💰 Paycheck|Increases with rank (intern → 850€ → 1200€)|
|🎓 **Learn (real-world education)**|After every ticket a debrief: what happened, how professionals do it, common mistakes, *simulation vs reality*, plus a reflection question (+5 XP). Learn app: lessons, troubleshooting method, game→real command table, glossary, skills. Terminal: `explain <cmd>`; hints on failed `resolve`|
|✉️ Mail|Reply, flag and archive; replies are graded on professional communication (+XP); a password in an e-mail = 0 XP and a security warning|
|🕵️ D:\\ evidence|Read real-style logs (event IDs 4698/4722/4725/4740), build a timeline for the keeper.ps1 mystery|
|🖥 Desktop|Resizable windows (8 handles), Start search (apps, tickets, files, lessons) + Recent, right-click menus, wallpapers, pinned taskbar apps, auto-maximize on mobile|
|⌨ Shortcuts|`Esc` closes menus · `Win+S` / `Ctrl+Alt+S` search · `Win+D` / `Ctrl+Alt+D` show desktop · `Alt+Tab` / `Alt+W` window switcher (the browser may swallow Win/Alt+Tab, hence the alternatives)|
|🎚 Volume|Slider in the main menu and Settings (plus mute)|

## Career ladder

```
IT Intern (240 XP) → Helpdesk Tier 1 (610 XP + A+ quiz) → Desktop Support Tier 2
        └── Phase 2+: └→ Jr. Sysadmin → Sysadmin → IT Operations Lead → \\\*\\\*Director of IT\\\*\\\*
                      └→ SOC T1 → SOC T2 (IR)
```

## Tickets

* **Intern (Phase 0):** locked account, printer, network, brute-force attack
* **Tier 1 (Phase 1):** onboarding, NTFS permissions, mailbox quota, VPN/RADIUS, offboarding, PC build (WDS)

## Security & real-world learning

TicketQuest is meant to teach skills you can use in a real IT / security job, not just entertain.

- **Learn app + debriefs** — after every ticket you get *what really happened*, how professionals do it, common mistakes, what the game simplifies, and a check question. `explain <command>` in the terminal shows the real Windows/PowerShell equivalent.
- **SOC Console** — endless alert triage (false positive / true positive / escalate) with randomised alerts. Difficulty grows with your rank; every verdict is explained.
- **Phishing trainer** — suspicious mails in your inbox: check the real sender domain, Reply-To, link target and attachment, then report or keep. Wrong guesses teach instead of punish.
- **Security hygiene tickets** — patching, MFA recovery (with the social-engineering trap), Group Policy, DNS and failed backups, each backed by a real-world lesson.
- **Consequences** — missing an SLA lowers the departments' *trust* and triggers complaint e-mails (and, if it gets low, a talk with the boss).
- **Cutscenes** — animated characters, a camera that follows the speaker, title cards and atmosphere (dust, rain, flickering server room).

## Structure

```
index.html            — layout + overlays (cutscene, notes, binder, quiz, tutorial)
css/style.css         — pixel-art/CRT style
js/state.js           — state + saving (v2)
js/ranks.js           — career ladder, salaries
js/tickets.js         — 10 tickets + resolution conditions
js/sim.js             — simulated Windows Server (\\\~25 commands)
js/learn.js           — educational layer: lessons, debrief, quiz, reply grading, Learn app
js/evidence.js        — D:\\ disk with logs/evidence for the night mystery
css/os.css, learn.css — desktop (resize, menus, search) and Learn styling
scripts/stamp.js      — one cache version (?v=hash) for index.html; check-encoding.js guards UTF-8/LF
js/avatar.js          — pixel sprites (avatar generated from name)
js/story.js           — PIXL Corp Saga story (intro, night scene, promotions)
js/cutscene.js        — VN engine (typewriter, POV, WebAudio blips)
js/sla.js             — SLA timers
js/tutorial.js        — tutorial with arrow keys
js/binder.js          — SOP Binder (curriculum/book)
js/quiz.js            — A+ certification
js/main.js            — game logic, connecting everything
test/*.js             — headless tests (smoke, branch, grind, learn) + Playwright UI test
```

Developing: `npm i` (Playwright), `npm run stamp` (cache version), `npm test` (encoding + stamp + unit + UI).

## Roadmap

* **Phase 2:** Desktop Support T2 tasks (PowerShell, GPO, MFA) + branch Sysadmin/SOC
* **Phase 3:** PIX Labs (Linux module: bash, systemd, nginx) + SOC module (SIEM, phishing)
* **Phase 4:** Network/VLAN/IR, CV export, ticket editor, leaderboard
* Story: mystery of locked accounts → two branches → one finale

## Hosting

```bash
python -m http.server 8000   # or
npx serve .
```

Production: Cloudflare Pages (free).

## Contact

Discord: `realbigrussian`

For support, password resets, or to report issues, message me on Discord. I can help with password resets, account issues, or any questions about the game.

\---

*This README was translated from Slovak to English. The game itself remains free, offline, and playable in any browser without installation.*


## v0.6.1 — what changed

- **Chapter check + Replay lab** (SOP Binder): after finishing a chapter you get a 3-question quiz (answers shuffled every time, +15 XP once) and a *replay* ticket of the same skill with a different fault, so it can't be solved from memory. Code: `js/chapters.js`.
- **A+ certification** now shuffles answers (before, the correct one was always first).
- **Fix:** tickets targeting the `Sales` group were unsolvable (the group did not exist on the server and an empty group was dropped on save/load).
- Tests: `npm test` runs encoding + cache-stamp checks, headless unit tests (incl. `test/chapters-test.js`) and the Playwright UI tests.
