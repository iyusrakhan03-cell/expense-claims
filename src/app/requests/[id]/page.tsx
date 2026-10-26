"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { useFlagText } from "@/components/flagText";
import { Stepper } from "@/components/Stepper";
import { formFromClaim, RequestFields, toEdits, validate, type FormErrors } from "@/components/RequestFields";
import { Amount, Card, ClaimLink, KindBadge, Owner, ProjectName, Row, SampleTag, StatusBadge, TriageBadge } from "@/components/ui";
import type { TKey } from "@/lib/i18n";
import type { Action, Claim, Flag } from "@/lib/types";
import { actingRole, canAct, canSee, stepSeat, type Check } from "@/lib/workflow";

function NoteBox({
  label,
  required,
  onCancel,
  onConfirm,
}: {
  label: string;
  required: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const { t } = useApp();
  const [note, setNote] = useState("");
  return (
    <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3">
      <label className="label">{label}</label>
      <textarea className="input min-h-[64px]" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={required && !note.trim()} onClick={() => onConfirm(note)}>
          {t("action.confirm")}
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          {t("action.cancel")}
        </button>
      </div>
    </div>
  );
}

function Checks({ claim, onError }: { claim: Claim; onError: (m: string | null) => void }) {
  const { t, user, run, name, claims } = useApp();
  const text = useFlagText();
  const [resolving, setResolving] = useState<number | null>(null);
  const order = (f: Flag) => (f.kind === "info" ? 2 : f.state === "resolved" ? 3 : f.kind === "investigate" ? 0 : 1);
  const indexed = claim.flags.map((f, i) => ({ f, i })).sort((a, b) => order(a.f) - order(b.f));

  return (
    <Card title={t("section.checks")} hint={t("section.checksHint")}>
      {!indexed.length && <p className="text-sm text-emerald-700">{t("history.rulesClean")}</p>}
      <ul className="space-y-3">
        {indexed.map(({ f, i }) => {
          const can = canAct(user, claim, "resolve_flag", i).ok;
          const done = f.state === "resolved";
          return (
            <li key={i} className={`rounded-lg border p-3 ${done ? "border-slate-100 bg-slate-50 opacity-75" : "border-slate-200"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <KindBadge kind={f.kind} />
                {f.kind !== "info" && <span className="text-xs text-slate-500">{t(`flagState.${f.state}`)}</span>}
                {f.owner && !done && <span className="text-xs text-slate-500">· {t("flag.owner", { role: t(`role.${f.owner}`) })}</span>}
              </div>
              <p className="mt-1.5 text-sm">{text(f)}</p>
              {(() => {
                const visible = f.related.filter((r) => {
                  const other = claims.find((c) => c.id === r);
                  return other && canSee(user, other);
                });
                return visible.length ? (
                  <p className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    {t("flag.related")}
                    {visible.map((r) => (
                      <ClaimLink key={r} id={r} />
                    ))}
                  </p>
                ) : null;
              })()}
              {f.response && (
                <p className="mt-1.5 text-xs text-slate-600">{t("flag.response", { by: name(f.response.by), note: f.response.note })}</p>
              )}
              {f.resolution && (
                <p className="mt-1 text-xs text-emerald-700">{t("flag.resolution", { by: name(f.resolution.by), note: f.resolution.note })}</p>
              )}
              {can && resolving !== i && (
                <button className="btn-secondary mt-2 py-1" onClick={() => setResolving(i)}>
                  {t("action.resolve_flag")}
                </button>
              )}
              {resolving === i && (
                <NoteBox
                  label={t("prompt.resolve_flag")}
                  required
                  onCancel={() => setResolving(null)}
                  onConfirm={(note) => {
                    const r = run(claim.id, "resolve_flag", { flagIndex: i, note });
                    onError(r.ok ? null : r.message);
                    setResolving(null);
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const REVIEW_ACTIONS: Action[] = ["approve", "send_back", "hold", "release", "reject", "record_payment"];
const SILENT = ["not_your_step", "closed", "not_visible", "only_requester", "not_in_clarification"];

function Actions({ claim, onError }: { claim: Claim; onError: (m: string | null) => void }) {
  const { t, user, run } = useApp();
  const [pending, setPending] = useState<Action | null>(null);

  if (user.id === claim.requesterId) {
    if (claim.status === "needs_clarification") return null;
    const reviewing = actingRole(claim) && actingRole(claim) !== "requester";
    return (
      <Card title={t("section.actions")}>
        <p className="text-sm text-slate-600">{reviewing && user.role !== "requester" ? t("deny.own_claim") : t("section.noActions")}</p>
      </Card>
    );
  }

  const checks = REVIEW_ACTIONS.map((a) => [a, canAct(user, claim, a)] as [Action, Check]);
  const visible = checks.filter(([, c]) => c.ok || !SILENT.includes(c.reason));
  const seat = stepSeat(claim.status);
  const label = (a: Action) => (a === "approve" ? t(`action.approve.${seat ?? "pm"}` as TKey) : t(`action.${a}` as TKey));
  const prompt = (a: Action): TKey => (a === "approve" ? "prompt.approve" : (`prompt.${a}` as TKey));

  const doAct = (a: Action, note?: string) => {
    const r = run(claim.id, a, { note });
    onError(r.ok ? null : r.message);
    setPending(null);
  };

  return (
    <Card title={t("section.actions")}>
      {!visible.length ? (
        <p className="text-sm text-slate-600">{t("section.noActions")}</p>
      ) : (
        <div className="space-y-2">
          {claim.status === "pm_review" && actingRole(claim) === "ops" && (
            <p className="rounded-lg bg-indigo-50 p-2 text-xs text-indigo-800">{t("approval.delegate")}</p>
          )}
          {visible.map(([a, c]) => (
            <div key={a}>
              <button
                className={a === "reject" ? "btn-danger w-full" : a === "approve" || a === "record_payment" ? "btn-primary w-full" : "btn-secondary w-full"}
                disabled={!c.ok}
                onClick={() => (a === "approve" || a === "release" ? doAct(a) : setPending(a))}
              >
                {label(a)}
              </button>
              {!c.ok && <p className="mt-1 text-xs text-slate-500">{t(`deny.${c.reason}` as TKey, c.params)}</p>}
              {pending === a && (
                <NoteBox label={t(prompt(a))} required onCancel={() => setPending(null)} onConfirm={(n) => doAct(a, n)} />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Correction({ claim, onError }: { claim: Claim; onError: (m: string | null) => void }) {
  const { t, run } = useApp();
  const [form, setForm] = useState(() => formFromClaim(claim));
  const [errors, setErrors] = useState<FormErrors>({});
  const [note, setNote] = useState("");
  const needsResponse = claim.flags.some(
    (f) => f.kind === "clarify" && f.state === "open" && !f.code.startsWith("MISSING_") && f.code !== "INVALID_PROJECT",
  );

  return (
    <Card title={t("section.correct")} hint={t("section.correctHint")}>
      <div className="space-y-4">
        <RequestFields form={form} setForm={setForm} errors={errors} showUrgent={false} showEvidence={!claim.evidence} />
        <div>
          <label className="label" htmlFor="f-response">
            {t("prompt.response")}
            {needsResponse && " *"}
          </label>
          <textarea id="f-response" className="input min-h-[64px]" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button
          className="btn-primary w-full"
          onClick={() => {
            const errs = validate(form);
            setErrors(errs);
            if (Object.keys(errs).length) return;
            const edits = toEdits(form);
            if (claim.evidence) delete edits.evidence;
            const r = run(claim.id, "resubmit", { edits, note });
            onError(r.ok ? null : r.message);
          }}
        >
          {t("action.resubmit")}
        </button>
      </div>
    </Card>
  );
}

function History({ claim }: { claim: Claim }) {
  const { t, name, date } = useApp();
  return (
    <Card title={t("section.history")}>
      <ol className="relative space-y-4 border-s border-slate-200 ps-4">
        {[...claim.history].reverse().map((h, i) => (
          <li key={i} className="text-sm">
            <span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-teal-600" />
            <p className="text-xs text-slate-500">
              {date(h.at, true)} · {name(h.by)}
            </p>
            <p className="font-medium">
              {h.action === "import"
                ? t("history.import", { channel: t(`channel.${claim.channel}`) })
                : h.action === "rules" && !h.codes?.length
                  ? t("history.rulesClean")
                  : t(`history.${h.action}` as TKey)}
            </p>
            {h.from && h.to && h.from !== h.to && (
              <p className="mt-1 flex flex-wrap items-center gap-1">
                <StatusBadge status={h.from} />
                <span className="text-slate-400">{"→"}</span>
                <StatusBadge status={h.to} />
              </p>
            )}
            {!h.from && h.to && (
              <p className="mt-1">
                <StatusBadge status={h.to} />
              </p>
            )}
            {!!h.codes?.length && (
              <p className="mt-1 flex flex-wrap gap-1">
                {h.codes.map((c) => (
                  <span key={c} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                    {t(`short.${c}`)}
                  </span>
                ))}
              </p>
            )}
            {h.note && <p className="mt-1 text-slate-600">“{h.note}”</p>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function ClaimPage() {
  const { id } = useParams<{ id: string }>();
  const { claims, user, t, name, date, num } = useApp();
  const [error, setError] = useState<string | null>(null);
  const claim = claims.find((c) => c.id === id);

  if (!claim || !canSee(user, claim)) {
    return (
      <Card>
        <p className="text-sm text-slate-600">{claim ? t("deny.not_visible") : t("deny.not_found")}</p>
        <Link href="/requests" className="mt-2 inline-block text-sm text-teal-700 hover:underline">
          {user.role === "requester" ? t("nav.myRequests") : t("nav.requests")}
        </Link>
      </Card>
    );
  }

  const ev = claim.evidence;
  const lineSum = ev?.lineItems?.reduce((a, b) => a + b, 0);
  const correcting = user.id === claim.requesterId && claim.status === "needs_clarification";

  return (
    <div className="space-y-5">
      <Link
        href={user.role === "requester" ? "/" : "/requests"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        {user.role === "requester" ? t("nav.home.requester") : t("nav.requests")}
      </Link>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="ltr-num font-mono text-2xl font-bold tracking-tight">{claim.id}</h1>
          <span className="text-xl font-semibold text-slate-800">{claim.purpose}</span>
          {claim.isSample && <SampleTag />}
          <span className="ms-auto text-xl">
            <Amount claim={claim} />
          </span>
        </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <StatusBadge status={claim.status} />
        {claim.status !== "paid" && claim.status !== "rejected" && (
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">{t("field.triage")}:</span>
            <TriageBadge claim={claim} />
          </span>
        )}
        <span>
          <span className="text-slate-500">{t("field.owner")}: </span>
          <Owner claim={claim} />
        </span>
      </div>
      </div>

      <div className="card overflow-x-auto px-4 py-5">
        <div className="min-w-[460px]">
          <Stepper claim={claim} />
        </div>
      </div>

      {error &&<p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Checks claim={claim} onError={setError} />
          {correcting && <Correction claim={claim} onError={setError} />}
          <Card title={t("section.request")}>
            <dl>
              <Row label={t("field.requester")}>{name(claim.requesterId)}</Row>
              <Row label={t("field.received")}>
                {date(claim.receivedAt, true)} · {t(`channel.${claim.channel}`)}
              </Row>
              <Row label={t("field.project")}>
                <ProjectName code={claim.projectCode} />
              </Row>
              <Row label={t("field.amount")}>
                <Amount claim={claim} />
              </Row>
              <Row label={t("field.expenseDate")}>
                {claim.expenseDate ? date(claim.expenseDate) : <span className="text-amber-700">{t("value.missing")}</span>}
              </Row>
              <Row label={t("field.purpose")}>{claim.purpose ?? <span className="text-amber-700">{t("value.missing")}</span>}</Row>
              {claim.urgent && <Row label={t("field.urgent")}>{t("value.yes")}</Row>}
              <Row label={t("field.message")}>
                <q className="text-slate-700" dir="ltr">
                  {claim.message}
                </q>
              </Row>
            </dl>
          </Card>
          <Card title={t("field.evidence")}>
            {ev ? (
              <dl>
                <Row label={t("field.evidenceRef")}>
                  <span className="ltr-num font-mono">{ev.ref}</span>
                </Row>
                {ev.vendor && <Row label={t("field.vendor")}>{ev.vendor}</Row>}
                {ev.date && <Row label={t("field.receiptDate")}>{date(ev.date)}</Row>}
                {ev.total !== undefined && (
                  <Row label={t("field.receiptTotal")}>
                    <span className="ltr-num">
                      {num(ev.total)} {ev.currency ?? ""}
                    </span>
                  </Row>
                )}
                {ev.receiptNo && (
                  <Row label={t("field.receiptNo")}>
                    <span className="ltr-num font-mono">{ev.receiptNo}</span>
                  </Row>
                )}
                {ev.lineItems && (
                  <Row label={t("field.lineItems")}>
                    <span className="ltr-num">
                      {ev.lineItems.map(num).join(" + ")} = {num(lineSum ?? 0)}
                    </span>
                  </Row>
                )}
                {ev.note && <Row label={t("field.evidenceNote")}>{ev.note}</Row>}
              </dl>
            ) : (
              <p className="text-sm text-amber-800">
                {t("value.noEvidence")}
                {claim.evidenceNote && <span className="block text-slate-600">“{claim.evidenceNote}”</span>}
              </p>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Actions claim={claim} onError={setError} />
          <History claim={claim} />
        </div>
      </div>
    </div>
  );
}
