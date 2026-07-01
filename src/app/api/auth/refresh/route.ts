import { NextResponse } from "next/server";

// Session refresh is handled by the Supabase middleware (src/proxy.ts). This
// endpoint remains for backward compatibility and is a no-op.
export async function POST() {
  return NextResponse.json({ ok: true });
}
