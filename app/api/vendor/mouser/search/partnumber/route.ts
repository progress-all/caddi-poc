import { NextRequest, NextResponse } from "next/server";
import { MouserApiClient } from "@/app/_lib/vendor/mouser/client";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.MOUSER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "MOUSER_API_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { partNumber, partSearchOptions } = body;

    if (!partNumber || typeof partNumber !== "string") {
      return NextResponse.json(
        { error: "partNumber is required and must be a string" },
        { status: 400 }
      );
    }

    const client = new MouserApiClient(apiKey);
    const result = await client.searchByPartNumber({
      partNumber,
      partSearchOptions,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Mouser API partnumber search error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCause =
      error instanceof Error && error.cause
        ? error.cause
        : undefined;
    return NextResponse.json(
      {
        error: "Failed to search by part number",
        details: errorMessage,
        cause: errorCause,
      },
      { status: 500 }
    );
  }
}
