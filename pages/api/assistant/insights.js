import jwt from "jsonwebtoken";
import { getLearningInsights } from "@/lib/intentHandler";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get user from token
    const token = req.cookies.token || req.cookies.employeeToken;
    let user = null;

    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
      }
    }

    // Check if user is admin or superadmin
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get simulated learning insights (no DB reads)
    const insights = getLearningInsights();
    
    // Format insights for display
    const formattedInsights = {
      totalQuestions: insights.totalQuestions,
      activeConversations: insights.activeConversations,
      mostCommonIntents: insights.mostCommonIntents,
      avgConfidenceByIntent: insights.avgConfidenceByIntent,
      recentQuestions: insights.recentQuestions,
      summary: {
        topIntent: insights.mostCommonIntents[0]?.[0] || 'payslip',
        avgConfidence: Object.values(insights.avgConfidenceByIntent).reduce((a, b) => a + b, 0) / Object.keys(insights.avgConfidenceByIntent).length || 0.8,
        conversationHealth: insights.activeConversations > 0 ? 'Active' : 'Quiet'
      }
    };
    
    res.status(200).json({
      success: true,
      insights: formattedInsights,
      message: "Simulated learning insights - lightweight self-learning system"
    });

  } catch (error) {
    console.error("Insights error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}