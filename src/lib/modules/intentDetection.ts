// Enhanced Intent Detection Module
import { getConversationContext, getContextualBoost } from './conversationContext.js';

// Enhanced intent patterns with HR context validation
const INTENT_PATTERNS = {
  payslip: {
    keywords: ['payslip', 'salary', 'pay', 'wage', 'earning', 'slip', 'payroll'],
    subTypes: {
      view: ['view', 'see', 'check', 'show', 'display'],
      download: ['download', 'get', 'save', 'pdf'],
      status: ['status', 'ready', 'available', 'generated'],
      amount: ['amount', 'total', 'net', 'gross']
    },
    weight: 1.0
  },
  leave: {
    keywords: ['leave', 'vacation', 'holiday', 'absence', 'off', 'pto'],
    subTypes: {
      balance: ['balance', 'remaining', 'left', 'available', 'how many'],
      apply: ['apply', 'request', 'take', 'book', 'submit'],
      status: ['status', 'approved', 'pending', 'rejected'],
      history: ['history', 'past', 'previous', 'old']
    },
    weight: 1.0
  },
  attendance: {
    keywords: ['attendance', 'present', 'absent', 'checkin', 'checkout', 'time', 'punch', 'clock'],
    subTypes: {
      today: ['today', 'current', 'now'],
      history: ['history', 'past', 'previous', 'yesterday'],
      checkin: ['checkin', 'check-in', 'punch', 'mark', 'clock in']
    },
    weight: 0.9
  },
  holiday: {
    keywords: ['holiday', 'festival', 'celebration', 'off day', 'public holiday'],
    subTypes: {
      list: ['list', 'all', 'calendar', 'schedule'],
      next: ['next', 'upcoming', 'future', 'when'],
      today: ['today', 'tomorrow']
    },
    weight: 0.8
  },
  contact: {
    keywords: ['contact', 'phone', 'email', 'hr', 'help', 'support', 'reach'],
    subTypes: {
      hr: ['hr', 'human resource', 'human resources'],
      it: ['it', 'technical', 'computer', 'system']
    },
    weight: 0.7
  },
  policy: {
    keywords: ['policy', 'rule', 'guideline', 'procedure', 'regulation'],
    subTypes: {
      company: ['company', 'organization'],
      leave: ['leave policy'],
      attendance: ['attendance policy']
    },
    weight: 0.6
  },
  profile: {
    keywords: ['profile', 'update', 'change', 'modify', 'edit', 'information', 'document', 'image', 'photo', 'picture', 'address', 'phone', 'email'],
    subTypes: {
      update: ['update', 'change', 'modify', 'edit'],
      image: ['image', 'photo', 'picture', 'avatar'],
      document: ['document', 'file', 'upload'],
      view: ['view', 'see', 'check', 'show']
    },
    weight: 0.9
  }
};

// Non-HR keywords that should be rejected
const NON_HR_KEYWORDS = [
  'weather', 'news', 'sports', 'cooking', 'recipe', 'movie', 'music', 
  'game', 'programming', 'code', 'math', 'science', 'history', 'geography'
];

// Detect advanced intent with context awareness
export function detectAdvancedIntent(question, userId = null) {
  const q = question.toLowerCase().trim();
  
  // Check for non-HR queries first
  if (NON_HR_KEYWORDS.some(keyword => q.includes(keyword))) {
    return {
      primaryIntent: 'non_hr',
      confidence: 0.95,
      isNonHR: true
    };
  }
  
  // Handle context-aware responses (yes/no)
  const context = getConversationContext(userId);
  if (context?.pendingConfirmation && (q === 'yes' || q === 'no' || q.includes('yes') || q.includes('no'))) {
    if (q.includes('yes') || q === 'yes') {
      return {
        primaryIntent: context.lastIntent.primaryIntent,
        subIntent: context.lastIntent.subIntent,
        confidence: 0.95,
        isConfirmation: true,
        confirmationResponse: true
      };
    } else {
      return {
        primaryIntent: 'clarification',
        confidence: 0.9,
        isConfirmation: true,
        confirmationResponse: false
      };
    }
  }
  
  let bestMatch = { intent: 'general', confidence: 0, subType: null };
  
  // Get contextual boost from conversation history
  const contextBoost = getContextualBoost(q, userId);
  
  // Fuzzy matching with enhanced scoring
  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    let matchedSubType = null;
    
    // Primary keyword matching with fuzzy logic
    for (const keyword of config.keywords) {
      if (q.includes(keyword)) {
        score += config.weight * 0.6;
      }
      // Partial matching for compound words
      if (q.startsWith(keyword) || keyword.includes(q.split(' ')[0])) {
        score += config.weight * 0.3;
      }
    }
    
    // Sub-type detection with enhanced matching
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
    
    // Apply contextual boost
    if (contextBoost[intent]) {
      score += contextBoost[intent];
    }
    
    // Boost for exact phrase matches
    if (q === intent || q.includes(`my ${intent}`) || q.includes(`${intent} status`)) {
      score += 0.3;
    }
    
    if (score > bestMatch.confidence) {
      bestMatch = {
        intent,
        confidence: Math.min(score, 1.0),
        subType: matchedSubType
      };
    }
  }
  
  return {
    primaryIntent: bestMatch.intent,
    subIntent: bestMatch.subType,
    confidence: bestMatch.confidence,
    labels: [bestMatch.intent, bestMatch.subType].filter(Boolean)
  };
}

// Validate if query is HR-related
export function isHRRelated(intent) {
  return intent.primaryIntent !== 'non_hr' && 
         intent.primaryIntent !== 'general' && 
         intent.confidence > 0.3;
}