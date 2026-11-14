// Records the REAL client IP server-side. The browser cannot choose or fake it.
// Deploy: supabase functions deploy log-login
// Secrets: supabase secrets set ALLOWED_ORIGIN=https://sebomsk.github.io
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://sebomsk.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /i, "");
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // injected by Supabase, never in client code
  );

  // Verify the caller really is a logged-in user.
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return new Response("Unauthorized", { status: 401, headers: cors });

  let body: { event?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const event = body.event === "signup" ? "signup" : "login";

  const ip = (req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim().slice(0, 45) || null;
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 200) || null;

  const { error: insErr } = await admin.from("login_events").insert({
    user_id: data.user.id, email: data.user.email ?? "", ip, event, user_agent: ua,
  });
  if (insErr) return new Response("Log failed", { status: 500, headers: cors });
  return new Response("ok", { headers: cors });
});
