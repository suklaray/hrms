import jwt from "jsonwebtoken";
import { getLearningInsights } from "@/lib/assistantLearning";
import prisma from "@/lib/prisma";

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

    // Check if user is admin (you can modify this check based on your user roles)
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get learning insights
    const insights = await getLearningInsights();
    
    // Get recent questions
    const recentQuestions = await prisma.$queryRaw`
      SELECT 
        question, 
        intent_category, 
        intent_labels, 
        frequency, 
        last_asked,
        user_id
      FROM assistant_learning 
      ORDER BY last_asked DESC 
      LIMIT 20
    `;

    // Get popular questions
    const popularQuestions = await prisma.$queryRaw`
      SELECT 
        question, 
        intent_category, 
        frequency, 
        confidence_score
      FROM assistant_learning 
      ORDER BY frequency DESC 
      LIMIT 10
    `;

    res.status(200).json({
      insights,
      recentQuestions,
      popularQuestions,
      totalQuestions: insights.reduce((sum, item) => sum + item.question_count, 0)
    });

  } catch (error) {
    console.error("Insights error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}