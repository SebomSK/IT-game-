/* ===== TicketQuest — career stats + CV export ===== */

function careerStats() {
  const resolvedCount = state.resolved.length;
  const esc = state.escalated.length;
  const avgMin = resolvedCount ? Math.round(state.stats.totalMin / resolvedCount) : 0;
  const t1Ids = RANKS[2].reqs.tickets;
  const t1Done = t1Ids.filter((id) => state.resolved.includes(id) || state.escalated.includes(id)).length;
  const onTime = t1Ids.filter((id) => state.resolved.includes(id) && !state.overdue[id]).length;
  const slaPct = t1Done ? Math.round((onTime / t1Done) * 100) : 100;
  return { resolvedCount, esc, avgMin, slaPct, notes: state.stats.notesGood, doris: state.dorisCount };
}

function skillsList() {
  const skills = new Set();
  [...state.resolved, ...state.escalated].forEach((id) => {
    const s = SKILL_MAP[id] || SKILL_MAP[id >= 2000 ? 2001 : id];
    if (s) skills.add(s);
  });
  return [...skills];
}

function statsOpen() {
  const s = careerStats();
  const rank = RANKS[rankIndex()];
  const days = Math.max(1, Math.ceil((Date.now() - (state.stats.startedAt || Date.now())) / 86400000));
  document.getElementById("stats-body").innerHTML = `
    <div class="stat-grid">
      <div class="stat"><b>${s.resolvedCount}</b><span>tickets resolved</span></div>
      <div class="stat"><b>${s.esc}</b><span>escalations (professional!)</span></div>
      <div class="stat"><b>${s.slaPct}%</b><span>on-time SLA (T1)</span></div>
      <div class="stat"><b>${s.avgMin} min</b><span>average per ticket</span></div>
      <div class="stat"><b>${s.notes}</b><span>resolution notes</span></div>
      <div class="stat"><b>${s.doris}×</b><span>Doris and her lockouts 😄</span></div>
    </div>
    <p class="modal-sub">Rank: <b>${rankTitle()}</b> · Days at PIXL Corp: <b>${days}</b></p>
    <div class="cv-skills">
      <b>Skills you practiced in the game:</b>
      <ul>${skillsList().map((x) => `<li>${x}</li>`).join("") || "<li>(none yet — how about one ticket?)</li>"}</ul>
    </div>
    <div class="cv-skills">
      <b>Real-world knowledge (from debriefs &amp; reflection questions):</b>
      <ul>${learn.skillSummary().filter((x) => x.count > 0).map((x) => `<li>${x.label} — ${x.level}</li>`).join("") || "<li>(solve a ticket and read the debrief)</li>"}</ul>
    </div>
    <div id="ach-panel"></div>`;
  achRender();
  document.getElementById("stats-overlay").classList.remove("hidden");
}

function cvBuild() {
  const s = careerStats();
  const rank = RANKS[rankIndex()];
  const certs = [];
  if (state.quiz.aplus) certs.push("CompTIA A+ (in-game, virtual)");
  const lines = [
    "════════════════════════════════════════════",
    `  ${(state.player.name || "Player").toUpperCase()}`,
    "  TicketQuest — simulated IT practice @ PIXL Corp",
    "════════════════════════════════════════════",
    "",
    `POSITION: ${rankTitle()} (in-game)`,
    `Duration: ${Math.max(1, Math.ceil((Date.now() - (state.stats.startedAt || Date.now())) / 86400000))} days in the simulated company`,
    "",
    "EXPERIENCE:",
    `· Tickets resolved: ${s.resolvedCount} (average ${s.avgMin} min/ticket)`,
    `· On-time SLA (T1): ${s.slaPct}%`,
    `· Escalations: ${s.esc} — correctly judged limits of responsibility`,
    `· Resolution notes: ${s.notes} — documentation was part of every fix`,
    s.doris ? `· Recurring incidents (Doris ×${s.doris}) — pattern recognition 😉` : "",
    "",
    "SKILLS:",
    ...skillsList().map((x) => `· ${x}`),
    "",
    certs.length ? `CERTIFICATIONS:\n· ${certs.join("\n· ")}` : "",
    "",
    "This CV was generated in the game TicketQuest — simulated practice, not real employment.",
  ].filter((l) => l !== null && l !== undefined);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function cvDownload() {
  const text = cvBuild();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `CV_${(state.player.name || "player").replace(/\s+/g, "_")}_TicketQuest.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("📄 CV downloaded! (It really works — try opening it.)", "t-ok");
}
