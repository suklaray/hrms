import nlp from "compromise";
import { makeConversational, bridgeTopic } from "@/lib/conversationWrapper";
function isConfused(message) {
  const text = message.toLowerCase();
  const patterns = [
    "don't see",
    "dont see",
    "cant see",
    "can't see",
    "didn't get",
    "didnt get",
    "not showing",
    "not visible",
    "missing",
    "no option",
    "option not",
    "where is",
    "not there",
    "i don't have",
    "i dont have",
  ];
  return patterns.some((p) => text.includes(p));
}

// Conversation context for short-term memory
const conversationContext = new Map();

// Optimized response mapping
export const RESPONSE_MAP = {
  payslip: {
    emoji: "💰",
    responses: {
      view: {
        employee:
          "You can view your payslips under Employee Dashboard → Payslip & Doc → View/Download.",
        management:
          "You can view your payslips under accounts & settings → Payslip & Documents.",
      },

      download: {
        employee:
          "To download your payslip, open Employee Dashboard → Payslip & Doc → Download.",
        management:
          "To download your payslip, go to Accounts & Settings → Payslip & Documents → Download.",
      },

      status: {
        employee:
          "You can check your payslip status at Employee Dashboard → Payslip section.",
        management:
          "You can check payslip generation status under Accounts & Settings → Payslip & Documents.",
      },

      default: {
        employee:
          "All your payslips are in Employee Dashboard → Payslip & Doc.",
        management:
          "Payslips for employees can be accessed via Accounts & Settings → Payslip & Documents.",
      },
    },
  },

  leave: {
    emoji: "📋",
    responses: {
      balance: {
        employee:
          "Your leave balance is available at Employee Dashboard → Attendance & Leave → Leave Balance.",
        management:
          "Your leave balance can be viewed under Account & Settings → Leave Reuests.",
      },

      apply: {
        employee:
          "To apply for leave, go to Employee Dashboard → Attendance & Leave → Apply Leave.",
        management:
          "To apply for leave, navigate to Accounts & Settings → Leave Request → Apply.",
      },

      status: {
        employee:
          "Your leave status is available at Employee Dashboard → Leave Request → History.",
        management:
          "You can check leave request status under Accounts & Settings → Leave Requests → History.",
      },

      default: {
        employee:
          "All your leave information is in Employee Dashboard → Attendance & Leave.",
        management:
          "All leave management options are under Accounts & Settings → Leave Requests.",
      },
    },
  },

  attendance: {
    emoji: "⏰",
    responses: {
      today: {
        employee:
          "Today’s attendance is visible at Employee Dashboard → Attendance Records.",
        management:
          "Today's attendance is visible in Accounts & Settings → My Attendance",
      },

      history: {
        employee:
          "Your attendance history is available at Attendance Records.",
        management:
          "Employee attendance history can be viewed in Accounts & Settings → My Attendance.",
      },

      checkin: {
        employee:
          "You can check-in and check-out using the Attendance card on your Employee Dashboard.",
        management:
          "You can check-in and check-out using the Attendance card on your management dashboard.",
      },

      default: {
        employee:
          "Your attendance details are available in Attendance & Leave → Attendance Records.",
        management:
          "Your attendance details are available in Accounts & Settings → My Attendance.",
      },
    },
  },

  holiday: {
    emoji: "🎉",
    responses: {
      list: {
        employee: "You can view all holidays at Employee Dashboard → Calendar.",
        management:
          "Management users can view and manage holidays under Calendar.",
      },

      next: {
        employee: "Your next holiday is shown in the Calendar section.",
        management:
          "You can view the holiday list under Calendar on the management dashboard.",
      },

      default: {
        employee: "All holiday details are in your Calendar section.",
        management: "Holiday information is available under Calendar.",
      },
    },
  },

  contact: {
    emoji: "📞",
    responses: {
      hr: {
        employee:
          "You can reach HR at hr@company.com or visit the HR desk (10AM–6PM).",
        management: "HR Team contact: hr@company.com.",
      },

      it: {
        employee:
          "For technical issues, contact IT Support at it-support@company.com.",
        management: "IT Support is available at it-support@company.com.",
      },

      default: {
        employee: "HR: hr@company.com | IT: it-support@company.com.",
        management: "HR: hr@company.com | IT: it-support@company.com.",
      },
    },
  },

  policy: {
    emoji: "📋",
    responses: {
      company: {
        employee:
          "Company policies are available under Employee Dashboard → Policies.",
        management:
          "Company-wide policies are available under Policy Management.",
      },

      default: {
        employee:
          "You can find all company policies under Dashboard → Policies.",
        management: "Policies are available under Policy Management.",
      },
    },
  },

  profile: {
    emoji: "👤",
    responses: {
      update: {
        employee:
          "You can update your profile under Employee Dashboard → Profile Management.",
        management:
          "Management can update employee profiles under Employee Management → Employees List → click on Eye.To update your profile, go to Accounts & Settings → Profile Management.",
      },

      document: {
        employee:
          "You can upload/view your documents at Profile Management → Click on View/Update.",
        management:
          "Employee documents can be managed under Compliance → Documents center.for your documents, go to Accounts & Settings → Profile Management → View/Update.",
      },

      default: {
        employee: "All profile options are in Dashboard → Profile Management.",
        management: "Profiles are managed under Employee Management → Employees List → click on Eye. for Your profile, go to Accounts & Settings → Profile Management.",
      },
    },
  },

  password: {
    emoji: "🔐",
    responses: {
      default: {
        employee:
          "You can change your password under Profile Management → Change Password.",
        management: "To change employee's password Go to Employee Management → Employees List → click on Eye → Change Password. Password options are available under Accounts & Settings → Profile Management → Change Password.",
      },
    },
  },

  tasks: {
    emoji: "📋",
    responses: {
      default: {
        employee: "Your tasks are available under Dashboard → Manage Tasks.",
        management: "You can assign tasks to employees under Task Management → Assign Tasks. to see your tasks, go to Accounts & Settings → Manage Tasks.",
      },
    },
  },

  recruitment: {
    emoji: "👥",
    responses: {
      candidates: {
        employee:
          "For joining documents or onboarding questions, contact HR for recruitment support.",
        management: "View and manage candidates under Recruitment Panel → Candidates.",
      },

      add: {
        employee:
          "Contact HR for recruitment-related queries and candidate referrals.",
        management: "Add new candidates under Recruitment Panel → Add Candidates.",
      },

      interview: {
        employee:
          "For interview schedules or feedback, contact HR department.",
        management: "Manage interviews and candidate details under Recruitment Panel → Candidates → View Details.",
      },

      status: {
        employee:
          "Contact HR for updates on recruitment processes and candidate status.",
        management: "Track recruitment status under Recruitment Panel → Candidates list.",
      },

      default: {
        employee:
          "For joining documents or onboarding questions, contact HR for recruitment support.",
        management: "Recruitment management is available under Recruitment Panel.",
      },
    },
  },

  employees: {
    emoji: "👥",
    responses: {
      list: {
        employee:
          "Contact HR for employee directory and contact information.",
        management: "View all employees under Employee Management → Employees List.",
      },

      add: {
        employee:
          "Contact HR for new employee registration and onboarding.",
        management: "Register new employees under Employee Management → Register Employee.",
      },

      view: {
        employee:
          "Contact HR for employee details and information.",
        management: "View employee details under Employee Management → Employees List → Click Eye icon.",
      },

      documents: {
        employee:
          "Upload your documents under Profile Management → View/Update Documents.",
        management: "View employee documents under Compliance → Document Center → Select Employee.",
      },

      default: {
        employee:
          "Contact HR for employee-related queries and information.",
        management: "Employee management is available under Employee Management section.",
      },
    },
  },

  leave_management: {
    emoji: "📅",
    responses: {
      approve: {
        employee:
          "Your leave requests are reviewed by HR. Check status under Dashboard → Leave Status.",
        management: "Approve/reject leave requests under Attendance & Leave → Leave Management.",
      },

      status: {
        employee:
          "Check your leave status under Dashboard → Leave Status or Employee Dashboard.",
        management: "Update employee leave status under Attendance & Leave → Leave Management → View Employee.",
      },

      history: {
        employee:
          "View your leave history under Employee Dashboard → Leave Records.",
        management: "View employee leave history under Attendance & Leave → Leave Management → All Leave History tab.",
      },

      types: {
        employee:
          "Available leave types are shown when applying for leave.",
        management: "Manage leave types under Attendance & Leave → Leave Management → Leave Types section.",
      },

      default: {
        employee:
          "Apply for leave under Employee Dashboard → Apply Leave.",
        management: "Leave management is available under Attendance & Leave → Leave Management.",
      },
    },
  },

  document_management: {
    emoji: "📄",
    responses: {
      view: {
        employee:
          "View your documents under Profile Management → View/Update Documents.",
        management: "View employee documents under Compliance → Document Center → Select Employee.",
      },

      upload: {
        employee:
          "Upload documents under Profile Management → View/Update Documents.",
        management: "Employee document uploads are managed under Compliance → Document Center.",
      },

      status: {
        employee:
          "Check document verification status under Profile Management → View/Update.",
        management: "Check employee document status under Compliance → Document Center → Employee Details.",
      },

      center: {
        employee:
          "Contact HR for document-related queries and compliance requirements.",
        management: "Access Document Center under Compliance → Document Center for all employee documents.",
      },

      default: {
        employee:
          "All document management is under Profile Management → View/Update Documents.",
        management: "Employee document management is available under Compliance → Document Center.",
      },
    },
  },

  payroll_management: {
    emoji: "💼",
    responses: {
      generate: {
        employee:
          "Contact HR for payroll processing and salary-related queries.",
        management: "Generate payroll under Payroll Management → Generate Payroll.",
      },

      records: {
        employee:
          "View your payslips under Employee Dashboard → Payslip & Documents.",
        management: "View payroll records under Payroll Management → Payroll Records.",
      },

      status: {
        employee:
          "Check payroll status with HR or under Employee Dashboard → Payslip section.",
        management: "Check payroll processing status under Payroll Management → Payroll Records.",
      },

      default: {
        employee:
          "Contact HR for payroll-related queries and information.",
        management: "Payroll management is available under Payroll Management section.",
      },
    },
  },

  general: {
    emoji: "ℹ️",
    responses: {
      dashboard: {
        employee: "Access your main dashboard at Employee Dashboard for overview of all features.",
        management: "Access your management dashboard for overview of all HR functions and analytics.",
      },
      calendar: {
        employee: "View calendar and events under Employee Dashboard → Calendar section.",
        management: "Manage calendar and events under Calendar section in your management panel.",
      },
      reports: {
        employee: "Contact HR for reports and analytics related to your employment.",
        management: "Access reports and analytics under various management sections like Attendance Analytics, Payroll Records.",
      },
      settings: {
        employee: "Access settings under Profile Management for personal preferences.",
        management: "Access settings under Accounts & Settings for profile and system preferences.",
      },
      logout: {
        employee: "You can logout using the Logout button in the sidebar or top navigation.",
        management: "You can logout using the Logout button in the sidebar or top navigation.",
      },
      default: {
        employee: "I can help you with payslip, leave, attendance, holidays, profile, and HR contact information.",
        management: "I can help you with employee management, recruitment, leave management, payroll, documents, and more HR functions.",
      },
    },
  },
};

// Intent anchor words for high-confidence detection
const INTENT_ANCHORS = {
  payslip: ["payslip", "salary slip", "pay slip", "salary", "wage", "pay", "income", "earnings", "compensation", "monthly salary", "salary certificate"],
  leave: ["leave", "apply leave", "leave balance", "leave status", "vacation", "time off", "absence", "sick leave", "casual leave", "annual leave", "maternity leave", "paternity leave"],
  attendance: ["attendance", "punch", "working hours", "timesheet", "work schedule"],
  checkin: ["check in", "check-in", "checkin", "clock in", "mark attendance", "punch in", "sign in", "start work", "office entry"],
  checkout: ["check out", "check-out", "checkout", "clock out", "punch out", "sign out", "end work", "office exit"],
  holiday: ["holiday", "holidays", "festival", "public holiday", "company holiday", "off day", "celebration"],
  contact: ["contact", "hr", "support", "help desk", "hr contact", "hr email", "hr phone", "it support", "technical support"],
  policy: ["policy", "company rules", "guidelines", "company policy", "hr policy", "work policy", "code of conduct"],
  profile: ["profile", "document", "documents", "files", "personal info", "profile picture", "update profile", "my profile", "employee profile"],
  password: ["password", "forgot password", "reset password", "change password", "login issue", "account access"],
  tasks: ["task", "my task", "assigned task", "work task", "todo", "pending task", "task list", "project task"],
  recruitment: ["recruitment", "candidate", "hiring", "interview", "job opening", "vacancy", "new hire", "candidate selection", "interview schedule"],
  employees: ["employee list", "employees", "staff list", "team members", "employee directory", "staff directory", "colleague info", "employee details"],
  leave_management: ["approve leave", "leave approval", "leave status update", "manage leave", "reject leave", "leave request", "employee leave"],
  document_management: ["document center", "employee documents", "compliance documents", "file management", "document upload", "document verification"],
  payroll_management: ["generate payroll", "payroll records", "salary processing", "payroll generation", "salary calculation", "payroll report"],
  dashboard: ["dashboard", "home", "main page", "overview", "summary"],
  calendar: ["calendar", "events", "schedule", "meetings", "appointments"],
  reports: ["report", "reports", "analytics", "statistics", "data export"],
  settings: ["settings", "preferences", "configuration", "account settings"],
  logout: ["logout", "sign out", "log out", "exit", "end session"]
};

// Optimized intent patterns
const INTENT_PATTERNS = {
  payslip: {
    keywords: [
      "payslip",
      "salary",
      "pay",
      "wage",
      "earning",
      "slip",
      "payment",
      "compensation",
      "income",
      "paycheck",
    ],
    subTypes: {
      view: ["view", "see", "check", "show", "display"],
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
      "punch",
      "clock",
      "check-in",
      "check-out",
      "working hours",
      "time sheet",
      "schedule",
    ],
    subTypes: {
      today: ["today", "current", "now", "present"],
      history: [
        "history",
        "past",
        "previous",
        "yesterday",
        "last",
        "week",
        "month",
      ],
      checkin: ["checkin", "check-in", "check in", "punch", "mark", "clock in", "attendance checkin", "make attendance", "punch in", "sign in"],
      checkout: ["checkout", "check-out", "check out", "punch out", "clock out", "sign out", "end work"],
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
      "personal information",
      "profile picture",
      "address",
      "phone number",
      "contact details",
      "document",
      "documents",
      "files",
    ],
    subTypes: {
      update: ["update", "change", "modify", "edit"],
      image: ["image", "photo", "picture", "avatar"],
      document: ["document", "documents", "files", "upload", "view documents"],
      view: ["view", "see", "check", "show"],
    },
    weight: 0.9,
  },
  password: {
    keywords: [
      "password",
      "change password",
      "reset password",
      "forgot password",
    ],
    subTypes: {
      change: ["change", "update", "modify"],
      reset: ["reset", "forgot", "recover"],
    },
    weight: 1.0,
  },
  tasks: {
    keywords: [
      "task",
      "tasks",
      "pending task",
      "my task",
      "assigned task",
      "work task",
      "todo",
    ],
    subTypes: {
      pending: ["pending", "incomplete", "remaining"],
      completed: ["completed", "finished", "done"],
      assigned: ["assigned", "given", "allocated"],
    },
    weight: 1.0,
  },
  recruitment: {
    keywords: [
      "recruitment",
      "hiring",
      "interview",
      "candidate",
      "job",
      "position",
      "vacancy",
    ],
    subTypes: {
      candidates: ["candidates", "candidate list", "applicants"],
      add: ["add", "new", "register", "create"],
      interview: ["interview", "schedule", "meeting"],
      status: ["status", "progress", "update"],
      process: ["process", "procedure", "steps"],
    },
    weight: 1.0,
  },
  employees: {
    keywords: [
      "employee",
      "employees",
      "staff",
      "team",
      "worker",
      "personnel",
      "member",
    ],
    subTypes: {
      list: ["list", "directory", "all", "view"],
      add: ["add", "register", "new", "create"],
      view: ["view", "details", "information", "profile"],
      documents: ["documents", "files", "papers"],
    },
    weight: 1.0,
  },
  leave_management: {
    keywords: [
      "leave management",
      "approve leave",
      "leave approval",
      "manage leave",
      "leave status",
      "leave update",
    ],
    subTypes: {
      approve: ["approve", "approval", "accept", "grant"],
      status: ["status", "update", "change", "modify"],
      history: ["history", "past", "previous", "records"],
      types: ["types", "categories", "kinds"],
    },
    weight: 0.9,
  },
  document_management: {
    keywords: [
      "document",
      "documents",
      "files",
      "compliance",
      "document center",
      "employee documents",
    ],
    subTypes: {
      view: ["view", "see", "check", "access"],
      upload: ["upload", "add", "submit"],
      status: ["status", "verification", "approved"],
      center: ["center", "management", "compliance"],
    },
    weight: 0.8,
  },
  payroll_management: {
    keywords: [
      "payroll",
      "generate payroll",
      "payroll records",
      "salary processing",
    ],
    subTypes: {
      generate: ["generate", "create", "process"],
      records: ["records", "history", "view"],
      status: ["status", "processing", "completed"],
    },
    weight: 0.8,
  },
};

// Extract NLP features once
function extractNLPFeatures(doc, question) {
  const q = question.toLowerCase().trim();

  return {
    verbs: doc.verbs().out("array"),
    nouns: doc.nouns().out("array"),
    adjectives: doc.adjectives().out("array"),
    dates: doc.match("#Date").out("array"),
    numbers: doc.match("#Value").out("array"),
    entities: doc.people().out("array").concat(doc.places().out("array")),
    isQuestion: doc.questions().length > 0,
    hasUrgency:
      doc.match("(urgent|asap|immediately|quickly|soon|emergency|critical)")
        .length > 0,
    questionWords: doc
      .match("(what|when|where|why|how|which|who)")
      .out("array"),
    actionWords: doc
      .match(
        "(need|want|require|get|find|check|see|view|download|apply|submit)"
      )
      .out("array"),
    timeWords: doc
      .match(
        "(today|tomorrow|yesterday|now|current|this|last|next|week|month|year)"
      )
      .out("array"),
    negationWords: doc
      .match("(not|no|never|none|nothing|cannot|can't|won't|don't)")
      .out("array"),
    sentiment: doc.has("#Negative")
      ? "negative"
      : doc.has("#Positive")
      ? "positive"
      : "neutral",
    wordCount: q.split(" ").length,
    q,
  };
}

// Calculate semantic similarity using bag-of-words
function calculateSemanticMatch(question, intentKeywords) {
  const questionWords = new Set(question.toLowerCase().split(/\s+/));
  const keywordSet = new Set(intentKeywords.map(k => k.toLowerCase()));
  
  const intersection = new Set([...questionWords].filter(x => keywordSet.has(x)));
  const union = new Set([...questionWords, ...keywordSet]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// Optimized intent matching with anchor detection and collision prevention
function matchIntent(features, patterns = INTENT_PATTERNS) {
  let bestMatch = { intent: "general", confidence: 0, subType: null };
  const intentScores = {};

  // STEP 1: Check for anchor words first (highest priority)
  for (const [intent, anchors] of Object.entries(INTENT_ANCHORS)) {
    for (const anchor of anchors) {
      if (features.q.includes(anchor.toLowerCase())) {
        // Special handling for checkin/checkout - return as attendance with appropriate subtype
        if (intent === 'checkin') {
          return {
            intent: 'attendance',
            confidence: 0.99,
            subType: 'checkin'
          };
        }
        if (intent === 'checkout') {
          return {
            intent: 'attendance',
            confidence: 0.99,
            subType: 'checkin'
          };
        }
        // Handle general navigation intents
        if (['dashboard', 'calendar', 'reports', 'settings', 'logout'].includes(intent)) {
          return {
            intent: 'general',
            confidence: 0.95,
            subType: intent
          };
        }
        return {
          intent,
          confidence: 0.99,
          subType: null
        };
      }
    }
  }

  // STEP 2: Process all intents with improved scoring
  for (const [intent, config] of Object.entries(patterns)) {
    let keywordScore = 0;
    let penalty = 0;
    let matchedSubType = null;

    // Primary keyword matching with collision prevention
    for (const keyword of config.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (features.q.includes(keywordLower)) {
        keywordScore += config.weight * 0.8;
      } else {
        // Check for partial matches with penalty for short words
        const words = features.q.split(" ");
        for (const word of words) {
          if (word.length <= 3 && keywordLower.includes(word)) {
            penalty += 0.2; // Penalty for short word matches
          } else if (word.length > 4 && keywordLower.includes(word)) {
            keywordScore += config.weight * 0.15;
          }
        }
      }
    }

    // Semantic similarity calculation
    const semanticSimilarity = calculateSemanticMatch(features.q, config.keywords);
    
    // Combined score: 70% keyword + 30% semantic
    let score = (keywordScore * 0.7) + (semanticSimilarity * 0.3);
    
    // Apply collision prevention penalty
    score -= penalty;

    // Sub-type detection with weighted scoring
    if (config.subTypes) {
      for (const [subType, subKeywords] of Object.entries(config.subTypes)) {
        for (const subKeyword of subKeywords) {
          if (features.q.includes(subKeyword.toLowerCase())) {
            score += 0.25; // Weighted subtype scoring
            matchedSubType = subType;
            break;
          }
        }
      }
    }

    // Contextual boosts
    const hasTimeContext = features.timeWords.length > 0 || features.dates.length > 0;
    if (intent === "attendance" && hasTimeContext) score += 0.05;
    if (intent === "leave" && hasTimeContext) score += 0.05;
    if (intent === "payslip" && features.numbers.length > 0) score += 0.05;

    intentScores[intent] = { score: Math.max(0, score), subType: matchedSubType };
  }

  // Find best match
  for (const [intent, data] of Object.entries(intentScores)) {
    if (data.score > bestMatch.confidence) {
      bestMatch = {
        intent,
        confidence: Math.min(data.score, 1.0),
        subType: data.subType,
      };
    }
  }

  return bestMatch;
}

// Improved confirmation handling
function handleConfirmation(features, context) {
  const { q } = features;

  if (!context?.pendingConfirmation) return null;

  const isPositive = q === "yes" || q.includes("yes");
  const isNegative = q === "no" || q.includes("no");

  if (isPositive) {
    // Skip scoring and directly use lastIntent
    return {
      primaryIntent: context.lastIntent.primaryIntent,
      subIntent: context.lastIntent.subIntent,
      confidence: 0.95,
      isConfirmation: true,
      confirmationResponse: true,
    };
  }

  if (isNegative) {
    // Clear lastIntent and ask for clarification
    return {
      primaryIntent: "general",
      confidence: 0.9,
      isConfirmation: true,
      confirmationResponse: false,
      needsClarification: true
    };
  }

  return null;
}

// Enhanced intent detection with learning
export async function detectAdvancedIntent(question, userId = null) {
  if (!question?.trim()) {
    return { primaryIntent: "general", confidence: 0, subIntent: null };
  }

  try {
    const doc = nlp(question);
    const features = extractNLPFeatures(doc, question);
    const context = getConversationContext(userId);

    // Handle confirmation responses
    const confirmationResult = handleConfirmation(features, context);
    if (confirmationResult) return confirmationResult;

    // Match intent
    const bestMatch = matchIntent(features);

    const baseIntent = {
      primaryIntent: bestMatch.intent,
      subIntent: bestMatch.subType,
      confidence: bestMatch.confidence,
      labels: [bestMatch.intent, bestMatch.subType].filter(Boolean),
      nlpFeatures: {
        ...features,
        hasTimeContext:
          features.timeWords.length > 0 || features.dates.length > 0,
        hasNegation: features.negationWords.length > 0,
        isActionOriented:
          features.actionWords.length > 0 || features.verbs.length > 0,
        complexity:
          features.verbs.length +
          features.nouns.length +
          features.adjectives.length,
        hasNumbers: features.numbers.length > 0,
        hasEntities: features.entities.length > 0,
      },
    };

    // Enhance with learned patterns
    try {
      const { findSimilarQuestions } = await import("@/lib/assistantLearning");
      const similarQuestions = await findSimilarQuestions(question, baseIntent);

      if (similarQuestions.length > 0) {
        const bestSimilar = similarQuestions[0];
        const learnedIntent = bestSimilar.intent_category;
        const learnedConfidence = parseFloat(bestSimilar.confidence_score) || 0;
        const nlpSimilarity = bestSimilar.similarity_score || 0;

        if (bestSimilar.similarity_score > 0.85) {
          return {
            ...baseIntent,
            primaryIntent: learnedIntent,
            confidence: Math.max(baseIntent.confidence, learnedConfidence),
            learned: true,
            frequency: bestSimilar.frequency,
            similarity: nlpSimilarity,
          };
        }
      }
    } catch (error) {
      console.error("Error enhancing intent with learning:", error);
    }

    return baseIntent;
  } catch (error) {
    console.error("Error in detectAdvancedIntent:", error);
    return { primaryIntent: "general", confidence: 0, subIntent: null };
  }
}

// Improved role-specific response selection
function chooseRoleResponse(responseObject, role = "employee") {
  if (typeof responseObject === "string") {
    return responseObject;
  }

  if (typeof responseObject === "object" && responseObject !== null) {
    // Map hr, admin, superadmin, ceo to management category
    const mappedRole = ["hr", "admin", "superadmin", "ceo"].includes(
      role?.toLowerCase()
    )
      ? "management"
      : "employee";
    console.log(`Input role: ${role}, Mapped to: ${mappedRole}`);
    console.log(`Available response keys:`, Object.keys(responseObject));
    
    // Improved fallback: prefer employee text if no role-specific text
    const selectedResponse = responseObject[mappedRole] || responseObject.employee || responseObject.default;
    console.log(`Selected response:`, selectedResponse);
    
    return selectedResponse || "I'm here to help! Please contact HR for assistance.";
  }

  return "I'm here to help! Please contact HR for assistance.";
}

// Generate response based on intent
export async function generateIntentResponse(
  intent,
  question,
  userId,
  role = "employee"
) {
  console.log(`generateIntentResponse called with role: ${role}`);

  if (!intent) {
    return {
      answer:
        "I'm here to help! You can ask me about payslip, leave, attendance, holidays, or HR information.",
      confidence: 0,
    };
  }

  try {
    const confidencePercent = Math.round(intent.confidence * 100);

    // === Fetch similar question suggestions (optional learning layer) ===
    let contextualResponse = null;
    let similarQuestions = [];

    try {
      const {
        generateContextualResponse,
        getUserContext,
        findSimilarQuestions,
      } = await import("@/lib/assistantLearning");

      similarQuestions = await findSimilarQuestions(question, intent);
      contextualResponse = generateContextualResponse(
        intent.primaryIntent,
        question,
        similarQuestions,
        userId,
        role
      );
    } catch (error) {
      console.error("Contextual response error:", error);
    }
    // CONFUSION HANDLER
    if (isConfused(question)) {
      return {
        answer:
          "It looks like the option isn't showing on your dashboard. Can you confirm whether you're using the Employee Dashboard, HR Dashboard, or Admin Dashboard? Each one has a different layout.",
        confidence: 1,
        isConfusionFix: true,
      };
    }

    // === LOW CONFIDENCE → Ask for clarification ===
    if (intent.confidence < 0.3) {
      console.log(`LOW CONFIDENCE PATH: ${intent.confidence}`);
      setConversationContext(userId, {
        lastIntent: intent,
        pendingConfirmation: false,
      });

      const clarificationMessage = `
🤔 I'm not fully sure what you're asking.
Could you please clarify?

I can help you with:
💰 Payslips
📋 Leave
⏰ Attendance
🎉 Holidays
📞 Contact HR info
${["hr", "admin", "superadmin", "ceo"].includes(role?.toLowerCase()) ? 
`👥 Employee Management
🏢 Recruitment
📄 Document Management
💼 Payroll Management` : ''}
      `.trim();

      return {
        answer: makeConversational(clarificationMessage, "neutral"),
        confidence: confidencePercent,
        needsClarification: true,
      };
    }

    // === MEDIUM CONFIDENCE → Ask for confirmation ===
    if (intent.confidence < 0.6) {
      console.log(`MEDIUM CONFIDENCE PATH: ${intent.confidence}`);
      setConversationContext(userId, {
        lastIntent: intent,
        pendingConfirmation: true,
      });

      const guessedResponse = getResponseFromMap(intent, role);

      // Role-specific clarification options
      const isManagement = ["hr", "admin", "superadmin", "ceo"].includes(role?.toLowerCase());
      const clarificationOptions = isManagement 
        ? "payslip, leave, attendance, employees, recruitment, documents, payroll, or something else?"
        : "payslip, leave, attendance, holidays, or something else?";

      return {
        answer: `Just to confirm — were you asking about ${clarificationOptions}`,
        isClarification: true,
        // confidence: confidencePercent,
        // needsConfirmation: true,
        // suggestedResponse: guessedResponse,
      };
    }

    // === HIGH CONFIDENCE → Give final answer ===
    const previousContext = getConversationContext(userId);

    setConversationContext(userId, {
      lastIntent: intent,
      pendingConfirmation: false,
    });

    let finalResponse;

    // Check if this is a policy-related question and use file knowledge
    if (intent.primaryIntent === 'policy') {
      try {
        const { getRelevantFile } = await import('@/lib/fileKnowledge');
        const fileResult = await getRelevantFile(intent, question);
        
        if (fileResult && !fileResult.ambiguous) {
          // Extract relevant content from the file
          const content = fileResult.content.substring(0, 800); // Limit content length
          finalResponse = `📋 Based on our company policy documents:\n\n${content}\n\n${fileResult.filename.includes('policy') ? 'For complete policy details, ' : ''}please refer to the full policy document.`;
        } else if (fileResult && fileResult.ambiguous) {
          finalResponse = fileResult.message;
        } else {
          finalResponse = getResponseFromMap(intent, role);
        }
      } catch (error) {
        console.error('Error accessing file knowledge:', error);
        finalResponse = getResponseFromMap(intent, role);
      }
    }
    // If there's a strong learned match → use contextual response
    else if (contextualResponse && intent.learned && intent.similarity > 0.85) {
      console.log(`USING ROLE-AWARE CONTEXTUAL RESPONSE`);
      finalResponse = contextualResponse;
    } else {
      console.log(`USING RESPONSE MAP with confidence: ${intent.confidence}`);
      finalResponse = getResponseFromMap(intent, role);
    }

    // Add urgency prefix if needed
    if (intent.nlpFeatures?.hasUrgency) {
      finalResponse =
        "⚡ " +
        finalResponse +
        "\n\nIt looks urgent — please contact HR directly if needed.";
    }

    return {
      answer: finalResponse,
      confidence: confidencePercent,
      intent: intent.primaryIntent,
      subIntent: intent.subIntent,
      learned: intent.learned || false,
      similarity: intent.similarity || 0,
      nlpFeatures: intent.nlpFeatures,
    };
  } catch (error) {
    console.error("Error in generateIntentResponse:", error);

    return {
      answer:
        "I'm here to help! You can ask me about payslip, leave, attendance, holidays, or HR information.",
      confidence: 0,
    };
  }
}

// Get response from structured map
function getResponseFromMap(intent, role = "employee") {
  console.log(
    `getResponseFromMap called with intent: ${intent.primaryIntent}, subIntent: ${intent.subIntent}, role: ${role}`
  );

  const intentConfig = RESPONSE_MAP[intent.primaryIntent];
  if (!intentConfig) {
    return makeConversational("I'm here to help! Please ask me about payslip, leave, attendance, holidays, or contact information.");
  }

  const emoji = intentConfig.emoji;
  const responses = intentConfig.responses;

  let response;
  if (intent.subIntent && responses[intent.subIntent]) {
    console.log(`Using subIntent: ${intent.subIntent}`);
    response = chooseRoleResponse(responses[intent.subIntent], role);
  } else {
    console.log(`Using default response`);
    response = chooseRoleResponse(responses.default, role);
  }

  return makeConversational(`${emoji} ${response}`);
}

// Conversation context management
function getConversationContext(userId) {
  if (!userId) return null;
  return conversationContext.get(userId);
}

function setConversationContext(userId, context) {
  if (!userId) return;

  const existing = conversationContext.get(userId) || {
    history: [],
    lastTopic: null,
    lastUserMessage: null,
    lastBotMessage: null,
    sentiment: null,
  };

  const updated = {
    ...existing,
    ...context,
    lastUpdated: Date.now(),
  };

  // Track topic flow
  if (context.lastIntent?.primaryIntent) {
    updated.lastTopic = context.lastIntent.primaryIntent;
  }

  // Track natural conversation trail
  if (context.userMessage) {
    updated.lastUserMessage = context.userMessage;
  }
  if (context.botMessage) {
    updated.lastBotMessage = context.botMessage;
  }

  // Emotional tone memory
  if (context.sentiment) {
    updated.sentiment = context.sentiment;
  }

  // Add to short-term history
  if (context.lastIntent) {
    updated.history = updated.history || [];
    updated.history.push({
      intent: context.lastIntent.primaryIntent,
      subIntent: context.lastIntent.subIntent,
      confidence: context.lastIntent.confidence,
      timestamp: new Date().toISOString(),
      userSaid: context.userMessage || null,
    });

    // Keep recent 7 interactions (more natural than 5)
    if (updated.history.length > 7) {
      updated.history = updated.history.slice(-7);
    }
  }

  conversationContext.set(userId, updated);
}

// Improved confirmation response handling
export function handleConfirmationResponse(userId, isPositive) {
  const context = getConversationContext(userId);
  if (!context?.pendingConfirmation) return null;

  setConversationContext(userId, { pendingConfirmation: false });

  if (isPositive) {
    return getResponseFromMap(context.lastIntent, "employee");
  } else {
    // Clear lastIntent and ask what they need help with
    setConversationContext(userId, { lastIntent: null });
    const isManagement = ["hr", "admin", "superadmin", "ceo"].includes(role?.toLowerCase());
    const helpOptions = isManagement 
      ? "payslip, leave, attendance, employees, recruitment, documents, payroll, or contact information."
      : "payslip, leave, attendance, holidays, or contact information.";
    return `What would you like help with? I can assist with ${helpOptions}`;
  }
}

// Store learning data with NLP features
export async function storeQuestionResponse(
  question,
  response,
  userId,
  intent
) {
  try {
    const { storeQuestionResponse: dbStore, setUserContext } = await import(
      "@/lib/assistantLearning"
    );

    await dbStore(question, response, userId, intent, false);
    setUserContext(userId, intent, question);

    const context = getConversationContext(userId) || {};
    context.lastSuccessfulIntent = intent;
    context.lastQuestion = question;
    context.lastResponse = response;
    context.lastTimestamp = new Date().toISOString();
    context.nlpAnalysis = intent.nlpFeatures;

    setConversationContext(userId, context);

    console.log(
      `Learning stored: ${intent.primaryIntent} - ${question} (confidence: ${intent.confidence})`
    );
  } catch (error) {
    console.error("Failed to store learning data:", error);
  }
}

// Get learning insights
export async function getLearningInsights() {
  try {
    const { getLearningInsights: dbInsights } = await import(
      "@/lib/assistantLearning"
    );
    const dbData = await dbInsights();

    const intentStats = {};
    const confidenceByIntent = {};

    dbData.forEach((record) => {
      const intent = record.intent_category || "general";
      intentStats[intent] = (intentStats[intent] || 0) + record.frequency;

      if (!confidenceByIntent[intent]) {
        confidenceByIntent[intent] = [];
      }
      confidenceByIntent[intent].push(parseFloat(record.confidence_score) || 0);
    });

    const avgConfidenceByIntent = {};
    Object.entries(confidenceByIntent).forEach(([intent, scores]) => {
      avgConfidenceByIntent[intent] =
        scores.reduce((a, b) => a + b, 0) / scores.length;
    });

    return {
      totalQuestions: dbData.reduce((sum, record) => sum + record.frequency, 0),
      activeConversations: conversationContext.size,
      mostCommonIntents: Object.entries(intentStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      avgConfidenceByIntent,
      recentQuestions: dbData.slice(0, 10).map((record) => ({
        question: record.question,
        intent: record.intent_category,
        confidence: parseFloat(record.confidence_score) || 0,
        frequency: record.frequency,
        timestamp: record.last_asked,
      })),
    };
  } catch (error) {
    console.error("Failed to get learning insights:", error);
    const totalContexts = conversationContext.size;
    return {
      totalQuestions: totalContexts * 3,
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
      recentQuestions: [],
    };
  }
}

// Find similar questions
export async function findSimilarQuestions(question, intent) {
  try {
    const { findSimilarQuestions: dbFind } = await import(
      "@/lib/assistantLearning"
    );
    return await dbFind(question, intent);
  } catch (error) {
    console.error("Failed to find similar questions:", error);
    return [];
  }
}
