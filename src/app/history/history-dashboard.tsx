"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressView } from "@/components/results";
import {
  isInsForgeConfigured,
  loadSessions,
  type GhostSession,
  type PersistenceMode,
} from "@/lib/db";
import { loadSessionsAction } from "@/lib/db/server";
import { cn } from "@/lib/utils";

import { signOut } from "../auth/actions";

interface HistoryState {
  sessions: GhostSession[];
  mode: PersistenceMode;
  userEmail?: string;
}

export function HistoryDashboard() {
  const [state, setState] = useState<HistoryState>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;

    // InsForge auth lives in cookies the browser SDK can't refresh on a cold
    // load, so read account history through a Server Action. Local-demo mode
    // (no InsForge) still loads from localStorage on the client.
    const load = isInsForgeConfigured() ? loadSessionsAction() : loadSessions();

    load
      .then((result) => {
        if (active) setState(result);
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
  }, []);

  if (error) {
    return (
      <EmptyState
        body={error}
        href="/results"
        linkLabel="Return to results"
        title="History could not load."
      />
    );
  }

  if (!state) {
    return (
      <div className="grid min-h-96 place-items-center text-muted-foreground">
        <LoaderCircle className="size-7 animate-spin" aria-label="Loading history" />
      </div>
    );
  }

  if (state.mode === "insforge" && !state.userEmail) {
    return (
      <EmptyState
        body="Sign in to load your saved InsForge sessions and progress."
        href="/auth?next=/history"
        linkLabel="Sign in"
        title="Your history is account-backed."
      />
    );
  }

  if (state.sessions.length === 0) {
    return (
      <EmptyState
        body="Film a shot and save the analysis to start your score trend."
        href="/capture"
        linkLabel="Record your first shot"
        title="No sessions yet."
      />
    );
  }

  return (
    <>
      {state.userEmail && (
        <div className="mb-5 flex items-center justify-end gap-3 text-xs text-muted-foreground">
          <span>{state.userEmail}</span>
          <form action={signOut}>
            <button className="inline-flex items-center gap-1.5 hover:text-foreground">
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </form>
        </div>
      )}
      <ProgressView sessions={state.sessions} mode={state.mode} />
    </>
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
    <Card className="mx-auto mt-14 w-full max-w-2xl border-0 py-12 text-center ring-white/10">
      <CardContent className="flex flex-col items-center">
        <p className="eyebrow">Progress history</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
          {title}
        </h1>
        <p className="mt-3 max-w-md leading-7 text-muted-foreground">{body}</p>
        <Link
          className={cn(buttonVariants(), "mt-7 h-11 px-5")}
          href={href}
        >
          {linkLabel}
        </Link>
      </CardContent>
    </Card>
  );
}
