import jwt from "jsonwebtoken";
import { 
  detectAdvancedIntent, 
  generateIntentResponse,
  handleConfirmationResponse,
  storeQuestionResponse
} from "@/lib/intentHandler";
import { getRelevantFile } from "@/lib/fileKnowledge";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    // Get user from token
    const token = req.cookies.token || req.cookies.employeeToken;
    let user = null;

    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.log("Token verification failed:", err.message);
      }
    }

    // Advanced intent detection with user context
    const userId = user?.empid || user?.id || 'anonymous';
    const intent = detectAdvancedIntent(question, userId);

    let answer;
    const botMode = process.env.BOT_MODE || "RULE_BASED";
    const source = botMode;

    if (botMode === "LLM") {
      // LLM-based response
      const { getLLMAnswerFromRepo } = await import("@/lib/llm");
      const llmResult = await getLLMAnswerFromRepo(question, intent, user);
      answer = llmResult?.answer || "Sorry, I couldn't generate an answer.";
    } else {
      // Rule-based response with file content for policy/holiday
      answer = await generateFileBasedAnswer(question, user, intent, userId);
    }

    // Store question and response for learning (in-memory)
    try {
      const finalAnswer = typeof answer === 'object' && answer.answer ? answer.answer : answer;
      storeQuestionResponse(question, finalAnswer, userId, intent);
    } catch (error) {
      console.log("Failed to store learning data:", error.message);
    }

    // Handle both string and object responses with confidence
    const responseData = {
      answer: typeof answer === 'object' && answer.answer ? answer.answer : answer,
      sourceFile: typeof answer === 'object' && answer.sourceFile ? answer.sourceFile : null,
      downloadUrl: typeof answer === 'object' && answer.downloadUrl ? answer.downloadUrl : null,
      // confidence: typeof answer === 'object' && answer.confidence ? answer.confidence : Math.round(intent.confidence * 100),
      needsConfirmation: typeof answer === 'object' && answer.needsConfirmation ? answer.needsConfirmation : false,
      needsClarification: typeof answer === 'object' && answer.needsClarification ? answer.needsClarification : false,
      suggestedResponse: typeof answer === 'object' && answer.suggestedResponse ? answer.suggestedResponse : null,
      source,
      intent: intent.primaryIntent,
      subIntent: intent.subIntent,
      labels: intent.labels
    };
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Assistant error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// File-based answer generation for policy and holiday queries
async function generateFileBasedAnswer(question, user, intent, userId) {
  // Handle confirmation responses (yes/no) - return file content if confirmed
  const q = question.toLowerCase().trim();
  if (q === 'yes' || q === 'no' || q.includes('yes') || q.includes('no')) {
    const confirmationResult = handleConfirmationResponse(userId, q.includes('yes'));
    if (confirmationResult && q.includes('yes')) {
      // If user confirmed, check for file content for policy/holiday
      if (intent.primaryIntent === 'policy' || intent.primaryIntent === 'holiday') {
        const relevantFile = getRelevantFile(intent, question);
        if (relevantFile && relevantFile.content) {
          if (intent.primaryIntent === 'holiday') {
            return formatHolidayContent(relevantFile);
          }
          if (intent.primaryIntent === 'policy') {
            return formatPolicyContent(relevantFile, question);
          }
        }
      }
      return {
        answer: confirmationResult,
        confidence: 95,
        isConfirmationResponse: true
      };
    } else if (confirmationResult) {
      return {
        answer: confirmationResult,
        confidence: 95,
        isConfirmationResponse: true
      };
    }
  }
  
  // Check for file content first for policy and holiday queries
  if (intent.primaryIntent === 'policy' || intent.primaryIntent === 'holiday') {
    const relevantFile = getRelevantFile(intent, question);
    
    if (relevantFile && relevantFile.content) {
      // Return file content directly for high confidence
      if (intent.confidence >= 0.8) {
        if (intent.primaryIntent === 'holiday') {
          return formatHolidayContent(relevantFile);
        }
        if (intent.primaryIntent === 'policy') {
          return formatPolicyContent(relevantFile, question);
        }
      }
    }
  }
  
  // Fallback to standard response for all other queries or low confidence
  return generateIntentResponse(intent, question, userId);
}

// Format holiday file content
function formatHolidayContent(file) {
  const lines = file.content.split('\n').filter(line => line.trim());
  let formattedHolidays = '';
  
  // Parse holiday format
  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim();
    if (trimmed && (trimmed.includes(':') || trimmed.includes('-') || /\d/.test(trimmed))) {
      formattedHolidays += `• ${trimmed}\n`;
    }
  }
  
  if (!formattedHolidays) {
    formattedHolidays = file.content.substring(0, 400);
  }
  
  return {
    answer: `🎉 **Holiday List:**\n\n${formattedHolidays}\n\n💾 **Download:** /api/bot/download?file=${encodeURIComponent(file.filename)}`,
    sourceFile: file.filename,
    downloadUrl: `/api/bot/download?file=${encodeURIComponent(file.filename)}`,
    confidence: 95
  };
}

// Format policy file content
function formatPolicyContent(file, question) {
  const content = file.content;
  const queryWords = question.toLowerCase().split(/\s+/);
  
  // Find relevant sections based on query
  const sections = content.split(/\n\s*\n/).filter(section => {
    const sectionLower = section.toLowerCase();
    return queryWords.some(word => sectionLower.includes(word));
  });
  
  let relevantContent = '';
  if (sections.length > 0) {
    relevantContent = sections.slice(0, 2).join('\n\n');
  } else {
    relevantContent = content.substring(0, 600);
  }
  
  return {
    answer: `📋 **Company Policy:**\n\n${relevantContent}${content.length > relevantContent.length ? '...' : ''}\n\n💾 **Download:** /api/bot/download?file=${encodeURIComponent(file.filename)}`,
    sourceFile: file.filename,
    downloadUrl: `/api/bot/download?file=${encodeURIComponent(file.filename)}`,
    confidence: 95
  };
}