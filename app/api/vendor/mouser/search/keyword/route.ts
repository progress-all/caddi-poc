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
    const { keyword, records, startingRecord } = body;

    if (!keyword || typeof keyword !== "string") {
      return NextResponse.json(
        { error: "keyword is required and must be a string" },
        { status: 400 }
      );
    }

    const client = new MouserApiClient(apiKey);
    const result = await client.searchByKeyword({
      keyword,
      records,
      startingRecord,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Mouser API keyword search error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCause =
      error instanceof Error && error.cause
        ? error.cause
        : undefined;
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
