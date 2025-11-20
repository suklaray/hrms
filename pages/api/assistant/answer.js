import jwt from "jsonwebtoken";
import nlp from 'compromise';
import prisma from "@/lib/prisma";
import {
  detectAdvancedIntent,
  generateIntentResponse,
  handleConfirmationResponse,
  storeQuestionResponse,
} from "@/lib/intentHandler";
import { getRelevantFile } from "@/lib/fileKnowledge";
const { findSimilarQuestions, generateContextualResponse } = await import("@/lib/assistantLearning");
// Using simplified response generation
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question, role } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    // Get user from token
    const token = req.cookies.token || req.cookies.employeeToken;
    let user = null;
    let actualUserRole = "employee";

    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch actual role from database
        if (user?.empid) {
          const dbUser = await prisma.users.findUnique({
            where: { empid: user.empid },
            select: { role: true }
          });
          actualUserRole = dbUser?.role || "employee";
          console.log(`Database role for ${user.empid}: ${actualUserRole}`);
        }
      } catch (err) {
        console.log("Token verification failed:", err.message);
      }
    }

    // Enhanced bot response with NLP and learning
    const userId = user?.empid || user?.id || "anonymous";
    const doc = nlp(question);
    const intent = await detectAdvancedIntent(question, userId);
    
    // Extract additional NLP features for better processing
    const nlpContext = {
      entities: doc.people().out('array').concat(doc.places().out('array')),
      dates: doc.match('#Date').out('array'),
      numbers: doc.match('#Value').out('array'),
      sentiment: doc.has('#Negative') ? 'negative' : doc.has('#Positive') ? 'positive' : 'neutral',
      questionType: doc.questions().length > 0 ? 'question' : 'statement'
    };

    let answer;
    const botMode = process.env.BOT_MODE || "RULE_BASED";
    const source = botMode;

    if (botMode === "LLM") {
      const { getLLMAnswerFromRepo } = await import("@/lib/llm");
      const llmResult = await getLLMAnswerFromRepo(question, intent, user, nlpContext);
      answer = llmResult?.answer || "Sorry, I couldn't generate an answer.";
    } else {
      // Enhanced multi-strategy response generation
      answer = await generateEnhancedAnswer(question, user, intent, userId, nlpContext, actualUserRole);
    }

    // Store for learning
    try {
      const finalAnswer =
        typeof answer === "object" && answer.answer ? answer.answer : answer;
      await storeQuestionResponse(question, finalAnswer, userId, intent);
    } catch (error) {
      console.log("Failed to store learning data:", error.message);
    }

    const responseData = {
      answer:
        typeof answer === "object" && answer.answer ? answer.answer : answer,
      sourceFile:
        typeof answer === "object" && answer.sourceFile
          ? answer.sourceFile
          : null,
      downloadUrl:
        typeof answer === "object" && answer.downloadUrl
          ? answer.downloadUrl
          : null,
      confidence:
        typeof answer === "object" && answer.confidence
          ? answer.confidence
          : Math.round(intent.confidence * 100),
      needsConfirmation:
        typeof answer === "object" && answer.needsConfirmation
          ? answer.needsConfirmation
          : false,
      needsClarification:
        typeof answer === "object" && answer.needsClarification
          ? answer.needsClarification
          : false,
      suggestedResponse:
        typeof answer === "object" && answer.suggestedResponse
          ? answer.suggestedResponse
          : null,
      source,
      intent: intent.primaryIntent,
      subIntent: intent.subIntent,
      learned:
        typeof answer === "object" && answer.learned ? answer.learned : false,
      frequency:
        typeof answer === "object" && answer.frequency
          ? answer.frequency
          : null,
      nlpFeatures: intent.nlpFeatures || {},
      nlpContext,
      similarity: intent.similarity || 0,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Assistant error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Enhanced multi-strategy answer generation with NLP
async function generateEnhancedAnswer(question, user, intent, userId, nlpContext, userRole) {
  const doc = nlp(question);
  
  // PRIORITY 1: Check for NLP-enhanced learned responses
  try {
    const similarQuestions = await findSimilarQuestions(question, intent);
    if (similarQuestions.length > 0) {
      const bestMatch = similarQuestions[0];
      const confidence = parseFloat(bestMatch.confidence_score) || 0;
      const nlpSimilarity = bestMatch.similarity_score || 0;

      // Use learned responses with NLP similarity scoring
      if (bestMatch.frequency >= 3 && confidence >= 0.7 && nlpSimilarity > 0.6) {
        console.log(`Using learned response for user role: ${userRole}`);
        // Skip learned responses for now to use role-based responses
        console.log(`Skipping learned response to use role-based response`);
      }
    }
  } catch (error) {
    console.error("Error checking NLP-enhanced learned responses:", error);
  }

  // PRIORITY 2: File-based responses with NLP enhancement
  return await generateNLPFileBasedAnswer(question, user, intent, userId, nlpContext, userRole);
}

// NLP-enhanced file-based answer generation
async function generateNLPFileBasedAnswer(question, user, intent, userId, nlpContext, userRole) {
  const doc = nlp(question);
  // Handle confirmation responses (yes/no) - return file content if confirmed
  const q = question.toLowerCase().trim();
  if (q === "yes" || q === "no" || q.includes("yes") || q.includes("no")) {
    const confirmationResult = handleConfirmationResponse(
      userId,
      q.includes("yes")
    );
    if (confirmationResult && q.includes("yes")) {
      // If user confirmed, check for file content for policy/holiday
      if (
        intent.primaryIntent === "policy" ||
        intent.primaryIntent === "holiday"
      ) {
        const relevantFile = getRelevantFile(intent, question);
        if (relevantFile && relevantFile.content) {
          if (intent.primaryIntent === "holiday") {
            return formatHolidayContent(relevantFile);
          }
          if (intent.primaryIntent === "policy") {
            return formatPolicyContent(relevantFile, question);
          }
        }
      }
      return {
        answer: confirmationResult,
        confidence: 95,
        isConfirmationResponse: true,
      };
    } else if (confirmationResult) {
      return {
        answer: confirmationResult,
        confidence: 95,
        isConfirmationResponse: true,
      };
    }
  }

  // NLP-enhanced file content processing
  if (intent.primaryIntent === "policy" || intent.primaryIntent === "holiday") {
    const relevantFile = getRelevantFile(intent, question);

    if (relevantFile && relevantFile.content) {
      // Use NLP to better match content relevance
      const contentDoc = nlp(relevantFile.content);
      const questionNouns = doc.nouns().out('array');
      const contentNouns = contentDoc.nouns().out('array');
      
      // Calculate content relevance using NLP
      const relevanceScore = calculateContentRelevance(questionNouns, contentNouns);
      
      // Return file content for high confidence or high relevance
      if (intent.confidence >= 0.8 || relevanceScore > 0.3) {
        if (intent.primaryIntent === "holiday") {
          return formatHolidayContentNLP(relevantFile, doc, nlpContext);
        }
        if (intent.primaryIntent === "policy") {
          return formatPolicyContentNLP(relevantFile, question, doc, nlpContext);
        }
      }
    }
  }

  // Fallback to NLP-enhanced standard response
  console.log(`Final role: ${userRole}`);
  return await generateIntentResponse(intent, question, userId, userRole);
}

// Calculate content relevance using NLP
function calculateContentRelevance(questionNouns, contentNouns) {
  if (questionNouns.length === 0 || contentNouns.length === 0) return 0;
  
  const questionSet = new Set(questionNouns.map(n => n.toLowerCase()));
  const contentSet = new Set(contentNouns.map(n => n.toLowerCase()));
  const intersection = new Set([...questionSet].filter(x => contentSet.has(x)));
  const union = new Set([...questionSet, ...contentSet]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// NLP-enhanced holiday content formatting
function formatHolidayContentNLP(file, doc, nlpContext) {
  const dates = doc.match('#Date').out('array');
  const timeWords = doc.match('(next|upcoming|future|this|current)').out('array');
  const lines = file.content.split("\n").filter((line) => line.trim());
  let formattedHolidays = "";

  // Parse holiday format
  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim();
    if (
      trimmed &&
      (trimmed.includes(":") || trimmed.includes("-") || /\d/.test(trimmed))
    ) {
      formattedHolidays += `• ${trimmed}\n`;
    }
  }

  if (!formattedHolidays) {
    formattedHolidays = file.content.substring(0, 400);
  }

  let contextualPrefix = "🎉 **Holiday List:**";
  if (timeWords.length > 0) {
    if (timeWords.some(w => ['next', 'upcoming', 'future'].includes(w))) {
      contextualPrefix = "🎉 **Upcoming Holidays:**";
    } else if (timeWords.some(w => ['current', 'this'].includes(w))) {
      contextualPrefix = "🎉 **Current Holiday Information:**";
    }
  }

  return {
    answer: `${contextualPrefix}\n\n${formattedHolidays}\n\n💾 **Download:** /api/bot/download?file=${encodeURIComponent(
      file.filename
    )}`,
    sourceFile: file.filename,
    downloadUrl: `/api/bot/download?file=${encodeURIComponent(file.filename)}`,
    confidence: 95,
    nlpEnhanced: true
  };
}

// Legacy holiday formatting for backward compatibility
function formatHolidayContent(file) {
  return formatHolidayContentNLP(file, nlp(''), {});
}

// NLP-enhanced policy content formatting
function formatPolicyContentNLP(file, question, doc, nlpContext) {
  const questionNouns = doc.nouns().out('array');
  const questionVerbs = doc.verbs().out('array');
  const content = file.content;
  const queryWords = question.toLowerCase().split(/\s+/);

  // Find relevant sections based on query
  const sections = content.split(/\n\s*\n/).filter((section) => {
    const sectionLower = section.toLowerCase();
    return queryWords.some((word) => sectionLower.includes(word));
  });

  let relevantContent = "";
  if (sections.length > 0) {
    relevantContent = sections.slice(0, 2).join("\n\n");
  } else {
    relevantContent = content.substring(0, 600);
  }

  // NLP-enhanced section title
  let contextualTitle = "📋 **Company Policy:**";
  if (questionNouns.length > 0) {
    const mainTopic = questionNouns[0];
    contextualTitle = `📋 **${mainTopic.charAt(0).toUpperCase() + mainTopic.slice(1)} Policy:**`;
  }

  return {
    answer: `${contextualTitle}\n\n${relevantContent}${
      content.length > relevantContent.length ? "..." : ""
    }\n\n💾 **Download:** /api/bot/download?file=${encodeURIComponent(
      file.filename
    )}`,
    sourceFile: file.filename,
    downloadUrl: `/api/bot/download?file=${encodeURIComponent(file.filename)}`,
    confidence: 95,
    nlpEnhanced: true
  };
}

// Legacy policy formatting for backward compatibility
function formatPolicyContent(file, question) {
  return formatPolicyContentNLP(file, question, nlp(question), {});
}
