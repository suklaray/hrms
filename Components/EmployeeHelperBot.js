import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
export default function EmployeeHelperBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  // const [notifications, setNotifications] = useState([]);

  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let greeting = "";
    let emoji = "";

    if (hour < 12) {
      greeting = "Good Morning";
      emoji = "🌅";
    } else if (hour < 17) {
      greeting = "Good Afternoon";
      emoji = "☀️";
    } else {
      greeting = "Good Evening";
      emoji = "🌆";
    }

    const motivationalMessages = [
      "Ready to make today productive?",
      "Let's achieve great things today!",
      "Hope you have a wonderful day ahead!",
      "Time to shine and do amazing work!",
      "Wishing you a fantastic and successful day!",
    ];

    const randomMessage =
      motivationalMessages[
        Math.floor(Math.random() * motivationalMessages.length)
      ];

    return `${emoji} ${greeting}!\n\n📅 Today is ${today}\n\n💪 ${randomMessage}\n\nI'm here to help with any questions about payroll, attendance, leaves, or company policies!`;
  };
  useEffect(() => {
    // Show greeting on site visit/login
    const greetingTimer = setTimeout(() => {
      const today = new Date().toDateString();
      // const lastGreetingDate = localStorage.getItem("lastGreetingDate");

      // Show greeting once per day or if no greeting shown today
      // if ( lastGreetingDate !== today) {
      setGreetingMessage(getGreetingMessage());
      setShowGreeting(true);
      setIsAnimating(true);
      localStorage.setItem("lastGreetingDate", today);

      // Auto-hide greeting after 8 seconds
      setTimeout(() => {
        setShowGreeting(false);
      }, 5000);
      // }
    }, 1000);

    return () => {
      clearTimeout(greetingTimer);
    };
  }, []);

  // Periodic animation effect
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }, 10000); // Animate every 10 seconds

    return () => clearInterval(animationInterval);
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    // 1️⃣ Push user message into chat
    setMessages((prev) => [...prev, { sender: "user", text: question }]);

    setLoading(true);
    try {
      const res = await fetch("/api/assistant/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      // 2️⃣ Push assistant response into chat
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: data.answer || "Sorry, I didn’t understand.",
          github_link: data.github_link || null,
          intent: data.intent || null,
          confidence: data.confidence || null,
          labels: data.labels || [],
        },
      ]);
    } catch (error) {
      // 3️⃣ Push error as assistant message
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: "⚠️ Sorry, I encountered an error. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
      setQuestion(""); // clear input box after sending
    }
  };

  const closeModal = () => {
    setMessages([]);
    setIsOpen(false);
    setQuestion("");

  };

  return (
    <>
      

      {/* Greeting Message */}
      {showGreeting && (
        <div className="fixed bottom-28 right-6 z-40 animate-fade-in-up">
          <div className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 text-white p-4 rounded-2xl shadow-2xl max-w-sm border-2 border-white/30 backdrop-blur-md">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm whitespace-pre-line leading-relaxed bg-white/10 p-3 rounded-lg">
                  {greetingMessage}
                </p>
              </div>
              <button
                onClick={() => setShowGreeting(false)}
                className="ml-2 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full p-1 hover:bg-white/20"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-500 flex items-center justify-center z-50 group border-4 border-white/30 ${
          isAnimating ? "animate-gentle-bounce" : ""
        } `}
        title="Ask Employee Assistant"
      >
      <Image 
        src="/images/robo.png" 
        alt="Assistant" 
        width={64}
        height={64}
        unoptimized
        className="w-16 h-16 group-hover:scale-125 transition-transform duration-300 drop-shadow-lg" 
      />
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 animate-ping opacity-30"></div>
      </button>
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 animate-fade-in-up">
          <div className="bg-white rounded-lg shadow-xl w-80 max-h-[70vh] flex flex-col border border-gray-200 backdrop-blur-sm relative">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 pt-12 space-y-3">
              {messages.length === 0 && (
                <div className="text-gray-500 text-sm text-center space-y-4">
                  <div>🤖 Start a conversation with your AI Assistant</div>

                  {/* Suggestions */}
                  <div className="flex flex-col gap-2">
                    {[
                      "Can you please tell me my payslip status?",
                      "What was my total working time yesterday?",
                      "What are the official office working hours?",
                      "Could you explain the company’s policies to me?",
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuestion(suggestion)}
                        className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm transition"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`px-3 py-2 rounded-lg max-w-[70%] text-sm ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>
                    {msg.github_link && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <a
                          href={msg.github_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          📋 View Full Policy on GitHub
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 bg-gray-100 text-gray-500 text-sm rounded-lg animate-pulse">
                    Assistant is typing...
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSubmit}
              className="p-3 border-t border-gray-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-2 rounded-full"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out;
        }
      `}</style>
    </>
  );
}
