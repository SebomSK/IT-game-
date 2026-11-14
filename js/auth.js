// ===== TICKETQUEST AUTH (Supabase) =====
// Passwords are handled and hashed by Supabase Auth; this code never stores them.
// IP is logged server-side by the log-login Edge Function, not by the browser.
(function () {
  "use strict";
  const cfg = window.TQ_CONFIG || {};
  const configured = window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !/YOUR_/.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY);
  const sb = configured
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY,
        { auth: { persistSession: true, autoRefreshToken: true } })
    : null;

  const $ = (id) => document.getElementById(id);
  const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}$/;

  function msg(text) {
    const el = $("auth-status");
    if (el) el.textContent = text;
  }

  function render(session) {
    const loggedIn = !!session;
    const form = $("auth-form"), who = $("auth-who"), clock = $("btn-clockin");
    if (form) form.classList.toggle("hidden", loggedIn);
    if (who) {
      who.classList.toggle("hidden", !loggedIn);
      $("auth-user").textContent = loggedIn ? session.user.email : "";
    }
    if (clock) clock.disabled = !loggedIn;
  }

  async function logEvent(session, event) {
    try {
      await fetch(cfg.SUPABASE_URL + "/functions/v1/log-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + session.access_token,
          "apikey": cfg.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ event })
      });
    } catch (e) { /* logging must never block play */ }
  }

  function readForm() {
    const email = ($("auth-email").value || "").trim();
    const password = $("auth-pass").value || "";
    if (!EMAIL_RE.test(email)) { msg("Enter a valid email."); return null; }
    if (password.length < 8) { msg("Password must be at least 8 characters."); return null; }
    return { email, password };
  }

  async function signup() {
    const f = readForm(); if (!f) return;
    msg("Creating account…");
    const { data, error } = await sb.auth.signUp(f);
    if (error) return msg(error.message);
    if (data.session) { await logEvent(data.session, "signup"); render(data.session); msg(""); }
    else msg("Account created. Check your email to confirm, then log in.");
  }

  async function login() {
    const f = readForm(); if (!f) return;
    msg("Logging in…");
    const { data, error } = await sb.auth.signInWithPassword(f);
    if (error) return msg("Login failed: " + error.message);
    await logEvent(data.session, "login");
    $("auth-pass").value = "";
    render(data.session); msg("");
  }

  async function reset() {
    const email = ($("auth-email").value || "").trim();
    if (!EMAIL_RE.test(email)) return msg("Enter your email first.");
    await sb.auth.resetPasswordForEmail(email); // Supabase emails a reset link
    msg("If that account exists, a reset link was sent.");
  }

  async function logout() { await sb.auth.signOut(); render(null); }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!sb) {
      // Not configured (e.g. offline/dev): leave the game playable without accounts.
      const box = $("auth-box"); if (box) box.classList.add("hidden");
      return;
    }
    $("btn-signup").addEventListener("click", signup);
    $("btn-login").addEventListener("click", login);
    $("btn-reset").addEventListener("click", reset);
    $("btn-logout").addEventListener("click", logout);
    const { data } = await sb.auth.getSession();
    render(data.session);
    sb.auth.onAuthStateChange((_e, session) => render(session));
  });
})();
