# TicketQuest 🎟️

**Helpdesk & IT career simulator in the browser** — a story game where you build a real IT career: from intern to SOC analyst. Gain experience before your first IT job.

Inspired by Hack Vantage, but **free, in English, with a story and without a real server** (the entire OS is simulated in the browser).

## Game in one sentence

Join PIXL Corp, the boss asks for your name, you get tickets, you solve them in a simulated Windows Server, fill out the curriculum in the SOP Binder, progress on the career ladder — and night after night you discover that something is happening in the company...

## How to play

1. Open `index.html` in your browser (no installation needed).
2. **START WORK** → intro cutscene (boss asks for your name) → tutorial with arrow keys.
3. Progress is saved automatically (localStorage). `resetGame()` clears from console.

## Game systems (Phase 1)

| System | What it does |
|---|---|
| 📞 Phone tickets | Dialog with user — correct diagnostic questions vs. bad (ticket #1107) |
| 🌙 Night mystery | Interactive night terminal: audit, keeper.ps1, who is "k"? |
| 📥 Live shifts | Tickets arrive progressively + toast notifications with sound |
| 📊 Career + CV | Statistics (SLA %, average time, Doris×) + real downloadable CV (.txt) |
| 📋 Performance review | A/B/C evaluation after completing T1 (SLA, notes, escalations) → bonus XP |
| 🙃 Doris gag | Repeated lockouts — dynamic tickets generated during gameplay |
| 🧑‍💻 Live office | Pixel sprite colleagues with animation (player types on keyboard) |
| 🔊 Sounds | Ping new ticket, ding resolve, SLA alarm, blips while typing |
| 🎬 Cutscenes | Visual novel style: pixel-art scenes, typewriter, 3rd/1st person POV, blip sounds |
| 👤 Player name | Boss asks in intro — then you're called tickets, dialogues, `whoami`, certificates |
| 🎓 Tutorial | 6 steps with arrow keys: tickets, SOP, terminal, XP |
| 📚 SOP Binder | Training Portal: download book, phases + chapters, tick according to progress |
| ⏱ SLA | Timers on T1 tickets, "past SLA" = half XP; **Chill mode** in top bar |
| ⬆ Escalation | `escalate <ID>` — realistic admission of limits (40% XP) |
| 📝 Resolution notes | Note after resolution — good note = +10 XP |
| 🎓 A+ quiz | 10 questions for promotion to Tier 2 (≥7/10) |
| 💰 Paycheck | Increases with rank (intern → 850€ → 1200€) |

## Career ladder

```
IT Intern (240 XP) → Helpdesk Tier 1 (610 XP + A+ quiz) → Desktop Support Tier 2
        └── Phase 2+: └→ Jr. Sysadmin → Sysadmin → IT Operations Lead → **Director of IT**
                      └→ SOC T1 → SOC T2 (IR)
```

## Tickets

- **Intern (Phase 0):** locked account, printer, network, brute-force attack
- **Tier 1 (Phase 1):** onboarding, NTFS permissions, mailbox quota, VPN/RADIUS, offboarding, PC build (WDS)

## Structure

```
index.html            — layout + overlays (cutscene, notes, binder, quiz, tutorial)
css/style.css         — pixel-art/CRT style
js/state.js           — state + saving (v2)
js/ranks.js           — career ladder, salaries
js/tickets.js         — 10 tickets + resolution conditions
js/sim.js             — simulated Windows Server (~25 commands)
js/avatar.js          — pixel sprites (avatar generated from name)
js/story.js           — PIXL Corp Saga story (intro, night scene, promotions)
js/cutscene.js        — VN engine (typewriter, POV, WebAudio blips)
js/sla.js             — SLA timers
js/tutorial.js        — tutorial with arrow keys
js/binder.js          — SOP Binder (curriculum/book)
js/quiz.js            — A+ certification
js/main.js            — game logic, connecting everything
test/smoke-test.js    — full career test (`node test/smoke-test.js`)
```

## Roadmap

- **Phase 2:** Desktop Support T2 tasks (PowerShell, GPO, MFA) + branch Sysadmin/SOC
- **Phase 3:** PIX Labs (Linux module: bash, systemd, nginx) + SOC module (SIEM, phishing)
- **Phase 4:** Network/VLAN/IR, CV export, ticket editor, leaderboard
- Story: mystery of locked accounts → two branches → one finale

## Hosting

```bash
python -m http.server 8000   # or
npx serve .
```
Production: Cloudflare Pages (free).
# TicketQuest 🎟️

**Helpdesk & IT kariérny simulátor v prehliadači** — príbehová hra, v ktorej si vybuduješ reálnu IT kariéru: od intern až po SOC analytika. Získaj skúsenosti ešte pred prvou IT pracou.

Inšpirované Hack Vantage, ale **zdarma, v slovenčine, s príbehom a bez reálneho servera** (celý OS je simulovaný v prehliadači).

## Hra v jednej vete

Nastúpiš do PIXL Corp, šéf sa ťa opýta na meno, dostaneš tickety, vyriešiš ich v simulovanom Windows Serveri, plníš kurikulum v SOP Bindri, postupuješ po kariérnom rebríku — a noc čo noc zisťuješ, že sa vo firme niečo deje...

## Ako spustiť

1. Otvor `index.html` v prehliadači (nič netreba inštalovať).
2. **NASTÚPIŤ DO PRÁCE** → intro cutscene (šéf pýta meno!) → tutorial so šípkami.
3. Postup sa ukladá automaticky (localStorage). `resetGame()` vyletí z konzoly.

## Herné systémy (Fáza 1)

| Systém | Čo robí |
|---|---|
| 📞 Telefónne tickety | Dialóg s používateľom — správne diagnostické otázky vs. zlé (ticket #1107) |
| 🌙 Nočná záhada | Interaktívny nočný terminál: audit, keeper.ps1, kto je "k"? |
| 📥 Živá smena | Tickety prichádzajú postupne + toast notifikácie so zvukom |
| 📊 Kariéra + CV | Štatistiky (SLA %, priemerný čas, Doris×) + reálne stiahnuteľné CV (.txt) |
| 📋 Performance review | Hodnotenie A/B/C po dokončení T1 (SLA, zápisy, eskalácie) → bonus XP |
| 🙃 Doris gag | Opakujúce sa zamknutia — dynamické ticket generované počas hry |
| 🧑‍💻 Živá kancelária | Pixel spritey kolegov s animáciou (hráč píše na klávese) |
| 🔊 Zvuky | Ping nového ticketu, ding resolve, SLA alarm, blipy pri písaní |
| 🎬 Cutscény | Visual novel štýl: pixel-art scény, typewriter, 3rd/1st person POV, blip zvuky |
| 👤 Meno hráča | Šéf sa spýta v intre — potom ťa tak volajú tickety, dialógy, `whoami`, certifikáty |
| 🎓 Tutorial | 6 krokov so šípkami: tickety, SOP, terminál, XP |
| 📚 SOP Binder | Training Portal: si stiahneš knihu, fázy + kapitoly, odškrtáva sa podľa postupu |
| ⏱ SLA | Časovače na T1 ticketoch, "po SLA" = polovičné XP; **Chill mód** v topbare |
| ⬆ Eskalácia | `escalate <ID>` — realistické priznanie hraníc (40 % XP) |
| 📝 Resolution notes | Zápis po vyriešení — kvalitný zápis = +10 XP |
| 🎓 A+ kvíz | 10 otázok na povýšenie na Tier 2 (≥7/10) |
| 💰 Výplata | Rastie s rankom (stáž → 850 € → 1200 €) |



## Tickets

- **Intern (Phase 0):** locked account, printer, network, brute-force attack
- **Tier 1 (Phase 1):** onboarding, NTFS permissions, mailbox quota, VPN/RADIUS, offboarding, PC build (WDS)

## Structure

```
index.html            — layout + overlaye (cutscene, notes, binder, quiz, tutorial)
css/style.css         — pixel-art/CRT štýl
js/state.js           — stav + ukladanie (v2)
js/ranks.js           — kariérny rebrík, výplaty
js/tickets.js         — 10 ticketov + podmienky vyriešenia
js/sim.js             — simulovaný Windows Server (~25 príkazov)
js/avatar.js          — pixel spritey (avatar generovaný z mena)
js/story.js           — príbeh PIX Corp Saga (intro, nočná scéna, povýšenia)
js/cutscene.js        — VN engine (typewriter, POV, WebAudio blipy)
js/sla.js             — SLA časovače
js/tutorial.js        — tutorial so šípkami
js/binder.js          — SOP Binder (kurikulum/kniha)
js/quiz.js            — A+ certifikácia
js/main.js            — herná logika, napojenie všetkého
test/smoke-test.js    — headless test celej kariéry (`node test/smoke-test.js`)
```

## Roadmap

- **Phase 2:** Desktop Support T2 tasks (PowerShell, GPO, MFA) + branch Sysadmin/SOC
- **Phase 3:** PIX Labs (Linux module: bash, systemd, nginx) + SOC module (SIEM, phishing)
- **Phase 4:** Network/VLAN/IR, CV export, ticket editor, leaderboard
- Story: mystery of locked accounts → two branches → one finale

## Hosting

```bash
python -m http.server 8000   # or
npx serve .
```
Production: Cloudflare Pages (free).
