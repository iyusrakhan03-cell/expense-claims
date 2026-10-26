"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ClaimsTable } from "@/components/ClaimsTable";
import { useRequestFilters } from "@/components/RequestFilters";
import { Card, PageHeader } from "@/components/ui";
import { canSubmit, visibleClaims } from "@/lib/workflow";

export default function RequestsPage() {
  const { claims, user, t } = useApp();
  const isRequester = user.role === "requester";
  const mine = visibleClaims(user, claims);
  const { filtered, toolbar } = useRequestFilters(mine, { showRequester: !isRequester });

  return (
    <>
      <PageHeader
        title={isRequester ? t("nav.myRequests") : t("nav.requests")}
        subtitle={isRequester ? t("dash.scopeOwn") : t("dash.scopeAll")}
        actions={
          canSubmit(user.role) ? (
            <Link href="/new" className="btn-primary">
              <PlusCircle className="h-4 w-4" aria-hidden />
              {t("nav.new")}
            </Link>
          ) : undefined
        }
      />
      <Card flush>
        {toolbar}
        <ClaimsTable claims={filtered} showRequester={!isRequester} />
      </Card>
    </>
  );
}
