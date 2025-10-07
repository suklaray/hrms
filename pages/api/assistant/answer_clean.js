import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { detectAdvancedIntent, storeQuestionResponse } from "@/lib/assistantLearning";
import { getLLMAnswerFromGitHub } from "../../../lib/llm";
import { getAssistantConfig } from "@/lib/assistantConfig";

// Retry function for database operations
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (error.message.includes("Server has closed the connection")) {
        console.log(`Retry ${i + 1}/${maxRetries} for database operation`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}

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

    // Get assistant configuration
    const config = await getAssistantConfig();
    const mode = config.mode || "RULE_BASED";

    // Advanced intent detection
    const intent = detectAdvancedIntent(question);

    let answer;
    let source = mode;

    try {
      if (mode === "LLM") {
        answer = await getLLMAnswerFromGitHub(question, intent, user, config);
        if (!answer) {
          answer = await retryOperation(() => generateAnswer(question, user, intent));
          source = "RULE_BASED_FALLBACK";
        }
      } else {
        answer = await retryOperation(() => generateAnswer(question, user, intent));
      }
    } catch (error) {
      console.error(`${mode} assistant error:`, error);
      answer = await retryOperation(() => generateAnswer(question, user, intent));
      source = "RULE_BASED_FALLBACK";
    }

    // Store question and response for learning
    try {
      await retryOperation(() =>
        storeQuestionResponse(question, answer, user?.empid || user?.id, intent)
      );
    } catch (error) {
      console.log("Failed to store learning data:", error.message);
    }

    // Handle both string and object responses
    const responseData = typeof answer === 'object' && answer.answer ? {
      answer: answer.answer,
      github_link: answer.github_link,
      source,
      intent: intent.primaryIntent,
      confidence: intent.confidence,
      labels: intent.labels
    } : {
      answer,
      github_link: null,
      source,
      intent: intent.primaryIntent,
      confidence: intent.confidence,
      labels: intent.labels
    };
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Assistant error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Main answer generation function
async function generateAnswer(question, user, intent) {
  const q = question.toLowerCase();

  // Enhanced intent detection with priority rules
  if (isLeaveBalanceQuery(q)) {
    return await handleLeaveBalance(user);
  }
  if (isPolicyQuery(q)) {
    return handlePolicyQuery(q);
  }
  if (isHRContactQuery(q)) {
    return handleHRContact();
  }
  if (isPayrollQuery(q)) {
    return await handlePayrollQuery(q, user);
  }
  if (isAttendanceQuery(q)) {
    return await handleAttendanceQuery(q, user);
  }
  if (isHolidayQuery(q)) {
    return await handleHolidayQuery(q);
  }
  if (isTechnicalQuery(q)) {
    return handleTechnicalQuery(q);
  }
  if (isBenefitsQuery(q)) {
    return handleBenefitsQuery();
  }
  if (isOfficeHoursQuery(q)) {
    return handleOfficeHours();
  }

  // Default fallback
  return getDefaultResponse();
}

// Query detection functions
function isLeaveBalanceQuery(q) {
  return q.includes("leave days remaining") ||
    q.includes("remaining leave") ||
    q.includes("leave balance") ||
    q.includes("how many leave days") ||
    /how\s+many.*leave/i.test(q) ||
    /leave.*remaining/i.test(q);
}

function isPolicyQuery(q) {
  return q.includes("company policies") ||
    q.includes("company's policies") ||
    q.includes("explain the company") ||
    q.includes("policy") ||
    /explain.*compan.*polic/i.test(q);
}

function isHRContactQuery(q) {
  return q.includes("contact hr") ||
    q.includes("hr contact") ||
    q.includes("how to contact hr") ||
    q.includes("hr phone") ||
    q.includes("hr email");
}

function isPayrollQuery(q) {
  return q.includes("payslip") || q.includes("salary") || q.includes("pay");
}

function isAttendanceQuery(q) {
  return q.includes("attendance") || q.includes("working") || q.includes("work time");
}

function isHolidayQuery(q) {
  return q.includes("holiday") || q.includes("holidays");
}

function isTechnicalQuery(q) {
  return q.includes("laptop") || q.includes("computer") || q.includes("technical") || q.includes("camera");
}

function isBenefitsQuery(q) {
  return q.includes("benefits") || q.includes("insurance");
}

function isOfficeHoursQuery(q) {
  return q.includes("office hours") || q.includes("office time") || q.includes("working hours");
}

// Handler functions
async function handleLeaveBalance(user) {
  if (!user) {
    return "Please log in to check your leave balance.";
  }

  try {
    const currentYear = new Date().getFullYear();
    const leaveTypes = await retryOperation(async () => {
      return await prisma.leave_types.findMany({
        orderBy: { type_name: "asc" },
      });
    });
    
    if (leaveTypes.length === 0) {
      return "No leave policy found. Contact HR: hr@company.com";
    }

    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);
    
    const approvedLeaves = await retryOperation(async () => {
      return await prisma.leave_requests.findMany({
        where: {
          empid: user.empid || user.id,
          status: "Approved",
          from_date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
      });
    });

    let response = `🏖️ Leave Balance ${currentYear}:\n`;
    
    leaveTypes.forEach((leaveType) => {
      const usedDays = approvedLeaves
        .filter(leave => leave.leave_type === leaveType.type_name)
        .reduce((total, leave) => {
          const fromDate = new Date(leave.from_date);
          const toDate = new Date(leave.to_date);
          const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
          return total + daysDiff;
        }, 0);
      
      const remaining = leaveType.max_days - usedDays;
      response += `• ${leaveType.type_name}: ${remaining}/${leaveType.max_days} days\n`;
    });
    
    return response;
  } catch (error) {
    console.error("Leave balance query error:", error);
    return "Unable to check leave balance. Contact HR.";
  }
}

function handlePolicyQuery(q) {
  if (q.includes("company policy") || q.includes("company's policies") || q.includes("explain the company")) {
    return {
      answer: `🏢 Company Policies Overview:\n\n🎯 Core Values: Innovation, integrity, customer-first\n🔒 Security: Data protection & confidentiality\n🌱 Sustainability: Paperless office & remote work\n⚖️ Compliance: Equal opportunity & anti-discrimination\n\n📞 Contact HR: hr@company.com`,
      github_link: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Employee/company_policy.md"
    };
  }
  
  if (q.includes("employee policy")) {
    return {
      answer: `👥 Employee Policy:\n\n🕐 Hours: 12PM-9PM, flexible timing\n📱 Communication: Professional etiquette required\n🎯 Performance: Monthly reviews & goal tracking\n🏠 WFH: 2 days/week with approval\n\n📞 Contact HR: hr@company.com`,
      github_link: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Employee/employee_policy.md"
    };
  }

  return {
    answer: `📋 Company Policies Summary:\n\n🔒 Security: Data protection, 2FA, clean desk\n💻 Technology: Authorized software, VPN for remote\n👔 Professional: Business casual, email etiquette\n⚖️ Ethics: Anti-harassment, equal opportunity\n\n📞 Contact HR: hr@company.com`,
    github_link: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Employee/employee_policy.md"
  };
}

function handleHRContact() {
  return `📞 HR Contact Information:\n\n📧 Email: hr@company.com\n📱 Phone: +91-XXXX-XXXX-XX\n📍 Office: HR Department, 2nd Floor\n🕐 Hours: Monday-Friday, 10:00 AM - 6:00 PM\n\n💡 For urgent matters:\n• Call during office hours\n• Email for non-urgent queries\n• Visit HR desk for immediate assistance\n\n🎯 HR Services:\n• Employee onboarding & offboarding\n• Leave and attendance queries\n• Payroll and benefits support\n• Policy clarifications\n• Grievance handling\n• Training and development`;
}

async function handlePayrollQuery(q, user) {
  if (!user) {
    return "Please log in to check your payslip information.";
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
              lt: new Date(currentYear, currentMonth, 1),
            },
          },
        ],
      },
      orderBy: { generated_on: "desc" },
    });

    if (payroll) {
      const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const basicSalary = payroll.basic_salary ? parseFloat(payroll.basic_salary) : 0;
      const deductions = payroll.deductions ? parseFloat(payroll.deductions) : 0;
      const netPay = payroll.net_pay ? parseFloat(payroll.net_pay) : 0;

      return `✅ Payslip for ${monthName}:\n💰 Basic Salary: ₹${basicSalary.toLocaleString()}\n💸 Deductions: ₹${deductions.toLocaleString()}\n💵 Net Salary: ₹${netPay.toLocaleString()}\n📍 Dashboard → Payroll Management`;
    } else {
      return `⏳ Your payslip for this month is not ready yet.`;
    }
  } catch (error) {
    return "Unable to check payslip status. Contact HR.";
  }
}

async function handleAttendanceQuery(q, user) {
  if (!user) {
    return "Please log in to check your attendance information.";
  }

  try {
    const today = new Date();
    
    if (q.includes("today")) {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const todayAttendance = await prisma.attendance.findFirst({
        where: {
          empid: user.empid || user.id,
          date: { gte: startOfDay, lt: endOfDay },
        },
      });

      if (todayAttendance) {
        const checkinTime = todayAttendance.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString() : "Not checked in";
        const checkoutTime = todayAttendance.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString() : "Not checked out";
        return `Today's Attendance:\nCheck-in: ${checkinTime}\nCheck-out: ${checkoutTime}`;
      } else {
        return `No attendance record found for today.`;
      }
    }

    return `📊 Attendance Overview:\n⏰ Standard Hours: 12:00 PM - 9:00 PM\n📍 View details: Dashboard → Attendance & Leave`;
  } catch (error) {
    return "Unable to check attendance. Contact HR.";
  }
}

async function handleHolidayQuery(q) {
  try {
    if (q.includes("next") || q.includes("upcoming")) {
      const nextHoliday = await retryOperation(async () => {
        const today = new Date();
        return await prisma.calendar_events.findFirst({
          where: {
            event_date: { gte: today },
            event_type: "holiday",
          },
          orderBy: { event_date: "asc" },
        });
      });
      
      if (nextHoliday) {
        const holidayDate = new Date(nextHoliday.event_date);
        const today = new Date();
        const daysUntil = Math.ceil((holidayDate - today) / (1000 * 60 * 60 * 24));
        return `🎉 Next Holiday: ${nextHoliday.title}\n📅 Date: ${holidayDate.toLocaleDateString()}\n⏰ Days remaining: ${daysUntil} days`;
      } else {
        return `No upcoming holidays found.`;
      }
    }

    if (q.includes("tomorrow")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      const endOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1);
      
      const tomorrowHoliday = await retryOperation(async () => {
        return await prisma.calendar_events.findFirst({
          where: {
            event_date: { gte: startOfDay, lt: endOfDay },
            event_type: "holiday",
          },
        });
      });

      if (tomorrowHoliday) {
        return `🎉 Yes! Tomorrow is ${tomorrowHoliday.title}`;
      } else {
        const dayOfWeek = tomorrow.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          return `🛌 Tomorrow is ${dayOfWeek === 0 ? "Sunday" : "Saturday"} - Weekend off`;
        }
        return `📅 Tomorrow is a regular working day.`;
      }
    }

    return `🎉 Holiday Information:\n💡 Ask: "Next holiday", "Is tomorrow holiday?"`;
  } catch (error) {
    return "Unable to check holiday information.";
  }
}

function handleTechnicalQuery(q) {
  if (q.includes("camera")) {
    return `📷 Camera Issue - IT Support:\n\n🔧 Quick Steps:\n• Check Device Manager\n• Update camera drivers\n• Restart laptop\n• Check privacy settings\n\n📞 IT Support: it-support@company.com`;
  }

  return `🔧 Technical Support:\n\n📞 Contact IT Support:\n• Email: it-support@company.com\n• Phone: Ext. 1234\n• Visit: IT Desk, Ground Floor\n• Hours: 9 AM - 6 PM`;
}

function handleBenefitsQuery() {
  return {
    answer: `🎁 Employee Benefits:\n• Health Insurance & Medical Coverage\n• Provident Fund (PF)\n• Gratuity\n• Performance Bonuses\n• Flexible Work Hours\n\n📞 Contact HR: hr@company.com`,
    github_link: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Benefits/benefits_policy.md"
  };
}

function handleOfficeHours() {
  return `🏢 Office Hours:\n⏰ Standard Working Hours: 12:00 PM - 9:00 PM\n📅 Working Days: Monday to Friday\n🍽️ Lunch Break: 1 hour (flexible timing)\n📍 Office Location: [Your Office Address]\n📞 Contact: [Office Phone Number]`;
}

function getDefaultResponse() {
  return `Sorry, I can't help with this question. I'm designed to assist with HR-related queries.

I can help you with:
• Payroll & Salary information
• Attendance records
• Leave balance & applications
• Holiday information
• HR contact details
• Company policies
• IT support requests

Try asking:
• "Show my payslip"
• "What's my attendance today?"
• "How can I contact HR?"
• "When is the next holiday?"
• "Office hours"

For other queries, please contact HR: hr@company.com`;
}