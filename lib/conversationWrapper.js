export function makeConversational(response, sentiment = "neutral") {
  const answer =
    typeof response === "string"
      ? response
      : response.answer || response.text || "";

  // Clean the answer and decode HTML entities
  const cleanAnswer = answer
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

  // Phrases you add as wrappers
  const openingMarkers = [
    "Sure",
    "Great", 
    "Awesome",
    "Absolutely",
    "Alright",
    "Got it",
    "No worries",
    "I understand",
    "Happy to help",
    "Okay",
    "Of course"
  ];

  // Check if already conversational - look for any opening marker at start
  const hasConversationalStart = openingMarkers.some(marker => 
    cleanAnswer.toLowerCase().startsWith(marker.toLowerCase())
  );

  // If already conversational → DO NOT WRAP AGAIN
  if (hasConversationalStart) {
    return cleanAnswer; // Return cleaned version without duplication
  }

  const openings = {
    positive: ["Great!", "Awesome!", "Happy to help!", "Absolutely!"],
    negative: ["I understand.", "No worries, I've got you.", "Let me help."],
    neutral: ["Sure!", "Alright!", "Got it!", "Okay!"],
  };

  const closings = [
    "Let me know if you'd like help with anything else.",
    "I'm here if you need anything else!",
    "Feel free to ask anytime.",
  ];

  const opening =
    openings[sentiment][
      Math.floor(Math.random() * openings[sentiment].length)
    ];
  const closing = closings[Math.floor(Math.random() * closings.length)];

  return `${opening} ${cleanAnswer}\n\n${closing}`;
}


export function bridgeTopic(previousTopic, newTopic) {
  if (!previousTopic || previousTopic !== newTopic) return "";
  return "Since we're still on the same topic, ";
}
