/* ===== TicketQuest — the office: clickable NPC coworkers ===== */

const NPCS = {
  doris: { label: "Doris Pemberton", role: "Office Admin", outfit: "doris" },
  marek: { label: "Mark Kovac",      role: "Marketing",     outfit: "marek" },
  jana:  { label: "Jane White",      role: "Accounting",    outfit: "jana"  },
  zora:  { label: "Zora",            role: "Your mentor · IT", outfit: "zora" },
  boss:  { label: "Mr. Pixel",       role: "CTO",           outfit: "boss"  },
};

/* ---------- dialogue pools ---------- */
const NPC_LINES = {
  doris: [
    "Oh hi! Quick question — is your password 'password123'? No? Smart. Mine was. Once.",
    "The printer hates me. It only eats MY documents. Everyone else prints fine.",
    "I wrote my password on a sticky note, like, super securely. On the monitor. Don't tell IT.",
    "You're the new IT person, right? So young! Back in my day we had ONE computer for the whole floor.",
  ],
  marek: [
    "Hey! Is the Wi-Fi slow today, or is it just my imagination? ...It's my imagination, isn't it.",
    "I think my PC has a virus. It's definitely a virus. It made a weird noise ONE time.",
    "Can you make Excel open faster? My spreadsheets are important. Very important.",
    "If something breaks, it's not my fault. I just press things until it works. That's normal, right?",
  ],
  jana: [
    "Good morning! I do invoices all day, so if the internet dies, money literally stops moving.",
    "I work from home on Fridays. If the VPN breaks, I will email you. A lot.",
    "You fixed my internet last week? You're basically a wizard. Thank you again.",
    "Tip from accounting: always check twice. Rebooting something twice is still cheaper than one lost invoice.",
  ],
  zora: [
    "Welcome to the floor, {PLAYER}! Your desk is the one by the window. Sit down — the system is already waiting for you.",
    "Read the SOP Binder before every new type of ticket. Later you won't need it — that's the goal.",
    "The golden rule: what the user says happened is a theory. What the log says happened is a fact.",
    "Don't be afraid to escalate a ticket. Knowing your limits IS a professional skill.",
    "Watch the SLA timers on Tier 1 tickets. Users don't mind waiting for a fix — but HR minds late tickets.",
  ],
  boss: [
    "Hm.",
    "The servers better be running.",
    "I don't do small talk. I do uptime.",
    "Hm. (This one means 'good job'. Probably.)",
  ],
};

/* state-dependent extra lines */
function npcExtraLines(who) {
  const extra = [];
  if (who === "doris") {
    if (state.dorisCount > 0) {
      extra.push(
        `Locked out again? Me? Never. Okay yes. That's like, ${state.dorisCount} times. The coffee here is SO strong.`,
        "New password every time is exhausting. I liked 'doris2019'. It had character."
      );
    }
    if (!state.server.users.doris.active) {
      extra.push("Hmm, my computer says 'account locked'. Sounds like a YOU problem, honestly. 😇");
    }
  }
  if (who === "marek") {
    if (state.resolved.includes(1107)) extra.push("The cable. It was the CABLE. In the wall. I'm still thinking about it.");
    if (state.resolved.includes(1103)) extra.push("My mailbox is clean now. I feel... lighter. Spiritually.");
  }
  if (who === "jana") {
    if (state.resolved.includes(1104)) extra.push("VPN works again! I processed forty invoices from my sofa. Technology!");
  }
  if (who === "zora") {
    if (state.story.nightEvidence) {
      extra.push(
        "You're still here? It's late, {PLAYER}. Go home.",
        "...You found something in the logs? Show me tomorrow. First thing. And {PLAYER} — only me. Not Mr. Pixel. Not yet."
      );
    } else if (state.rank >= 1) {
      extra.push("Tier 1 suits you. Keep the SLA green and the notes long.");
    }
  }
  if (who === "boss" && state.rank >= 2) {
    extra.push("Tier 2. Acceptable. Don't make me say it twice.");
  }
  return extra;
}

/* ---------- chat UI ---------- */
const officeChat = {
  who: null,
  lines: [],
  idx: 0,
  el: null,
};

const office = (() => {
  let frame = 0;
  let timer = null;

  function drawNPCs() {
    document.querySelectorAll(".npc-canvas").forEach((c) => {
      const npcEl = c.closest(".npc");
      const who = npcEl.dataset.npc;
      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(0, 0, c.width, c.height);
      drawChar(ctx, 6, 6, 5, outfitOf(NPCS[who].outfit), frame);
    });
  }

  function startAnim() {
    if (timer) return;
    timer = setInterval(() => {
      if (document.getElementById("game").classList.contains("hidden")) return;
      if (document.getElementById("office-view").classList.contains("hidden")) return;
      frame = 1 - frame;
      drawNPCs();
    }, 700);
  }

  function updateBadge() {
    const btn = document.getElementById("btn-sitdown");
    if (!btn) return;
    const pending = [...TICKETS, ...(state.dorisTickets || [])].filter(
      (t) => ticketVisible(t) && !state.resolved.includes(t.id) && !state.escalated.includes(t.id)
    ).length;
    btn.textContent = pending > 0
      ? `🖥️ SIT DOWN AT YOUR DESK (${pending} ticket${pending > 1 ? "s" : ""} waiting)`
      : "🖥️ SIT DOWN AT YOUR DESK";
  }

  /* ---------- talking ---------- */
  function talk(who) {
    SFX.click();
    const chat = document.getElementById("office-chat");
    officeChat.who = who;
    officeChat.lines = [
      ...NPC_LINES[who],
      ...npcExtraLines(who),
    ];
    officeChat.idx = 0;
    chat.classList.remove("hidden");
    chatShowLine();
  }

  function chatShowLine() {
    const chat = document.getElementById("office-chat");
    document.getElementById("chat-name").textContent = officeChat.who
      ? NPCS[officeChat.who].label
      : "";
    document.getElementById("chat-text").textContent = officeChat.lines[officeChat.idx] || "";
    document.getElementById("chat-next").textContent =
      officeChat.idx >= officeChat.lines.length - 1 ? "END TALK ▸" : "NEXT ▸";
    chat.classList.remove("hidden");
  }

  function chatNext() {
    SFX.click();
    if (officeChat.idx >= officeChat.lines.length - 1) { chatClose(); return; }
    officeChat.idx++;
    chatShowLine();
  }

  function chatClose() {
    document.getElementById("office-chat").classList.add("hidden");
    officeChat.who = null;
  }

  function init() {
    drawNPCs();
    startAnim();
    updateBadge();
    document.querySelectorAll(".npc").forEach((el) => {
      el.addEventListener("click", () => talk(el.dataset.npc));
    });
    document.getElementById("chat-next").addEventListener("click", chatNext);
    document.getElementById("chat-close").addEventListener("click", () => { SFX.click(); chatClose(); });
  }

  return { init, updateBadge, drawNPCs };
})();
