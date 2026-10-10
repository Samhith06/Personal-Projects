"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { wagerLeaderboardApi, ActiveRace, RaceType } from "@/lib/api/wagerLeaderboard";
import { formatLondon } from "@/lib/londonTime";

/**
 * Warns when a wager race needs attention.
 *
 * The weekly race used to roll itself over every Monday. It doesn't any more —
 * races are created by hand so nothing overwrites an admin's schedule — which
 * introduces a failure mode that is otherwise silent: a race ends, no successor
 * exists, and the public leaderboard quietly shows "no race is running" until
 * someone notices. This surfaces both that state and the run-up to it.
 *
 * Reads the public /active endpoint, so it needs no admin token of its own.
 */

const WARN_WITHIN_MS = 24 * 60 * 60 * 1000;

type Status =
  | { type: RaceType; kind: "missing" }
  | { type: RaceType; kind: "ending"; endDate: string; msLeft: number };

function label(t: RaceType) {
  return t === "WEEKLY" ? "Weekly" : "Monthly";
}

function humanise(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export default function RaceStatusBanner() {
  const [issues, setIssues] = useState<Status[]>([]);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const types: RaceType[] = ["WEEKLY", "MONTHLY"];
      const found: Status[] = [];

      for (const type of types) {
        let race: ActiveRace | null = null;
        try {
          race = await wagerLeaderboardApi.getActive(type);
        } catch {
          return; // a transient fetch failure shouldn't flash a scary banner
        }

        if (!race) {
          found.push({ type, kind: "missing" });
          continue;
        }
        const msLeft = new Date(race.endDate).getTime() - Date.now();
        if (msLeft <= 0) {
          found.push({ type, kind: "missing" });
        } else if (msLeft <= WARN_WITHIN_MS) {
          found.push({ type, kind: "ending", endDate: race.endDate, msLeft });
        }
      }

      if (!cancelled) setIssues(found);
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (issues.length === 0) return null;

  return (
    <div className="space-y-2">
      {issues.map((issue) => {
        const missing = issue.kind === "missing";
        return (
          <div
            key={issue.type}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
              missing
                ? "bg-red-500/10 border-red-500/25 text-red-300"
                : "bg-amber-500/10 border-amber-500/25 text-amber-300"
            }`}
          >
            {missing ? (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <div className="min-w-0 flex-1 text-sm">
              {missing ? (
                <>
                  <span className="font-semibold">
                    No {label(issue.type).toLowerCase()} race is running.
                  </span>{" "}
                  The public leaderboard is showing an empty {label(issue.type).toLowerCase()} tab.
                </>
              ) : (
                <>
                  <span className="font-semibold">
                    {label(issue.type)} race ends in {humanise(issue.msLeft)}
                  </span>{" "}
                  ({formatLondon(issue.endDate)}). Create the next one so there&apos;s no gap.
                </>
              )}
            </div>
            <a
              href="/admin/leaderboards"
              className="shrink-0 text-xs font-semibold underline underline-offset-2 hover:opacity-80 mt-0.5"
            >
              Manage races
            </a>
          </div>
        );
      })}
    </div>
  );
}
