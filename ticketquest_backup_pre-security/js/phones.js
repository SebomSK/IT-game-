/* ===== TicketQuest — phone tickets (user dialogue) ===== */
/* Lesson: users never tell you everything at once. Good questions = fast fix. */

const PHONES = {
  1107: {
    user: "Mark (on the phone)",
    steps: [
      {
        user: "Hi! The PC just DOESN'T WORK. I'm sitting here and I honestly have no idea.",
        options: [
          { text: "What exactly happens when you press the power button?", good: true,
            reply: "Well... nothing. The screen is black. But I can hear the fans spinning. Hmm." },
          { text: "Have you tried restarting it?", good: false,
            reply: "That's what my coworker said. We don't get along." },
          { text: "Is it plugged into power?", good: false,
            reply: "It's on... I guess. The fans are humming. I can see that." },
        ],
      },
      {
        user: "The screen is black. So the computer is broken, right?",
        options: [
          { text: "Fans spinning + black screen → check the MONITOR CABLE. Into the PC and into the wall.", good: true,
            reply: "Wait... that cable goes... into the wall?? ... You're right. The cleaners unplugged it while tidying. LOL" },
          { text: "Then buy a new PC.", good: false,
            reply: "I don't think it's that simple... thanks for trying, I guess?" },
          { text: "Download new drivers.", good: false,
            reply: "And how, when everything is black?" },
        ],
      },
      {
        user: "Plugged the cable into the PC and... it lights up! It works! Thank you!!",
        final: "📞 Click. Mark owes you a coffee now. Diagnosing with the right questions = solved in 3 minutes.",
      },
    ],
  },
};

function phoneOpen(ticketId) {
  const ph = PHONES[ticketId];
  if (!ph) return;
  if (state.phoneDone[ticketId]) {
    toast(`📞 ${ph.user}: you already had this call.`, "t-ok");
    return;
  }
  if (!state.phoneState[ticketId]) state.phoneState[ticketId] = { step: 0, mistakes: 0 };
  renderPhone(ticketId);
}

function renderPhone(ticketId) {
  const ph = PHONES[ticketId];
  const st = state.phoneState[ticketId];
  const overlay = document.getElementById("phone-overlay");
  const dlg = document.getElementById("phone-dialog");
  const opts = document.getElementById("phone-options");
  const title = document.getElementById("phone-title");
  const mistakes = document.getElementById("phone-mistakes");

  title.textContent = `📞 Call: ${ph.user}`;
  mistakes.textContent = st.mistakes > 0 ? `⛔ Bad questions: ${st.mistakes} (they hurt your reputation and XP)` : "🎯 Diagnose right and fast!";

  const step = ph.steps[st.step];
  dlg.textContent = "";
  const line = document.createElement("div");
  line.className = "phone-user-line";
  line.textContent = `🗣️ ${step.user}`;
  dlg.appendChild(line);

  opts.innerHTML = "";
  if (step.final) {
    const fin = document.createElement("div");
    fin.className = "phone-final";
    fin.textContent = step.final;
    dlg.appendChild(fin);
    const b = document.createElement("button");
    b.className = "btn-primary";
    b.textContent = "HANG UP";
    b.onclick = () => {
      state.phoneDone[ticketId] = true;
      saveGame();
      overlay.classList.add("hidden");
      renderTickets();
      showDetail(ticketId);
      toast("📞 Call finished. Now fix it in the terminal!", "t-ok");
      SFX.ding();
    };
    opts.appendChild(b);
    return;
  }
  step.options.forEach((o) => {
    const b = document.createElement("button");
    b.className = "phone-option";
    b.textContent = o.text;
    b.onclick = () => {
      const reply = document.createElement("div");
      reply.className = o.good ? "phone-reply good" : "phone-reply bad";
      reply.textContent = (o.good ? "✅ " : "❌ ") + o.reply;
      dlg.appendChild(reply);
      if (o.good) {
        SFX.ding();
        st.step++;
        saveGame();
        opts.innerHTML = "";
        setTimeout(() => renderPhone(ticketId), 600);
      } else {
        st.mistakes++;
        saveGame();
        SFX.err();
        mistakes.textContent = `⛔ Bad questions: ${st.mistakes} (they hurt your reputation and XP)`;
      }
    };
    opts.appendChild(b);
  });
  overlay.classList.remove("hidden");
}
