/* ===== TicketQuest — in-game certifications (A+ quiz) ===== */

const APLUS_QUIZ = {
  id: "aplus",
  title: "🎓 In-game certification: CompTIA A+ (virtual)",
  passScore: 7,
  questions: [
    {
      q: "Which type of memory is completely erased when the computer powers off?",
      a: ["RAM", "SSD drive", "HDD drive"],
      correct: 0,
    },
    {
      q: "A PC has the IP address 169.254.31.44. What does that mean?",
      a: ["The server didn't get an address from DHCP (APIPA)", "The PC has a public IP", "The network works correctly"],
      correct: 0,
    },
    {
      q: "Which Windows command shows the network configuration?",
      a: ["ipconfig", "netstat -h", "dir /net"],
      correct: 0,
    },
    {
      q: "The 'Print Spooler' service is responsible for:",
      a: ["print queues and printing", "the DNS cache", "automatic backups"],
      correct: 0,
    },
    {
      q: "Port 443 is typically used for:",
      a: ["HTTPS", "SSH", "SMTP"],
      correct: 0,
    },
    {
      q: "The most secure way to protect an account is:",
      a: ["Multi-factor authentication (MFA)", "a very long password without MFA", "no password at all"],
      correct: 0,
    },
    {
      q: "Event ID 4625 in the Windows security log means:",
      a: ["A failed logon", "A clean shutdown", "A hardware error"],
      correct: 0,
    },
    {
      q: "The NTFS permission 'Read' allows a user to:",
      a: ["read files, but not modify them", "modify files too", "delete files"],
      correct: 0,
    },
    {
      q: "Keyboard shortcut to lock the screen in Windows:",
      a: ["Win + L", "Ctrl + Alt + P", "Alt + F4"],
      correct: 0,
    },
    {
      q: "'Social engineering' is:",
      a: ["tricking people into giving up data (e.g. phishing)", "configuring a firewall", "disk encryption"],
      correct: 0,
    },
  ],
};

const quizState = { i: 0, score: 0, active: null, picked: null, order: [] };


function quizOpen(key) {
  const def = APLUS_QUIZ;
  quizState.active = def;
  quizState.i = 0;
  quizState.score = 0;
  document.getElementById("quiz-title").textContent = def.title;
  document.getElementById("quiz-result").classList.add("hidden");
  document.getElementById("quiz-body").classList.remove("hidden");
  document.getElementById("quiz-overlay").classList.remove("hidden");
  quizShow();
}

function quizShow() {
  const def = quizState.active;
  const q = def.questions[quizState.i];
  document.getElementById("quiz-q").textContent = `Question ${quizState.i + 1}/${def.questions.length}: ${q.q}`;
  const box = document.getElementById("quiz-answers");
  box.innerHTML = "";
  quizState.order = shuffleIdx(q.a.length);      // order[pozícia] = pôvodný index odpovede
  quizState.order.forEach((orig) => {
    const b = document.createElement("button");
    b.className = "quiz-answer";
    b.textContent = q.a[orig];
    b.dataset.orig = String(orig);
    b.onclick = () => quizPick(orig, b);
    box.appendChild(b);
  });
  document.getElementById("quiz-next").disabled = true;
}

function quizPick(i, btn) {
  const def = quizState.active;
  const q = def.questions[quizState.i];
  document.querySelectorAll(".quiz-answer").forEach((b) => (b.disabled = true));
  if (i === q.correct) {
    btn.classList.add("correct");
    quizState.score++;
  } else {
    btn.classList.add("wrong");
    document.querySelectorAll(".quiz-answer").forEach((b) => { if (Number(b.dataset.orig) === q.correct) b.classList.add("correct"); });
  }
  document.getElementById("quiz-next").disabled = false;
}

function quizNext() {
  const def = quizState.active;
  quizState.i++;
  if (quizState.i >= def.questions.length) { quizFinish(); return; }
  quizShow();
}

function quizFinish() {
  const def = quizState.active;
  const passed = quizState.score >= def.passScore;
  document.getElementById("quiz-body").classList.add("hidden");
  const res = document.getElementById("quiz-result");
  res.classList.remove("hidden");
  res.innerHTML = passed
    ? `<h3>✅ PASSED — ${quizState.score}/${def.questions.length}</h3>
       <p>Congratulations! The <b>${def.title.replace("🎓 In-game certification: ", "")}</b>
       (virtual) certificate is yours. Mr. Pixel noticed...</p>`
    : `<h3>❌ FAILED — ${quizState.score}/${def.questions.length}</h3>
       <p>You need at least ${def.passScore}/10. Nobody's taking your nerves hostage — in real life
       people pass certifications on the third attempt too. You can try again.</p>`;
  const btn = document.createElement("button");
  btn.className = "btn-primary";
  btn.textContent = passed ? "CLAIM CERTIFICATE" : "TRY AGAIN";
  btn.onclick = () => {
    document.getElementById("quiz-overlay").classList.add("hidden");
    if (passed) {
      state.quiz[def.id] = true;
      saveGame();
      onQuizPassed(def.id);
    } else {
      quizOpen(def.id);
    }
  };
  res.appendChild(btn);
}

document.getElementById("quiz-next").addEventListener("click", quizNext);
