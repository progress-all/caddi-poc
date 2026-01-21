import { NextRequest, NextResponse } from "next/server";
import { DigiKeyApiClient } from "@/app/_lib/vendor/digikey/client";
import type { RecommendedProductsInput } from "@/app/_lib/vendor/digikey/types";

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

    const body: RecommendedProductsInput = await request.json();
    const {
      productNumber,
      limit,
      searchOptionList,
      excludeMarketPlaceProducts,
    } = body;

    if (!productNumber || typeof productNumber !== "string") {
      return NextResponse.json(
        { error: "productNumber is required and must be a string" },
        { status: 400 }
      );
    }

    const client = new DigiKeyApiClient(clientId, clientSecret);
    const result = await client.getRecommendedProducts({
      productNumber,
      limit,
      searchOptionList,
      excludeMarketPlaceProducts,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("DigiKey API recommended products error:", error);
    const errorCause =
      error instanceof Error && error.cause ? error.cause : undefined;
    if (errorCause) {
      console.error("Error cause:", JSON.stringify(errorCause, null, 2));
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to get recommended products",
        details: errorMessage,
        cause: errorCause,
      },
      { status: 500 }
    );
  }
}
