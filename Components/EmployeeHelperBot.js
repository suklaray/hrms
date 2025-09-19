import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
export default function EmployeeHelperBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let greeting = '';
    let emoji = '';
    
    if (hour < 12) {
      greeting = 'Good Morning';
      emoji = '🌅';
    } else if (hour < 17) {
      greeting = 'Good Afternoon';
      emoji = '☀️';
    } else {
      greeting = 'Good Evening';
      emoji = '🌆';
    }
    
    const motivationalMessages = [
      'Ready to make today productive?',
      'Let\'s achieve great things today!',
      'Hope you have a wonderful day ahead!',
      'Time to shine and do amazing work!',
      'Wishing you a fantastic and successful day!'
    ];
    
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    
    return `${emoji} ${greeting}!\n\n📅 Today is ${today}\n\n💪 ${randomMessage}\n\nI'm here to help with any questions about payroll, attendance, leaves, or company policies!`;
  };
  
  const showCheckInNotifications = async () => {
    try {
      console.log('showCheckInNotifications called');
      
      const lastNotificationShown = localStorage.getItem('lastNotificationShown');
      
      // If notifications already shown for this check-in session, don't show again
      if (lastNotificationShown) {
        console.log('Notifications already shown for this session');
        return;
      }
      
      const newNotifications = [];
      
      // Check leave notifications
      const leaveRes = await fetch('/api/assistant/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'check leave status' }),
      });
      const leaveData = await leaveRes.json();
      
      if (leaveData.answer && leaveData.answer.includes('✅') && leaveData.answer.includes('Approved')) {
        const lines = leaveData.answer.split('\n');
        const approvedLeaves = lines.filter(line => line.includes('✅') && line.includes('Approved'));
        
        if (approvedLeaves.length > 0) {
          newNotifications.push({
            id: 'leave-approved',
            type: 'leave',
            status: 'approved',
            title: 'Leave Approved!',
            message: `🎉 You have approved leave requests:\n\n${approvedLeaves.join('\n')}\n\n📍 View details in Leave Management`,
            bgColor: 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600',
            borderColor: 'border-yellow-300/80'
          });
        }
      }
      
      if (leaveData.answer && leaveData.answer.includes('❌') && leaveData.answer.includes('Rejected')) {
        const lines = leaveData.answer.split('\n');
        const rejectedLeaves = lines.filter(line => line.includes('❌') && line.includes('Rejected'));
        
        if (rejectedLeaves.length > 0) {
          newNotifications.push({
            id: 'leave-rejected',
            type: 'leave',
            status: 'rejected',
            title: 'Leave Rejected!',
            message: `😔 Your leave request(s) were rejected:\n\n${rejectedLeaves.join('\n')}\n\n📍 View details in Leave Management`,
            bgColor: 'bg-gradient-to-br from-red-400 via-red-500 to-red-600',
            borderColor: 'border-orange-300/80'
          });
        }
      }
      
      // Check payslip notifications
      const payslipRes = await fetch('/api/assistant/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'general hr query' }),
      });
      const payslipData = await payslipRes.json();
      
      if (payslipData.answer && payslipData.answer.includes('💰') && payslipData.answer.includes('payslip is ready')) {
        // Extract payslip details from the response
        const lines = payslipData.answer.split('\n');
        let payslipInfo = '';
        let foundPayslip = false;
        
        lines.forEach(line => {
          if (line.includes('✅') && (line.includes('Payslip') || line.includes('Generated') || line.includes('Salary'))) {
            payslipInfo += line.trim() + '\n';
            foundPayslip = true;
          }
        });
        
        if (foundPayslip) {
          newNotifications.push({
            id: 'payslip-ready',
            type: 'payslip',
            status: 'ready',
            title: 'Payslip Ready!',
            message: `💰 Your payslip is now available:\n\n${payslipInfo}\n📍 View in Payroll Management`,
            bgColor: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600',
            borderColor: 'border-cyan-300/80'
          });
        }
      }
      
      // Check for holiday notifications
      const holidayRes = await fetch('/api/assistant/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'is tomorrow holiday?' }),
      });
      const holidayData = await holidayRes.json();
      
      if (holidayData.answer && holidayData.answer.includes('🎉 Yes!')) {
        // Extract holiday name from response
        const holidayMatch = holidayData.answer.match(/Tomorrow.*is (.+?)\n/);
        const holidayName = holidayMatch ? holidayMatch[1] : 'a holiday';
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });
        
        newNotifications.push({
          id: 'holiday-tomorrow',
          type: 'holiday',
          status: 'info',
          title: 'Holiday Tomorrow!',
          message: `🎉 Tomorrow (${tomorrowDate}) is ${holidayName}\n\n🏖️ Enjoy your holiday break!\n\n💡 Office will be closed tomorrow.`,
          bgColor: 'bg-gradient-to-br from-purple-400 via-pink-500 to-red-500',
          borderColor: 'border-yellow-300/80'
        });
      } else {
        // Check for weekend holiday tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDay = tomorrow.getDay(); // 0 = Sunday, 6 = Saturday
        
        if (tomorrowDay === 0 || tomorrowDay === 6) {
          const dayName = tomorrowDay === 0 ? 'Sunday' : 'Saturday';
          const tomorrowDate = tomorrow.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          });
          
          newNotifications.push({
            id: 'weekend-holiday',
            type: 'holiday',
            status: 'info',
            title: 'Weekend Holiday Tomorrow!',
            message: `🎉 Tomorrow is ${dayName} (${tomorrowDate})\n\n🏖️ Enjoy your weekend break!\n\n💡 Office will be closed tomorrow.`,
            bgColor: 'bg-gradient-to-br from-purple-400 via-pink-500 to-red-500',
            borderColor: 'border-yellow-300/80'
          });
        }
      }
      
      // Check for upcoming holidays in next 3 days
      const upcomingHolidayRes = await fetch('/api/assistant/answer', {
        method: 'POST',
        headers: { 'Content-type': 'application/json' },
        body: JSON.stringify({ question: 'next holiday' }),
      });
      const upcomingHolidayData = await upcomingHolidayRes.json();
      
      if (upcomingHolidayData.answer && upcomingHolidayData.answer.includes('Next Holiday:')) {
        const daysMatch = upcomingHolidayData.answer.match(/Days remaining: (\d+) days/);
        const holidayNameMatch = upcomingHolidayData.answer.match(/Next Holiday: (.+?)\n/);
        
        if (daysMatch && holidayNameMatch) {
          const daysRemaining = parseInt(daysMatch[1]);
          const holidayName = holidayNameMatch[1];
          
          // Show notification if holiday is within next 3 days (but not tomorrow, already handled above)
          if (daysRemaining > 1 && daysRemaining <= 3) {
            newNotifications.push({
              id: 'upcoming-holiday',
              type: 'holiday',
              status: 'info',
              title: 'Upcoming Holiday!',
              message: `🗓️ ${holidayName} is coming up in ${daysRemaining} days\n\n📅 Plan your work accordingly\n\n💡 Don't forget to complete pending tasks!`,
              bgColor: 'bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-500',
              borderColor: 'border-orange-300/80'
            });
          }
        }
      }
      
      console.log('Found notifications:', newNotifications.length);
      if (newNotifications.length > 0) {
        console.log('Setting notifications:', newNotifications);
        setNotifications(newNotifications);
        localStorage.setItem('lastNotificationShown', 'true');
      } else {
        // Always show at least one notification on check-in
        const defaultNotifications = [{
          id: 'checkin-welcome',
          type: 'welcome',
          status: 'info',
          title: 'Attendance Checked In!',
          message: `🎉 You've successfully checked in for attendance. Have a productive day!`,
          bgColor: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600',
          borderColor: 'border-cyan-300/80'
        }];
        console.log('Setting default notification');
        setNotifications(defaultNotifications);
        localStorage.setItem('lastNotificationShown', 'true');
      }
    } catch (error) {
      console.error('Error showing check-in notifications:', error);
    }
  };
  
  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };
  
  useEffect(() => {
    // Initial setup - don't show notifications on page load
    // Notifications will only show on check-in events
    
    // Set up interval to monitor check-in/check-out status
    const statusInterval = setInterval(async () => {
      try {
        const checkInStatus = await fetch('/api/employee/work-status');
        if (!checkInStatus.ok) return;
        
        const statusData = await checkInStatus.json();
        
        const wasWorking = localStorage.getItem('wasWorking');
        
        if (!statusData.isWorking && wasWorking === 'true') {
          // User just checked out from attendance - clear all notification localStorage
          console.log('User checked out from attendance, clearing notifications');
          localStorage.removeItem('lastNotificationShown');
          // Keep greeting date-based, don't remove on checkout
          localStorage.removeItem('wasWorking');
          setNotifications([]);
        } else if (statusData.isWorking && wasWorking !== 'true') {
          // User just checked in for attendance - show notifications immediately
          console.log('User checked in for attendance, showing notifications');
          localStorage.setItem('wasWorking', 'true');
          showCheckInNotifications();
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    }, 5000); // Check every 5 seconds for faster detection
    
    return () => clearInterval(statusInterval);
  }, []);
  
  useEffect(() => {
    // Show greeting on site visit/login
    const greetingTimer = setTimeout(() => {
      const today = new Date().toDateString();
      const lastGreetingDate = localStorage.getItem('lastGreetingDate');
      
      // Show greeting once per day or if no greeting shown today
      if (notifications.length === 0 && lastGreetingDate !== today) {
        setGreetingMessage(getGreetingMessage());
        setShowGreeting(true);
        setIsAnimating(true);
        localStorage.setItem('lastGreetingDate', today);
        
        // Auto-hide greeting after 8 seconds
        setTimeout(() => {
          setShowGreeting(false);
        }, 8000);
      }
    }, 1000);
    
    return () => {
      clearTimeout(greetingTimer);
    };
  }, [notifications]);
  
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

    setLoading(true);
    try {
      const res = await fetch('/api/assistant/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      setResponse(data);
      
      // No need to check notifications here - they're handled by attendance events
    } catch (error) {
      setResponse({
        answer: 'Sorry, I encountered an error. Please try again later.',
        github_link: null
      });
    }
    setLoading(false);
  };

  const closeModal = () => {
    setIsOpen(false);
    setQuestion('');
    setResponse(null);
  };

  return (
    <>
      {/* Notifications */}
      {notifications.map((notification, index) => (
        <div 
          key={notification.id} 
          className="fixed right-6 z-[9999] animate-fade-in-up" 
          style={{zIndex: 9999, bottom: `${28 + (index * 120)}px`}}
        >
          <div className={`text-white p-4 rounded-2xl shadow-2xl max-w-sm border-4 backdrop-blur-sm ${notification.bgColor} ${notification.borderColor}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <span className="font-bold text-lg block mb-2">{notification.title}</span>
                <p className="text-sm whitespace-pre-line leading-relaxed font-medium bg-white/10 p-3 rounded-lg">{notification.message}</p>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="ml-2 text-yellow-200 hover:text-white transition-colors text-lg font-bold bg-white/10 rounded-full p-1 hover:bg-white/20"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
      
      {/* Greeting Message */}
      {showGreeting && notifications.length === 0 && (
        <div className="fixed bottom-28 right-6 z-40 animate-fade-in-up">
          <div className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 text-white p-4 rounded-2xl shadow-2xl max-w-sm border-2 border-white/30 backdrop-blur-md">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm whitespace-pre-line leading-relaxed bg-white/10 p-3 rounded-lg">{greetingMessage}</p>
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
          isAnimating ? 'animate-gentle-bounce' : ''
        } ${notifications.length > 0 ? 'animate-pulse ring-8 ring-green-400/50' : ''}`}
        title="Ask Employee Assistant"
      >
        <Image src="/images/robo.png" alt="Assistant" className="w-16 h-16 group-hover:scale-125 transition-transform duration-300 drop-shadow-lg" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 animate-ping opacity-30"></div>
        {notifications.length > 0 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white animate-bounce shadow-lg">
            <div className="w-full h-full bg-green-300 rounded-full animate-ping opacity-75"></div>
            {notifications.length > 1 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {notifications.length}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 animate-fade-in-up">
          <div className="bg-white rounded-lg shadow-xl w-80 max-h-[70vh] overflow-y-auto border border-gray-200 backdrop-blur-sm relative">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <div className="p-4 pt-12">
              {!response ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="user_question" className="block text-sm font-medium text-gray-700 mb-2">
                      🤖 Smart AI Assistant - I learn from your questions!
                    </label>
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700 font-medium mb-2">💡 Popular Questions:</p>
                      <div className="flex flex-wrap gap-1">
                        {[
                          "My payslip status?",
                          "Yesterday working time?", 
                          "Leave balance?",
                          "Office timings?",
                          "Company policy?"
                        ].map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => setQuestion(suggestion)}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded-full transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      id="user_question"
                      name="user_question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Ask about payroll, attendance, leaves, policies, IT support, facilities..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Ask Assistant'
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Assistant Response</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-700 whitespace-pre-wrap">{response.answer}</p>
                    {response.intent && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {response.intent}
                          </span>
                          {response.confidence && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              {Math.round(response.confidence * 100)}% confidence
                            </span>
                          )}
                          {response.labels && response.labels.length > 0 && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                              {response.labels[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {response.github_link && (
                    <a
                      href={response.github_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      View GitHub Page
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setResponse(null)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md transition-colors"
                    >
                      Ask Another Question
                    </button>
                    <button
                      onClick={closeModal}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
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
        
        @keyframes gentle-bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        .animate-gentle-bounce {
          animation: gentle-bounce 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}