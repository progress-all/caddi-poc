import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { parseCSV } from "@/app/_lib/csv-utils";
import type { BOMRow } from "@/app/bom/_lib/types";
import { DigiKeyApiClient } from "@/app/_lib/vendor/digikey/client";
import { withCache, buildCacheKey } from "@/app/_lib/cache";
import { enrichBomRows } from "./enrich-bom";

/**
 * BOMデータ取得API
 * GET /api/bom?id={bom-id}
 * 
 * キャッシュが存在する場合はキャッシュを返し、
 * 存在しない場合はCSVを読み込んでDigiKey APIを呼び出し、キャッシュを保存してから返す
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bomId = searchParams.get("id");

    if (!bomId) {
      return NextResponse.json(
        { error: "id parameter is required" },
        { status: 400 }
      );
    }

    // パス検証（ディレクトリトラバーサル対策）
    if (bomId.includes("..") || bomId.includes("/") || bomId.includes("\\")) {
      return NextResponse.json(
        { error: "Invalid bom-id" },
        { status: 400 }
      );
    }

    // キャッシュキーの生成
    const cacheKey = buildCacheKey({ id: bomId });

    // キャッシュを使用してBOMデータを取得
    const { data: rowsWithRisk, fromCache } = await withCache(
      {
        namespace: "bom",
        key: cacheKey,
      },
      async () => {
        // CSV読み込み: アップロード用 → public の順
        const uploadsPath = path.join(process.cwd(), "data", "bom-uploads", `${bomId}.csv`);
        const publicPath = path.join(process.cwd(), "public", "data", `${bomId}.csv`);
        let csvText: string;
        try {
          csvText = await fs.readFile(uploadsPath, "utf-8");
        } catch {
          try {
            csvText = await fs.readFile(publicPath, "utf-8");
          } catch {
            throw new Error(`BOM file not found: ${bomId}.csv`);
          }
        }

        // CSVをパース
        const parsedRows = parseCSV<Record<string, string>>(csvText);
        const rows = parsedRows as unknown as BOMRow[];

        const clientId = process.env.DIGIKEY_CLIENT_ID;
        const clientSecret = process.env.DIGIKEY_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          throw new Error(
            "DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET environment variables are not set"
          );
        }
        const client = new DigiKeyApiClient(clientId, clientSecret);
        return enrichBomRows(rows, client);
      }
    );

    return NextResponse.json(rowsWithRisk, {
      headers: {
        "X-Cache": fromCache ? "HIT" : "MISS",
      },
    });
  } catch (error) {
    console.error("BOMデータ取得エラー:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to get BOM data",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
