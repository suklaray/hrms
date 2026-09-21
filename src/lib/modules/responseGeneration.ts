// Response Generation Module with File-Based Validation
import { checkHRFile, readHRFileContent } from './fileChecker.js';

// Friendly structured response map with emojis
const RESPONSE_MAP = {
  payslip: {
    emoji: '💰',
    responses: {
      view: 'Visit Dashboard → Payslip → Select Month → View/Download your payslip',
      download: 'Go to Dashboard → Payslip → Choose month → Click Download button',
      status: 'Check Dashboard → Payslip section to see if your current month\'s payslip is ready',
      default: 'Visit Dashboard → Payslip section to view and download your payslip history'
    }
  },
  leave: {
    emoji: '📋',
    responses: {
      balance: 'Go to Dashboard → Attendance & Leave → Leave Balance tab to see remaining days',
      apply: 'Visit Dashboard → Attendance & Leave → Apply Leave button → Fill form and submit',
      status: 'Check Dashboard → Leave Request → History tab to see your leave request status',
      history: 'Go to Dashboard → Leave Request → History tab to view all your past leaves',
      default: 'Visit Dashboard → Attendance & Leave section for all leave-related activities'
    }
  },
  attendance: {
    emoji: '⏰',
    responses: {
      today: 'Check Dashboard → Attendance & Leave → Attendance Records for today\'s check-in/out',
      history: 'Visit Dashboard → Attendance & Leave → Attendance Records to view your attendance history',
      checkin: 'Use the check-in/check-out buttons on your dashboard or attendance section',
      default: 'Go to Dashboard → Attendance & Leave → Attendance Records for all attendance info'
    }
  },
  holiday: {
    emoji: '🎉',
    responses: {
      list: 'Check Dashboard → Calendar section to see all upcoming holidays and events',
      next: 'Visit Dashboard → Calendar to find the next upcoming holiday',
      today: 'Check Dashboard → Calendar or ask HR if today is a holiday',
      default: 'Visit Dashboard → Calendar section for complete holiday information'
    }
  },
  contact: {
    emoji: '📞',
    responses: {
      hr: 'HR Contact: hr@company.com | Phone: +91-XXXX-XXXX-XX | Office: 2nd Floor | Hours: 10 AM - 6 PM',
      it: 'IT Support: it-support@company.com | Ext. 1234 | Ground Floor | Hours: 9 AM - 6 PM',
      default: 'HR: hr@company.com | IT: it-support@company.com | For urgent matters, visit respective offices'
    }
  },
  policy: {
    emoji: '📋',
    responses: {
      company: 'Contact HR Department for complete company policy documents and guidelines',
      leave: 'Leave policy details are available through HR Department or Dashboard → Leave section',
      attendance: 'Attendance policy information is available through HR or Dashboard → Attendance section',
      default: 'Contact HR Department (hr@company.com) for all policy-related information and documents'
    }
  },
  profile: {
    emoji: '👤',
    responses: {
      update: 'Go to Dashboard → Profile Management → Update your contact information, address, or personal details',
      image: 'Visit Dashboard → Profile Management → Change Profile Image to upload a new profile picture',
      document: 'Go to Dashboard → Profile Management → Update Document to upload or modify your documents',
      view: 'Check Dashboard → Profile Management to view your current profile information',
      default: 'Visit Dashboard → Profile Management to update your profile information, change picture, or manage documents'
    }
  }
};

// Generate enhanced response with file validation
export async function generateEnhancedResponse(intent, question, userId) {
  const confidencePercent = Math.round(intent.confidence * 100);
  
  // Check for relevant HR file first
  const hrFile: any = await checkHRFile(intent, question);
  
  if (hrFile) {
    const content = await readHRFileContent(hrFile.path);
    if (content && content.trim()) {
      const preview = content.substring(0, 400);
      return {
        answer: `📄 **Found relevant document:**\n\n${preview}${content.length > 400 ? '...' : ''}\n\n💾 **Download:** ${hrFile.downloadUrl}`,
        confidence: Math.max(confidencePercent, 85),
        sourceFile: hrFile.filename,
        downloadUrl: hrFile.downloadUrl,
        hasFileContent: true
      };
    }
  }
  
  // Low confidence - ask for clarification
  if (intent.confidence < 0.6) {
    return {
      answer: `🤔 I'm not entirely sure what you're looking for. Could you please be more specific?\n\n**I can help you with:**\n• 💰 Payslip queries\n• 📋 Leave management\n• ⏰ Attendance records\n• 🎉 Holiday information\n• 📞 Contact details\n• 👤 Profile updates`,
      confidence: confidencePercent,
      needsClarification: true
    };
  }
  
  // Medium confidence - ask for confirmation
  if (intent.confidence < 0.8) {
    const response = getResponseFromMap(intent);
    return {
      answer: `I think you're asking about **${intent.primaryIntent}**. Is that correct? 🤔`,
      confidence: confidencePercent,
      needsConfirmation: true,
      suggestedResponse: response
    };
  }
  
  // High confidence - direct response
  const response = getResponseFromMap(intent);
  return {
    answer: response,
    confidence: confidencePercent,
    intent: intent.primaryIntent,
    subIntent: intent.subIntent
  };
}

// Get response from structured map
function getResponseFromMap(intent) {
  const intentConfig = RESPONSE_MAP[intent.primaryIntent];
  if (!intentConfig) {
    return "🤖 I'm here to help with HR queries! Please ask me about payslip, leave, attendance, holidays, or contact information.";
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

// Generate clarification response for non-HR queries
export function generateNonHRResponse() {
  return {
    answer: "🚫 I can only help with HR-related queries. Please ask about:\n\n• 💰 Payslip and salary\n• 📋 Leave requests\n• ⏰ Attendance records\n• 🎉 Holidays\n• 📞 Contact information\n• 👤 Profile management",
    confidence: 100,
    isNonHR: true
  };
}