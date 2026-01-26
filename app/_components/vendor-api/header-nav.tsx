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

  return (
    <header className="border-b bg-card flex-shrink-0">
      <div className="flex items-center gap-4 px-4 h-12">
        {/* 左側: メニュー（リスク評価 → Mouser → DigiKey の順） */}
        <nav className="flex items-center gap-2">
          {/* リスク評価へのリンク */}
          <Button
            variant={isRiskAssessment ? "secondary" : "ghost"}
            asChild
            className={cn(
              "h-9 px-3",
              isRiskAssessment &&
              "bg-primary/10 text-foreground font-medium"
            )}
          >
            <Link href={RISK_ASSESSMENT_PATH}>リスク評価</Link>
          </Button>

          {/* BOM一覧へのリンク */}
          <Button
            variant={isBOM ? "secondary" : "ghost"}
            asChild
            className={cn("h-9 px-3", isBOM && "bg-primary/10 text-foreground font-medium")}
          >
            <Link href={BOM_PATH}>BOM一覧</Link>
          </Button>

          {/* ベンダードロップダウンメニュー */}
          {vendors.map((vendor) => {
            const hasActiveEndpoint = vendor.endpoints.some(
              (endpoint) => pathname === endpoint.href
            );

            return (
              <DropdownMenu key={vendor.label}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={hasActiveEndpoint ? "secondary" : "ghost"}
                    className={cn(
                      "h-9 px-3",
                      hasActiveEndpoint &&
                      "bg-primary/10 text-foreground font-medium"
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

        {/* API選択の右横: 現在のAPI表示（ページタイトル） */}
        {currentApi.vendor && currentApi.endpoint && (
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span>{currentApi.vendor.label}</span>
            <span className="text-muted-foreground">/</span>
            <span>{currentApi.endpoint.label}</span>
          </h1>
        )}
        {isRiskAssessment && (
          <h1 className="text-lg font-semibold text-foreground">
            規制リスク評価・代替品提案
          </h1>
        )}
        {isBOM && (
          <h1 className="text-lg font-semibold text-foreground">
            BOM一覧
          </h1>
        )}
      </div>
    </header>
  );
}
