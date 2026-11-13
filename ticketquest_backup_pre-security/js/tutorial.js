/* ===== TicketQuest — interactive arrow tutorial ===== */

const tutorial = (() => {
  const layer = document.getElementById("tutorial-layer");
  const box = document.getElementById("tut-box");
  const textEl = document.getElementById("tut-text");
  const arrow = document.getElementById("tut-arrow");
  const nextBtn = document.getElementById("tut-next");
  const skipBtn = document.getElementById("tut-skip");
  const highlight = document.getElementById("tut-highlight");

  const STEPS = [
    {
      sel: "#desktop-icons .dicon[data-app='mail']",
      text: "👉 This is your DESKTOP — your work computer. All your job apps live here. Double-click an icon to open it.",
    },
    {
      sel: "#hd-content #ticket-list",
      text: "🎫 The HelpDesk app: TICKETS arrive here. Coworkers tell you what isn't working. Click a ticket and read it.",
    },
    {
      sel: "#hd-content .sop",
      text: "📖 That's the SOP procedure — the step-by-step recipe for solving the problem. Early on it holds your hand; later you'll research yourself (just like a real job!).",
    },
    {
      sel: "#hd-content #btn-take",
      text: "✋ This is how you TAKE a ticket. Until you take it, the terminal won't accept it. In real life this is called 'assign to me'.",
    },
    {
      sel: "#desktop-icons .dicon[data-app='terminal']",
      text: "💻 The Terminal app — SRV-DC01, your simulated Windows Server. Type commands here. Start with 'help'. ↑↓ gives you command history.",
    },
    {
      sel: "#taskbar",
      text: "⌨️ The taskbar: switch between open apps, 🍃 Chill mode (no SLA pressure), 📚 SOP Binder — and 🚶 Leave desk to go back to the office and talk to coworkers.",
    },
  ];

  let idx = -1;

  function place() {
    const el = document.querySelector(STEPS[idx].sel);
    if (!el) { next(); return; }
    const r = el.getBoundingClientRect();
    highlight.style.left = r.left - 6 + "px";
    highlight.style.top = r.top - 6 + "px";
    highlight.style.width = r.width + 12 + "px";
    highlight.style.height = r.height + 12 + "px";
    const below = r.bottom + 70 < window.innerHeight;
    box.style.top = below ? r.bottom + 16 + "px" : "";
    box.style.bottom = below ? "" : window.innerHeight - r.top + 16 + "px";
    box.style.left = Math.max(12, Math.min(r.left, window.innerWidth - box.offsetWidth - 12)) + "px";
    arrow.textContent = below ? "▲" : "▼";
    arrow.style.top = below ? r.bottom + 2 + "px" : "";
    arrow.style.bottom = below ? "" : window.innerHeight - r.top + 2 + "px";
    arrow.style.left = Math.min(Math.max(r.left + r.width / 2 - 10, 20), window.innerWidth - 40) + "px";
  }

  function show() {
    idx = 0;
    layer.classList.remove("hidden");
    textEl.textContent = STEPS[0].text;
    requestAnimationFrame(place);
  }

  function next() {
    idx++;
    if (idx >= STEPS.length) {
      end();
      return;
    }
    textEl.textContent = STEPS[idx].text;
    requestAnimationFrame(place);
  }

  function end() {
    idx = -1;
    layer.classList.add("hidden");
    state.tutorialDone = true;
    saveGame();
  }

  nextBtn.addEventListener("click", next);
  skipBtn.addEventListener("click", end);
  window.addEventListener("resize", () => { if (idx >= 0) place(); });

  return { show };
})();
