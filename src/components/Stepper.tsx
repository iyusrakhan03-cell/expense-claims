"use client";

import { Ban, Check, CircleAlert, Pause } from "lucide-react";
import type { TKey } from "@/lib/i18n";
import { requiresOps } from "@/lib/rules";
import type { Approval, Claim } from "@/lib/types";
import { useApp } from "./AppProvider";

type StepState = "done" | "current" | "upcoming" | "skipped" | "attention" | "hold" | "rejected";

interface Step {
  key: TKey;
  state: StepState;
  approval?: Approval;
}

export function buildSteps(c: Claim): Step[] {
  const base: { key: TKey; done: boolean; skipped?: boolean; approval?: Approval }[] = [
    { key: "step.submitted", done: c.status !== "needs_clarification" },
    { key: "step.pm", done: !!c.approvals.pm, approval: c.approvals.pm },
    { key: "step.ops", done: !!c.approvals.ops, skipped: !requiresOps(c) && !c.approvals.ops, approval: c.approvals.ops },
    { key: "step.finance", done: !!c.approvals.finance, approval: c.approvals.finance },
    { key: "step.paid", done: !!c.approvals.payment, approval: c.approvals.payment },
  ];
  let currentFound = false;
  return base.map((s, i) => {
    if (s.skipped) return { key: s.key, state: "skipped" };
    if (s.done) return { key: s.key, state: "done", approval: s.approval };
    if (currentFound) return { key: s.key, state: "upcoming" };
    currentFound = true;
    if (i === 0) return { key: s.key, state: "attention" };
    if (c.status === "on_hold") return { key: s.key, state: "hold" };
    if (c.status === "rejected") return { key: s.key, state: "rejected" };
    return { key: s.key, state: "current" };
  });
}

const DOT: Record<StepState, string> = {
  done: "bg-emerald-600 text-white border-emerald-600",
  current: "bg-white text-accent-700 border-accent-700 ring-4 ring-accent-100",
  upcoming: "bg-white text-slate-300 border-slate-300",
  skipped: "bg-slate-50 text-slate-300 border-dashed border-slate-300",
  attention: "bg-amber-500 text-white border-amber-500 ring-4 ring-amber-100",
  hold: "bg-slate-500 text-white border-slate-500",
  rejected: "bg-rose-600 text-white border-rose-600",
};

export function Stepper({ claim, compact = false }: { claim: Claim; compact?: boolean }) {
  const { t, name, date } = useApp();
  const steps = buildSteps(claim);

  return (
    <ol className="flex w-full items-start" aria-label={t("section.approvals")}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const icon =
          s.state === "done" ? (
            <Check className="h-3.5 w-3.5" />
          ) : s.state === "attention" ? (
            <CircleAlert className="h-3.5 w-3.5" />
          ) : s.state === "hold" ? (
            <Pause className="h-3.5 w-3.5" />
          ) : s.state === "rejected" ? (
            <Ban className="h-3.5 w-3.5" />
          ) : (
            <span className="ltr-num text-[11px] font-bold">{i + 1}</span>
          );
        const sub =
          s.state === "skipped"
            ? t("step.notNeeded")
            : s.state === "attention"
              ? t("status.needs_clarification")
              : s.state === "hold"
                ? t("status.on_hold")
                : s.state === "rejected"
                  ? t("status.rejected")
                  : s.approval && !compact
                    ? `${name(s.approval.by)} · ${date(s.approval.at, true)}`
                    : "";
        return (
          <li key={s.key} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
            {!last && (
              <span
                className={`absolute top-3.5 h-0.5 ${s.state === "done" ? "bg-emerald-500" : "bg-slate-200"}`}
                style={{ insetInlineStart: "calc(50% + 16px)", insetInlineEnd: "calc(-50% + 16px)" }}
                aria-hidden
              />
            )}
            <span className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 ${DOT[s.state]}`}>{icon}</span>
            {!compact && (
              <>
                <span
                  className={`mt-2 max-w-full break-words px-0.5 text-[11px] font-semibold leading-tight sm:text-xs ${
                    s.state === "upcoming" || s.state === "skipped" ? "text-slate-400" : "text-slate-800"
                  }`}
                >
                  {t(s.key)}
                </span>
                {sub && <span className="mt-0.5 max-w-full break-words px-0.5 text-[11px] leading-tight text-slate-500">{sub}</span>}
              </>
            )}
            {compact && <span className="sr-only">{t(s.key)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
