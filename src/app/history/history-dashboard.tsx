"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ProgressView } from "@/components/results";
import {
  isSupabaseConfigured,
  loadSessions,
  type EchoSession,
  type PersistenceMode,
} from "@/lib/db";
import { loadSessionsAction } from "@/lib/db/server";
import { SPORTS, type SportId } from "@/lib/sports";
import { cn } from "@/lib/utils";

import { signOut } from "../auth/actions";

interface HistoryState {
  sessions: EchoSession[];
  mode: PersistenceMode;
  userEmail?: string;
}

export function HistoryDashboard({ sport }: { sport: SportId }) {
  const [state, setState] = useState<HistoryState>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    // Saved sessions predate multi-sport support and have no sport column. Do
    // not present basketball records as pitches until the schema can identify
    // them truthfully.
    if (sport === "baseball") return;

    let active = true;

    // Supabase auth lives in cookies the browser SDK can't refresh on a cold
    // load, so read account history through a Server Action. Local-demo mode
    // (no Supabase) still loads from localStorage on the client.
    const load = isSupabaseConfigured() ? loadSessionsAction() : loadSessions();

    load
      .then((result) => {
        if (active) {
          setError(undefined);
          setState(result);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Could not load history.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [sport]);

  const accountControls =
    sport === "basketball" && state?.userEmail ? (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>{state.userEmail}</span>
        <form action={signOut}>
          <button className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <LogOut className="size-3.5" />
            Sign out
          </button>
        </form>
      </div>
    ) : null;

  if (sport === "baseball") {
    return (
      <HistoryFrame accountControls={accountControls} sport={sport}>
        <EmptyState
          body="Record a pitch to start your delivery history."
          href="/capture?sport=baseball"
          linkLabel="Record a pitch"
          title="No saved pitches yet."
        />
      </HistoryFrame>
    );
  }

  if (error) {
    return (
      <HistoryFrame accountControls={accountControls} sport={sport}>
        <EmptyState
          body={error}
          href="/results"
          linkLabel="Return to results"
          title="History could not load."
        />
      </HistoryFrame>
    );
  }

  if (!state) {
    return (
      <HistoryFrame accountControls={accountControls} sport={sport}>
        <div className="grid min-h-96 place-items-center border-b border-border text-muted-foreground">
          <LoaderCircle
            className="size-7 animate-spin"
            aria-label="Loading history"
          />
        </div>
      </HistoryFrame>
    );
  }

  if (state.mode === "supabase" && !state.userEmail) {
    return (
      <HistoryFrame accountControls={accountControls} sport={sport}>
        <EmptyState
          body="Sign in to load your saved Supabase sessions and progress."
          href="/auth?next=/history"
          linkLabel="Sign in"
          title="Your history is account-backed."
        />
      </HistoryFrame>
    );
  }

  if (state.sessions.length === 0) {
    return (
      <HistoryFrame accountControls={accountControls} sport={sport}>
        <EmptyState
          body="Record a shot to start your form history."
          href="/capture"
          linkLabel="Record a shot"
          title="No saved shots yet."
        />
      </HistoryFrame>
    );
  }

  return (
    <HistoryFrame accountControls={accountControls} sport={sport}>
      <ProgressView sessions={state.sessions} mode={state.mode} />
    </HistoryFrame>
  );
}

function HistoryFrame({
  accountControls,
  children,
  sport,
}: {
  accountControls: React.ReactNode;
  children: React.ReactNode;
  sport: SportId;
}) {
  return (
    <div>
      <div className="mb-10 flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <nav
          aria-label="Choose progress sport"
          className="grid w-fit grid-cols-2 overflow-hidden rounded-lg border border-border bg-background p-1"
        >
          {(["basketball", "baseball"] as const).map((id) => (
            <Link
              aria-current={sport === id ? "page" : undefined}
              className={cn(
                "min-w-28 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                sport === id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              href={id === "basketball" ? "/history" : "/history?sport=baseball"}
              key={id}
            >
              {SPORTS[id].label}
            </Link>
          ))}
        </nav>
        {accountControls}
      </div>
      {children}
    </div>
  );
}

function EmptyState({
  title,
  body,
  href,
  linkLabel,
}: {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <section className="min-h-[30rem] border-b border-border pb-20 pt-2 sm:pt-6">
      <h1 className="text-5xl font-semibold tracking-[-0.055em] sm:text-6xl">
        Progress
      </h1>
      <div className="mt-12 max-w-2xl border-t border-border pt-10 sm:mt-16 sm:pt-12">
        <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
          {body}
        </p>
        <Link
          className={cn(
            buttonVariants(),
            "mt-8 h-11 rounded-lg bg-accent-brand px-5 font-medium text-accent-brand-foreground hover:bg-accent-brand/90",
          )}
          href={href}
        >
          {linkLabel}
        </Link>
      </div>
    </section>
  );
}
