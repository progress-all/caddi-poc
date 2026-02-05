"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/app/_lib/utils";
import { vendors, type Vendor, RISK_ASSESSMENT_PATH, BOM_PATH } from "./vendors";

function getCurrentApiInfo(pathname: string): {
  vendor: Vendor | null;
  endpoint: { href: string; label: string } | null;
} {
  for (const vendor of vendors) {
    const endpoint = vendor.endpoints.find((ep) => ep.href === pathname);
    if (endpoint) {
      return { vendor, endpoint };
    }
  }
  return { vendor: null, endpoint: null };
}

function isRiskAssessmentPage(pathname: string): boolean {
  return pathname.startsWith(RISK_ASSESSMENT_PATH);
}

function isBOMPage(pathname: string): boolean {
  return pathname.startsWith(BOM_PATH);
}

export function HeaderNav() {
  const pathname = usePathname();
  const currentApi = getCurrentApiInfo(pathname);
  const isRiskAssessment = isRiskAssessmentPage(pathname);
  const isBOM = isBOMPage(pathname);

  // ページ別タイトル（区切り線の下に表示）
  let pageTitle: string | null = null;
  if (isRiskAssessment) {
    pageTitle = "リスク評価（部品検索）";
  } else if (isBOM) {
    pageTitle = "BOM一覧";
  } else if (currentApi.vendor && currentApi.endpoint) {
    pageTitle = `${currentApi.vendor.label} / ${currentApi.endpoint.label}`;
  }

  return (
    <header className="bg-card flex-shrink-0">
      {/* 1行目: プロダクト名（固定） */}
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          供給リスク対応AIソリューション
        </h1>
      </div>
      {/* 2行目: タブ [ リスク評価 | BOM一覧 ] */}
      <div className="px-4 py-2 bg-muted/40 border-b border-border">
        <nav className="flex items-center gap-0.5">
          <Button
            variant={isRiskAssessment ? "secondary" : "ghost"}
            asChild
            size="sm"
            className={cn(
              "h-8 px-4 rounded-md",
              isRiskAssessment && "bg-background shadow-sm font-medium"
            )}
          >
            <Link href={RISK_ASSESSMENT_PATH}>リスク評価</Link>
          </Button>
          <Button
            variant={isBOM ? "secondary" : "ghost"}
            asChild
            size="sm"
            className={cn(
              "h-8 px-4 rounded-md",
              isBOM && "bg-background shadow-sm font-medium"
            )}
          >
            <Link href={BOM_PATH}>BOM一覧</Link>
          </Button>
          {vendors.map((vendor) => {
            const hasActiveEndpoint = vendor.endpoints.some(
              (endpoint) => pathname === endpoint.href
            );
            return (
              <DropdownMenu key={vendor.label}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={hasActiveEndpoint ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-8 px-4 rounded-md",
                      hasActiveEndpoint && "bg-background shadow-sm font-medium"
                    )}
                  >
                    {vendor.label}
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {vendor.endpoints.map((endpoint) => {
                    const isActive = pathname === endpoint.href;
                    return (
                      <DropdownMenuItem
                        key={endpoint.href}
                        asChild
                        disabled={endpoint.disabled}
                      >
                        <Link
                          href={endpoint.disabled ? "#" : endpoint.href}
                          className={cn(
                            "flex items-center w-full",
                            isActive && "font-medium"
                          )}
                        >
                          {isActive && (
                            <Check className="mr-2 h-4 w-4 flex-shrink-0" />
                          )}
                          {!isActive && <span className="mr-2 w-4" />}
                          {endpoint.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>
      </div>
      {/* 3行目: ページタイトル（サブヘッダー） */}
      <div className="px-5 pt-4 pb-2">
        {pageTitle && (
          <h2 className="text-base font-semibold text-foreground">
            {pageTitle}
          </h2>
        )}
      </div>
    </header>
  );
}
