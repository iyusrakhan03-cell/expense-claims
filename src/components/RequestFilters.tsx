"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { TKey } from "@/lib/i18n";
import { PROJECTS, USERS } from "@/lib/reference";
import { triage } from "@/lib/rules";
import type { Claim, FlagCode, Status, Triage } from "@/lib/types";
import { statusGroup, type StatusGroup } from "@/lib/workflow";
import { useApp } from "./AppProvider";

type Sort = "newest" | "oldest" | "amountDesc" | "amountAsc";

interface Filters {
  q: string;
  status: "all" | StatusGroup | Status;
  project: string;
  assessment: "all" | Triage;
  requester: string;
  flag: "all" | FlagCode;
  sort: Sort;
}

const INITIAL: Filters = { q: "", status: "all", project: "all", assessment: "all", requester: "all", flag: "all", sort: "newest" };

const GROUPS: StatusGroup[] = ["pending", "approved", "paid", "rejected"];
const STATUSES: Status[] = ["needs_clarification", "pm_review", "ops_review", "finance_review", "on_hold"];
const TRIAGES: Triage[] = ["forward", "clarify", "investigate"];
const FLAGS: FlagCode[] = [
  "MISSING_PROJECT",
  "MISSING_DATE",
  "MISSING_EVIDENCE",
  "POSSIBLE_DUPLICATE",
  "POSSIBLE_SPLIT",
  "RELATED_PURCHASES",
  "CURRENCY_MISMATCH",
  "AMOUNT_MISMATCH",
  "ARITHMETIC_MISMATCH",
  "FOREIGN_CURRENCY",
  "ABOVE_THRESHOLD",
  "URGENT_NOTED",
  "REVIEWER_QUESTION",
];

export function useRequestFilters(claims: Claim[], { showRequester }: { showRequester: boolean }) {
  const { t, name, lang } = useApp();
  const [f, setF] = useState<Filters>(INITIAL);
  const set = (patch: Partial<Filters>) => setF((p) => ({ ...p, ...patch }));
  const dirty = JSON.stringify(f) !== JSON.stringify(INITIAL);

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const out = claims.filter((c) => {
      if (q) {
        const hay = [c.id, c.purpose, c.message, c.evidence?.vendor, c.evidence?.receiptNo, c.evidence?.ref, c.projectCode, name(c.requesterId)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (f.status !== "all") {
        if ((GROUPS as string[]).includes(f.status) ? statusGroup(c.status) !== f.status : c.status !== f.status) return false;
      }
      if (f.project !== "all" && (f.project === "none" ? c.projectCode !== null : c.projectCode !== f.project)) return false;
      if (f.assessment !== "all" && (statusGroup(c.status) !== "pending" || triage(c) !== f.assessment)) return false;
      if (f.requester !== "all" && c.requesterId !== f.requester) return false;
      if (f.flag !== "all" && !c.flags.some((fl) => fl.code === f.flag && fl.state !== "resolved")) return false;
      return true;
    });
    const amt = (c: Claim) => c.amount ?? 0;
    out.sort((a, b) => {
      if (f.sort === "oldest") return a.receivedAt.localeCompare(b.receivedAt);
      if (f.sort === "amountDesc") return amt(b) - amt(a);
      if (f.sort === "amountAsc") return amt(a) - amt(b);
      return b.receivedAt.localeCompare(a.receivedAt);
    });
    return out;
  }, [claims, f, name]);

  const select = (id: string, label: string, value: string, onChange: (v: string) => void, options: [string, string][]) => (
    <div className="min-w-[140px] flex-1 sm:flex-none">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select id={id} className="input cursor-pointer" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  const any = (k: TKey) => `${t(k)}: ${t("filter.any")}`;

  const toolbar = (
    <div className="space-y-3 border-b border-slate-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-[2]">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            className="input ps-9"
            placeholder={t("filter.search")}
            aria-label={t("filter.search")}
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>
        {select("flt-status", t("filter.status"), f.status, (v) => set({ status: v as Filters["status"] }), [
          ["all", any("filter.status")],
          ...GROUPS.map((g) => [g, t(`group.${g}`)] as [string, string]),
          ...STATUSES.map((s) => [s, `— ${t(`status.${s}`)}`] as [string, string]),
        ])}
        {select("flt-project", t("filter.project"), f.project, (v) => set({ project: v }), [
          ["all", any("filter.project")],
          ...Object.entries(PROJECTS).map(([code, p]) => [code, `${code} ${lang === "ar" ? p.ar : p.en}`] as [string, string]),
          ["none", t("dash.noProject")],
        ])}
        {select("flt-assess", t("filter.assessment"), f.assessment, (v) => set({ assessment: v as Filters["assessment"] }), [
          ["all", any("filter.assessment")],
          ...TRIAGES.map((tr) => [tr, t(`triage.${tr}`)] as [string, string]),
        ])}
        {showRequester &&
          select("flt-req", t("filter.requester"), f.requester, (v) => set({ requester: v }), [
            ["all", any("filter.requester")],
            ...USERS.map((u) => [u.id, name(u.id)] as [string, string]),
          ])}
        {select("flt-flag", t("filter.flag"), f.flag, (v) => set({ flag: v as Filters["flag"] }), [
          ["all", any("filter.flag")],
          ...FLAGS.map((c) => [c, t(`short.${c}`)] as [string, string]),
        ])}
        {select("flt-sort", t("filter.sort"), f.sort, (v) => set({ sort: v as Sort }), [
          ["newest", t("sort.newest")],
          ["oldest", t("sort.oldest")],
          ["amountDesc", t("sort.amountDesc")],
          ["amountAsc", t("sort.amountAsc")],
        ])}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{t("filter.count", { n: filtered.length, total: claims.length })}</span>
        {dirty && (
          <button className="inline-flex cursor-pointer items-center gap-1 font-semibold text-accent-700 hover:underline" onClick={() => setF(INITIAL)}>
            <X className="h-3.5 w-3.5" aria-hidden />
            {t("filter.clear")}
          </button>
        )}
      </div>
    </div>
  );

  return { filtered, toolbar };
}
