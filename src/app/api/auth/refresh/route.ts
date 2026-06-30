import { refreshAuth } from "@insforge/sdk/ssr";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (
    !process.env.NEXT_PUBLIC_INSFORGE_URL ||
    !process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  ) {
    return NextResponse.json(
      { error: "InsForge is not configured." },
      { status: 503 },
    );
  }

  const result = await refreshAuth({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    request,
  });

  return result.response;
}
