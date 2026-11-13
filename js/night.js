/* ===== TicketQuest — interactive night mystery (mini terminal) ===== */

const night = (() => {
  const overlay = document.getElementById("night-overlay");
  const out = document.getElementById("night-out");
  const input = document.getElementById("night-input");
  let cb = null;

  function print(text, cls = "") {
    const d = document.createElement("div");
    d.className = "n-line " + cls;
    d.innerHTML = text;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }

  function open(done) {
    cb = done;
    out.innerHTML = "";
    overlay.classList.remove("hidden");
    print("--- SRV-DC01 — night session (9:43 PM) ---", "n-title");
    print("Nobody checks this. Nobody knows you're here.", "n-dim");
    print("Type <b>help</b> and let's go.", "n-dim");
    print("");
    input.focus();
  }

  function run(raw) {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = (parts[1] || "").toLowerCase();

    switch (cmd) {
      case "help":
        print("Available: audit doris | read keeper.ps1 | trace keeper | go-home", "n-dim");
        break;
      case "audit":
        if (arg !== "doris") { print("Usage: audit doris", "n-err"); break; }
        print("=== AUDIT: account doris ===", "n-warn");
        print("4740  Account locked  user=doris");
        print("      initiator: SRV-DC01$ (SYSTEM — a scheduled task!)");
        print("      script: C:\\Windows\\Tasks\\keeper.ps1");
        print("It happened 3× this week. Always at 11:00 PM. Always from this server.", "n-warn");
        break;
      case "read":
      case "type":
        if (arg !== "keeper.ps1") { print("File doesn't exist. (Hint: 'read keeper.ps1')", "n-err"); break; }
        print("=== keeper.ps1 ===", "n-warn");
        print("# Nightly account hygiene");
        print("# do not remove. -k");
        print("net user doris /active:no");
        print("# tomorrow: petra.nova?");
        print("", "");
        print("'do not remove. -k' ... Who is K?", "n-thought");
        print("And why is Petra — the new employee — on the list too?", "n-thought");
        state.story.nightEvidence = true;
        saveGame();
        break;
      case "trace":
        print("=== TRACE: task keeper.ps1 ===", "n-warn");
        print("Registered: 2/14/2026 2:31 AM");
        print("By user:     (account was deleted)");
        print("Last run:    yesterday 11:00 PM — SUCCESS", "n-err");
        break;
      case "go-home":
      case "exit":
        print("You turn off the monitor. You'll hand this to Zora tomorrow.", "n-dim");
        print("[NIGHT OVER]", "n-warn");
        SFX.click();
        setTimeout(() => {
          overlay.classList.add("hidden");
          if (cb) cb();
        }, 900);
        break;
      default:
        print(`'${escHtml(cmd)}' — at night only the essentials work. Try 'help'.`, "n-err");
    }
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const v = input.value;
      print(`<span class="n-prompt">night&gt;</span> ${v.replace(/</g, "&lt;")}`, "n-echo");
      input.value = "";
      run(v);
    }
  });

  return { open };
})();
