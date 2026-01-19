import { NextRequest, NextResponse } from "next/server";
import { DigiKeyApiClient } from "@/app/_lib/vendor/digikey/client";

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

    const body = await request.json();
    const { keywords, limit, offset } = body;

    if (!keywords || typeof keywords !== "string") {
      return NextResponse.json(
        { error: "keywords is required and must be a string" },
        { status: 400 }
      );
    }

    const client = new DigiKeyApiClient(clientId, clientSecret);
    const result = await client.keywordSearch({
      keywords,
      limit,
      offset,
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
