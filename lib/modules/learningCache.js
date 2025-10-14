// Learning Cache Module for Bot Insights
import fs from 'fs';
import path from 'path';

// In-memory learning cache
let learningCache = {
  questions: [], // { question, intent, confidence, response, timestamp, userId, frequency }
  insights: {
    totalQuestions: 0,
    intentStats: {},
    avgConfidenceByIntent: {},
    commonPatterns: []
  }
};

const cacheFile = path.join(process.cwd(), 'data', 'bot-learning-cache.json');

// Load cache from file on startup
function loadLearningCache() {
  try {
    if (fs.existsSync(cacheFile)) {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      learningCache = { ...learningCache, ...data };
    }
  } catch (error) {
    console.log('Learning cache not found, starting fresh');
  }
}

// Save cache to file
function saveLearningCache() {
  try {
    const dir = path.dirname(cacheFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(cacheFile, JSON.stringify(learningCache, null, 2));
  } catch (error) {
    console.error('Failed to save learning cache:', error);
  }
}

// Store question and response for learning
export function storeQuestionResponse(question, response, userId, intent) {
  const timestamp = new Date().toISOString();
  
  // Check if question already exists
  const existingIndex = learningCache.questions.findIndex(
    q => q.question.toLowerCase() === question.toLowerCase() && q.userId === userId
  );
  
  if (existingIndex >= 0) {
    // Update existing question
    learningCache.questions[existingIndex].frequency += 1;
    learningCache.questions[existingIndex].timestamp = timestamp;
    learningCache.questions[existingIndex].response = response;
  } else {
    // Add new question
    learningCache.questions.push({
      question: question.toLowerCase(),
      intent: intent.primaryIntent,
      subIntent: intent.subIntent,
      confidence: intent.confidence,
      response: typeof response === 'object' ? response.answer : response,
      timestamp,
      userId,
      frequency: 1,
      entities: intent.entities || []
    });
  }
  
  // Update insights
  updateInsights(intent);
  
  // Save to file periodically
  if (learningCache.questions.length % 10 === 0) {
    saveLearningCache();
  }
}

// Update learning insights
function updateInsights(intent) {
  learningCache.insights.totalQuestions += 1;
  
  const intentKey = intent.primaryIntent;
  if (!learningCache.insights.intentStats[intentKey]) {
    learningCache.insights.intentStats[intentKey] = 0;
  }
  learningCache.insights.intentStats[intentKey] += 1;
  
  // Update average confidence
  if (!learningCache.insights.avgConfidenceByIntent[intentKey]) {
    learningCache.insights.avgConfidenceByIntent[intentKey] = [];
  }
  learningCache.insights.avgConfidenceByIntent[intentKey].push(intent.confidence);
}

// Get learning insights for admin
export function getLearningInsights() {
  const insights = learningCache.insights;
  
  // Calculate average confidence per intent
  const avgConfidence = {};
  for (const [intent, scores] of Object.entries(insights.avgConfidenceByIntent)) {
    avgConfidence[intent] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  
  return {
    totalQuestions: insights.totalQuestions,
    intentStats: insights.intentStats,
    avgConfidenceByIntent: avgConfidence,
    totalCachedQuestions: learningCache.questions.length,
    mostCommonIntents: Object.entries(insights.intentStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5),
    recentQuestions: learningCache.questions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)
      .map(q => ({
        question: q.question,
        intent: q.intent,
        confidence: q.confidence,
        frequency: q.frequency
      }))
  };
}

// Find similar questions from cache
export function findSimilarQuestions(question, threshold = 0.7) {
  return learningCache.questions
    .map(cached => ({
      ...cached,
      similarity: calculateSimilarity(question.toLowerCase(), cached.question.toLowerCase())
    }))
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

// Calculate string similarity
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Initialize cache on module load
loadLearningCache();