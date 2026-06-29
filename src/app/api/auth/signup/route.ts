import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/automations/admin-client";

// ============================================================
// POST /api/auth/signup
//
// Creates a new user *server-side* using the service-role key
// with `email_confirm: true`, so Supabase never sends a
// confirmation email. This sidesteps the hosted SMTP rate limit
// ("email rate limit exceeded") entirely — the user is created
// already confirmed and can sign in immediately.
//
// The `handle_new_user` trigger on auth.users still fires on
// insert, so the personal account + profile (with full_name from
// user_metadata) are provisioned exactly as with the client-side
// signUp() flow.
// ============================================================

export async function POST(request: Request) {
  let body: { email?: string; password?: string; fullName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const fullName = body.fullName?.trim() ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    // Surface a friendly message for the common "already exists" case.
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 },
      );
    }
    console.error("[api/auth/signup] createUser error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
