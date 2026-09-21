import { NextRequest, NextResponse } from "next/server";
import { runAutoCheckout } from "@/lib/autoCheckout";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  

  try {
    const result = await runAutoCheckout();

    return NextResponse.json({
      message: `Auto-checkout completed for ${result.processedCount} records`,
      checkedOutCount: result.processedCount,
    }, { status: 200 });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      error: "Auto-checkout failed",
    }, { status: 500 });
  }
}

