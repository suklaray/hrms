import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { 
  detectAdvancedIntent,
  storeQuestionResponse
} from "@/lib/assistantLearning";
import {
  getAllHolidays,
  getHolidaysByYear,
  getHolidaysByMonth,
  isHoliday,
  getNextHoliday,
  searchHolidays
} from "@/lib/holidayManager";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    // Get user from token
    const token = req.cookies.token || req.cookies.employeeToken;
    let user = null;

    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.log("Token verification failed:", err.message);
      }
    }

    // Advanced intent detection
    const intent = detectAdvancedIntent(question);
    
    // Generate answer with enhanced context
    const answer = await generateAnswer(question.toLowerCase(), user, intent);

    // Store question and response for learning
    await storeQuestionResponse(question, answer, user?.empid || user?.id, intent);
    
    res.status(200).json({
      answer,
      intent: intent.primaryIntent,
      labels: intent.labels,
      confidence: intent.confidence,
      github_link: answer.includes("policy")
        ? "https://github.com/your-company/hr-policies"
        : null,
    });
  } catch (error) {
    console.error("Assistant error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

function detectIntent(question) {
  const lowerQuestion = question.toLowerCase();

  const payrollKeywords = ["payslip", "salary", "pay", "wage", "income", "earning", "money", "payment", "compensation", "status"];
  const attendanceKeywords = ["attendance", "working", "work", "hours", "days", "time", "present", "absent", "checkin", "checkout", "office", "duty", "shift", "yesterday", "today", "clock", "punch", "wfh", "work from home", "remote", "flexible", "overtime", "regularization"];
  const leaveKeywords = ["leave", "holiday", "vacation", "off", "break", "absent", "sick", "medical", "personal", "casual"];
  const benefitsKeywords = ["benefits", "insurance", "health", "medical", "retirement", "pf", "provident", "bonus", "allowance", "reimbursement", "claim", "mediclaim", "esi", "gratuity", "wellness", "checkup"];
  const policyKeywords = ["policy", "rule", "regulation", "guideline", "procedure", "process", "code", "conduct", "dress", "behavior", "harassment", "grievance", "ethics", "compliance", "confidentiality", "nda"];

  const timeKeywords = {
    today: ["today", "current", "now", "present", "this day"],
    yesterday: ["yesterday", "last day", "previous day"],
    month: ["month", "monthly", "this month", "current month"],
    last: ["last", "previous", "recent", "latest", "past"],
    specific: ["on", "date", "day"],
  };

  const isPayroll = payrollKeywords.some((keyword) => lowerQuestion.includes(keyword));
  const isAttendance = attendanceKeywords.some((keyword) => lowerQuestion.includes(keyword)) ||
                      (lowerQuestion.includes('yesterday') && lowerQuestion.includes('working')) ||
                      (lowerQuestion.includes('working') && lowerQuestion.includes('time'));

  return {
    isPayroll,
    isAttendance,
    isLeave: leaveKeywords.some((keyword) => lowerQuestion.includes(keyword)),
    isBenefits: benefitsKeywords.some((keyword) => lowerQuestion.includes(keyword)),
    isPolicy: policyKeywords.some((keyword) => lowerQuestion.includes(keyword)),
    isToday: timeKeywords.today.some((keyword) => lowerQuestion.includes(keyword)),
    isYesterday: timeKeywords.yesterday.some((keyword) => lowerQuestion.includes(keyword)),
    isMonth: timeKeywords.month.some((keyword) => lowerQuestion.includes(keyword)),
    isLast: timeKeywords.last.some((keyword) => lowerQuestion.includes(keyword)),
    isSpecificDate: timeKeywords.specific.some((keyword) => lowerQuestion.includes(keyword)) || /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(lowerQuestion),
  };
}

async function checkRecentApprovals(user) {
  if (!user) return null;

  try {
    // Check for recently updated leaves (approved/rejected in last 7 days)
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentUpdates = await prisma.leave_requests.findMany({
      where: {
        empid: user.empid || user.id,
        status: { in: ["Approved", "Rejected"] },
        // Only show notifications for leaves that haven't ended yet
        to_date: {
          gte: today
        },
        // Check for leaves that start within next 30 days or recently updated
        OR: [
          {
            from_date: {
              gte: today,
              lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
            }
          },
          {
            applied_at: {
              gte: weekAgo
            }
          }
        ]
      },
      orderBy: { applied_at: "desc" },
      take: 3
    });

    console.log("Found recent leave updates:", recentUpdates.length);
    return recentUpdates;
  } catch (error) {
    console.error("Error checking recent updates:", error);
    return null;
  }
}

async function checkRecentPayslips(user) {
  if (!user) return null;

  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Check for any payslip generated in the last 7 days
    const recentPayslip = await prisma.payroll.findFirst({
      where: {
        empid: user.empid || user.id,
        generated_on: {
          gte: weekAgo
        }
      },
      orderBy: { generated_on: "desc" }
    });

    console.log("Found recent payslip:", recentPayslip ? "Yes" : "No");
    return recentPayslip;
  } catch (error) {
    console.error("Error checking recent payslips:", error);
    return null;
  }
}

// Simple spell correction
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
    'polcy': 'policy', 'polici': 'policy', 'benfit': 'benefit'
  };
  
  let corrected = text.toLowerCase();
  for (const [wrong, right] of Object.entries(corrections)) {
    corrected = corrected.replace(new RegExp(wrong, 'g'), right);
  }
  return corrected;
}

async function generateAnswer(question, user, advancedIntent) {
  const correctedQuestion = correctSpelling(question);
  const intent = detectIntent(correctedQuestion);
  
  // Use advanced intent if available
  const finalIntent = advancedIntent || intent;
  
  // Force attendance detection for specific patterns (use corrected question)
  if ((correctedQuestion.includes('yesterday') && (correctedQuestion.includes('working') || correctedQuestion.includes('time') || correctedQuestion.includes('attendance'))) ||
      (correctedQuestion.includes('today') && (correctedQuestion.includes('working') || correctedQuestion.includes('time') || correctedQuestion.includes('attendance'))) ||
      correctedQuestion.includes('working time') || correctedQuestion.includes('today attendance') || correctedQuestion.includes('todays attendance')) {
    finalIntent.isAttendance = true;
    finalIntent.primaryIntent = 'attendance';
    finalIntent.isToday = correctedQuestion.includes('today');
    finalIntent.isYesterday = correctedQuestion.includes('yesterday');
  }
  
  // Enhanced intent detection with priority rules
  
  // Policy queries - highest priority for policy keywords
  if (question.includes('policy') || question.includes('employee policy') || question.includes('company policy') || 
       question.includes('hr policy') || question.includes('code of conduct') ||
       question.includes('dress code') || question.includes('behavior') ||
       question.includes('harassment') || question.includes('grievance') ||
       question.includes('leave policy') || correctedQuestion.includes('leave policy')) {
    finalIntent.isPolicy = true;
    finalIntent.primaryIntent = 'policy';
  }
  
  // Leave queries - specific leave patterns
  else if ((question.includes('leave') && question.includes('status')) ||
      (question.includes('leave') && /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(question)) ||
      question.includes('my leave') ||
      question.includes('leave for') ||
      question.includes('leave approved') ||
      question.includes('leave rejected')) {
    finalIntent.isLeave = true;
    finalIntent.primaryIntent = 'leave';
  }
  
  // Payroll queries - specific payroll patterns
  else if (question.includes('payslip') || question.includes('salary') ||
           (question.includes('pay') && !question.includes('leave')) ||
           question.includes('payment') || question.includes('wage')) {
    finalIntent.isPayroll = true;
    finalIntent.primaryIntent = 'payroll';
  }
  
  // Benefits queries
  else if (question.includes('benefits') || question.includes('insurance') ||
           question.includes('medical') || question.includes('health coverage')) {
    finalIntent.isBenefits = true;
    finalIntent.primaryIntent = 'benefits';
  }
  
  // Technical support queries
  else if (question.includes('laptop') || question.includes('computer') ||
           question.includes('technical') || question.includes('it support') ||
           question.includes('system') || question.includes('software')) {
    finalIntent.primaryIntent = 'technical';
  }

  // Handle notification status checks
  if (question.includes('check payslip status')) {
    if (!user) {
      return "Please log in to check your payslip status.";
    }
    
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const payroll = await prisma.payroll.findFirst({
        where: {
          empid: user.empid || user.id,
          OR: [
            {
              month: currentMonth.toString(),
              year: currentYear,
            },
            {
              generated_on: {
                gte: new Date(currentYear, currentMonth - 1, 1),
                lt: new Date(currentYear, currentMonth, 1)
              }
            }
          ]
        },
        orderBy: { generated_on: 'desc' }
      });
      
      if (payroll) {
        const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
        return `✅ Your payslip for ${monthName} is ready and available for download.`;
      } else {
        return `⏳ Your payslip for this month is not ready yet.`;
      }
    } catch (error) {
      return "Unable to check payslip status.";
    }
  }

  // Only show notifications for general HR queries, not for technical or specific questions
  if (!intent.isSpecificDate && !question.includes('status') && !question.includes('approved') && !question.includes('pending') && !intent.isLeave && !intent.isPayroll && !question.includes('payslip') && !question.includes('check') && !finalIntent.primaryIntent.includes('technical') && !question.includes('laptop') && !question.includes('camera') && !question.includes('computer') && !question.includes('problem') && !question.includes('issue') && !finalIntent.isAttendance && !question.includes('working') && !question.includes('yesterday') && !question.includes('today') && !intent.isPolicy && !finalIntent.primaryIntent.includes('policy') && !question.includes('policy') && !question.includes('conduct') && !question.includes('dress')) {
    let notificationMessage = '';
    
    // Check leave notifications
    const recentUpdates = await checkRecentApprovals(user);
    if (recentUpdates && recentUpdates.length > 0) {
      const approvedLeaves = recentUpdates.filter(leave => leave.status === 'Approved');
      const rejectedLeaves = recentUpdates.filter(leave => leave.status === 'Rejected');
      
      if (approvedLeaves.length > 0) {
        notificationMessage += `🎉 Great News! Your leave request(s) have been approved:

`;
        approvedLeaves.forEach((leave, index) => {
          const fromDate = new Date(leave.from_date).toLocaleDateString();
          const toDate = new Date(leave.to_date).toLocaleDateString();
          const appliedTime = new Date(leave.applied_at).toLocaleString();
          notificationMessage += `✅ ${leave.leave_type} Leave
📅 ${fromDate} - ${toDate}
⏰ Applied: ${appliedTime}

`;
        });
      }
      
      if (rejectedLeaves.length > 0) {
        if (approvedLeaves.length > 0) notificationMessage += '---\n\n';
        notificationMessage += `😞 Unfortunately, some leave request(s) were rejected:\n\n`;
        rejectedLeaves.forEach((leave, index) => {
          const fromDate = new Date(leave.from_date).toLocaleDateString();
          const toDate = new Date(leave.to_date).toLocaleDateString();
          const appliedTime = new Date(leave.applied_at).toLocaleString();
          notificationMessage += `❌ ${leave.leave_type} Leave
📅 ${fromDate} - ${toDate}
⏰ Applied: ${appliedTime}

`;
        });
      }
      
      if (notificationMessage) {
        notificationMessage += `📍 View details: Dashboard → Attendance & Leave → Leave Management

---

`;
      }
    }
    
    // Check payslip notifications
    const recentPayslip = await checkRecentPayslips(user);
    if (recentPayslip) {
      const monthName = new Date(recentPayslip.year, parseInt(recentPayslip.month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const generatedDate = new Date(recentPayslip.generated_on).toLocaleDateString();
      
      if (notificationMessage) notificationMessage += '---\n\n';
      notificationMessage += `💰 Great News! Your payslip is ready:

`;
      notificationMessage += `✅ ${monthName} Payslip
📅 Generated: ${generatedDate}
💵 Net Salary: ₹${parseFloat(recentPayslip.net_pay || 0).toLocaleString()}

`;
      notificationMessage += `📍 View details: Dashboard → Payroll Management → View Payrolls

---

`;
    }

    if (notificationMessage) {
      const regularResponse = await generateRegularAnswer(question, user, intent);
      return notificationMessage + regularResponse;
    }
  }

  return await generateRegularAnswer(correctedQuestion, user, finalIntent);
}

async function callAmazonQ(question, user) {
  const prompt = `You are an HR assistant for an HRMS system. Answer this employee question based on the context:

Employee Question: "${question}"

Available HR topics:
- Payroll/Payslip queries
- Attendance and working hours
- Leave management
- Employee benefits
- Company policies
- IT support
- Office facilities

Provide a helpful response. If it's about specific data (payslip, attendance, leaves), guide them to the appropriate dashboard section.`;

  try {
    // This would integrate with Amazon Q API
    // For now, return null to use existing logic
    return null;
  } catch (error) {
    console.error('Amazon Q API error:', error);
    return null;
  }
}

async function generateRegularAnswer(question, user, intent) {
  // Ensure intent is defined
  if (!intent) {
    intent = detectIntent(question);
  }
  
  // Handle office time queries
  if (question.includes('office time') || question.includes('office hours') || question.includes('working hours') || (question.includes('office') && question.includes('time')) || (question.includes('what time') && question.includes('office'))) {
    return `🏢 Office Hours:

⏰ Standard Working Hours: 12:00 PM - 9:00 PM
📅 Working Days: Monday to Friday
🍽️ Lunch Break: 1 hour (flexible timing)

📍 Office Location: [Your Office Address]
📞 Contact: [Office Phone Number]

💡 Note: These are standard hours. Some departments may have different schedules.`;
  }

  // Handle holiday queries
  if (question.includes('holiday') || question.includes('holidays') || question.includes('festival') || question.includes('public holiday') || question.includes('next holiday') || question.includes('upcoming holiday')) {
    if (question.includes('next') || question.includes('upcoming')) {
      const nextHoliday = getNextHoliday();
      if (nextHoliday) {
        const holidayDate = new Date(nextHoliday.date);
        const today = new Date();
        const daysUntil = Math.ceil((holidayDate - today) / (1000 * 60 * 60 * 24));
        return `🎉 Next Holiday: ${nextHoliday.name}
📅 Date: ${holidayDate.toLocaleDateString()}
⏰ Days remaining: ${daysUntil} days
🏷️ Type: ${nextHoliday.type}

💡 Plan your leaves accordingly!`;
      } else {
        return `No upcoming holidays found in our current list.`;
      }
    }
    
    if (question.includes('today') || question.includes('is today')) {
      const today = new Date();
      const todayHoliday = isHoliday(today);
      if (todayHoliday) {
        return `🎉 Yes! Today is ${todayHoliday.name}
🏷️ Type: ${todayHoliday.type}

Enjoy your holiday! 🎊`;
      } else {
        return `📅 Today is not a holiday. It's a regular working day.

💡 Check upcoming holidays by asking "What's the next holiday?"`;
      }
    }
    
    if (question.includes('list') || question.includes('all') || question === 'holidays' || question === 'holiday') {
      const currentYear = new Date().getFullYear();
      const holidays = getHolidaysByYear(currentYear);
      let response = `🎉 ${currentYear} Holiday List:

`;
      holidays.forEach((holiday, index) => {
        const date = new Date(holiday.date);
        response += `${index + 1}. ${holiday.name}
📅 ${date.toLocaleDateString()}
🏷️ ${holiday.type}

`;
      });
      response += `💡 Total holidays: ${holidays.length}
📍 Plan your leaves in advance!`;
      return response;
    }
    
    // Search for specific holidays
    const searchResults = searchHolidays(question);
    if (searchResults.length > 0) {
      let response = `🔍 Holiday Search Results:

`;
      searchResults.forEach((holiday, index) => {
        const date = new Date(holiday.date);
        response += `${index + 1}. ${holiday.name}
📅 ${date.toLocaleDateString()}
🏷️ ${holiday.type}

`;
      });
      return response;
    }
    
    // Default holiday response
    const currentYear = new Date().getFullYear();
    const nextHoliday = getNextHoliday();
    let response = `🎉 Holiday Information:

`;
    if (nextHoliday) {
      const holidayDate = new Date(nextHoliday.date);
      const today = new Date();
      const daysUntil = Math.ceil((holidayDate - today) / (1000 * 60 * 60 * 24));
      response += `📅 Next Holiday: ${nextHoliday.name} (${daysUntil} days)

`;
    }
    response += `💡 Ask me:
• "What's the next holiday?"
• "List all holidays"
• "Is today a holiday?"
• "Diwali holiday date"
• "Christmas when?"`;
    return response;
  }

  // Handle technical support queries
  if (intent.primaryIntent === 'technical' || question.includes('laptop') || question.includes('camera') || question.includes('computer') || question.includes('system') || question.includes('software') || question.includes('hardware')) {
    if (question.includes('camera')) {
      return `📷 Camera Issue - IT Support\n\n🔧 Quick Troubleshooting Steps:\n• Check if camera is enabled in Device Manager\n• Update camera drivers\n• Restart your laptop\n• Check privacy settings (Windows + I → Privacy → Camera)\n• Try using camera in different applications\n\n📞 If issue persists, contact IT Support:\n• Email: it-support@company.com\n• Phone: Ext. 1234\n• Visit IT Desk: Ground Floor\n• Remote Support: Available 9 AM - 6 PM\n\n💡 For urgent issues, mention 'URGENT' in your email subject.`;
    }
    
    if (question.includes('laptop') || question.includes('computer')) {
      return `💻 Laptop/Computer Support\n\n🔧 Common Solutions:\n• Restart your device\n• Check power and connections\n• Update drivers and software\n• Run Windows troubleshooter\n• Check for malware/virus\n\n📞 IT Support Contact:\n• Email: it-support@company.com\n• Phone: Ext. 1234\n• Visit: IT Desk, Ground Floor\n• Remote Support: 9 AM - 6 PM\n\n📋 When contacting IT, please provide:\n• Your employee ID\n• Laptop model/serial number\n• Detailed description of the issue\n• Error messages (if any)`;
    }
    
    return `🔧 Technical Support\n\n📞 Contact IT Support for technical issues:\n• Email: it-support@company.com\n• Phone: Ext. 1234\n• Visit: IT Desk, Ground Floor\n• Remote Support: Available 9 AM - 6 PM\n\n💡 Common IT Services:\n• Hardware issues (laptop, mouse, keyboard)\n• Software installation and updates\n• Network connectivity problems\n• Email and system access issues\n• Password resets and account unlocks\n\n⚡ For urgent issues, mention 'URGENT' in email subject.`;
  }
  // Check for payslip/payroll related queries
  if (intent.isPayroll || question.includes('payslip')) {
    if (!user) {
      return "Please log in to check your payslip information.";
    }

    try {
      let targetMonth, targetYear;

      // Handle "last payslip" queries
      if (intent.isLast) {
        const lastPayroll = await prisma.payroll.findFirst({
          where: { empid: user.empid || user.id },
          orderBy: [{ year: "desc" }, { month: "desc" }],
        });

        if (lastPayroll) {
          const monthName = new Date(
            parseInt(lastPayroll.year),
            parseInt(lastPayroll.month) - 1
          ).toLocaleDateString("en-US", { month: "long", year: "numeric" });
          const createdDate = lastPayroll.generated_on
            ? new Date(lastPayroll.generated_on).toLocaleDateString()
            : "N/A";
          return `✅ Your last payslip was for ${monthName}.

📅 Generated on: ${createdDate}
💰 Net Salary: ₹${
            lastPayroll.net_pay
              ? parseFloat(lastPayroll.net_pay).toLocaleString()
              : "N/A"
          }
📍 You can find it in: Dashboard → Payroll Management → View Payrolls

💡 Tip: Click on "View Payslip" next to your record to download the PDF.`;
        } else {
          return `❌ No payslips found in your records.

📞 Please contact HR for assistance:
• Email: hr@company.com
• Visit HR office during business hours (12:00 PM - 9:00 PM)`;
        }
      }

      // Handle current month queries
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Check for specific month mentions
      const monthNames = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
      ];
      const foundMonth = monthNames.findIndex((month) =>
        question.includes(month)
      );

      if (foundMonth !== -1) {
        targetMonth = foundMonth + 1;
        // Check for year mentions in the question
        const yearMatch = question.match(/20\d{2}/);
        if (yearMatch) {
          targetYear = parseInt(yearMatch[0]);
        } else if (question.includes((currentYear - 1).toString())) {
          targetYear = currentYear - 1;
        } else {
          targetYear = currentYear;
        }
      } else {
        targetMonth = currentMonth;
        targetYear = currentYear;
      }

      const payroll = await prisma.payroll.findFirst({
        where: {
          empid: user.empid || user.id,
          OR: [
            {
              month: targetMonth.toString(),
              year: targetYear,
            },
            {
              generated_on: {
                gte: new Date(targetYear, targetMonth - 1, 1),
                lt: new Date(targetYear, targetMonth, 1)
              }
            }
          ]
        },
        orderBy: { generated_on: 'desc' }
      });

      if (payroll) {
        const createdDate = payroll.generated_on
          ? new Date(payroll.generated_on).toLocaleDateString()
          : "N/A";
        const monthName = new Date(
          targetYear,
          targetMonth - 1
        ).toLocaleDateString("en-US", { month: "long", year: "numeric" });
        return `✅ Yes! Your payslip for ${monthName} is ready.

📅 Generated on: ${createdDate}
💰 Net Salary: ₹${
          payroll.net_pay ? parseFloat(payroll.net_pay).toLocaleString() : "N/A"
        }
📍 You can find it in: Dashboard → Payroll Management → View Payrolls

💡 Tip: Click on "View Payslip" next to your record to download the PDF.`;
      } else {
        const monthName = new Date(
          targetYear,
          targetMonth - 1
        ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

        if (targetMonth === currentMonth && targetYear === currentYear) {
          const lastDayOfMonth = new Date(
            currentYear,
            currentMonth,
            0
          ).getDate();
          const payrollDate = new Date(
            currentYear,
            currentMonth - 1,
            lastDayOfMonth
          );
          const today = new Date();

          if (today < payrollDate) {
            return `⏳ Your payslip for ${monthName} is not ready yet.

📅 Expected date: ${payrollDate.toLocaleDateString()} (last working day of the month)
⏰ Days remaining: ${Math.ceil(
              (payrollDate - today) / (1000 * 60 * 60 * 24)
            )} days

💡 Payrolls are typically processed on the last working day of each month.`;
          } else {
            return `⚠️ Your payslip for ${monthName} appears to be delayed.

📞 Please contact HR for assistance:
• Email: hr@company.com
• Visit HR office during business hours (12:00 PM - 9:00 PM)

💡 Payrolls are usually processed by the last working day of each month.`;
          }
        } else {
          return `❌ No payslip found for ${monthName}.

📞 Please contact HR if you believe this is an error:
• Email: hr@company.com
• Visit HR office during business hours (12:00 PM - 9:00 PM)`;
        }
      }
    } catch (error) {
      console.error("Payroll query error:", error);
      return "Unable to check payslip status. Please contact HR or try again later.";
    }
  }

  // Check for attendance related queries - prioritize specific attendance requests
  if (intent.isAttendance || intent.primaryIntent === 'attendance' || question.includes('working time') || question.includes('yesterday working') || question.includes('today working') || question.includes('today attendance') || question.includes('todays attendance')) {
    if (!user) {
      return "Please log in to check your attendance information.";
    }

    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      // Handle yesterday's working time queries
      if (intent.isYesterday || question.includes('yesterday') || (question.includes('yesterday') && (question.includes('working') || question.includes('time') || question.includes('attendance')))) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfDay = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate()
        );
        const endOfDay = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate() + 1
        );

        const yesterdayAttendance = await prisma.attendance.findFirst({
          where: {
            empid: user.empid || user.id,
            date: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
        });

        if (yesterdayAttendance) {
          const checkinTime = yesterdayAttendance.check_in
            ? new Date(yesterdayAttendance.check_in)
            : null;
          let workingTime = "No checkout recorded";

          if (checkinTime && yesterdayAttendance.check_out) {
            const checkoutTime = new Date(yesterdayAttendance.check_out);
            const diffMs = checkoutTime - checkinTime;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor(
              (diffMs % (1000 * 60 * 60)) / (1000 * 60)
            );
            workingTime = `${hours}h ${minutes}m`;
          }

          const checkinTimeStr = checkinTime ? checkinTime.toLocaleTimeString() : "Not checked in";
          const checkoutTimeStr = yesterdayAttendance.check_out ? new Date(yesterdayAttendance.check_out).toLocaleTimeString() : "Not checked out";
          return `Yesterday (${yesterday.toLocaleDateString()}):\nCheck-in: ${checkinTimeStr}\nCheck-out: ${checkoutTimeStr}\nWorking time: ${workingTime}`;
        } else {
          return `No attendance record found for yesterday.`;
        }
      }

      // Handle today's working time queries
      if (intent.isToday || question.includes('today') || (question.includes('today') && (question.includes('working') || question.includes('time') || question.includes('attendance')))) {
        const startOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        const endOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1
        );

        const todayAttendance = await prisma.attendance.findFirst({
          where: {
            empid: user.empid || user.id,
            date: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
        });

        if (todayAttendance) {
          const checkinTime = todayAttendance.check_in
            ? new Date(todayAttendance.check_in)
            : null;
          let workingTime = "Still working";

          if (checkinTime) {
            if (todayAttendance.check_out) {
              const checkoutTime = new Date(todayAttendance.check_out);
              const diffMs = checkoutTime - checkinTime;
              const hours = Math.floor(diffMs / (1000 * 60 * 60));
              const minutes = Math.floor(
                (diffMs % (1000 * 60 * 60)) / (1000 * 60)
              );
              workingTime = `${hours}h ${minutes}m`;
            } else {
              const now = new Date();
              const diffMs = now - checkinTime;
              const hours = Math.floor(diffMs / (1000 * 60 * 60));
              const minutes = Math.floor(
                (diffMs % (1000 * 60 * 60)) / (1000 * 60)
              );
              workingTime = `${hours}h ${minutes}m (ongoing)`;
            }
          }

          const checkinTimeStr = checkinTime ? checkinTime.toLocaleTimeString() : "Not checked in";
          const checkoutTimeStr = todayAttendance.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString() : "Not checked out";
          return `Today (${today.toLocaleDateString()}):\nCheck-in: ${checkinTimeStr}\nCheck-out: ${checkoutTimeStr}\nWorking time: ${workingTime}`;
        } else {
          return `No attendance record found for today.`;
        }
      }

      // Handle specific date queries
      const dateMatch = question.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/);
      if (dateMatch) {
        const dateStr = dateMatch[0];
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
          const targetDate = new Date(year, month - 1, day);
          
          const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
          const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
          
          const dateAttendance = await prisma.attendance.findFirst({
            where: {
              empid: user.empid || user.id,
              date: {
                gte: startOfDay,
                lt: endOfDay,
              },
            },
          });
          
          if (dateAttendance) {
            const checkinTime = dateAttendance.check_in ? new Date(dateAttendance.check_in) : null;
            let workingTime = "No checkout recorded";
            
            if (checkinTime && dateAttendance.check_out) {
              const checkoutTime = new Date(dateAttendance.check_out);
              const diffMs = checkoutTime - checkinTime;
              const hours = Math.floor(diffMs / (1000 * 60 * 60));
              const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              workingTime = `${hours}h ${minutes}m`;
            }
            
            const checkinTimeStr = checkinTime ? checkinTime.toLocaleTimeString() : "Not checked in";
            const checkoutTimeStr = dateAttendance.check_out ? new Date(dateAttendance.check_out).toLocaleTimeString() : "Not checked out";
            return `${targetDate.toLocaleDateString()}:\nCheck-in: ${checkinTimeStr}\nCheck-out: ${checkoutTimeStr}\nWorking time: ${workingTime}`;
          } else {
            return `No attendance record found for ${targetDate.toLocaleDateString()}.`;
          }
        }
      }
      
      // Handle monthly working days queries
      if (intent.isMonth || question.includes("days")) {
        let targetMonth = currentMonth;
        let targetYear = currentYear;

        // Check for specific month mentions
        const monthNames = [
          "january",
          "february",
          "march",
          "april",
          "may",
          "june",
          "july",
          "august",
          "september",
          "october",
          "november",
          "december",
        ];
        const foundMonth = monthNames.findIndex((month) =>
          question.includes(month)
        );

        if (foundMonth !== -1) {
          targetMonth = foundMonth + 1;
          targetYear = question.includes((currentYear - 1).toString())
            ? currentYear - 1
            : currentYear;
        }

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        const attendanceRecords = await prisma.attendance.findMany({
          where: {
            empid: user.empid || user.id,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const workingDays = attendanceRecords.length;
        const totalHours = attendanceRecords.reduce((total, record) => {
          if (record.check_out && record.check_in) {
            const checkin = new Date(record.check_in);
            const checkout = new Date(record.check_out);
            const diffMs = checkout - checkin;
            return total + diffMs / (1000 * 60 * 60);
          }
          return total;
        }, 0);

        const monthName = new Date(
          targetYear,
          targetMonth - 1
        ).toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const avgHours =
          workingDays > 0 ? (totalHours / workingDays).toFixed(1) : 0;

        return `📊 Attendance Summary for ${monthName}:

📅 Working Days: ${workingDays} days
⏱️ Total Hours: ${totalHours.toFixed(1)} hours
📈 Average Hours/Day: ${avgHours} hours

📍 View detailed attendance: Dashboard → Attendance & Leave → Attendance
💡 Standard working hours: 8 hours/day`;
      }

      // Handle general attendance queries
      const thisMonthAttendance = await prisma.attendance.findMany({
        where: {
          empid: user.empid || user.id,
          date: {
            gte: new Date(currentYear, currentMonth - 1, 1),
            lte: new Date(currentYear, currentMonth, 0, 23, 59, 59),
          },
        },
      });

      const workingDays = thisMonthAttendance.length;
      const currentMonthName = new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      return `📊 Your Attendance Overview:

📅 This Month (${currentMonthName}): ${workingDays} working days
⏰ Standard Hours: 12:00 PM - 9:00 PM
🍽️ Lunch Break: 1 hour

📍 View full attendance: Dashboard → Attendance & Leave → Attendance
💡 You can ask me:
• "How many days did I work this month?"
• "What's my today's working time?"
• "Show my attendance for March"`;
    } catch (error) {
      console.error("Attendance query error:", error);
      return "Unable to check attendance information. Please contact HR or try again later.";
    }
  }

  // Check for leave related queries
  if (intent.isLeave || question.includes('leave status') || question.includes('my leave')) {
    if (!user) {
      return "Please log in to check your leave information.";
    }

    try {
      // Check for specific date leave queries
      const dateMatch = question.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/);
      if (dateMatch || question.includes("for") && (question.includes("date") || question.includes("day"))) {
        let targetDate = null;
        
        if (dateMatch) {
          // Parse the date from the question
          const dateStr = dateMatch[0];
          const parts = dateStr.split(/[-/]/);
          if (parts.length === 3) {
            // Handle different date formats (DD/MM/YYYY, MM/DD/YYYY, etc.)
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
            targetDate = new Date(year, month - 1, day);
          }
        } else {
          // Handle relative dates like "today", "tomorrow", "yesterday"
          if (question.includes("today")) {
            targetDate = new Date();
          } else if (question.includes("tomorrow")) {
            targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 1);
          } else if (question.includes("yesterday")) {
            targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - 1);
          }
        }
        
        if (targetDate) {
          // Set time to start of day for proper comparison
          const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
          const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
          
          const leaveForDate = await prisma.leave_requests.findFirst({
            where: {
              empid: user.empid || user.id,
              AND: [
                { from_date: { lte: endOfDay } },
                { to_date: { gte: startOfDay } }
              ]
            }
          });
          
          const dateStr = targetDate.toLocaleDateString();
          
          if (leaveForDate) {
            const status = leaveForDate.status === "Approved" ? "✅ Approved" : 
                          leaveForDate.status === "Rejected" ? "❌ Rejected" : "⏳ Pending";
            const fromDate = new Date(leaveForDate.from_date).toLocaleDateString();
            const toDate = new Date(leaveForDate.to_date).toLocaleDateString();
            
            return `Leave status for ${dateStr}:\n${status}\nType: ${leaveForDate.leave_type}\nDuration: ${fromDate} to ${toDate}\nReason: ${leaveForDate.reason || 'Not specified'}`;
          } else {
            return `📅 Leave Status for ${dateStr}:

❌ No leave found for this date

You are expected to be present on ${dateStr}.

📍 Apply for leave: Dashboard → Attendance & Leave → Leave Management`;
          }
        }
      }
      
      // Check for leave status queries first (prioritize over date-specific queries)
      if (question.includes("status") || question.includes("approved") || question.includes("pending") || question.includes("my leave")) {
        const leaveRequests = await prisma.leave_requests.findMany({
          where: { empid: user.empid || user.id },
          orderBy: { applied_at: "desc" },
          take: 5,
        });

        if (leaveRequests.length > 0) {
          let response = `Your Recent Leave Requests:\n\n`;
          leaveRequests.forEach((leave, index) => {
            const fromDate = new Date(leave.from_date).toLocaleDateString();
            const toDate = new Date(leave.to_date).toLocaleDateString();
            const status = leave.status === "Approved" ? "✅" : leave.status === "Rejected" ? "❌" : "⏳";
            response += `${index + 1}. ${status} ${leave.leave_type} (${fromDate} - ${toDate}) - ${leave.status}\n`;
          });
          return response;
        } else {
          return `No leave requests found.`;
        }
      }

      // Check if it's a general leave policy question
      if (question === 'leaves?' || question === 'leave?' || question.includes('leave policy') || 
          (question.includes('leave') && !question.includes('status') && !question.includes('approved') && 
           !question.includes('pending') && !question.includes('for') && !question.includes('my'))) {
        return `🏖️ IT Company Leave Policy:

📅 **Annual Entitlements:**
• Casual Leave: 12 days per year
• Sick Leave: 12 days per year  
• Earned Leave: 21 days per year
• Maternity Leave: 26 weeks (as per law)
• Paternity Leave: 15 days
• Bereavement Leave: 5 days

⏰ **Leave Rules:**
• Advance Notice: 2 days for planned leave
• Medical Certificate: Required for sick leave >3 days
• Sandwich Leave: Public holidays between leaves count
• Carry Forward: Max 15 earned leaves to next year
• Encashment: Unused leaves can be encashed

📱 **Application Process:**
• Apply via HRMS Dashboard → Leave Management
• Manager approval required
• HR approval for leaves >5 days
• Emergency leave: Inform within 24 hours

💡 **Leave Balance:** Check current balance in dashboard
📞 **Contact:** HR at hr@company.com for leave queries`;
      }
      

      
      return `🏖️ Leave Policy Information:

• Annual Leave: 21 days per year
• Sick Leave: 10 days per year
• Personal Leave: 5 days per year
• Maternity/Paternity Leave: As per local regulations

📍 To apply for leave: Dashboard → Attendance & Leave → Leave Management

💡 You can ask me:
• "What's my leave status?"
• "Is my leave for 15/12/2024 approved?"
• "Do I have leave today?"
• "Show my approved leaves"`;
    } catch (error) {
      console.error("Leave query error:", error);
      return "Unable to check leave information. Please contact HR or try again later.";
    }
  }

  // Check for benefits related queries  
  if (intent.isBenefits || intent.primaryIntent === 'benefits') {
    return `🎁 Employee Benefits:

• Health Insurance: Comprehensive medical coverage
• Retirement Plan: Company-matched contributions
• Professional Development: Training budget allocated annually
• Flexible Working: Remote work options available
• Employee Assistance Program: Counseling and support services

📞 For detailed benefits info, contact HR:
• Email: hr@company.com
• Visit HR office during business hours (12:00 PM - 9:00 PM)`;
  }

  // Check for policy related queries
  if (intent.isPolicy || (intent.primaryIntent === 'policy')) {
    // Check for leave policy questions
    if (question === 'leaves?' || question === 'leave?' || question.includes('leave policy') || 
        (question.includes('leave') && !question.includes('status') && !question.includes('approved') && 
         !question.includes('pending') && !question.includes('for') && !question.includes('my'))) {
      return `🏖️ IT Company Leave Policy:

📅 **Annual Entitlements:**
• Casual Leave: 12 days per year
• Sick Leave: 12 days per year  
• Earned Leave: 21 days per year
• Maternity Leave: 26 weeks (as per law)
• Paternity Leave: 15 days
• Bereavement Leave: 5 days

⏰ **Leave Rules:**
• Advance Notice: 2 days for planned leave
• Medical Certificate: Required for sick leave >3 days
• Sandwich Leave: Public holidays between leaves count
• Carry Forward: Max 15 earned leaves to next year
• Encashment: Unused leaves can be encashed

📱 **Application Process:**
• Apply via HRMS Dashboard → Leave Management
• Manager approval required
• HR approval for leaves >5 days
• Emergency leave: Inform within 24 hours

💡 **Leave Balance:** Check current balance in dashboard
📞 **Contact:** HR at hr@company.com for leave queries`;
    }
    
    // Check for employee policy questions
    if (question.includes('employee policy') || question.includes('employee handbook') || question.includes('employee rules')) {
      return `👥 Employee Policy Guidelines:

🕐 **Working Hours:**
• Standard Hours: 12:00 PM - 9:00 PM
• Flexible timing with core hours 2:00 PM - 6:00 PM
• Lunch Break: 1 hour (flexible timing)
• Work from Home: 2 days per week (with approval)

📱 **Communication Policy:**
• Professional email etiquette mandatory
• Response time: Within 4 hours during work hours
• Team meetings: Attendance required
• Slack/Teams: Primary communication channels

🎯 **Performance Standards:**
• Monthly performance reviews
• Goal setting and tracking via dashboard
• Continuous learning encouraged
• Feedback culture promoted

📞 **Contact:** HR at hr@company.com for employee policy queries`;
    }
    
    // Check for company policy questions
    if (question.includes('company policy') || question.includes('organizational policy') || question.includes('corporate policy')) {
      return `🏢 Company Policy Framework:

🎯 **Mission & Values:**
• Innovation-driven technology solutions
• Customer-first approach
• Integrity and transparency in all dealings
• Collaborative and inclusive work environment

🔒 **Data Security Policy:**
• Confidentiality agreements mandatory
• Secure handling of client data
• Regular security training required
• BYOD policy with security compliance

🌱 **Sustainability Policy:**
• Paperless office initiatives
• Energy-efficient practices
• Remote work to reduce carbon footprint
• Recycling and waste management

⚖️ **Compliance:**
• Equal opportunity employer
• Anti-discrimination policy
• Whistleblower protection
• Regular compliance audits

📞 **Contact:** HR at hr@company.com for company policy details`;
    }
    
    if (question.includes('dress code') || question.includes('dress')) {
      return `👔 Dress Code Policy:

• Business Casual: Standard dress code
• Formal Attire: Required for client meetings
• Casual Friday: Relaxed dress code on Fridays
• No: Shorts, flip-flops, or revealing clothing
• ID Badge: Must be visible at all times

📖 For complete dress code guidelines, refer to employee handbook.`;
    }
    
    if (question.includes('harassment') || question.includes('grievance')) {
      return `🚫 Anti-Harassment Policy:

• Zero Tolerance: No harassment of any kind
• Reporting: Multiple channels available
• Investigation: Prompt and confidential process
• Protection: No retaliation against reporters
• Support: Counseling and assistance provided

📞 Report to: HR at hr@company.com or call confidential hotline`;
    }
    
    if (question.includes('code of conduct') || question.includes('behavior')) {
      return `📜 Code of Conduct:

• Professional Behavior: Respectful and ethical conduct
• Integrity: Honest and transparent dealings
• Confidentiality: Protect company and client information
• Compliance: Follow all laws and regulations
• Teamwork: Collaborative and supportive environment

📖 Full code available in employee handbook.`;
    }
    
    return `📋 IT Company Employee Policies:

🔒 **Information Security:**
• Data Protection: Strict confidentiality of client & company data
• Access Control: Use secure passwords, 2FA mandatory
• Clean Desk Policy: Lock screens when away, secure documents
• BYOD Policy: Personal devices must comply with security standards

💻 **Technology Usage:**
• Software Licensing: Use only authorized software
• Internet Usage: Professional use, limited personal browsing
• Remote Work: VPN required, secure home office setup
• Equipment Care: Responsible use of company hardware

👔 **Professional Standards:**
• Dress Code: Smart casual, formal for client meetings
• Communication: Professional email etiquette, respectful interactions
• Intellectual Property: All code/designs belong to company
• Non-Disclosure: Confidentiality agreements strictly enforced

⚖️ **Compliance & Ethics:**
• Anti-Harassment: Zero tolerance, multiple reporting channels
• Equal Opportunity: Merit-based, inclusive workplace
• Conflict of Interest: Declare any potential conflicts
• Social Media: Professional representation of company

📖 Complete policy handbook available on company intranet
💡 Contact HR for policy clarifications: hr@company.com`;
  }

  const responses = {
    leave: `Our leave policy allows:
• Annual Leave: 21 days per year
• Sick Leave: 10 days per year
• Personal Leave: 5 days per year
• Maternity/Paternity Leave: As per local regulations

To apply for leave, use the Leave Management system in your dashboard.`,

    attendance: `Attendance Guidelines:
• Standard working hours: 12:00 PM - 9:00 PM
• Lunch break: 1 hour
• Late arrival (after 9:15 AM) requires manager approval
• Use the attendance system to clock in/out
• Monthly attendance reports are available in your dashboard`,

    benefits: `Employee Benefits:
• Health Insurance: Comprehensive medical coverage
• Retirement Plan: Company-matched contributions
• Professional Development: Training budget allocated annually
• Flexible Working: Remote work options available
• Employee Assistance Program: Counseling and support services`,

    policy: `Company Policies:
• Code of Conduct: Professional behavior expected
• Anti-Harassment: Zero tolerance policy
• Data Security: Confidentiality agreements mandatory
• Social Media: Guidelines for professional representation
• Dress Code: Business casual unless specified otherwise

For detailed policies, refer to the employee handbook.`,
  };

  for (const [keyword, response] of Object.entries(responses)) {
    if (question.includes(keyword)) {
      return response;
    }
  }

  // Use Amazon Q for better understanding if local detection fails
  try {
    const qResponse = await callAmazonQ(question, user);
    if (qResponse) {
      return qResponse;
    }
  } catch (error) {
    console.error('Amazon Q error:', error);
  }

  return `👋 Hi! I'm your HR Assistant. I can help with:

💰 **Payroll & Finance:**
• Payslip status, salary details, deductions
• Expense claims, reimbursements, advances
• Tax documents, Form 16, investment declarations

⏰ **Attendance & Time:**
• Working hours, overtime, flexible timing
• Attendance records, regularization requests
• Work from home, remote work policies

🏖️ **Leave Management:**
• Leave applications, balance, status
• Holiday calendar, festival dates
• Sick leave, casual leave, annual leave

🎁 **Benefits & Policies:**
• Health insurance, medical claims
• Company policies, code of conduct
• Employee benefits, wellness programs

🔧 **IT & Facilities:**
• Technical support, hardware issues
• Office facilities, meeting rooms
• Access cards, parking, canteen

📈 **Career & Performance:**
• Performance reviews, appraisals
• Training programs, skill development
• Promotions, increments, recognition

💡 **Try asking:**
• "What's my leave balance?"
• "When is the next holiday?"
• "How to claim medical expenses?"
• "What are office timings?"
• "My laptop is slow, help!"
• "How to apply for work from home?"

📞 **Need more help?** Contact HR: hr@company.com | Office: 12:00 PM - 9:00 PM`;
}
