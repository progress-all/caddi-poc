"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartSearch } from "./_components/part-search";

export default function RiskAssessmentPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">規制リスク評価・代替品提案</h1>
        <p className="text-sm text-muted-foreground">
          キーワードで部品を検索し、カードの「類似品を探す」ボタンから代替候補を確認できます
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {/* 検索セクション */}
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-base">部品検索</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden">
            <PartSearch />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
