"use client";

import { Ban, Banknote, CircleCheck, Clock } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Card, ClaimLink, PageHeader, ProjectName, Reasons, Stat, StatusBadge } from "@/components/ui";
import { PROJECTS } from "@/lib/reference";
import { effectiveCurrency, triage } from "@/lib/rules";
import type { Claim, Status, Triage } from "@/lib/types";
import { statusGroup, visibleClaims, type StatusGroup } from "@/lib/workflow";

const PENDING_STEPS: Status[] = ["needs_clarification", "pm_review", "ops_review", "finance_review", "on_hold"];
const TRIAGES: Triage[] = ["forward", "clarify", "investigate"];
const TRIAGE_ACCENT: Record<Triage, string> = {
  forward: "border-t-emerald-500",
  clarify: "border-t-amber-500",
  investigate: "border-t-rose-500",
};
const BAR: Record<Status, string> = {
  needs_clarification: "bg-amber-400",
  pm_review: "bg-sky-500",
  ops_review: "bg-orange-500",
  finance_review: "bg-indigo-500",
  on_hold: "bg-slate-400",
  approved: "bg-emerald-400",
  paid: "bg-emerald-700",
  rejected: "bg-rose-400",
};

function sarTotal(cs: Claim[]) {
  return cs.reduce((s, c) => s + (effectiveCurrency(c) === "SAR" ? (c.amount ?? 0) : 0), 0);
}

export default function Overview() {
  const { claims, user, t, num } = useApp();
  const scope = visibleClaims(user, claims);
  const open = scope.filter((c) => statusGroup(c.status) === "pending");
  const by = (g: StatusGroup) => scope.filter((c) => statusGroup(c.status) === g);
  const projectRows = [...Object.keys(PROJECTS), null];
  const maxOpen = Math.max(1, ...PENDING_STEPS.map((s) => open.filter((c) => c.status === s).length));

  return (
    <>
      <PageHeader title={t("nav.overview")} subtitle={user.role === "requester" ? t("dash.scopeOwn") : t("dash.scopeAll")} />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t("dash.pending")} value={by("pending").length} sub={t("dash.amount", { amount: num(sarTotal(by("pending"))) })} icon={Clock} tone="sky" />
          <Stat label={t("dash.approved")} value={by("approved").length} sub={t("dash.amount", { amount: num(sarTotal(by("approved"))) })} icon={CircleCheck} tone="emerald" />
          <Stat label={t("dash.paid")} value={by("paid").length} sub={t("dash.amount", { amount: num(sarTotal(by("paid"))) })} icon={Banknote} tone="emerald" />
          <Stat label={t("dash.rejected")} value={by("rejected").length} sub={t("dash.amount", { amount: num(sarTotal(by("rejected"))) })} icon={Ban} tone="rose" />
        </div>

        <Card title={t("dash.triage")}>
          <div className="grid gap-3 md:grid-cols-3">
            {TRIAGES.map((tr) => {
              const cs = open.filter((c) => triage(c) === tr);
              return (
                <div key={tr} className={`rounded-xl border border-slate-200 border-t-4 p-4 ${TRIAGE_ACCENT[tr]}`}>
                  <p className="text-sm font-semibold">
                    {t(`triage.${tr}`)} <span className="ltr-num text-slate-400">({cs.length})</span>
                  </p>
                  <ul className="mt-3 space-y-2">
                    {cs.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-1.5 text-sm">
                        <ClaimLink id={c.id} />
                        <Reasons claim={c} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title={t("dash.byStep")}>
            <ul className="space-y-3">
              {PENDING_STEPS.map((s) => {
                const n = open.filter((c) => c.status === s).length;
                return (
                  <li key={s} className="grid grid-cols-[1fr_28px] items-center gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[180px_1fr_28px]">
                    <StatusBadge status={s} />
                    {/* On phones the bar drops under the badge so the row fits. */}
                    <span className="order-last col-span-2 h-2 overflow-hidden rounded-full bg-slate-100 sm:order-none sm:col-span-1">
                      <span className={`block h-full rounded-full ${BAR[s]}`} style={{ width: `${(n / maxOpen) * 100}%` }} />
                    </span>
                    <span className="ltr-num text-end font-semibold tabular-nums">{n}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title={t("dash.byProject")} flush>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px]">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="th">{t("field.project")}</th>
                    {(["pending", "approved", "paid"] as StatusGroup[]).map((g) => (
                      <th key={g} className="th whitespace-normal text-end sm:whitespace-nowrap">
                        {t(`group.${g}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectRows.map((p) => (
                    <tr key={p ?? "none"}>
                      <td className="td">
                        {p ? (
                          <ProjectName code={p} stacked />
                        ) : (
                          <span className="text-slate-500">{t("dash.noProject")}</span>
                        )}
                      </td>
                      {(["pending", "approved", "paid"] as StatusGroup[]).map((g) => {
                        const cs = by(g).filter((c) => c.projectCode === p);
                        return (
                          <td key={g} className="td text-end">
                            <span className="ltr-num font-semibold tabular-nums">{cs.length}</span>
                            <span className="block whitespace-nowrap text-xs text-slate-500">{t("dash.amount", { amount: num(sarTotal(cs)) })}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
