"use client";

import { Card, CardContent } from "@/components/ui/card";

interface ApiPageLayoutProps {
  form: React.ReactNode;
  result: React.ReactNode;
  isLoading?: boolean;
  error?: Error | null;
}

export function ApiPageLayout({
  form,
  result,
  isLoading,
  error,
}: ApiPageLayoutProps) {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      <Card className="flex flex-col flex-1 min-h-0">
        <CardContent className="p-4 flex flex-col flex-1 min-h-0 gap-3">
          {/* コンパクトなフォーム領域 */}
          <div className="flex-shrink-0">
            {form}
            {error && (
              <div className="text-sm text-destructive mt-2">
                <strong>Error:</strong> {error.message}
              </div>
            )}
          </div>

          {/* 結果表示領域 - 残りの高さを全て使用 */}
          {result && (
            <div className="flex-1 min-h-0 overflow-hidden">
              {result}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
