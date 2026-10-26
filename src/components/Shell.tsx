"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ChevronsUpDown,
  CircleHelp,
  Inbox,
  Languages,
  ListChecks,
  Menu,
  PlusCircle,
  Receipt,
  RotateCcw,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { TKey } from "@/lib/i18n";
import { queueFor } from "@/lib/workflow";
import { useApp } from "./AppProvider";
import { PersonaSwitcher } from "./PersonaSwitcher";
import { Avatar } from "./ui";

interface NavItem {
  href: string;
  key: TKey;
  icon: LucideIcon;
  badge?: number;
}

function SidebarContent({ onSwitch, onNavigate }: { onSwitch: () => void; onNavigate?: () => void }) {
  const { ready, user, lang, setLang, t, name, reset, claims } = useApp();
  const path = usePathname();
  const isRequester = user.role === "requester";
  const queueCount = ready ? queueFor(user, claims).length : 0;

  const work: NavItem[] = [
    { href: "/", key: `nav.home.${user.role}` as TKey, icon: isRequester ? Receipt : Inbox, badge: queueCount },
    { href: "/requests", key: isRequester ? "nav.myRequests" : "nav.requests", icon: ListChecks },
    ...(isRequester ? [] : [{ href: "/overview", key: "nav.overview" as TKey, icon: BarChart3 }]),
    { href: "/new", key: "nav.new", icon: PlusCircle },
  ];
  const more: NavItem[] = [
    ...(isRequester ? [] : [{ href: "/import", key: "nav.import" as TKey, icon: Upload }]),
    { href: "/guide", key: "nav.guide", icon: CircleHelp },
  ];

  const link = (n: NavItem) => {
    const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
    const Icon = n.icon;
    return (
      <Link
        key={n.href}
        href={n.href}
        onClick={onNavigate}
        className={`flex min-h-[40px] items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
          active ? "bg-white/10 font-semibold text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
        <span className="flex-1">{t(n.key)}</span>
        {!!n.badge && <span className="ltr-num rounded-full bg-accent-600 px-2 text-xs font-semibold text-white">{n.badge}</span>}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600 text-white">
          <Receipt className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-white">{t("app.shortTitle")}</span>
          <span className="block truncate text-xs text-slate-400">{t("app.company")}</span>
        </span>
      </Link>

      <button
        onClick={onSwitch}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-start transition-colors hover:bg-white/10"
        aria-label={t("persona.switch")}
      >
        <Avatar userId={user.id} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{name(user.id)}</span>
          <span className="block truncate text-xs text-slate-400">{t(`role.${user.role}`)}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>

      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("nav.section.work")}</p>
        {work.map(link)}
        <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("nav.section.more")}</p>
        {more.map(link)}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <Languages className="h-[18px] w-[18px]" aria-hidden />
          <span lang={lang === "en" ? "ar" : "en"}>{t("app.language")}</span>
        </button>
        <button
          onClick={() => {
            if (window.confirm(t("app.resetConfirm"))) reset();
          }}
          className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <RotateCcw className="h-[18px] w-[18px]" aria-hidden />
          {t("app.reset")}
        </button>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { ready, firstVisit, lang, setLang, t } = useApp();
  const [switcher, setSwitcher] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const path = usePathname();

  // First visit: let the reviewer choose who they are before anything else.
  useEffect(() => {
    if (ready && firstVisit) setSwitcher(true);
  }, [ready, firstVisit]);

  useEffect(() => setDrawer(false), [path]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 bg-brand lg:block">
        <SidebarContent onSwitch={() => setSwitcher(true)} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-slate-900/60" />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-brand" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute end-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
              onClick={() => setDrawer(false)}
              aria-label={t("persona.close")}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              onSwitch={() => {
                setDrawer(false);
                setSwitcher(true);
              }}
              onNavigate={() => setDrawer(false)}
            />
          </aside>
        </div>
      )}

      <div className="lg:ps-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <button className="btn-ghost h-10 w-10 p-0 lg:hidden" onClick={() => setDrawer(true)} aria-label={t("app.menu")}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
            {t("app.demoMode")}
          </span>
          <p className="hidden min-w-0 flex-1 truncate text-xs text-slate-500 xl:block" title={t("app.demoBanner")}>
            {t("app.demoBanner")}
          </p>
          <div className="ms-auto flex items-center gap-2">
            <button className="btn-secondary" onClick={() => setSwitcher(true)}>
              <Users className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("persona.title")}</span>
            </button>
            <button className="btn-ghost" onClick={() => setLang(lang === "en" ? "ar" : "en")} lang={lang === "en" ? "ar" : "en"}>
              <Languages className="h-4 w-4" aria-hidden />
              {t("app.language")}
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          {ready ? children : <p className="text-sm text-slate-500">{t("app.loading")}</p>}
        </main>
      </div>

      <PersonaSwitcher open={switcher} onClose={() => setSwitcher(false)} welcome={firstVisit} />
    </div>
  );
}
