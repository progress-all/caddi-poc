"use client";

import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartSearch } from "./_components/part-search";

export default function RiskAssessmentPage() {
  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <p className="text-sm text-muted-foreground mb-3 flex-shrink-0">
        キーワードで部品を検索し、カードの「類似品を探す」ボタンから代替候補を確認できます
      </p>

      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
        {/* 検索セクション */}
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0 p-4 pb-2">
            <CardTitle className="text-base">部品検索</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 pt-0">
            <Suspense
              fallback={
                <div className="text-sm text-muted-foreground py-4">
                  読み込み中...
                </div>
              }
            >
              <PartSearch />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
