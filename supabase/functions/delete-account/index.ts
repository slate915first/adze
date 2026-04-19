// delete-account · Adze
// Hard-deletes the calling user's account end-to-end:
//   1. Removes the user's email from public.beta_allowlist (Art. 17 — without
//      this, deleted users would remain in the closed-beta invite list).
//   2. Deletes the auth.users row. The user_state row cascades via the
//      ON DELETE CASCADE foreign key, so the user's encrypted practice
//      data is removed in the same transaction.
//
// Order matters: allowlist delete first, then the auth delete. Reading the
// email AFTER auth.admin.deleteUser would race with the deletion. If the
// allowlist delete fails, we abort BEFORE deleting the auth user — better
// to return a visible error than to half-delete and silently leak data.
//
// Requires the caller to present a valid JWT (verify_jwt: true). We then
// derive the user id and email from the JWT and use the service role to
// actually delete — never trust user-supplied identifiers.
//
// SOURCE OF TRUTH: this file is committed to the repo for audit trail and
// disaster recovery. To change the live function, edit here AND deploy via
// `supabase functions deploy delete-account` (or the Supabase MCP).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://adze.life",
  "https://adze.cloudflare-adze-gotten828.workers.dev",
  "http://localhost:8000",
];

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "https://adze.life";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing Authorization header" }, 401, origin);
  }

  // 1) Resolve the user from their own JWT (anon-key client + their token).
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: "Not authenticated" }, 401, origin);
  }
  const userId = userData.user.id;
  const userEmail = userData.user.email; // may be undefined for non-email providers

  // 2) Service-role client for privileged operations.
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // 3) Remove the user's email from the closed-beta allowlist FIRST.
  //    Art. 17 right to erasure: if we left the email behind, a deleted
  //    user would still appear on the invite list. Skip cleanly if the
  //    user has no email (edge case for non-email auth providers).
  if (userEmail) {
    const normalizedEmail = userEmail.toLowerCase().trim();
    const { error: allowlistErr } = await adminClient
      .from("beta_allowlist")
      .delete()
      .eq("email", normalizedEmail);
    if (allowlistErr) {
      // Abort BEFORE the auth delete — better a visible failure than a
      // half-deleted account that silently leaks the email.
      return json(
        { error: "Could not clean allowlist entry: " + allowlistErr.message },
        500,
        origin,
      );
    }
  }

  // 4) Delete the auth row. user_state cascades via the FK.
  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return json({ error: "Could not delete account: " + deleteErr.message }, 500, origin);
  }

  return json({ success: true, deletedUserId: userId }, 200, origin);
});
