import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { UnifiedProduct } from "@/app/_lib/datasheet/types";

const PRODUCTS_DIR = join(process.cwd(), "app/_lib/datasheet/products");
const MAX_IDS = 50;

/**
 * 統合 product 取得API
 * GET /api/products/unified?ids=partId1,partId2,...
 * 存在する id のみ Record<partId, UnifiedProduct> で返す
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json(
        { error: "ids query parameter is required" },
        { status: 400 }
      );
    }

    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      return NextResponse.json({});
    }

    if (ids.length > MAX_IDS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IDS} ids allowed` },
        { status: 400 }
      );
    }

    const results: Record<string, UnifiedProduct> = {};

    await Promise.all(
      ids.map(async (partId) => {
        try {
          const filePath = join(PRODUCTS_DIR, `${partId}.json`);
          const content = await readFile(filePath, "utf-8");
          const data = JSON.parse(content) as UnifiedProduct;
          if (data.partId) {
            results[partId] = data;
          }
        } catch {
          // ファイルが無い or パースエラーは無視
        }
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Products unified GET error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch unified products", details: message },
      { status: 500 }
    );
  }
}

/**
 * 統合 product 保存API
 * POST /api/products/unified
 * Body: { partId, digiKeyParameters, datasheetParameters, manufacturerProductNumber?, digiKeyProductNumber? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      partId,
      digiKeyParameters,
      datasheetParameters,
      manufacturerProductNumber,
      digiKeyProductNumber,
    } = body;

    if (!partId || typeof partId !== "string") {
      return NextResponse.json(
        { error: "partId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!Array.isArray(digiKeyParameters)) {
      return NextResponse.json(
        { error: "digiKeyParameters must be an array" },
        { status: 400 }
      );
    }

    if (
      datasheetParameters != null &&
      typeof datasheetParameters !== "object"
    ) {
      return NextResponse.json(
        { error: "datasheetParameters must be an object or null" },
        { status: 400 }
      );
    }

    const payload: UnifiedProduct = {
      partId,
      digiKeyParameters: digiKeyParameters as UnifiedProduct["digiKeyParameters"],
      datasheetParameters:
        (datasheetParameters as UnifiedProduct["datasheetParameters"]) ?? {},
      updatedAt: new Date().toISOString(),
    };
    if (manufacturerProductNumber != null) {
      payload.manufacturerProductNumber = String(manufacturerProductNumber);
    }
    if (digiKeyProductNumber != null) {
      payload.digiKeyProductNumber = String(digiKeyProductNumber);
    }

    await mkdir(PRODUCTS_DIR, { recursive: true });

    const filePath = join(PRODUCTS_DIR, `${partId}.json`);
    await writeFile(
      filePath,
      JSON.stringify(payload, null, 2),
      "utf-8"
    );

    return NextResponse.json({ ok: true, partId });
  } catch (error) {
    console.error("Products unified POST error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to save unified product", details: message },
      { status: 500 }
    );
  }
}
