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

## Kariérny rebrík

```
IT Intern (240 XP) → Helpdesk Tier 1 (610 XP + A+ kvíz) → Desktop Support Tier 2
       └── Fáza 2+: └─→ Jr. Sysadmin → Sysadmin → Network Eng
                     └─→ SOC T1 → SOC T2 (IR)
```

## Tickety

- **Intern (Fáza 0):** zamknutý účet, tlačiareň, sieť, brute-force útok
- **Tier 1 (Fáza 1):** onboarding, NTFS oprávnenia, mailbox kvóta, VPN/RADIUS, offboarding, PC build (WDS)

## Štruktúra

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

- **Fáza 2:** Desktop Support T2 úlohy (PowerShell, GPO, MFA) + vetvenie Sysadmin/SOC
- **Fáza 3:** PIX Labs (Linux modul: bash, systemd, nginx) + SOC modul (SIEM, phishing)
- **Fáza 4:** Network/VLAN/IR, CV export, editor ticketa, leaderboard
- Príbeh: záhada zamknutých účtov → dve vetvy → jeden finale

## Hosting

```bash
python -m http.server 8000   # alebo
npx serve .
```
Production: Cloudflare Pages (zdarma).
