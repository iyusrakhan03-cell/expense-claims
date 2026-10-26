"use client";

import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Card, ClaimLink, PageHeader } from "@/components/ui";
import { getUser } from "@/lib/reference";
import type { IntakeRecord } from "@/lib/seed";
import type { Channel } from "@/lib/types";

const CHANNELS: Channel[] = ["whatsapp", "email", "form", "import"];

const EXAMPLE = JSON.stringify(
  [
    {
      receivedAt: "2026-10-23T09:30:00+03:00",
      channel: "whatsapp",
      requesterId: "nabil",
      message: "P-103, traffic cones, 300, Oct 23",
      projectCode: "P-103",
      amount: 300,
      currency: null,
      expenseDate: "2026-10-23",
      purpose: "Traffic cones",
      evidence: { ref: "IMG-111", vendor: "Shop F", date: "2026-10-23", currency: "SAR", total: 300, receiptNo: "F120" },
    },
  ],
  null,
  2,
);

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const numOrNull = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);

export default function ImportPage() {
  const { t, importRecords } = useApp();
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [imported, setImported] = useState<string[]>([]);

  const onImport = () => {
    setImported([]);
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      setErrors([t("valid.json")]);
      return;
    }
    const list = Array.isArray(data) ? data : [data];
    const errs: string[] = [];
    const recs: IntakeRecord[] = [];
    list.forEach((raw, i) => {
      if (!raw || typeof raw !== "object") {
        errs.push(t("valid.record", { n: i + 1, problem: t("valid.json") }));
        return;
      }
      const r = raw as Record<string, unknown>;
      const requesterId = str(r.requesterId) ?? "";
      if (!getUser(requesterId)) {
        errs.push(t("valid.record", { n: i + 1, problem: t("valid.requesterUnknown", { id: requesterId }) }));
        return;
      }
      const ev = r.evidence && typeof r.evidence === "object" ? (r.evidence as IntakeRecord["evidence"]) : null;
      recs.push({
        receivedAt: str(r.receivedAt) ?? new Date().toISOString(),
        channel: CHANNELS.includes(r.channel as Channel) ? (r.channel as Channel) : "import",
        requesterId,
        message: str(r.message) ?? "",
        projectCode: str(r.projectCode),
        amount: numOrNull(r.amount),
        currency: str(r.currency),
        expenseDate: str(r.expenseDate),
        purpose: str(r.purpose),
        urgent: r.urgent === true,
        evidence: ev && str(ev.ref) ? ev : null,
        evidenceNote: str(r.evidenceNote) ?? undefined,
      });
    });
    setErrors(errs);
    if (errs.length || !recs.length) return;
    const r = importRecords(recs);
    if (r.ok) setImported(r.ids ?? []);
    setText("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t("import.title")} />
      <Card>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{t("import.hint")}</p>
          <textarea
            className="input min-h-[260px] font-mono text-xs"
            dir="ltr"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-rose-700">
              {e}
            </p>
          ))}
          {!!imported.length && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-emerald-700">
              {t("import.done", { n: imported.length })}
              {imported.map((id) => (
                <ClaimLink key={id} id={id} />
              ))}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={!text.trim()} onClick={onImport}>
              {t("action.import")}
            </button>
            <button className="btn-secondary" onClick={() => setText(EXAMPLE)}>
              {t("import.template")}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
