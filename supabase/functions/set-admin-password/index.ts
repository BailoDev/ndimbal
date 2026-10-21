// Edge function: set-admin-password
// One-time bootstrap tool for the super admin. Accepts a recovery token and
// a new password, verifies the token against auth.users via the database
// connection, then sets the password using Supabase's admin API.
import { createClient } from "jsr:@supabase/supabase-js@2";
import postgres from "npm:postgres@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let recoveryToken = "";
  let newPassword = "";

  try {
    const body = await req.json();
    recoveryToken = body.recovery_token ?? "";
    newPassword = body.new_password ?? "";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!recoveryToken || !newPassword) {
    return new Response(JSON.stringify({ error: "Missing recovery_token or new_password" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (newPassword.length < 6) {
    return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;

  // Query auth.users directly via the database connection
  const sql = postgres(dbUrl);
  let userId = "";
  let userEmail = "";

  try {
    const rows = await sql`
      SELECT id, email FROM auth.users
      WHERE recovery_token = ${recoveryToken}
      AND recovery_token != ''
    `;
    if (rows.length === 0) {
      await sql.end();
      return new Response(JSON.stringify({ error: "Invalid or expired recovery token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = rows[0].id;
    userEmail = rows[0].email;
  } catch {
    await sql.end();
    return new Response(JSON.stringify({ error: "Database lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update the password via Supabase admin API
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (updateError) {
    await sql.end();
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Clear the recovery token (single-use) and update timestamp
  await sql`
    UPDATE auth.users
    SET recovery_token = '', updated_at = now()
    WHERE id = ${userId}
  `;
  await sql.end();

  return new Response(
    JSON.stringify({ success: true, email: userEmail }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
