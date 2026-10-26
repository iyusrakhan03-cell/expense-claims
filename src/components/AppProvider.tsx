"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { seedClaims } from "@/lib/demo";
import { formatDate, formatNumber, translate, type Lang, type TKey } from "@/lib/i18n";
import { getUser, USERS } from "@/lib/reference";
import type { IntakeRecord } from "@/lib/seed";
import type { Action, Claim, User } from "@/lib/types";
import { act, intake, WorkflowError, type ActOptions } from "@/lib/workflow";

const KEY_CLAIMS = "expense-demo:v1:claims";
const KEY_USER = "expense-demo:v1:user";
const KEY_LANG = "expense-demo:v1:lang";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked — the demo still works for this page view */
  }
}

export type Result = { ok: true; id?: string; ids?: string[] } | { ok: false; message: string };

interface AppState {
  ready: boolean;
  /** No person chosen yet in this browser — the shell opens the person picker. */
  firstVisit: boolean;
  claims: Claim[];
  user: User;
  lang: Lang;
  setUser: (id: string) => void;
  setLang: (l: Lang) => void;
  t: (key: TKey, params?: Record<string, string | number>) => string;
  num: (n: number) => string;
  date: (iso: string, withTime?: boolean) => string;
  name: (userId: string) => string;
  run: (claimId: string, action: Action, opts?: ActOptions) => Result;
  submit: (rec: IntakeRecord) => Result;
  importRecords: (recs: IntakeRecord[]) => Result;
  reset: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [userId, setUserId] = useState("ali");
  const [lang, setLangState] = useState<Lang>("en");
  const [firstVisit, setFirstVisit] = useState(false);

  useEffect(() => {
    let loaded: Claim[] | null = null;
    try {
      const raw = read(KEY_CLAIMS);
      if (raw) loaded = JSON.parse(raw) as Claim[];
    } catch {
      loaded = null;
    }
    setClaims(loaded && Array.isArray(loaded) && loaded.length ? loaded : seedClaims());
    const u = read(KEY_USER);
    if (u && getUser(u)) setUserId(u);
    else setFirstVisit(true);
    const l = read(KEY_LANG);
    if (l === "en" || l === "ar") setLangState(l);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) write(KEY_CLAIMS, JSON.stringify(claims));
  }, [claims, ready]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const user = getUser(userId) ?? USERS[0];

  const t = useCallback((key: TKey, params?: Record<string, string | number>) => translate(lang, key, params), [lang]);

  const name = useCallback(
    (id: string) => {
      const u = getUser(id);
      if (!u) return translate(lang, "history.system");
      return lang === "ar" ? u.nameAr : u.name;
    },
    [lang],
  );

  const describe = useCallback(
    (e: unknown): string => {
      if (e instanceof WorkflowError) {
        const key = `deny.${e.reason}` as TKey;
        return translate(lang, key, e.params);
      }
      return String(e);
    },
    [lang],
  );

  const now = () => new Date().toISOString();

  const run = useCallback(
    (claimId: string, action: Action, opts?: ActOptions): Result => {
      try {
        setClaims(act(claims, claimId, user, action, now(), opts));
        return { ok: true };
      } catch (e) {
        return { ok: false, message: describe(e) };
      }
    },
    [claims, user, describe],
  );

  const submit = useCallback(
    (rec: IntakeRecord): Result => {
      try {
        const next = intake(claims, rec, { by: user.id, at: now(), via: "submit" });
        setClaims(next);
        return { ok: true, id: next[next.length - 1].id };
      } catch (e) {
        return { ok: false, message: describe(e) };
      }
    },
    [claims, user, describe],
  );

  const importRecords = useCallback(
    (recs: IntakeRecord[]): Result => {
      const at = now();
      let next = claims;
      try {
        for (const r of recs) next = intake(next, r, { by: user.id, at, via: "import" });
      } catch (e) {
        return { ok: false, message: describe(e) };
      }
      setClaims(next);
      return { ok: true, ids: next.slice(claims.length).map((c) => c.id) };
    },
    [claims, user, describe],
  );

  const reset = useCallback(() => setClaims(seedClaims()), []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      firstVisit,
      claims,
      user,
      lang,
      setUser: (id) => {
        setUserId(id);
        setFirstVisit(false);
        write(KEY_USER, id);
      },
      setLang: (l) => {
        setLangState(l);
        write(KEY_LANG, l);
      },
      t,
      num: (n) => formatNumber(lang, n),
      date: (iso, withTime) => formatDate(lang, iso, withTime),
      name,
      run,
      submit,
      importRecords,
      reset,
    }),
    [ready, firstVisit, claims, user, lang, t, name, run, submit, importRecords, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
