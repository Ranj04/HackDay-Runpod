import type { Metadata } from "next";
import { Suspense } from "react";
import { Saira, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { ProductHeader } from "@/components/product-header";

import { AuthNav } from "./auth/auth-nav";

// Distinctive trio: Saira (technical athletic display) for headers + stat
// numbers, Hanken Grotesk (warm humanist) for prose, JetBrains Mono for every
// measured number — the "instrument readout".
const saira = Saira({ subsets: ["latin"], variable: "--font-saira", display: "swap" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Echo — AI Sports Form Coach",
    template: "%s · Echo",
  },
  description:
    "One video. One fix. Compare basketball, baseball, and football mechanics with an Echo reference and train the correction that matters next.",
};

function HeaderFallback() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex min-h-18 w-full max-w-[1536px] items-center px-5 sm:px-8">
        <span className="font-heading text-2xl font-bold uppercase tracking-[-0.04em]">
          Echo
        </span>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark h-full antialiased ${saira.variable} ${hanken.variable} ${jetbrains.variable}`}>
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-screen flex-col">
          <Suspense fallback={<HeaderFallback />}>
            <ProductHeader authSlot={<AuthNav />} />
          </Suspense>
          {children}
        </div>
      </body>
    </html>
  );
}
