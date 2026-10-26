"use client";

import { useApp } from "@/components/AppProvider";
import { Card, PageHeader } from "@/components/ui";
import type { TKey } from "@/lib/i18n";

const STEPS: TKey[] = ["guide.s1", "guide.s2", "guide.s3", "guide.s4", "guide.s5", "guide.s6", "guide.s7", "guide.s8", "guide.s9", "guide.s10"];

export default function GuidePage() {
  const { t } = useApp();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t("guide.title")} subtitle={t("guide.intro")} />
      <Card>
        <ol className="space-y-3">
          {STEPS.map((k, i) => (
            <li key={k} className="flex gap-3 text-sm">
              <span className="ltr-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-relaxed">{t(k)}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
