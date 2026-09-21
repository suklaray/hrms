import { createRouteHandler } from "@/lib/apiAdapter";
import { runAutoCheckout } from "@/lib/autoCheckout";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const result = await runAutoCheckout();

    return res.status(200).json({
      message: `Auto-checkout completed for ${result.processedCount} records`,
      checkedOutCount: result.processedCount,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Auto-checkout failed",
    });
  }
}

export const { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS } = createRouteHandler(handler);
