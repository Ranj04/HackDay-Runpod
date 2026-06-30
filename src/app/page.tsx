import { ArrowRight, Crosshair, ScanLine } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { HeroShowcase } from "@/components/overlay";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="relative isolate flex flex-1 overflow-hidden">
      <div className="hero-glow absolute inset-0 -z-10" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <section>
          <Badge
            variant="outline"
            className="h-7 border-white/10 bg-white/5 px-3 backdrop-blur"
          >
            Basketball form coach
          </Badge>
          <h1 className="mt-7 max-w-3xl text-6xl font-semibold leading-[0.95] tracking-[-0.065em] sm:text-7xl">
            See the shot
            <br />
            <span className="text-[#5aa0ff]">you can’t feel.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
            Ghost turns one video into measured mechanics, a visual reference,
            and one cited drill to fix what matters most.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              className={cn(
                buttonVariants(),
                "h-12 rounded-full bg-[#2e86ff] px-6 font-medium text-[#04080f] hover:bg-[#1e6fe0]",
              )}
              href="/capture"
            >
              Analyze your shot
              <ArrowRight className="size-4" />
            </Link>
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-12 rounded-full bg-white/5 px-6",
              )}
              href="/results"
            >
              View sample
            </Link>
          </div>
          <div className="mt-11 flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <span className="flex items-center gap-2">
              <ScanLine className="size-4 text-[#5aa0ff]" />
              Pose tracked
            </span>
            <span className="flex items-center gap-2">
              <Crosshair className="size-4 text-[#5aa0ff]" />
              Reference aligned
            </span>
          </div>
        </section>

        <HeroShowcase />
      </div>
    </main>
  );
}
