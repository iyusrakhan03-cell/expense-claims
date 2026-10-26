"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { emptyForm, RequestFields, toEdits, validate, type FormErrors } from "@/components/RequestFields";
import { Card, PageHeader } from "@/components/ui";
import { canSubmit } from "@/lib/workflow";

export default function NewRequestPage() {
  const { t, user, name, submit } = useApp();
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState("");

  if (!canSubmit(user.role)) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t("form.title")} />
        <Card>
          <p className="text-sm text-slate-600">{t("deny.cannot_submit")}</p>
        </Card>
      </div>
    );
  }

  const onSubmit = () => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const e = toEdits(form);
    const text =
      message.trim() ||
      [e.projectCode, e.purpose, [e.amount, e.currency].filter(Boolean).join(" "), e.expenseDate].filter(Boolean).join(", ");
    const r = submit({
      receivedAt: new Date().toISOString(),
      channel: "form",
      requesterId: user.id,
      message: text,
      projectCode: e.projectCode ?? null,
      amount: e.amount ?? null,
      currency: e.currency ?? null,
      expenseDate: e.expenseDate ?? null,
      purpose: e.purpose ?? null,
      urgent: form.urgent,
      evidence: e.evidence ?? null,
    });
    if (r.ok && r.id) router.push(`/requests/${r.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t("form.title")} subtitle={t("form.requestFor", { name: `${name(user.id)} · ${t(`role.${user.role}`)}` })} />
      <Card>
        <div className="space-y-5">
          <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-900">{t("form.hint")}</p>
          <div>
            <label className="label" htmlFor="f-msg">
              {t("form.message")}
            </label>
            <textarea id="f-msg" className="input min-h-[56px]" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <RequestFields form={form} setForm={setForm} errors={errors} />
          <button className="btn-primary w-full sm:w-auto" onClick={onSubmit}>
            {t("action.submit")}
          </button>
        </div>
      </Card>
    </div>
  );
}
