"use client";

import Link from "next/link";
import { Check, ClipboardCheck, HardHat, Landmark, ShieldCheck, X, type LucideIcon } from "lucide-react";
import type { TKey } from "@/lib/i18n";
import { getUser, PROJECTS } from "@/lib/reference";
import { triage } from "@/lib/rules";
import type { Claim, FlagKind, Role, Status, Triage } from "@/lib/types";
import { currentOwner } from "@/lib/workflow";
import { useApp } from "./AppProvider";

const STATUS_STYLE: Record<Status, string> = {
  needs_clarification: "bg-amber-50 text-amber-800 ring-amber-200",
  pm_review: "bg-sky-50 text-sky-800 ring-sky-200",
  ops_review: "bg-orange-50 text-orange-800 ring-orange-200",
  finance_review: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  paid: "bg-emerald-600 text-white ring-emerald-600",
  on_hold: "bg-slate-100 text-slate-700 ring-slate-300",
  rejected: "bg-rose-50 text-rose-800 ring-rose-200",
};

const STATUS_DOT: Record<Status, string> = {
  needs_clarification: "bg-amber-500",
  pm_review: "bg-sky-500",
  ops_review: "bg-orange-500",
  finance_review: "bg-indigo-500",
  approved: "bg-emerald-500",
  paid: "bg-white",
  on_hold: "bg-slate-400",
  rejected: "bg-rose-500",
};

const TRIAGE_STYLE: Record<Triage, string> = {
  forward: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  clarify: "bg-amber-50 text-amber-800 ring-amber-200",
  investigate: "bg-rose-50 text-rose-800 ring-rose-200",
};

const KIND_STYLE: Record<FlagKind, string> = {
  clarify: "bg-amber-50 text-amber-800 ring-amber-200",
  investigate: "bg-rose-50 text-rose-800 ring-rose-200",
  info: "bg-slate-100 text-slate-600 ring-slate-200",
};

export const ROLE_META: Record<Role, { icon: LucideIcon; avatar: string; tint: string }> = {
  requester: { icon: HardHat, avatar: "bg-emerald-600", tint: "text-emerald-700 bg-emerald-50" },
  pm: { icon: ClipboardCheck, avatar: "bg-sky-600", tint: "text-sky-700 bg-sky-50" },
  finance: { icon: Landmark, avatar: "bg-indigo-600", tint: "text-indigo-700 bg-indigo-50" },
  ops: { icon: ShieldCheck, avatar: "bg-orange-600", tint: "text-orange-700 bg-orange-50" },
};

const pill = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset";

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useApp();
  return (
    <span className={`${pill} ${STATUS_STYLE[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
      {t(`status.${status}`)}
    </span>
  );
}

export function TriageBadge({ claim }: { claim: Claim }) {
  const { t } = useApp();
  if (claim.status === "paid" || claim.status === "rejected") return null;
  const tr = triage(claim);
  return <span className={`${pill} ${TRIAGE_STYLE[tr]}`}>{t(`triage.${tr}`)}</span>;
}

export function KindBadge({ kind }: { kind: FlagKind }) {
  const { t } = useApp();
  return <span className={`${pill} ${KIND_STYLE[kind]}`}>{t(`flagKind.${kind}`)}</span>;
}

export function SampleTag() {
  const { t } = useApp();
  return <span className={`${pill} bg-white text-slate-500 ring-slate-200`}>{t("short.sample")}</span>;
}

export function Avatar({ userId, size = "md" }: { userId: string; size?: "sm" | "md" | "lg" }) {
  const { name, lang } = useApp();
  const u = getUser(userId);
  const role = u?.role ?? "requester";
  const label = name(userId);
  const dims = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-11 w-11 text-base" : "h-9 w-9 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${ROLE_META[role].avatar} ${dims}`}
      aria-hidden
      lang={lang}
    >
      {label.slice(0, 1)}
    </span>
  );
}

export function ClaimLink({ id }: { id: string }) {
  return (
    <Link href={`/requests/${id}`} className="ltr-num font-mono font-semibold text-accent-700 hover:underline">
      {id}
    </Link>
  );
}

export function Amount({ claim }: { claim: Claim }) {
  const { num, t } = useApp();
  if (claim.amount === null) return <span className="text-amber-700">{t("value.missing")}</span>;
  return (
    <span className="whitespace-nowrap">
      <span className="ltr-num font-semibold tabular-nums">
        {num(claim.amount)} <span className="font-normal text-slate-500">{claim.currency ?? "SAR"}</span>
      </span>
      {claim.currency === null && <span className="ms-1 text-xs text-slate-400">({t("value.assumed")})</span>}
    </span>
  );
}

/** `stacked` puts the project name under the code, to keep table columns narrow. */
export function ProjectName({ code, stacked = false }: { code: string | null; stacked?: boolean }) {
  const { lang, t } = useApp();
  if (!code) return <span className="text-amber-700">{t("value.missing")}</span>;
  const p = PROJECTS[code];
  return (
    <span className={stacked ? "flex flex-col items-start gap-0.5" : undefined}>
      <span className="ltr-num rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">{code}</span>
      {p && <span className={stacked ? "text-xs text-slate-500" : "ms-1.5 text-slate-600"}>{lang === "ar" ? p.ar : p.en}</span>}
    </span>
  );
}

/** `stacked` puts the role under the name, to keep table columns narrow. */
export function Owner({ claim, stacked = false }: { claim: Claim; stacked?: boolean }) {
  const { name, t } = useApp();
  const o = currentOwner(claim);
  if (!o) {
    const closed = claim.status === "paid" || claim.status === "rejected";
    return <span className={closed ? "text-slate-400" : "font-medium text-rose-700"}>{t(closed ? "value.nobody" : "value.noReviewer")}</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Avatar userId={o.id} size="sm" />
      {stacked ? (
        <span className="flex flex-col leading-tight">
          {name(o.id)}
          <span className="text-xs text-slate-500">{t(`role.${o.role}`)}</span>
        </span>
      ) : (
        <span>
          {name(o.id)} <span className="text-xs text-slate-500">· {t(`role.${o.role}`)}</span>
        </span>
      )}
    </span>
  );
}

/** Short reasons, e.g. "Potential duplicate · Date missing". Info-only flags are left out. */
export function Reasons({ claim, hideEmpty = false }: { claim: Claim; hideEmpty?: boolean }) {
  const { t } = useApp();
  const live = claim.flags.filter((f) => f.kind !== "info" && f.state !== "resolved");
  if (!live.length) return hideEmpty ? null : <span className="text-slate-400">{t("value.none")}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {live.map((f, i) => (
        <span key={i} className={`${pill} font-medium ${KIND_STYLE[f.kind]}`}>
          {t(`short.${f.code}`)}
        </span>
      ))}
    </span>
  );
}

export function Card({
  title,
  hint,
  action,
  children,
  className = "",
  flush = false,
}: {
  title?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(110px,38%)_1fr] gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon: Icon,
  tone = "slate",
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon?: LucideIcon;
  tone?: "slate" | "amber" | "sky" | "emerald" | "rose" | "indigo" | "orange";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    indigo: "bg-indigo-50 text-indigo-700",
    orange: "bg-orange-50 text-orange-700",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`card flex w-full items-start gap-3 p-4 text-start ${onClick ? "cursor-pointer transition-colors hover:border-slate-300" : ""} ${
        active ? "ring-2 ring-accent-600" : ""
      }`}
    >
      {Icon && (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-xs font-medium text-slate-500">{label}</span>
        <span className="ltr-num mt-0.5 block text-2xl font-bold tabular-nums text-slate-900">{value}</span>
        {sub && <span className="block text-xs text-slate-500">{sub}</span>}
      </span>
    </Tag>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-2">
      {tabs.map((tb) => (
        <button
          key={tb.key}
          role="tab"
          aria-selected={value === tb.key}
          onClick={() => onChange(tb.key)}
          className={`-mb-px flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 border-b-2 px-2 text-center text-sm leading-tight transition-colors sm:flex-none sm:gap-2 sm:whitespace-nowrap sm:px-3 ${
            value === tb.key ? "border-accent-700 font-semibold text-accent-800" : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          {tb.label}
          {tb.count !== undefined && (
            <span
              className={`ltr-num rounded-full px-1.5 text-xs font-semibold ${
                value === tb.key ? "bg-accent-700 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {tb.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function AccessCard({ role }: { role: Role }) {
  const { t } = useApp();
  const can: TKey[] = [`access.${role}.can1`, `access.${role}.can2`] as TKey[];
  const cannot: TKey[] = [`access.${role}.cannot1`, `access.${role}.cannot2`] as TKey[];
  const Icon = ROLE_META[role].icon;
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${ROLE_META[role].tint}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold">{t("access.title")}</p>
          <p className="text-xs text-slate-500">{t(`role.${role}`)}</p>
        </div>
      </div>
      <AccessList can={can} cannot={cannot} />
    </Card>
  );
}

export function AccessList({ can, cannot }: { can: TKey[]; cannot: TKey[] }) {
  const { t } = useApp();
  return (
    <ul className="space-y-1.5 text-sm">
      {can.map((k) => (
        <li key={k} className="flex gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label={t("persona.can")} />
          <span>{t(k)}</span>
        </li>
      ))}
      {cannot.map((k) => (
        <li key={k} className="flex gap-2 text-slate-500">
          <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-label={t("persona.cannot")} />
          <span>{t(k)}</span>
        </li>
      ))}
    </ul>
  );
}

export function Empty({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-slate-500">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-5 w-5 text-slate-400" aria-hidden />
      </span>
      {text}
    </div>
  );
}
