import { createBrowserClient } from "@insforge/sdk/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function isInsForgeConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_INSFORGE_URL &&
      process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  );
}

export function getBrowserInsForge() {
  if (!isInsForgeConfigured()) {
    return null;
  }

  browserClient ??= createBrowserClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  });

  return browserClient;
}
