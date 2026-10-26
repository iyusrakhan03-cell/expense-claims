"use client";

import type { TKey } from "@/lib/i18n";
import type { Flag } from "@/lib/types";
import { useApp } from "./AppProvider";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Full, translated sentence for a flag, with names, numbers and dates formatted for the current language. */
export function useFlagText() {
  const { t, num, date, name } = useApp();
  return (f: Flag) => {
    const params: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(f.params)) {
      if (k === "by") params[k] = name(String(v));
      else if (typeof v === "number") params[k] = num(v);
      else if (ISO_DATE.test(v)) params[k] = date(v);
      else params[k] = v;
    }
    return t(`flag.${f.code}` as TKey, params);
  };
}
