import { NextRequest, NextResponse } from "next/server";
import { isDatasheetToolsEnabled } from "@/app/_lib/datasheet/dev-guard";
import { DigiKeyApiClient } from "@/app/_lib/vendor/digikey/client";
import { getMfgMpnDatasheetId } from "@/app/_lib/datasheet/manufacturer-short-names";

/**
 * GET /api/datasheet/datasheet-url?mpn=...&manufacturer=...
 *
 * ローカル開発専用。DigiKey Keyword 検索で先頭候補の Datasheet URL を返す。
 * 本番または ENABLE_DATASHEET_TOOLS 未設定時は 404。
 */
export async function GET(request: NextRequest) {
  if (!isDatasheetToolsEnabled()) {
    return NextResponse.json(
      { error: "Datasheet tools are not available in this environment" },
      { status: 404 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const mpn = searchParams.get("mpn")?.trim();
  const manufacturer = searchParams.get("manufacturer")?.trim();

  if (!mpn) {
    return NextResponse.json(
      { error: "mpn query parameter is required" },
      { status: 400 },
    );
  }

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
    const result = await client.keywordSearch({
      keywords,
      limit: 10,
    });

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

    const manufacturerName = first.Manufacturer?.Name ?? null;
    const suggestedDatasheetId = getMfgMpnDatasheetId(
      manufacturerName ?? undefined,
      first.ManufacturerProductNumber ?? mpn,
    );

    return NextResponse.json({
      datasheetUrl,
      productCount: products.length,
      manufacturerPartNumber: first.ManufacturerProductNumber,
      digiKeyProductNumber: first.ProductVariations?.[0]?.DigiKeyProductNumber,
      manufacturerName,
      suggestedDatasheetId,
    });
  } catch (error) {
    console.error("Datasheet URL API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch datasheet URL", details: message },
      { status: 500 },
    );
  }
}
