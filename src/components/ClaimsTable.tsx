"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Inbox } from "lucide-react";
import type { Claim } from "@/lib/types";
import { useApp } from "./AppProvider";
import { Amount, Avatar, ClaimLink, Empty, Owner, ProjectName, Reasons, SampleTag, StatusBadge, TriageBadge } from "./ui";

export function ClaimsTable({ claims, showRequester = true, emptyText }: { claims: Claim[]; showRequester?: boolean; emptyText?: string }) {
  const { t, date, name } = useApp();
  const router = useRouter();
  if (!claims.length) return <Empty icon={Inbox} text={emptyText ?? t("list.empty")} />;
  const open = (id: string) => router.push(`/requests/${id}`);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50/80">
            <tr>
              <th className="th">{t("section.request")}</th>
              {showRequester && <th className="th">{t("field.requester")}</th>}
              <th className="th">{t("field.project")}</th>
              <th className="th text-end">{t("field.amount")}</th>
              <th className="th">{t("field.status")}</th>
              <th className="th">{t("field.owner")}</th>
              <th className="th">{t("field.triage")}</th>
              <th className="th" aria-hidden />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {claims.map((c) => (
              <tr key={c.id} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => open(c.id)}>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <ClaimLink id={c.id} />
                    {c.isSample && <SampleTag />}
                  </div>
                  <div className="mt-0.5 max-w-[180px] truncate text-slate-700" title={c.purpose ?? ""}>
                    {c.purpose ?? <span className="text-amber-700">{t("value.missing")}</span>}
                  </div>
                  <div className="text-xs text-slate-400">{date(c.receivedAt, true)}</div>
                </td>
                {showRequester && (
                  <td className="td">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Avatar userId={c.requesterId} size="sm" />
                      {name(c.requesterId)}
                    </span>
                  </td>
                )}
                <td className="td whitespace-nowrap">
                  <ProjectName code={c.projectCode} stacked />
                </td>
                <td className="td text-end">
                  <Amount claim={c} />
                </td>
                <td className="td">
                  <StatusBadge status={c.status} />
                </td>
                <td className="td">
                  <Owner claim={c} stacked />
                </td>
                <td className="td">
                  <div className="flex min-w-[170px] max-w-[240px] flex-col items-start gap-1.5">
                    <TriageBadge claim={c} />
                    <Reasons claim={c} />
                  </div>
                </td>
                <td className="td text-slate-300">
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {claims.map((c) => (
          <li key={c.id}>
            <button className="flex w-full cursor-pointer flex-col gap-2 p-4 text-start hover:bg-slate-50" onClick={() => open(c.id)}>
              <div className="flex w-full items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="ltr-num font-mono font-semibold text-accent-700">{c.id}</span>
                  {c.isSample && <SampleTag />}
                </span>
                <Amount claim={c} />
              </div>
              <div className="text-sm text-slate-700">
                {c.purpose} {showRequester && <span className="text-slate-400">· {name(c.requesterId)}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge status={c.status} />
                <TriageBadge claim={c} />
              </div>
              <Reasons claim={c} hideEmpty />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
