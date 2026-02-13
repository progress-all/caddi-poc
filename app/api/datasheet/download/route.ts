import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isDatasheetToolsEnabled } from "@/app/_lib/datasheet/dev-guard";
import {
  resolveToPdfBuffer,
  NotPdfError,
  CouldNotResolvePdfError,
} from "@/app/_lib/datasheet/resolve-pdf-url";
import { DigiKeyApiClient } from "@/app/_lib/vendor/digikey/client";
import { MANUFACTURER_SHORT_NAMES } from "@/app/_lib/datasheet/manufacturer-short-names";

const PROJECT_ROOT = process.cwd();

function sanitizeForId(s: string): string {
  return (
    String(s)
      .replaceAll(/\s+/g, "_")
      .replaceAll(/[/\\:*?"<>|]/g, "_")
      .trim() || "unknown"
  );
}

/**
 * データシートIDを決定する。
 * 形式: {MfgShort}_{MPN}  例: TI_LM358M, Broadcom_ATF-511P8-BLK
 *
 * 重要: URL由来のリビジョン番号は付与しない。
 * toResponseCandidateKeys() がアンダースコアで分割してMPNを復元するため、
 * MPN以降に余分な "_数字" が付くとMPNキーの生成に失敗する。
 */
function resolveDatasheetId(params: {
  id: string | null;
  manufacturer: string;
  mpn: string;
}): string {
  if (params.id) return params.id;
  const mfgShort =
    MANUFACTURER_SHORT_NAMES[params.manufacturer] ??
    MANUFACTURER_SHORT_NAMES[params.manufacturer.trim()] ??
    sanitizeForId(params.manufacturer || "unknown");
  const mpnPart = sanitizeForId(params.mpn);
  return `${mfgShort}_${mpnPart}`;
}

/**
 * POST /api/datasheet/download
 * Body: { manufacturer?: string, mpn: string, id?: string }
 *
 * ローカル開発専用。DigiKey で Datasheet URL 取得 → PDF ダウンロード → docs/datasheet/output/<id>/ に保存。
 */
export async function POST(request: NextRequest) {
  if (!isDatasheetToolsEnabled()) {
    return NextResponse.json(
      { error: "Datasheet tools are not available in this environment" },
      { status: 404 },
    );
  }

  let body: { manufacturer?: string; mpn?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mpn = body.mpn?.trim();
  if (!mpn) {
    return NextResponse.json({ error: "mpn is required" }, { status: 400 });
  }

  const manufacturer = body.manufacturer?.trim() ?? "";
  const clientId = process.env.DIGIKEY_CLIENT_ID;
  const clientSecret = process.env.DIGIKEY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET environment variables are not set",
      },
      { status: 500 },
    );
  }

  try {
    const keywords = manufacturer ? `${manufacturer} ${mpn}` : mpn;
    const client = new DigiKeyApiClient(clientId, clientSecret);
    const result = await client.keywordSearch({ keywords, limit: 10 });
    const products = result.Products ?? [];
    if (products.length === 0) {
      return NextResponse.json(
        { error: "No products found", datasheetUrl: null },
        { status: 200 },
      );
    }

    const first = products[0];
    let datasheetUrl: string | null =
      first.DatasheetUrl ??
      (first as { PrimaryDatasheetUrl?: string }).PrimaryDatasheetUrl ??
      null;
    // DigiKey が //mm.digikey.com/... のようなプロトコル相対URLを返す場合があるので正規化
    if (datasheetUrl?.startsWith("//")) {
      datasheetUrl = `https:${datasheetUrl}`;
    }

    if (!datasheetUrl) {
      return NextResponse.json(
        {
          error:
            "No datasheet URL for this product. Place PDF manually under docs/datasheet/output/<id>/<id>.pdf",
        },
        { status: 200 },
      );
    }

    // DigiKey 応答のメーカー名を優先し、無ければリクエストの manufacturer にフォールバック
    const digiKeyMfg = first.Manufacturer?.Name ?? "";
    const datasheetId = resolveDatasheetId({
      id: body.id?.trim() ?? null,
      manufacturer: digiKeyMfg || manufacturer,
      mpn,
    });

    const dir = join(PROJECT_ROOT, "docs", "datasheet", "output", datasheetId);
    const pdfPath = join(dir, `${datasheetId}.pdf`);
    await mkdir(dir, { recursive: true });

    const { buffer } = await resolveToPdfBuffer(datasheetUrl);
    await writeFile(pdfPath, Buffer.from(buffer));

    return NextResponse.json({
      datasheetId,
      path: pdfPath,
      message: `Saved to docs/datasheet/output/${datasheetId}/${datasheetId}.pdf`,
    });
  } catch (error) {
    console.error("Datasheet download API error:", error);

    if (error instanceof NotPdfError) {
      return NextResponse.json(
        {
          error: "not_pdf",
          message: error.message,
          originalUrl: error.originalUrl,
          contentType: error.contentType,
          suggestedAction:
            "The URL may point to an HTML redirect page (e.g. manufacturer). Try opening the URL in a browser and downloading the PDF manually, then place it under docs/datasheet/output/<id>/<id>.pdf",
        },
        { status: 422 },
      );
    }

    if (error instanceof CouldNotResolvePdfError) {
      return NextResponse.json(
        {
          error: "could_not_resolve_pdf",
          message: error.message,
          originalUrl: error.originalUrl,
          suggestedAction:
            "Open the URL in a browser, find the direct PDF link, and download manually to docs/datasheet/output/<id>/<id>.pdf",
        },
        { status: 422 },
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "download_failed",
        message,
        suggestedAction: "Check the URL or try manual download.",
      },
      { status: 500 },
    );
  }
}
