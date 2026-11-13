/* ===== TicketQuest — SLA časovače ===== */

function startSla(t) {
  if (state.chill || !t.slaMin) return;
  state.deadlines[t.id] = Date.now() + t.slaMin * 60 * 1000;
  saveGame();
}

function slaRemaining(t) {
  const d = state.deadlines[t.id];
  if (!d || state.chill) return null;
  return d - Date.now();
}

function slaOverdue(t) {
  const r = slaRemaining(t);
  return r !== null && r < 0;
}

function fmtSla(t) {
  const r = slaRemaining(t);
  if (r === null) return "";
  if (r < 0) return "⏰ OVER SLA";
  const m = Math.floor(r / 60000);
  const s = Math.floor((r % 60000) / 1000);
  return `⏱ ${m}:${String(s).padStart(2, "0")}`;
}
