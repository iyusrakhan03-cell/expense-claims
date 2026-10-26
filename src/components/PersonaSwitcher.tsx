"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { TKey } from "@/lib/i18n";
import { USERS } from "@/lib/reference";
import type { Role } from "@/lib/types";
import { queueFor, visibleClaims } from "@/lib/workflow";
import { useApp } from "./AppProvider";
import { AccessList, Avatar, ROLE_META } from "./ui";

const REVIEWER_ROLES: Role[] = ["pm", "finance", "ops"];

export function PersonaSwitcher({ open, onClose, welcome }: { open: boolean; onClose: () => void; welcome: boolean }) {
  const { t, name, user, claims, setUser } = useApp();
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pick = (id: string) => {
    setUser(id);
    onClose();
    router.push("/");
  };

  const requesters = USERS.filter((u) => u.role === "requester");
  const reviewers = USERS.filter((u) => u.role !== "requester").sort(
    (a, b) => REVIEWER_ROLES.indexOf(a.role) - REVIEWER_ROLES.indexOf(b.role),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="persona-title"
        className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 id="persona-title" className="text-xl font-bold text-slate-900">
              {welcome ? t("persona.welcome") : t("persona.title")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{t("persona.subtitle")}</p>
            <p className="mt-2 inline-block rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">{t("app.demoBanner")}</p>
          </div>
          <button ref={closeRef} className="btn-ghost h-10 w-10 shrink-0 p-0" onClick={onClose} aria-label={t("persona.close")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("persona.reviewers")}</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {reviewers.map((u) => {
                const Icon = ROLE_META[u.role].icon;
                const waiting = queueFor(u, claims).length;
                const current = u.id === user.id && !welcome;
                return (
                  <button
                    key={u.id}
                    onClick={() => pick(u.id)}
                    className={`flex cursor-pointer flex-col rounded-xl border p-4 text-start transition-colors hover:border-accent-600 hover:bg-accent-50/40 ${
                      current ? "border-accent-600 ring-2 ring-accent-600/30" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar userId={u.id} size="lg" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{name(u.id)}</p>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                          {t(`role.${u.role}`)}
                        </p>
                      </div>
                    </div>
                    <div className="my-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {t("persona.waiting", { n: waiting })}
                      </span>
                      {current && (
                        <span className="rounded-full bg-accent-700 px-2 py-0.5 text-xs font-semibold text-white">{t("persona.current")}</span>
                      )}
                    </div>
                    <AccessList
                      can={[`access.${u.role}.can1`, `access.${u.role}.can2`] as TKey[]}
                      cannot={[`access.${u.role}.cannot1`, `access.${u.role}.cannot2`] as TKey[]}
                    />
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("persona.requesters")}</h3>
            <div className="mb-3 rounded-xl bg-slate-50 p-3">
              <AccessList can={["access.requester.can1", "access.requester.can2"]} cannot={["access.requester.cannot1", "access.requester.cannot2"]} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {requesters.map((u) => {
                const mine = visibleClaims(u, claims).length;
                const action = queueFor(u, claims).length;
                const current = u.id === user.id && !welcome;
                return (
                  <button
                    key={u.id}
                    onClick={() => pick(u.id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-start transition-colors hover:border-accent-600 hover:bg-accent-50/40 ${
                      current ? "border-accent-600 ring-2 ring-accent-600/30" : "border-slate-200"
                    }`}
                  >
                    <Avatar userId={u.id} />
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900">{name(u.id)}</span>
                      <span className="block text-xs text-slate-500">{t("persona.mine", { n: mine, m: action })}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
