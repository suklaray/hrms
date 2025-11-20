import prisma from "@/lib/prisma";
import nlp from 'compromise';

// Short-term in-memory context storage
const userContexts = new Map();

// Enhanced spell correction using Compromise NLP
function correctSpelling(text) {
  const doc = nlp(text);
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
  
  let corrected = doc.text().toLowerCase();
  for (const [wrong, right] of Object.entries(corrections)) {
    corrected = corrected.replace(new RegExp(wrong, 'g'), right);
  }
  return corrected;
}

// Removed detectAdvancedIntent function - now handled by intentHandler.js

// Enhanced similarity calculation with basic synonym expansion
function calculateNLPSimilarity(question1, question2) {
  const doc1 = nlp(question1);
  const doc2 = nlp(question2);
  
  // Basic synonym mapping for HR terms
  const synonymMap = {
    'salary': ['pay', 'wage', 'income', 'earning', 'compensation'],
    'leave': ['vacation', 'holiday', 'off', 'absence'],
    'attendance': ['presence', 'work', 'duty', 'shift'],
    'policy': ['rule', 'guideline', 'procedure', 'regulation'],
    'contact': ['reach', 'call', 'email', 'connect'],
    'help': ['support', 'assist', 'aid', 'guide']
  };
  
  const expandWords = (words) => {
    const expanded = new Set(words.map(w => w.toLowerCase()));
    words.forEach(word => {
      const lower = word.toLowerCase();
      Object.entries(synonymMap).forEach(([key, synonyms]) => {
        if (key === lower || synonyms.includes(lower)) {
          expanded.add(key);
          synonyms.forEach(syn => expanded.add(syn));
        }
      });
    });
    return expanded;
  };
  
  const nouns1 = expandWords(doc1.nouns().out('array'));
  const nouns2 = expandWords(doc2.nouns().out('array'));
  const verbs1 = expandWords(doc1.verbs().out('array'));
  const verbs2 = expandWords(doc2.verbs().out('array'));
  
  const nounIntersection = new Set([...nouns1].filter(x => nouns2.has(x)));
  const nounUnion = new Set([...nouns1, ...nouns2]);
  const nounSimilarity = nounUnion.size > 0 ? nounIntersection.size / nounUnion.size : 0;
  
  const verbIntersection = new Set([...verbs1].filter(x => verbs2.has(x)));
  const verbUnion = new Set([...verbs1, ...verbs2]);
  const verbSimilarity = verbUnion.size > 0 ? verbIntersection.size / verbUnion.size : 0;
  
  const words1 = new Set(question1.toLowerCase().split(' '));
  const words2 = new Set(question2.toLowerCase().split(' '));
  const wordIntersection = new Set([...words1].filter(x => words2.has(x)));
  const wordUnion = new Set([...words1, ...words2]);
  const wordSimilarity = wordUnion.size > 0 ? wordIntersection.size / wordUnion.size : 0;
  
  return (nounSimilarity * 0.4) + (verbSimilarity * 0.3) + (wordSimilarity * 0.3);
}

// Store user context
export function setUserContext(userId, intent, question) {
  userContexts.set(userId, {
    lastIntent: intent,
    lastQuestion: question,
    timestamp: Date.now()
  });
}

// Get user context
export function getUserContext(userId) {
  const context = userContexts.get(userId);
  if (context && Date.now() - context.timestamp < 300000) { // 5 minutes
    return context;
  }
  return null;
}

// Store question and response with learning quality tracking
export async function storeQuestionResponse(question, response, userId, intent, isReused = false) {
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

// Find and merge similar questions
export async function findSimilarQuestions(question, intent) {
  try {
    const candidates = await prisma.assistant_learning.findMany({
      where: {
        intent_category: intent?.primaryIntent || 'general',
        confidence_score: { gte: 0.7 },
        frequency: { gte: 3 }
      },
      orderBy: [{ frequency: 'desc' }, { confidence_score: 'desc' }],
      take: 20
    });

    const scoredCandidates = candidates.map(candidate => {
      const similarity = calculateNLPSimilarity(question, candidate.question);
      return {
        ...candidate,
        similarity_score: similarity
      };
    });

    // Merge similar questions with similarity > 0.7
    const highSimilarity = scoredCandidates.filter(c => c.similarity_score > 0.7);
    for (const similar of highSimilarity) {
      try {
        await prisma.assistant_learning.update({
          where: { id: similar.id },
          data: {
            confidence_score: Math.min(similar.confidence_score + 0.05, 1.0)
          }
        });
      } catch (e) {}
    }

    return scoredCandidates
      .filter(candidate => candidate.similarity_score > 0.3)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 5);
      
  } catch (error) {
    console.error('Similar questions error:', error.message);
    return [];
  }
}

// Get learning insights with NLP analysis
export async function getLearningInsights() {
  try {
    const insights = await prisma.assistant_learning.findMany({
      orderBy: [{ frequency: 'desc' }, { last_asked: 'desc' }],
      take: 20
    });
    
    // NLP-enhanced insights
    const nlpInsights = {
      commonNouns: {},
      commonVerbs: {},
      questionPatterns: {}
    };

    insights.forEach(q => {
      const doc = nlp(q.question);
      doc.nouns().out('array').forEach(noun => {
        nlpInsights.commonNouns[noun] = (nlpInsights.commonNouns[noun] || 0) + q.frequency;
      });
      doc.verbs().out('array').forEach(verb => {
        nlpInsights.commonVerbs[verb] = (nlpInsights.commonVerbs[verb] || 0) + q.frequency;
      });
    });
    
    return { insights, nlpInsights };
  } catch (error) {
    console.error('Learning insights error:', error.message);
    return { insights: [], nlpInsights: {} };
  }
}

// Generate tone-based human-like response with role awareness
export function generateContextualResponse(intent, question, similarQuestions = [], userId = null, userRole = "employee") {
  if (similarQuestions.length > 0) {
    const bestMatch = similarQuestions[0];
    if (bestMatch.similarity_score > 0.8) {
      // Import role-based response system
      const { RESPONSE_MAP } = require('./intentHandler');
      
      // Get role-based response instead of learned response
      const intentConfig = RESPONSE_MAP[intent];
      if (intentConfig) {
        const mappedRole = ["hr", "admin", "superadmin", "ceo"].includes(userRole?.toLowerCase()) ? "management" : "employee";
        const responses = intentConfig.responses;
        
        let roleBasedResponse;
        if (responses.view && responses.view[mappedRole]) {
          roleBasedResponse = `${intentConfig.emoji} ${responses.view[mappedRole]}`;
        } else if (responses.default && responses.default[mappedRole]) {
          roleBasedResponse = `${intentConfig.emoji} ${responses.default[mappedRole]}`;
        }
        
        if (roleBasedResponse) {
          // Update learning with role-based response
          storeQuestionResponse(question, roleBasedResponse, userId, { primaryIntent: intent }, true);
          return roleBasedResponse;
        }
      }
      
      // Fallback to original learned response
      storeQuestionResponse(question, bestMatch.response, userId, { primaryIntent: intent }, true);
      return bestMatch.response;
    }
  }
  
  return null; // Let the main system handle the response
}

// Add tone to response based on sentiment
function addToneToResponse(response, sentiment) {
  // Check if response already has conversational prefixes
  const conversationalPrefixes = ['Sure', 'Great', 'Awesome', 'Absolutely', 'Alright', 'Got it', 'No worries', 'I understand', 'Happy to help', 'Okay', 'Of course'];
  const hasPrefix = conversationalPrefixes.some(prefix => 
    response.toLowerCase().startsWith(prefix.toLowerCase())
  );
  
  if (hasPrefix) {
    return response; // Return as-is if already conversational
  }
  
  const toneMap = {
    positive: ['Great question! ', 'Happy to help! ', 'Absolutely! '],
    negative: ['I understand your concern. ', 'Let me help you with this. ', 'I see why this might be frustrating. '],
    neutral: ['', 'Sure, ', 'Of course, ']
  };
  
  const prefix = toneMap[sentiment][Math.floor(Math.random() * toneMap[sentiment].length)];
  return prefix + response;
}

// Get tone-based greeting
function getToneBasedGreeting(sentiment, intent) {
  const greetings = {
    positive: `Great! I'd be happy to help you with ${intent}.`,
    negative: `I understand you need help with ${intent}. Let me assist you.`,
    neutral: `I can help you with ${intent}.`
  };
  return greetings[sentiment] || greetings.neutral;
}

// Get tone-based closing
function getToneBasedClosing(sentiment) {
  const closings = {
    positive: " Hope this helps! Feel free to contact HR for more details.",
    negative: " I hope this resolves your concern. Please don't hesitate to contact HR if you need further assistance.",
    neutral: " Please contact HR for specific details."
  };
  return closings[sentiment] || closings.neutral;
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