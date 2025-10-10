
const conversationContext = new Map(); 
const RESPONSE_MAP = {
  payslip: {
    emoji: "💰",
    responses: {
      view: "Visit Dashboard → Payslip & Doc → View/Download your payslip",
      download:
        "Go to Dashboard → Payslip & Doc → Click Download button",
      status:
        "Check Dashboard → Payslip section to see if your current month's payslip is ready",
      default:
        "Visit Dashboard → Payslip section to view and download your payslip history",
    },
  },
  leave: {
    emoji: "📋",
    responses: {
      balance:
        "Go to Dashboard → Attendance & Leave → Leave Balance tab to see remaining days",
      apply:
        "Visit Dashboard → Attendance & Leave → Apply Leave button → Fill form and submit",
      status:
        "Check Dashboard → Leave Request → History tab to see your leave request status",
      history:
        "Go to Dashboard → Leave Request → History tab to view all your past leaves",
      default:
        "Visit Dashboard → Attendance & Leave section for all leave-related activities",
    },
  },
  attendance: {
    emoji: "⏰",
    responses: {
      today:
        "Check Dashboard → Attendance & Leave → Attendance Records for today's check-in/out",
      history:
        "Visit Dashboard → Attendance & Leave → Attendance Records to view your attendance history",
      checkin:
        "Use the check-in/check-out buttons on your dashboard or attendance section",
      default:
        "Go to Dashboard → Attendance & Leave → Attendance Records for all attendance info",
    },
  },
  holiday: {
    emoji: "🎉",
    responses: {
      list: "Check Dashboard → Calendar section to see all upcoming holidays and events",
      next: "Visit Dashboard → Calendar to find the next upcoming holiday",
      today: "Check Dashboard → Calendar or ask HR if today is a holiday",
      default:
        "Visit Dashboard → Calendar section for complete holiday information",
    },
  },
  contact: {
    emoji: "📞",
    responses: {
      hr: "HR Contact: hr@company.com | Phone: +91-XXXX-XXXX-XX | Office: 2nd Floor | Hours: 10 AM - 6 PM",
      it: "IT Support: it-support@company.com | Ext. 1234 | Ground Floor | Hours: 9 AM - 6 PM",
      default:
        "HR: hr@company.com | IT: it-support@company.com | For urgent matters, visit respective offices",
    },
  },
  policy: {
    emoji: "📋",
    responses: {
      company:
        "Contact HR Department for complete company policy documents and guidelines",
      leave:
        "Leave policy details are available through HR Department or Dashboard → Leave section",
      attendance:
        "Attendance policy information is available through HR or Dashboard → Attendance section",
      default:
        "Contact HR Department (hr@company.com) for all policy-related information and documents",
    },
  },
  profile: {
    emoji: "👤",
    responses: {
      update:
        "Go to Dashboard → Profile Management → Update your contact information, address, or personal details",
      image:
        "Visit Dashboard → Profile Management → Change Profile Image to upload a new profile picture",
      document:
        "Go to Dashboard → Profile Management → Update Document to upload or modify your documents",
      view: "Check Dashboard → Profile Management to view your current profile information",
      default:
        "Visit Dashboard → Profile Management to update your profile information, change picture, or manage documents",
    },
  },
};

// Enhanced intent detection with fuzzy matching
export function detectAdvancedIntent(question, userId = null) {
  const q = question.toLowerCase().trim();

  // Handle context-aware responses (yes/no)
  const context = getConversationContext(userId);
  if (
    context?.pendingConfirmation &&
    (q === "yes" || q === "no" || q.includes("yes") || q.includes("no"))
  ) {
    if (q.includes("yes") || q === "yes") {
      return {
        primaryIntent: context.lastIntent.primaryIntent,
        subIntent: context.lastIntent.subIntent,
        confidence: 0.95,
        isConfirmation: true,
        confirmationResponse: true,
      };
    } else {
      return {
        primaryIntent: "clarification",
        confidence: 0.9,
        isConfirmation: true,
        confirmationResponse: false,
      };
    }
  }

  // Intent patterns with fuzzy matching
  const intentPatterns = {
    payslip: {
      keywords: ["payslip", "salary", "pay", "wage", "earning", "slip","payment","remuneration",  "compensation", "stipend", "income", "paycheck",  "payout", "paystub", "salary slip", "salary statement", "salary details", "salary information", "salary record", "salary history", "salary summary", "salary breakdown", "salary overview"],
      subTypes: {
        view: ["view", "see", "check", "show", "display",],
        download: ["download", "get", "save", "pdf"],
        status: ["status", "ready", "available", "generated"],
        amount: ["amount", "total", "net", "gross"],
      },
      weight: 1.0,
    },
    leave: {
      keywords: ["leave", "vacation", "holiday", "absence", "off", "time off"],
      subTypes: {
        balance: ["balance", "remaining", "left", "available", "how many"],
        apply: ["apply", "request", "take", "book", "submit"],
        status: ["status", "approved", "pending", "rejected"],
        history: ["history", "past", "previous", "old"],
      },
      weight: 1.0,
    },
    attendance: {
      keywords: [
        "attendance",
        "attendance record",
        "punch",
        "clock in",
        "clock out",
        "time sheet",
        "check-in",
        "check-out",
        "working hours",
        "time",
        "schedule",
        "work hours",
        "log",
        "record",
        "attendence history",
        "attendance",
        "attendance details",
        "attendance info",
        "attendance data",
      ],
      subTypes: {
        today: ["today", "current", "now", "this day", "present", "todays"],
        history: ["history", "past", "previous", "yesterday","last","week","month"],
        checkin: ["checkin", "check-in", "punch", "mark"],
      },
      weight: 0.9,
    },
    holiday: {
      keywords: ["holiday", "festival", "celebration", "off day"],
      subTypes: {
        list: ["list", "all", "calendar", "schedule"],
        next: ["next", "upcoming", "future", "when"],
        today: ["today", "tomorrow"],
      },
      weight: 0.8,
    },
    contact: {
      keywords: ["contact", "phone", "email", "hr", "help", "support"],
      subTypes: {
        hr: ["hr", "human resource"],
        it: ["it", "technical", "computer", "system"],
      },
      weight: 0.7,
    },
    policy: {
      keywords: ["policy", "rule", "guideline", "procedure"],
      subTypes: {
        company: ["company", "organization"],
        leave: ["leave policy"],
        attendance: ["attendance policy"],
      },
      weight: 0.6,
    },
    profile: {
      keywords: [
        "profile",
        "update",
        "change",
        "modify",
        "edit",
        "information",
        "document",
        "image",
        "photo",
        "picture",
        "address",
        "phone",
        "email",
      ],
      subTypes: {
        update: ["update", "change", "modify", "edit"],
        image: ["image", "photo", "picture", "avatar"],
        document: ["document", "file", "upload"],
        view: ["view", "see", "check", "show"],
      },
      weight: 0.9,
    },
  };

  let bestMatch = { intent: "general", confidence: 0, subType: null };

  // Fuzzy matching with includes/startsWith
  for (const [intent, config] of Object.entries(intentPatterns)) {
    let score = 0;
    let matchedSubType = null;

    // Primary keyword matching (fuzzy)
    for (const keyword of config.keywords) {
      if (
        q.includes(keyword) ||
        q.startsWith(keyword) ||
        keyword.includes(q.split(" ")[0])
      ) {
        score += config.weight * 0.6;
      }
    }

    // Sub-type detection (fuzzy)
    if (config.subTypes) {
      for (const [subType, subKeywords] of Object.entries(config.subTypes)) {
        for (const subKeyword of subKeywords) {
          if (q.includes(subKeyword) || q.startsWith(subKeyword)) {
            score += config.weight * 0.4;
            matchedSubType = subType;
          }
        }
      }
    }

    if (score > bestMatch.confidence) {
      bestMatch = {
        intent,
        confidence: Math.min(score, 1.0),
        subType: matchedSubType,
      };
    }
  }

  return {
    primaryIntent: bestMatch.intent,
    subIntent: bestMatch.subType,
    confidence: bestMatch.confidence,
    labels: [bestMatch.intent, bestMatch.subType].filter(Boolean),
  };
}

// Generate response based on intent with confidence scoring
export function generateIntentResponse(intent, question, userId) {
  const confidencePercent = Math.round(intent.confidence * 100);

  // Low confidence - ask for clarification
  if (intent.confidence < 0.6) {
    setConversationContext(userId, {
      lastIntent: intent,
      pendingConfirmation: false,
    });
    return {
      answer: `🤔 I'm not entirely sure what you're looking for. Could you please be more specific? \n\nI can help you with:\n Payslip queries\n Leave management\n Attendance records\n Holiday information\n Contact details`,
      confidence: confidencePercent,
      needsClarification: true,
    };
  }

  // Medium confidence - ask for confirmation
  if (intent.confidence < 0.8) {
    setConversationContext(userId, {
      lastIntent: intent,
      pendingConfirmation: true,
    });
    const response = getResponseFromMap(intent);
    return {
      answer: `I think you're asking about ${intent.primaryIntent}. Is that correct?`,
      confidence: confidencePercent,
      needsConfirmation: true,
      suggestedResponse: response,
    };
  }

  // High confidence - direct response
  setConversationContext(userId, {
    lastIntent: intent,
    pendingConfirmation: false,
  });
  const response = getResponseFromMap(intent);

  return {
    answer: response,
    confidence: confidencePercent,
    intent: intent.primaryIntent,
    subIntent: intent.subIntent,
  };
}

// Get response from structured map
function getResponseFromMap(intent) {
  const intentConfig = RESPONSE_MAP[intent.primaryIntent];
  if (!intentConfig) {
    return "I'm here to help! Please ask me about payslip, leave, attendance, holidays, or contact information.";
  }

  const emoji = intentConfig.emoji;
  const responses = intentConfig.responses;

  let response;
  if (intent.subIntent && responses[intent.subIntent]) {
    response = responses[intent.subIntent];
  } else {
    response = responses.default;
  }

  return `${emoji} ${response}`;
}

// Conversation context management
function getConversationContext(userId) {
  if (!userId) return null;
  return conversationContext.get(userId);
}

function setConversationContext(userId, context) {
  if (!userId) return;

  const existing = conversationContext.get(userId) || { history: [] };
  const updated = { ...existing, ...context };

  // Add to history
  if (context.lastIntent) {
    updated.history = updated.history || [];
    updated.history.push({
      intent: context.lastIntent,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 5 interactions
    if (updated.history.length > 5) {
      updated.history = updated.history.slice(-5);
    }
  }

  conversationContext.set(userId, updated);
}

// Handle confirmation responses
export function handleConfirmationResponse(userId, isPositive) {
  const context = getConversationContext(userId);
  if (!context?.pendingConfirmation) {
    return null;
  }

  // Clear pending confirmation
  setConversationContext(userId, { pendingConfirmation: false });

  if (isPositive) {
    return getResponseFromMap(context.lastIntent);
  } else {
    return "No problem! Could you please rephrase your question? I'm here to help with payslip, leave, attendance, holidays, or contact information.";
  }
}

// Store learning data (in-memory only)
export function storeQuestionResponse(question, response, userId, intent) {
  // Simple in-memory storage - no DB writes
  const timestamp = new Date().toISOString();

  // Update conversation context with successful interaction
  const context = getConversationContext(userId) || {};
  context.lastSuccessfulIntent = intent;
  context.lastQuestion = question;
  context.lastResponse = response;
  context.lastTimestamp = timestamp;

  setConversationContext(userId, context);

  // Could add to a simple learning cache here if needed
  console.log(
    `Learning: ${intent.primaryIntent} - ${question} (confidence: ${intent.confidence})`
  );
}

// Get simulated insights (no DB reads)
export function getLearningInsights() {
  const totalContexts = conversationContext.size;

  // Simulated insights based on conversation contexts
  const insights = {
    totalQuestions: totalContexts * 3, // Simulate multiple questions per user
    activeConversations: totalContexts,
    mostCommonIntents: [
      ["payslip", Math.floor(totalContexts * 0.3)],
      ["leave", Math.floor(totalContexts * 0.25)],
      ["attendance", Math.floor(totalContexts * 0.2)],
      ["holiday", Math.floor(totalContexts * 0.15)],
      ["contact", Math.floor(totalContexts * 0.1)],
    ],
    avgConfidenceByIntent: {
      payslip: 0.85,
      leave: 0.82,
      attendance: 0.78,
      holiday: 0.75,
      contact: 0.88,
    },
    recentQuestions: Array.from(conversationContext.values())
      .filter((ctx) => ctx.lastQuestion)
      .slice(-10)
      .map((ctx) => ({
        question: ctx.lastQuestion,
        intent: ctx.lastSuccessfulIntent?.primaryIntent || "unknown",
        confidence: ctx.lastSuccessfulIntent?.confidence || 0,
        timestamp: ctx.lastTimestamp,
      })),
  };

  return insights;
}
