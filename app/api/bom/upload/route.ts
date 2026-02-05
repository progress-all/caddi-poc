import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

import type { BOMRow } from "@/app/bom/_lib/types";
import { parseCSV } from "@/app/_lib/csv-utils";
import { DigiKeyApiClient } from "@/app/_lib/vendor/digikey/client";
import { enrichBomRows } from "../enrich-bom";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 500;

function parseXLSXToBOMRows(buffer: ArrayBuffer): BOMRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
  }) as string[][];

  if (raw.length < 2) return [];

  const headerRow = raw[0].map((h) => String(h ?? "").trim());
  const headerIndex: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    headerIndex[h] = i;
  });

  const getCol = (row: string[], key: keyof BOMRow): string => {
    const i = headerIndex[key as string];
    return i !== undefined ? String(row[i] ?? "").trim() : "";
  };

  const rows: BOMRow[] = [];
  for (let r = 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row || row.length === 0) continue;
    const 部品型番 = getCol(row, "部品型番");
    if (!部品型番) continue;
    rows.push({
      サブシステム: getCol(row, "サブシステム"),
      カテゴリ: getCol(row, "カテゴリ"),
      部品型番,
      メーカー: getCol(row, "メーカー"),
      製品概要: getCol(row, "製品概要"),
      製品ページURL: getCol(row, "製品ページURL"),
    });
  }
  return rows;
}

/**
 * BOMアップロードAPI（PoC）
 * CSV/Excelをその場でパース・リスク付与し、結果をレスポンスで返す（ファイル・キャッシュ保存なし）
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "ファイルが指定されていません。" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `ファイルサイズは${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB以下にしてください。` },
        { status: 400 }
      );
    }

    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let rows: BOMRow[];

    if (name.endsWith(".csv")) {
      const csvText = new TextDecoder("utf-8").decode(buffer);
      const parsed = parseCSV<Record<string, string>>(csvText);
      rows = parsed
        .filter((r) => r["部品型番"] != null && String(r["部品型番"]).trim() !== "")
        .map((r) => ({
          サブシステム: String(r["サブシステム"] ?? "").trim(),
          カテゴリ: String(r["カテゴリ"] ?? "").trim(),
          部品型番: String(r["部品型番"] ?? "").trim(),
          メーカー: String(r["メーカー"] ?? "").trim(),
          製品概要: String(r["製品概要"] ?? "").trim(),
          製品ページURL: String(r["製品ページURL"] ?? "").trim(),
        })) as BOMRow[];
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      rows = parseXLSXToBOMRows(
        buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      );
    } else {
      return NextResponse.json(
        { error: "CSVまたはExcel（.xlsx, .xls）ファイルを指定してください。" },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "有効なデータ行がありません。部品型番が必須です。" },
        { status: 400 }
      );
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `行数は${MAX_ROWS}行以下にしてください。（現在${rows.length}行）` },
        { status: 400 }
      );
    }

    const clientId = process.env.DIGIKEY_CLIENT_ID;
    const clientSecret = process.env.DIGIKEY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "DigiKey APIの設定がありません。" },
        { status: 500 }
      );
    }

    const client = new DigiKeyApiClient(clientId, clientSecret);
    const rowsWithRisk = await enrichBomRows(rows, client);
    return NextResponse.json(rowsWithRisk);
  } catch (error) {
    console.error("BOM upload error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "アップロードに失敗しました。", details: message },
      { status: 500 }
    );
  }
}
