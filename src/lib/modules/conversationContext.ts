// Conversation Context Management Module
const conversationContext = new Map(); // userId -> { lastIntent, pendingConfirmation, history }

// Get conversation context for user
export function getConversationContext(userId) {
  if (!userId) return null;
  return conversationContext.get(userId);
}

// Set conversation context for user
export function setConversationContext(userId, context) {
  if (!userId) return;
  
  const existing = conversationContext.get(userId) || { history: [] };
  const updated = { ...existing, ...context };
  
  // Add to history
  if (context.lastIntent) {
    updated.history = updated.history || [];
    updated.history.push({
      intent: context.lastIntent,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 5 interactions
    if (updated.history.length > 5) {
      updated.history = updated.history.slice(-5);
    }
  }
  
  conversationContext.set(userId, updated);
}

// Handle confirmation responses (yes/no)
export function handleConfirmationResponse(userId, isPositive) {
  const context = getConversationContext(userId);
  if (!context?.pendingConfirmation) {
    return null;
  }
  
  // Clear pending confirmation
  setConversationContext(userId, { pendingConfirmation: false });
  
  if (isPositive) {
    return {
      shouldUseSuggested: true,
      lastIntent: context.lastIntent
    };
  } else {
    return {
      shouldClarify: true,
      message: "No problem! Could you please rephrase your question? I'm here to help with HR-related queries."
    };
  }
}

// Get conversation history for context boost
export function getContextualBoost(currentQuestion, userId) {
  const context = getConversationContext(userId);
  const boost = {};
  
  if (!context?.history || context.history.length === 0) return boost;
  
  const lastMessage = context.history[context.history.length - 1];
  if (lastMessage?.intent?.primaryIntent) {
    // If previous question was about same topic, boost confidence
    boost[lastMessage.intent.primaryIntent] = 0.2;
  }
  
  return boost;
}

// Clear conversation context (for admin/reset)
export function clearConversationContext(userId) {
  if (userId) {
    conversationContext.delete(userId);
  } else {
    conversationContext.clear();
  }
}

// Get all active conversations (for admin insights)
export function getActiveConversations() {
  return {
    total: conversationContext.size,
    contexts: Array.from(conversationContext.entries()).map(([userId, context]) => ({
      userId,
      lastActivity: context.history?.[context.history.length - 1]?.timestamp,
      totalInteractions: context.history?.length || 0,
      pendingConfirmation: context.pendingConfirmation || false
    }))
  };
}