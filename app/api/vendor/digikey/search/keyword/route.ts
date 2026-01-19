import { NextRequest, NextResponse } from "next/server";
import { DigiKeyApiClient } from "@/app/_lib/vendor/digikey/client";
import type {
  KeywordSearchInput,
  DigiKeySortOptions,
  DigiKeyFilterOptionsRequest,
  DigiKeySortField,
  DigiKeySortOrder,
} from "@/app/_lib/vendor/digikey/types";

// 有効なソートフィールド値
const validSortFields: DigiKeySortField[] = [
  "None",
  "DigiKeyProductNumber",
  "ManufacturerProductNumber",
  "Manufacturer",
  "MinimumQuantity",
  "QuantityAvailable",
  "Price",
  "Packaging",
  "ProductStatus",
  "Supplier",
  "PriceManufacturerStandardPackage",
];

// 有効なソート順序値
const validSortOrders: DigiKeySortOrder[] = ["Ascending", "Descending"];

export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.DIGIKEY_CLIENT_ID;
    const clientSecret = process.env.DIGIKEY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            "DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET environment variables are not set",
        },
        { status: 500 }
      );
    }

    const body: KeywordSearchInput = await request.json();
    const {
      keywords,
      limit,
      offset,
      sortField,
      sortOrder,
      manufacturerIds,
      categoryIds,
      statusIds,
      minimumQuantityAvailable,
    } = body;

    if (!keywords || typeof keywords !== "string") {
      return NextResponse.json(
        { error: "keywords is required and must be a string" },
        { status: 400 }
      );
    }

    // SortOptionsを構築（空文字列や無効な値は除外）
    const validatedSortField = validSortFields.includes(
      sortField as DigiKeySortField
    )
      ? (sortField as DigiKeySortField)
      : undefined;
    const validatedSortOrder = validSortOrders.includes(
      sortOrder as DigiKeySortOrder
    )
      ? (sortOrder as DigiKeySortOrder)
      : undefined;
    const sortOptions: DigiKeySortOptions | undefined =
      validatedSortField || validatedSortOrder
        ? {
            Field: validatedSortField,
            SortOrder: validatedSortOrder,
          }
        : undefined;

    // FilterOptionsRequestを構築
    const manufacturerFilter = manufacturerIds
      ? manufacturerIds
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
          .map((id) => ({ Id: id }))
      : undefined;

    const categoryFilter = categoryIds
      ? categoryIds
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
          .map((id) => ({ Id: id }))
      : undefined;

    const statusFilter = statusIds
      ? statusIds
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
          .map((id) => ({ Id: id }))
      : undefined;

    const filterOptionsRequest: DigiKeyFilterOptionsRequest | undefined =
      manufacturerFilter ||
      categoryFilter ||
      statusFilter ||
      minimumQuantityAvailable !== undefined
        ? {
            ManufacturerFilter: manufacturerFilter,
            CategoryFilter: categoryFilter,
            StatusFilter: statusFilter,
            MinimumQuantityAvailable:
              minimumQuantityAvailable !== undefined
                ? minimumQuantityAvailable
                : undefined,
          }
        : undefined;

    const client = new DigiKeyApiClient(clientId, clientSecret);
    const result = await client.keywordSearch({
      keywords,
      limit,
      offset,
      sortOptions,
      filterOptionsRequest,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("DigiKey API keyword search error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCause =
      error instanceof Error && error.cause ? error.cause : undefined;
    return NextResponse.json(
      {
        error: "Failed to search by keyword",
        details: errorMessage,
        cause: errorCause,
      },
      { status: 500 }
    );
  }
}
