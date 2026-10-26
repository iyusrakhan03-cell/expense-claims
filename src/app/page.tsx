"use client";

import { useApp } from "@/components/AppProvider";
import { FinanceHome, OpsHome, PmHome, RequesterHome } from "@/components/RoleHomes";

export default function Home() {
  const { user } = useApp();
  if (user.role === "pm") return <PmHome />;
  if (user.role === "finance") return <FinanceHome />;
  if (user.role === "ops") return <OpsHome />;
  return <RequesterHome />;
}
