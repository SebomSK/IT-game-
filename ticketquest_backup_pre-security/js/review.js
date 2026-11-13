/* ===== TicketQuest — performance review ===== */

function reviewCompute() {
  const s = careerStats();
  let score = 0;
  // SLA: 0-3 points
  if (s.slaPct >= 90) score += 3; else if (s.slaPct >= 60) score += 2; else if (s.slaPct > 0) score += 1;
  // notes: 0-3 points
  if (s.notes >= 5) score += 3; else if (s.notes >= 3) score += 2; else if (s.notes > 0) score += 1;
  // escalations: 0-2 points (1 escalation = fine)
  if (s.esc === 0) score += 2; else if (s.esc <= 1) score += 2; else if (s.esc <= 3) score += 1;
  // phone: bonus
  if (state.phoneDone[1107]) score += 2;
  return { s, score, max: 10 };
}

function reviewShow(after) {
  const { s, score } = reviewCompute();
  let grade, title, text, bonus;
  if (score >= 9) {
    grade = "A"; bonus = 60;
    title = "🔥 EXCELLENT";
    text = "Mr. Pixel noticed you. That doesn't happen often. This is what a shift that deserves a promotion looks like.";
  } else if (score >= 6) {
    grade = "B"; bonus = 30;
    title = "👍 SOLID";
    text = "Zora: \"Decent work. We'll polish the details next time — and watch the SLA and the notes.\"";
  } else {
    grade = "C"; bonus = 0;
    title = "⚠️ NEEDS IMPROVEMENT";
    text = "Mr. Pixel: \"Hm.\" (That's a long speech, for him.) Faster, more notes, less chaos.";
  }
  state.stats.reviews++;
  state.xp += bonus;
  state.reviewDone = true;
  saveGame();
  SFX.fanfare();

  const overlay = document.getElementById("review-overlay");
  document.getElementById("review-body").innerHTML = `
    <div class="review-grade ${grade === "A" ? "gA" : grade === "B" ? "gB" : "gC"}">${grade}</div>
    <h3>${title}</h3>
    <p class="modal-sub">${text}</p>
    <div class="stat-grid">
      <div class="stat"><b>${s.slaPct}%</b><span>on-time SLA</span></div>
      <div class="stat"><b>${s.notes}</b><span>res. notes</span></div>
      <div class="stat"><b>${s.esc}</b><span>escalations</span></div>
      <div class="stat"><b>${score}/10</b><span>overall score</span></div>
    </div>
    ${bonus ? `<p class="modal-sub">💰 Bonus for the review: <b>+${bonus} XP</b></p>` : ""}`;
  document.getElementById("review-ok").onclick = () => {
    overlay.classList.add("hidden");
    renderTopbar();
    renderTickets();
    if (after) after();
  };
  overlay.classList.remove("hidden");
}
