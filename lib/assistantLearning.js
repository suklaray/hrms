import prisma from "@/lib/prisma";

// Simple spell correction for common misspellings
function correctSpelling(text) {
  const corrections = {
    'attendence': 'attendance', 'attandance': 'attendance', 'atendance': 'attendance',
    'payslp': 'payslip', 'paysleep': 'payslip', 'payslipp': 'payslip',
    'leav': 'leave', 'leve': 'leave', 'leeve': 'leave',
    'salry': 'salary', 'sallary': 'salary', 'salery': 'salary',
    'wrking': 'working', 'workng': 'working', 'workin': 'working',
    'tim': 'time', 'tiem': 'time', 'tym': 'time',
    'hr': 'human resource', 'hrs': 'hours', 'wrkng': 'working',
    'chkin': 'checkin', 'chkout': 'checkout', 'ofice': 'office',
    'polcy': 'policy', 'polici': 'policy', 'benfit': 'benefit',
    'remainig': 'remaining', 'remaning': 'remaining', 'balence': 'balance',
    'contct': 'contact', 'contat': 'contact', 'cantact': 'contact'
  };
  
  let corrected = text.toLowerCase();
  for (const [wrong, right] of Object.entries(corrections)) {
    corrected = corrected.replace(new RegExp(wrong, 'g'), right);
  }
  return corrected;
}

// Enhanced intent detection with more categories and labels
export function detectAdvancedIntent(question) {
  const correctedQuestion = correctSpelling(question);
  const lowerQuestion = correctedQuestion.toLowerCase();

  // Comprehensive keyword mapping with synonyms and variations
  const intentCategories = {
    // Payroll & Salary
    payroll: {
      keywords: [
        "payslip", "salary", "pay", "wage", "income", "earning", "money", "payment", 
        "compensation", "remuneration", "stipend", "bonus", "increment", "raise", 
        "deduction", "tax", "pf", "provident fund", "esi", "gratuity", "ctc", 
        "gross", "net", "take home", "in hand", "slip", "payroll"
      ],
      labels: ["salary_inquiry", "payslip_request", "deduction_query", "bonus_inquiry", "increment_request"]
    },

    // Attendance & Time
    attendance: {
      keywords: [
        "attendance", "working", "work", "hours", "days", "time", "present", 
        "absent", "checkin", "checkout", "office", "duty", "shift", "overtime", 
        "late", "early", "punctuality", "clock", "swipe", "biometric", "login", 
        "logout", "break", "lunch", "timing", "attendence", "attandance", "atendance",
        "wrking", "workng", "workin", "tim", "tiem", "tym", "hrs", "wrkng"
      ],
      labels: ["attendance_query", "working_hours", "overtime_request", "timing_inquiry", "break_policy"]
    },

    // Leave Management
    leave: {
      keywords: [
        "leave", "holiday", "vacation", "off", "break", "absent", "sick", 
        "medical", "personal", "casual", "annual", "maternity", "paternity", 
        "emergency", "bereavement", "comp off", "compensatory", "lwp", 
        "without pay", "half day", "permission", "early leave", "leave balance",
        "remaining leave", "leave days remaining", "available leave", "leave days left",
        "how many leave days", "leave entitlement", "leave quota"
      ],
      labels: ["leave_application", "leave_balance", "leave_policy", "sick_leave", "casual_leave", "annual_leave"]
    },

    // Benefits & Policies
    benefits: {
      keywords: [
        "benefits", "insurance", "health", "medical", "retirement", "pf", 
        "provident", "bonus", "allowance", "reimbursement", "claim", "policy", 
        "coverage", "premium", "nominee", "dependent", "family", "spouse", 
        "child", "parent", "mediclaim"
      ],
      labels: ["insurance_query", "medical_benefits", "reimbursement_claim", "policy_inquiry", "family_benefits"]
    },

    // HR Policies & Procedures
    policy: {
      keywords: [
        "policy", "rule", "regulation", "guideline", "procedure", "process", 
        "code", "conduct", "dress", "behavior", "harassment", "grievance", 
        "complaint", "disciplinary", "performance", "appraisal", "feedback", 
        "training", "development", "promotion", "transfer"
      ],
      labels: ["policy_inquiry", "code_of_conduct", "grievance_procedure", "performance_review", "training_request"]
    },

    // IT & Technical Support
    technical: {
      keywords: [
        "laptop", "computer", "system", "software", "hardware", "password", 
        "email", "access", "login", "account", "vpn", "internet", "wifi", 
        "printer", "scanner", "phone", "mobile", "sim", "it support", 
        "technical", "issue", "problem", "error", "bug", "camera", "webcam",
        "microphone", "audio", "video", "screen", "display", "keyboard", "mouse"
      ],
      labels: ["it_support", "system_access", "hardware_request", "software_issue", "password_reset", "camera_issue"]
    },

    // Office & Facilities
    facilities: {
      keywords: [
        "office", "desk", "chair", "cabin", "seating", "parking", "canteen", 
        "food", "cafeteria", "transport", "shuttle", "bus", "cab", "taxi", 
        "accommodation", "guest house", "hostel", "facility", "maintenance", 
        "cleaning", "security", "access card", "id card", "office hours",
        "office time", "working hours", "office location", "office address"
      ],
      labels: ["office_facilities", "seating_arrangement", "transport_facility", "canteen_services", "maintenance_request", "office_hours"]
    },

    // Holidays
    holidays: {
      keywords: [
        "holiday", "holidays", "festival", "festivals", "public holiday", 
        "national holiday", "religious holiday", "celebration", "observance", 
        "diwali", "christmas", "eid", "holi", "dussehra", "new year", 
        "independence day", "republic day", "gandhi jayanti", "next holiday", 
        "upcoming holiday", "holiday list", "festival list"
      ],
      labels: ["holiday_inquiry", "festival_dates", "next_holiday", "holiday_list", "public_holidays"]
    },

    // Finance & Expenses
    finance: {
      keywords: [
        "expense", "reimbursement", "claim", "bill", "receipt", "travel", 
        "conveyance", "fuel", "mobile", "internet", "advance", "loan", 
        "settlement", "final", "fnf", "recovery", "deduction", "fine", 
        "penalty", "tax", "tds", "form 16", "investment"
      ],
      labels: ["expense_claim", "travel_reimbursement", "advance_request", "loan_inquiry", "tax_related"]
    },

    // Performance & Career
    performance: {
      keywords: [
        "performance", "appraisal", "review", "feedback", "rating", "goal", 
        "target", "kpi", "objective", "achievement", "promotion", "career", 
        "growth", "development", "skill", "training", "certification", 
        "course", "learning", "mentoring", "coaching"
      ],
      labels: ["performance_review", "career_growth", "training_request", "skill_development", "promotion_inquiry"]
    },

    // General HR Queries
    general: {
      keywords: [
        "hr", "human resource", "contact", "help", "support", "query", 
        "question", "doubt", "clarification", "information", "details", 
        "process", "procedure", "how to", "when", "where", "who", "what", "why",
        "contact hr", "hr contact", "hr phone", "hr email", "reach hr", "hr department",
        "how can i contact hr", "hr information", "hr details"
      ],
      labels: ["general_inquiry", "contact_information", "process_clarification", "help_request", "information_request", "hr_contact"]
    }
  };

  // Time-based detection
  const timePatterns = {
    today: ["today", "current", "now", "present", "this day"],
    yesterday: ["yesterday", "last day", "previous day"],
    tomorrow: ["tomorrow", "next day"],
    week: ["week", "weekly", "this week", "last week", "next week"],
    month: ["month", "monthly", "this month", "last month", "next month"],
    year: ["year", "yearly", "annual", "this year", "last year"],
    specific: ["on", "date", "day", /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/]
  };

  // Status-based detection
  const statusPatterns = {
    pending: ["pending", "waiting", "under review", "processing"],
    approved: ["approved", "accepted", "confirmed", "sanctioned"],
    rejected: ["rejected", "denied", "declined", "disapproved"],
    completed: ["completed", "done", "finished", "processed"],
    cancelled: ["cancelled", "canceled", "withdrawn", "revoked"]
  };

  // Detect primary intent
  let primaryIntent = "general";
  let confidence = 0;
  let detectedLabels = [];

  for (const [category, data] of Object.entries(intentCategories)) {
    const matches = data.keywords.filter(keyword => lowerQuestion.includes(keyword));
    const categoryConfidence = matches.length / data.keywords.length;
    
    if (categoryConfidence > confidence) {
      confidence = categoryConfidence;
      primaryIntent = category;
      detectedLabels = data.labels;
    }
  }

  // Detect time context
  const timeContext = {};
  for (const [timeType, patterns] of Object.entries(timePatterns)) {
    timeContext[timeType] = patterns.some(pattern => {
      if (typeof pattern === 'string') {
        return lowerQuestion.includes(pattern);
      } else {
        return pattern.test(lowerQuestion);
      }
    });
  }

  // Detect status context
  const statusContext = {};
  for (const [status, patterns] of Object.entries(statusPatterns)) {
    statusContext[status] = patterns.some(pattern => lowerQuestion.includes(pattern));
  }

  // Extract specific labels based on question content
  const specificLabels = [];
  detectedLabels.forEach(label => {
    if (lowerQuestion.includes(label.split('_')[0])) {
      specificLabels.push(label);
    }
  });

  return {
    primaryIntent,
    confidence,
    labels: specificLabels.length > 0 ? specificLabels : [detectedLabels[0] || "general_inquiry"],
    timeContext,
    statusContext,
    isSpecificDate: timeContext.specific,
    hasTimeReference: Object.values(timeContext).some(Boolean),
    hasStatusReference: Object.values(statusContext).some(Boolean)
  };
}

// Store question and response for learning
export async function storeQuestionResponse(question, response, userId, intent) {
  try {
    const existingRecord = await prisma.assistant_learning.findFirst({
      where: { question: question.toLowerCase().trim() }
    });

    if (existingRecord) {
      await prisma.assistant_learning.update({
        where: { id: existingRecord.id },
        data: {
          frequency: { increment: 1 },
          last_asked: new Date(),
          response: response.substring(0, 1000),
          intent_category: intent?.primaryIntent || 'general',
          confidence_score: intent?.confidence || 0
        }
      });
    } else {
      await prisma.assistant_learning.create({
        data: {
          question: question.toLowerCase().trim(),
          response: response.substring(0, 1000),
          user_id: userId || 'anonymous',
          intent_category: intent?.primaryIntent || 'general',
          intent_labels: JSON.stringify(intent?.labels || []),
          confidence_score: intent?.confidence || 0,
          frequency: 1
        }
      });
    }
  } catch (error) {
    console.error('Learning storage error:', error.message);
  }
}

// Find similar questions from learning database
export async function findSimilarQuestions(question, intent) {
  try {
    const similar = await prisma.assistant_learning.findMany({
      where: {
        OR: [
          { question: { contains: question.toLowerCase() } },
          { intent_category: intent?.primaryIntent || 'general' }
        ]
      },
      orderBy: [{ frequency: 'desc' }, { last_asked: 'desc' }],
      take: 5
    });
    return similar;
  } catch (error) {
    console.error('Similar questions error:', error.message);
    return [];
  }
}

// Get learning insights for admin
export async function getLearningInsights() {
  try {
    const insights = await prisma.assistant_learning.findMany({
      orderBy: [{ frequency: 'desc' }, { last_asked: 'desc' }],
      take: 20
    });
    return insights;
  } catch (error) {
    console.error('Learning insights error:', error.message);
    return [];
  }
}

// Check if learning table exists
export async function checkTableExists() {
  // Learning system disabled
  return false;
}

// Create database table if not exists
export async function initializeLearningTable() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS assistant_learning (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        response TEXT NOT NULL,
        user_id VARCHAR(255),
        intent_category VARCHAR(100),
        intent_labels JSON,
        confidence_score DECIMAL(3,2),
        frequency INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_asked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_question (question(255))
      )
    `;
    console.log("Learning table initialized successfully");
  } catch (error) {
    console.error("Learning table initialization failed:", error.message);
  }
}