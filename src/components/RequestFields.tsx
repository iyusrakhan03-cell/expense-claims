"use client";

import { PROJECTS } from "@/lib/reference";
import type { TKey } from "@/lib/i18n";
import type { Claim, Evidence } from "@/lib/types";
import type { Edits } from "@/lib/workflow";
import { useApp } from "./AppProvider";

export interface FormState {
  projectCode: string;
  amount: string;
  currency: string;
  expenseDate: string;
  purpose: string;
  urgent: boolean;
  ev: { ref: string; vendor: string; date: string; currency: string; total: string; receiptNo: string; lineItems: string; note: string };
}

export type FormErrors = Partial<Record<keyof FormState | "lineItems", TKey>>;

export function emptyForm(): FormState {
  return {
    projectCode: "",
    amount: "",
    currency: "",
    expenseDate: "",
    purpose: "",
    urgent: false,
    ev: { ref: "", vendor: "", date: "", currency: "", total: "", receiptNo: "", lineItems: "", note: "" },
  };
}

export function formFromClaim(c: Claim): FormState {
  const e = c.evidence;
  return {
    projectCode: c.projectCode ?? "",
    amount: c.amount === null ? "" : String(c.amount),
    currency: c.currency ?? "",
    expenseDate: c.expenseDate ?? "",
    purpose: c.purpose ?? "",
    urgent: c.urgent,
    ev: {
      ref: e?.ref ?? "",
      vendor: e?.vendor ?? "",
      date: e?.date ?? "",
      currency: e?.currency ?? "",
      total: e?.total === undefined ? "" : String(e.total),
      receiptNo: e?.receiptNo ?? "",
      lineItems: e?.lineItems?.join(" + ") ?? "",
      note: e?.note ?? "",
    },
  };
}

function parseLines(s: string): number[] | null {
  if (!s.trim()) return [];
  const parts = s.split("+").map((p) => p.trim().replace(/,/g, ""));
  if (parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  return parts.map(Number);
}

export function validate(f: FormState): FormErrors {
  const err: FormErrors = {};
  if (!f.projectCode) err.projectCode = "valid.project";
  else if (!PROJECTS[f.projectCode]) err.projectCode = "valid.project";
  const amt = Number(f.amount.replace(/,/g, ""));
  if (!f.amount.trim() || !(amt > 0)) err.amount = "valid.amount";
  if (!f.expenseDate) err.expenseDate = "valid.required";
  if (!f.purpose.trim()) err.purpose = "valid.required";
  if (parseLines(f.ev.lineItems) === null) err.lineItems = "valid.lineItems";
  return err;
}

export function toEvidence(f: FormState): Evidence | null {
  if (!f.ev.ref.trim()) return null;
  const lines = parseLines(f.ev.lineItems) ?? [];
  const total = Number(f.ev.total.replace(/,/g, ""));
  return {
    ref: f.ev.ref.trim(),
    vendor: f.ev.vendor.trim() || undefined,
    date: f.ev.date || undefined,
    currency: f.ev.currency.trim().toUpperCase() || undefined,
    total: f.ev.total.trim() && total >= 0 ? total : undefined,
    receiptNo: f.ev.receiptNo.trim() || undefined,
    lineItems: lines.length ? lines : undefined,
    note: f.ev.note.trim() || undefined,
  };
}

export function toEdits(f: FormState): Edits {
  return {
    projectCode: f.projectCode || null,
    amount: f.amount.trim() ? Number(f.amount.replace(/,/g, "")) : null,
    currency: f.currency.trim() || null,
    expenseDate: f.expenseDate || null,
    purpose: f.purpose.trim() || null,
    evidence: toEvidence(f),
  };
}

function Err({ k }: { k?: TKey }) {
  const { t } = useApp();
  return k ? <p className="mt-1 text-xs text-rose-700">{t(k)}</p> : null;
}

export function RequestFields({
  form,
  setForm,
  errors,
  showUrgent = true,
  showEvidence = true,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  errors: FormErrors;
  showUrgent?: boolean;
  showEvidence?: boolean;
}) {
  const { t, lang } = useApp();
  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });
  const setEv = (patch: Partial<FormState["ev"]>) => setForm({ ...form, ev: { ...form.ev, ...patch } });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="f-project">
            {t("field.project")} *
          </label>
          <select id="f-project" className="input" value={form.projectCode} onChange={(e) => set({ projectCode: e.target.value })}>
            <option value="">{t("form.selectProject")}</option>
            {Object.entries(PROJECTS).map(([code, p]) => (
              <option key={code} value={code}>
                {code} — {lang === "ar" ? p.ar : p.en}
              </option>
            ))}
          </select>
          <Err k={errors.projectCode} />
        </div>
        <div>
          <label className="label" htmlFor="f-purpose">
            {t("field.purpose")} *
          </label>
          <input id="f-purpose" className="input" value={form.purpose} onChange={(e) => set({ purpose: e.target.value })} />
          <Err k={errors.purpose} />
        </div>
        <div className="grid grid-cols-[1fr_110px] gap-2">
          <div>
            <label className="label" htmlFor="f-amount">
              {t("field.amount")} *
            </label>
            <input
              id="f-amount"
              className="input ltr-num"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value })}
            />
            <Err k={errors.amount} />
          </div>
          <div>
            <label className="label" htmlFor="f-currency">
              {t("field.currency")}
            </label>
            <input
              id="f-currency"
              className="input ltr-num uppercase"
              placeholder="SAR"
              value={form.currency}
              onChange={(e) => set({ currency: e.target.value })}
              title={t("form.currencyHint")}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="f-date">
            {t("field.expenseDate")} *
          </label>
          <input id="f-date" type="date" className="input" value={form.expenseDate} onChange={(e) => set({ expenseDate: e.target.value })} />
          <Err k={errors.expenseDate} />
        </div>
        {showUrgent && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.urgent} onChange={(e) => set({ urgent: e.target.checked })} />
            {t("field.urgent")}
          </label>
        )}
      </div>

      {showEvidence && (
      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">{t("field.evidence")}</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="f-ref">
              {t("field.evidenceRef")}
            </label>
            <input id="f-ref" className="input ltr-num" placeholder="IMG-…" value={form.ev.ref} onChange={(e) => setEv({ ref: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="f-vendor">
              {t("field.vendor")}
            </label>
            <input id="f-vendor" className="input" value={form.ev.vendor} onChange={(e) => setEv({ vendor: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="f-rno">
              {t("field.receiptNo")}
            </label>
            <input id="f-rno" className="input ltr-num" value={form.ev.receiptNo} onChange={(e) => setEv({ receiptNo: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="f-rdate">
              {t("field.receiptDate")}
            </label>
            <input id="f-rdate" type="date" className="input" value={form.ev.date} onChange={(e) => setEv({ date: e.target.value })} />
          </div>
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <div>
              <label className="label" htmlFor="f-rtotal">
                {t("field.receiptTotal")}
              </label>
              <input
                id="f-rtotal"
                className="input ltr-num"
                inputMode="decimal"
                value={form.ev.total}
                onChange={(e) => setEv({ total: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="f-rcur">
                {t("field.receiptCurrency")}
              </label>
              <input
                id="f-rcur"
                className="input ltr-num uppercase"
                placeholder="SAR"
                value={form.ev.currency}
                onChange={(e) => setEv({ currency: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="f-lines">
              {t("field.lineItems")}
            </label>
            <input
              id="f-lines"
              className="input ltr-num"
              placeholder="210 + 150"
              value={form.ev.lineItems}
              onChange={(e) => setEv({ lineItems: e.target.value })}
            />
            {errors.lineItems ? <Err k={errors.lineItems} /> : <p className="mt-1 text-xs text-slate-400">{t("field.lineItemsHint")}</p>}
          </div>
        </div>
      </fieldset>
      )}
    </div>
  );
}
