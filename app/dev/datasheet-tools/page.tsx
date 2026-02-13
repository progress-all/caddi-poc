"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { searchByKeyword } from "@/app/_lib/vendor/digikey/api";
import type { DigiKeyKeywordSearchResults } from "@/app/_lib/vendor/digikey/types";

type ProductRow = {
  manufacturerProductNumber?: string;
  digiKeyProductNumber?: string;
  datasheetUrl?: string;
  manufacturerName?: string;
};

export default function DatasheetToolsPage() {
  const [manufacturer, setManufacturer] = useState("");
  const [mpn, setMpn] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [downloadStatus, setDownloadStatus] = useState<Record<string, string>>({});
  const [lastDownloadError, setLastDownloadError] = useState<{
    key: string;
    message: string;
    suggestedAction?: string;
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setProducts([]);
    const keywords = [manufacturer.trim(), mpn.trim()].filter(Boolean).join(" ");
    if (!keywords) {
      setSearchError("メーカー名または部品番号を入力してください");
      return;
    }
    setIsSearching(true);
    try {
      const result: DigiKeyKeywordSearchResults = await searchByKeyword({
        keywords,
        limit: 25,
      });
      const list = (result.Products ?? []).map((p) => ({
        manufacturerProductNumber: p.ManufacturerProductNumber,
        digiKeyProductNumber: (p as { DigiKeyProductNumber?: string }).DigiKeyProductNumber,
        datasheetUrl: p.DatasheetUrl ?? (p as { PrimaryDatasheetUrl?: string }).PrimaryDatasheetUrl,
        manufacturerName: p.Manufacturer?.Name,
      }));
      setProducts(list);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "検索に失敗しました");
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (row: ProductRow) => {
    const mpnVal = row.manufacturerProductNumber;
    if (!mpnVal) return;
    const key = row.digiKeyProductNumber ?? mpnVal;
    setLastDownloadError(null);
    setDownloadStatus((prev) => ({ ...prev, [key]: "..." }));
    try {
      const res = await fetch("/api/datasheet/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manufacturer: (row.manufacturerName || manufacturer.trim()) ?? "",
          mpn: mpnVal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLastDownloadError({
          key,
          message: data.message ?? data.error ?? "ダウンロードに失敗しました",
          suggestedAction: data.suggestedAction,
        });
        setDownloadStatus((prev) => ({ ...prev, [key]: "失敗" }));
        return;
      }
      setDownloadStatus((prev) => ({
        ...prev,
        [key]: data.datasheetId
          ? `保存完了: ${data.datasheetId}`
          : data.message ?? "完了",
      }));
    } catch (err) {
      setLastDownloadError({
        key,
        message: err instanceof Error ? err.message : "ダウンロードに失敗しました",
        suggestedAction: "ネットワーク接続を確認して再試行してください。",
      });
      setDownloadStatus((prev) => ({ ...prev, [key]: "失敗" }));
    }
  };

  return (
    <div className="space-y-6">
      {/* ========== 使い方ガイド（トグル） ========== */}
      <Collapsible defaultOpen={false}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="group flex w-full items-center gap-2 text-left rounded-md -m-1 p-1 hover:bg-muted/50 transition-colors"
              >
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 -rotate-90 group-data-[state=open]:rotate-0" />
                <div>
                  <CardTitle>使い方ガイド</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 group-data-[state=open]:hidden">クリックで開く</p>
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 text-sm leading-relaxed pt-0">
              <section>
                <h3 className="font-semibold mb-2">データシート解析の流れ</h3>
                <ol className="space-y-3 ml-1">
                  <li>
                    <span className="font-medium">Step 1: PDFダウンロード（このページ ↓）</span>
                    <p className="text-muted-foreground ml-5 mt-0.5">
                      下の「Step 1: 部品検索・PDFダウンロード」でメーカー名と部品番号を入力して検索し、
                      該当する部品の「ダウンロード」ボタンを押す。
                      PDFが <code className="text-xs bg-muted px-1 py-0.5 rounded">docs/datasheet/output/&lt;id&gt;/</code> に保存される。
                    </p>
                  </li>
                  <li>
                    <span className="font-medium">Step 2: パラメータ抽出（Cursor）</span>
                    <p className="text-muted-foreground ml-5 mt-0.5">
                      Cursorのチャットで以下のように入力する:
                    </p>
                    <code className="block text-xs bg-muted px-3 py-2 rounded mt-1 ml-5">
                      /parse-datasheet &lt;datasheet-id&gt; @docs/datasheet/output/&lt;id&gt;/&lt;id&gt;.pdf
                    </code>
                    <p className="text-muted-foreground ml-5 mt-0.5">
                      AIがスキーマ生成 → パラメータ抽出 → バリデーション → JSON出力を自動で実行する。
                      完了すると、抽出結果JSONが <code className="text-xs bg-muted px-1 py-0.5 rounded">app/_lib/datasheet/data/&lt;id&gt;.json</code> に自動配置され、
                      フロントエンドから参照可能になる。
                    </p>
                  </li>
                </ol>
              </section>

              <section>
                <h3 className="font-semibold mb-2">リスク評価画面で類似度を表示する場合</h3>
                <p className="text-muted-foreground mb-2">
                  比較元（Target）と比較先（Candidate）の両方のPDFを上記の手順で解析した後、
                  以下を実行する:
                </p>
                <ol className="space-y-2 ml-1">
                  <li>
                    <span className="font-medium">Step 3: 類似度評価（Cursor）</span>
                    <p className="text-muted-foreground ml-5 mt-0.5">
                      Cursorのチャットで以下のようにスキルを呼び出す:
                    </p>
                    <code className="block text-xs bg-muted px-3 py-2 rounded mt-1 ml-5 whitespace-pre-wrap break-all">
                      /evaluate-similarity で Target: app/_lib/datasheet/data/&lt;target-id&gt;.json、{"\n"}Candidate: app/_lib/datasheet/data/&lt;candidate-id&gt;.json、{"\n"}出力先: app/_lib/datasheet/similarity-results/&lt;target-id&gt;/&lt;candidate-id&gt;.json を実行して
                    </code>
                    <p className="text-muted-foreground ml-5 mt-0.5">
                      例: Target=TI_LM358M, Candidate=TI_LM358M_NOPB の場合
                    </p>
                    <code className="block text-xs bg-muted px-3 py-2 rounded mt-1 ml-5 whitespace-pre-wrap break-all">
                      /evaluate-similarity で Target: app/_lib/datasheet/data/TI_LM358M.json、{"\n"}Candidate: app/_lib/datasheet/data/TI_LM358M_NOPB.json、{"\n"}出力先: app/_lib/datasheet/similarity-results/TI_LM358M/TI_LM358M_NOPB.json を実行して
                    </code>
                  </li>
                </ol>
              </section>

              <section>
                <h3 className="font-semibold mb-2">前提条件</h3>
                <ul className="list-disc list-inside space-y-1 ml-1 text-muted-foreground">
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code>{" "}
                    に以下を設定していること:
                    <code className="block text-xs bg-muted px-3 py-2 rounded mt-1 ml-5 whitespace-pre">{`ENABLE_DATASHEET_TOOLS=1\nDIGIKEY_CLIENT_ID=<your-client-id>\nDIGIKEY_CLIENT_SECRET=<your-client-secret>`}</code>
                  </li>
                  <li>
                    開発サーバーを <code className="text-xs bg-muted px-1 py-0.5 rounded">npm run dev</code> で起動していること
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold mb-2">なぜこの仕組みか</h3>
                <p className="text-muted-foreground">
                  Vercel Blob（ファイルストレージ）を未導入のため、LLMで生成したJSONをバックエンドに動的に保存できません。
                  そのため、抽出結果は <code className="text-xs bg-muted px-1 py-0.5 rounded">app/_lib/datasheet/data/</code>（Git管理下）に直接配置し、
                  コミット・デプロイに含める運用としています。
                </p>
              </section>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ========== Step 1: 部品検索・PDFダウンロード ========== */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: 部品検索・PDFダウンロード</CardTitle>
          <p className="text-sm text-muted-foreground">
            メーカー名と部品番号（MPN）で検索し、データシートPDFをダウンロードします。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="manufacturer">メーカー名</Label>
              <Input
                id="manufacturer"
                placeholder="例: Texas Instruments, Murata"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mpn">部品番号 (MPN)</Label>
              <Input
                id="mpn"
                placeholder="例: LM358M, GRM185R60J105KE26"
                value={mpn}
                onChange={(e) => setMpn(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isSearching}>
              {isSearching ? "検索中..." : "検索"}
            </Button>
          </form>
          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}
        </CardContent>
      </Card>

      {lastDownloadError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive text-base">
              ダウンロード失敗
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">{lastDownloadError.message}</p>
            {lastDownloadError.suggestedAction && (
              <p className="text-sm text-muted-foreground">
                対処法: {lastDownloadError.suggestedAction}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>検索結果</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>メーカー</TableHead>
                  <TableHead>部品番号 (MPN)</TableHead>
                  <TableHead>DigiKey 品番</TableHead>
                  <TableHead>データシート</TableHead>
                  <TableHead className="w-[140px]">ダウンロード</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((row, i) => {
                  const key = row.digiKeyProductNumber ?? row.manufacturerProductNumber ?? String(i);
                  return (
                    <TableRow key={key}>
                      <TableCell>{row.manufacturerName ?? "-"}</TableCell>
                      <TableCell>{row.manufacturerProductNumber ?? "-"}</TableCell>
                      <TableCell>{row.digiKeyProductNumber ?? "-"}</TableCell>
                      <TableCell>
                        {row.datasheetUrl ? (
                          <a
                            href={row.datasheetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline"
                          >
                            PDF
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!row.datasheetUrl}
                          onClick={() => handleDownload(row)}
                        >
                          ダウンロード
                        </Button>
                        {downloadStatus[key] && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {downloadStatus[key]}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
