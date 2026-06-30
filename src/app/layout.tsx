import type { Metadata } from "next";
import { Saira, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { AuthNav } from "./auth/auth-nav";

// Distinctive trio: Saira (technical athletic display) for headers + stat
// numbers, Hanken Grotesk (warm humanist) for prose, JetBrains Mono for every
// measured number — the "instrument readout".
const saira = Saira({ subsets: ["latin"], variable: "--font-saira", display: "swap" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Ghost — AI Basketball Form Coach",
    template: "%s · Ghost",
  },
  description:
    "Measure your basketball mechanics, compare your motion with a ghost reference, and get one cited drill to improve.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark h-full antialiased ${saira.variable} ${hanken.variable} ${jetbrains.variable}`}>
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-white/10 bg-[#080c14]/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
              <Link
                href="/"
                className="flex items-center gap-2 font-heading text-lg font-semibold tracking-[-0.02em]"
              >
                <span className="grid size-7 place-items-center rounded-full bg-[#2e86ff] text-[#04080f] shadow-[0_0_16px_rgba(46,134,255,0.5)]">
                  G
                </span>
                GHOST
              </Link>
              <nav className="flex items-center gap-1 text-sm" aria-label="Primary navigation">
                <Link
                  href="/capture"
                  className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                >
                  Analyze
                </Link>
                <Link
                  href="/history"
                  className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                >
                  History
                </Link>
                <Link
                  href="/battle"
                  className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                >
                  Battle
                </Link>
                <AuthNav />
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
