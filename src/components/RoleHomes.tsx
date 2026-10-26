"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Banknote,
  CircleAlert,
  CircleCheck,
  Clock,
  Flag as FlagIcon,
  Inbox,
  Layers,
  Pause,
  PlusCircle,
  Scale,
  Split,
  UserCheck,
} from "lucide-react";
import { effectiveCurrency, isUnresolved } from "@/lib/rules";
import type { Claim, User } from "@/lib/types";
import { canSubmit, queueFor, statusGroup, visibleClaims } from "@/lib/workflow";
import { useApp } from "./AppProvider";
import { ClaimsTable } from "./ClaimsTable";
import { useFlagText } from "./flagText";
import { Stepper } from "./Stepper";
import { AccessCard, Amount, Card, ClaimLink, Empty, PageHeader, Reasons, SampleTag, Stat, StatusBadge, Tabs } from "./ui";

const sar = (cs: Claim[]) => cs.reduce((s, c) => s + (effectiveCurrency(c) === "SAR" ? (c.amount ?? 0) : 0), 0);

function decidedBy(user: User, claims: Claim[]) {
  const acts = ["approve", "reject", "send_back", "hold", "resolve_flag", "record_payment"];
  return claims.filter((c) => c.history.some((h) => h.by === user.id && acts.includes(h.action)));
}

function NewButton() {
  const { t, user } = useApp();
  if (!canSubmit(user.role)) return null;
  return (
    <Link href="/new" className="btn-primary">
      <PlusCircle className="h-4 w-4" aria-hidden />
      {t("nav.new")}
    </Link>
  );
}

/* ---------------- Requester ---------------- */

export function RequesterHome() {
  const { t, user, claims, num } = useApp();
  const text = useFlagText();
  const mine = visibleClaims(user, claims);
  const action = queueFor(user, claims);
  const inReview = mine.filter((c) => ["pm_review", "ops_review", "finance_review", "on_hold"].includes(c.status));
  const approved = mine.filter((c) => c.status === "approved");
  const paid = mine.filter((c) => c.status === "paid");
  const sorted = [...mine].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  return (
    <>
      <PageHeader title={t("nav.home.requester")} subtitle={t("home.requester.sub")} actions={<NewButton />} />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={t("stat.needsAction")} value={action.length} icon={CircleAlert} tone="amber" />
            <Stat label={t("stat.inReview")} value={inReview.length} icon={Clock} tone="sky" />
            <Stat label={t("stat.approved")} value={approved.length} sub={t("dash.amount", { amount: num(sar(approved)) })} icon={CircleCheck} tone="emerald" />
            <Stat label={t("stat.paid")} value={paid.length} sub={t("dash.amount", { amount: num(sar(paid)) })} icon={Banknote} tone="emerald" />
          </div>

          <Card title={t("home.questions")} flush>
            {action.length ? (
              <ul className="divide-y divide-slate-100">
                {action.map((c) => (
                  <li key={c.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <ClaimLink id={c.id} />
                        <span className="font-medium">{c.purpose}</span>
                        <Amount claim={c} />
                      </div>
                      <ul className="space-y-1">
                        {c.flags
                          .filter((f) => f.kind === "clarify" && f.state === "open")
                          .map((f, i) => (
                            <li key={i} className="flex gap-2 text-sm text-amber-900">
                              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                              {text(f)}
                            </li>
                          ))}
                      </ul>
                    </div>
                    <Link href={`/requests/${c.id}`} className="btn-primary shrink-0">
                      {t("home.fix")}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={CircleCheck} text={t("home.nothing")} />
            )}
          </Card>

          <Card title={t("home.recent")} flush>
            {sorted.length ? (
              <ul className="divide-y divide-slate-100">
                {sorted.map((c) => (
                  <li key={c.id}>
                    <Link href={`/requests/${c.id}`} className="grid gap-3 p-5 transition-colors hover:bg-slate-50 md:grid-cols-[1fr_320px] md:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="ltr-num font-mono font-semibold text-accent-700">{c.id}</span>
                          {c.isSample && <SampleTag />}
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-700">
                          {c.purpose} · <Amount claim={c} />
                        </p>
                      </div>
                      <Stepper claim={c} compact />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={Inbox} text={t("list.empty")} />
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <AccessCard role="requester" />
        </div>
      </div>
    </>
  );
}

/* ---------------- Project manager ---------------- */

export function PmHome() {
  const { t, user, claims } = useApp();
  const [tab, setTab] = useState<"waiting" | "onHold" | "decided">("waiting");
  const queue = queueFor(user, claims).filter((c) => c.status !== "on_hold");
  const onHold = claims.filter((c) => c.status === "on_hold" && c.heldBy === "pm" && c.requesterId !== user.id);
  const decided = decidedBy(user, claims);
  const flagged = queue.filter((c) => c.flags.some(isUnresolved));
  const withRequesters = claims.filter((c) => c.status === "needs_clarification").length;
  const lists = { waiting: queue, onHold, decided };

  return (
    <>
      <PageHeader title={t("nav.home.pm")} subtitle={t("home.pm.sub")} actions={<NewButton />} />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={t("stat.waiting")} value={queue.length} icon={Inbox} tone="sky" active={tab === "waiting"} onClick={() => setTab("waiting")} />
            <Stat label={t("stat.flagged")} value={flagged.length} icon={FlagIcon} tone="rose" />
            <Stat label={t("stat.onHold")} value={onHold.length} icon={Pause} tone="slate" active={tab === "onHold"} onClick={() => setTab("onHold")} />
            <Stat label={t("stat.decided")} value={decided.length} icon={UserCheck} tone="emerald" active={tab === "decided"} onClick={() => setTab("decided")} />
          </div>
          <Card flush>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { key: "waiting", label: t("tab.waiting"), count: queue.length },
                { key: "onHold", label: t("tab.onHold"), count: onHold.length },
                { key: "decided", label: t("tab.decided"), count: decided.length },
              ]}
            />
            <ClaimsTable claims={lists[tab]} emptyText={t("home.nothing")} />
          </Card>
        </div>
        <div className="space-y-6">
          <AccessCard role="pm" />
          {withRequesters > 0 && (
            <Card>
              <p className="text-sm text-slate-600">{t("home.waitingRequesters", { n: withRequesters })}</p>
              <Link href="/requests" className="mt-2 inline-block text-sm font-semibold text-accent-700 hover:underline">
                {t("nav.requests")}
              </Link>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- Operations manager ---------------- */

function RelatedGroups() {
  const { t, claims, num, date, name } = useApp();
  const seen = new Set<string>();
  const groups: { key: string; members: Claim[]; vendor: string; day: string; total: number; requesterId: string }[] = [];
  for (const c of claims) {
    const f = c.flags.find((x) => x.code === "RELATED_PURCHASES");
    if (!f) continue;
    const ids = [c.id, ...f.related].sort();
    const key = ids.join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push({
      key,
      members: ids.map((id) => claims.find((x) => x.id === id)!).filter(Boolean),
      vendor: String(f.params.vendor),
      day: String(f.params.date),
      total: Number(f.params.total),
      requesterId: c.requesterId,
    });
  }

  return (
    <Card title={t("groups.title")} hint={t("groups.hint")}>
      {!groups.length ? (
        <p className="text-sm text-slate-500">{t("groups.empty")}</p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key} className="rounded-xl border border-orange-200 bg-orange-50/40">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Layers className="h-4 w-4 text-orange-600" aria-hidden />
                  <span className="font-semibold">{g.vendor}</span>
                  <span className="text-slate-500">
                    · {date(g.day)} · {name(g.requesterId)}
                  </span>
                </div>
                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800">
                  {t("groups.total", { total: num(g.total) })}
                </span>
              </div>
              <ul className="divide-y divide-orange-100">
                {g.members.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-sm">
                    <ClaimLink id={m.id} />
                    <span className="min-w-[120px] flex-1 text-slate-700">{m.purpose}</span>
                    <span className="ltr-num font-mono text-xs text-slate-500">{m.evidence?.receiptNo}</span>
                    <Amount claim={m} />
                    <StatusBadge status={m.status} />
                    <Reasons claim={m} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function OpsHome() {
  const { t, user, claims } = useApp();
  const [tab, setTab] = useState<"waiting" | "decided">("waiting");
  const queue = queueFor(user, claims);
  const decided = decidedBy(user, claims);
  const above = queue.filter((c) => effectiveCurrency(c) === "SAR" && (c.amount ?? 0) > 1000);
  const splits = claims.filter((c) => statusGroup(c.status) === "pending" && c.flags.some((f) => f.code === "POSSIBLE_SPLIT" && f.state !== "resolved"));
  const delegate = queue.filter((c) => c.status === "pm_review");

  return (
    <>
      <PageHeader title={t("home.ops.title")} subtitle={t("home.ops.sub")} actions={<NewButton />} />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={t("stat.waiting")} value={queue.length} icon={Inbox} tone="orange" />
            <Stat label={t("stat.above")} value={above.length} icon={Scale} tone="orange" />
            <Stat label={t("stat.splits")} value={splits.length} icon={Split} tone="rose" />
            <Stat label={t("stat.delegate")} value={delegate.length} icon={UserCheck} tone="sky" />
          </div>
          <Card flush>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { key: "waiting", label: t("tab.waiting"), count: queue.length },
                { key: "decided", label: t("tab.decided"), count: decided.length },
              ]}
            />
            <ClaimsTable claims={tab === "waiting" ? queue : decided} emptyText={t("home.nothing")} />
          </Card>
          <RelatedGroups />
        </div>
        <div className="space-y-6">
          <AccessCard role="ops" />
        </div>
      </div>
    </>
  );
}

/* ---------------- Finance reviewer ---------------- */

export function FinanceHome() {
  const { t, user, claims, num } = useApp();
  const [tab, setTab] = useState<"toReview" | "readyToPay" | "paid">("toReview");
  const toReview = claims.filter((c) => c.status === "finance_review" && c.requesterId !== user.id);
  const ready = claims.filter((c) => c.status === "approved");
  const paid = claims.filter((c) => c.status === "paid");
  const financeFlags = claims
    .filter((c) => statusGroup(c.status) === "pending")
    .reduce((n, c) => n + c.flags.filter((f) => f.owner === "finance" && isUnresolved(f)).length, 0);
  const lists = { toReview, readyToPay: ready, paid };

  return (
    <>
      <PageHeader title={t("nav.home.finance")} subtitle={t("home.finance.sub")} actions={<NewButton />} />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={t("tab.toReview")} value={toReview.length} icon={Inbox} tone="indigo" active={tab === "toReview"} onClick={() => setTab("toReview")} />
            <Stat
              label={t("stat.readyToPay")}
              value={ready.length}
              sub={t("dash.amount", { amount: num(sar(ready)) })}
              icon={CircleCheck}
              tone="emerald"
              active={tab === "readyToPay"}
              onClick={() => setTab("readyToPay")}
            />
            <Stat
              label={t("stat.paid")}
              value={paid.length}
              sub={t("dash.amount", { amount: num(sar(paid)) })}
              icon={Banknote}
              tone="emerald"
              active={tab === "paid"}
              onClick={() => setTab("paid")}
            />
            <Stat label={t("stat.financeFlags")} value={financeFlags} icon={FlagIcon} tone="rose" />
          </div>
          <Card flush>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { key: "toReview", label: t("tab.toReview"), count: toReview.length },
                { key: "readyToPay", label: t("tab.readyToPay"), count: ready.length },
                { key: "paid", label: t("tab.paid"), count: paid.length },
              ]}
            />
            <ClaimsTable claims={lists[tab]} emptyText={t("home.nothing")} />
          </Card>
        </div>
        <div className="space-y-6">
          <AccessCard role="finance" />
        </div>
      </div>
    </>
  );
}
