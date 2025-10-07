import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { Octokit } from "@octokit/rest";
import { OpenAI } from "openai";
import Groq from "groq-sdk";
import prisma from "@/lib/prisma";

// Document cache to reduce API calls
const docCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Initialize clients dynamically
let bedrockClient = null;
let groq = null;
let octokit = null;
let client = null;

function initializeClients(config) {
  // Initialize Bedrock client if credentials are available
  if (config?.awsAccessKey && config?.awsSecretKey && config?.awsRegion) {
    bedrockClient = new BedrockRuntimeClient({
      region: config.awsRegion,
      credentials: {
        accessKeyId: config.awsAccessKey,
        secretAccessKey: config.awsSecretKey,
      },
    });
  }

  // Initialize Groq client
  if (config?.groqApiKey || process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: config?.groqApiKey || process.env.GROQ_API_KEY });
  }

  // Initialize GitHub client
  octokit = new Octokit({
    auth: config?.githubToken || process.env.GITHUB_TOKEN,
  });

  // Initialize OpenAI client
  if (process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
}

// export async function getLLMAnswerFromGitHub(question, intent) {
//   // Map intent → GitHub repo/file
//   const repo = "hr-assistant-docs";
//   const owner = "deshmukhraysoftwareservice";
//   let path;

//   switch (intent.primaryIntent) {
//     case "leave":
//       path = "Leaves/leave_policy.md";
//       break;
//     case "grievance":
//       path = "HR/grievance_policy.md";
//       break;
//     case "policy":
//       path = "Benefits/benefits_policy.md";
//       break;
//     default:
//       path = "README.md"; // fallback
//   }

//   // Fetch file content
//   const fileContent = await octokit.repos.getContent({ owner, repo, path });
//   const content = Buffer.from(fileContent.data.content, "base64").toString(
//     "utf-8"
//   );

//   // Call LLM to answer question based on file
//   const completion = await client.chat.completions.create({
//     model: "gpt-4.1-mini",
//     messages: [
//       { role: "system", content: "You are an HR assistant." },
//       {
//         role: "user",
//         content: `Use this document to answer: ${question}\n\nDocument:\n${content}`,
//       },
//     ],
//   });

//   return completion.choices[0].message.content;
// }
async function getDocumentFromGitHub(intent) {
  const repo = "hr-assistant-docs";
  const owner = "deshmukhraysoftwareservice";
  
  // Enhanced intent to document mapping with GitHub links
  const intentToPath = {
    leave: "Leaves/leave_policy.md",
    grievance: "HR/grievance_policy.md",
    employee: "Employee/employee_policy.md",
    company: "Employee/company_policy.md",
    policy: "Benefits/benefits_policy.md",
    benefits: "Benefits/benefits_policy.md",
    payroll: "Payroll/payroll_policy.md",
    attendance: "Attendance/attendance_policy.md",
    technical: "IT/technical_support.md",
    facilities: "Office/facilities_policy.md",
    performance: "HR/performance_policy.md",
    finance: "Finance/expense_policy.md",
    holidays: "Calendar/holidays_policy.md",
    general: "README.md"
  };

  const intentToGitHubLink = {
    leave: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Leaves/leave_policy.md",
    grievance: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/HR/grievance_policy.md",
    employee: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Employee/employee_policy.md",
    company: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Employee/company_policy.md",
    policy: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Benefits/benefits_policy.md",
    benefits: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Benefits/benefits_policy.md",
    payroll: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Payroll/payroll_policy.md",
    attendance: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Attendance/attendance_policy.md",
    technical: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/IT/technical_support.md",
    facilities: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Office/facilities_policy.md",
    performance: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/HR/performance_policy.md",
    finance: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Finance/expense_policy.md",
    holidays: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/Calendar/holidays_policy.md",
    general: "https://github.com/deshmukhraysoftwareservice/hr-assistant-docs/blob/main/README.md"
  };

  const path = intentToPath[intent.primaryIntent] || intentToPath.general;
  const cacheKey = `${owner}/${repo}/${path}`;

  // Check cache first
  const cached = docCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { content: cached.content, githubLink: cached.githubLink };
  }

  try {
    const fileContent = await octokit.repos.getContent({ owner, repo, path });
    const content = Buffer.from(fileContent.data.content, "base64").toString("utf-8");
    const githubLink = intentToGitHubLink[intent.primaryIntent] || intentToGitHubLink.general;
    
    // Cache the content with GitHub link
    docCache.set(cacheKey, {
      content,
      githubLink,
      timestamp: Date.now()
    });
    
    return { content, githubLink };
  } catch (error) {
    console.error(`Failed to fetch document ${path}:`, error.message);
    return null;
  }
}

async function getContextualData(question, user, intent) {
  let contextData = "";

  try {
    // Add user role and type information
    if (user) {
      contextData += `\nUser Profile:
- Role: ${user.role || 'employee'}
- Employee ID: ${user.empid || user.id}
- Name: ${user.name || 'N/A'}`;
      
      // Add role-specific context
      if (user.role === 'admin' || user.role === 'superadmin') {
        contextData += `\n- Access Level: Administrative (can view company-wide data)`;
      } else {
        contextData += `\n- Access Level: Employee (personal data only)`;
      }
    }

    // Add user-specific data based on intent
    if (intent.primaryIntent === "payroll" && user) {
      const payroll = await prisma.payroll.findFirst({
        where: { empid: user.empid || user.id },
        orderBy: { generated_on: "desc" }
      });
      
      if (payroll) {
        contextData += `\nUser's Latest Payroll Data:
- Month: ${payroll.month}/${payroll.year}
- Basic Salary: ₹${payroll.basic_salary}
- Net Pay: ₹${payroll.net_pay}
- Deductions: ₹${payroll.deductions}`;
      }
    }

    if (intent.primaryIntent === "leave" && user) {
      const leaveRequests = await prisma.leave_requests.findMany({
        where: { empid: user.empid || user.id },
        orderBy: { applied_at: "desc" },
        take: 3
      });
      
      if (leaveRequests.length > 0) {
        contextData += `\nUser's Recent Leave Requests:`;
        leaveRequests.forEach((leave, index) => {
          contextData += `\n${index + 1}. ${leave.leave_type} - ${leave.status} (${new Date(leave.from_date).toLocaleDateString()} to ${new Date(leave.to_date).toLocaleDateString()})`;
        });
      }
    }

    if (intent.primaryIntent === "attendance" && user) {
      const today = new Date();
      const todayAttendance = await prisma.attendance.findFirst({
        where: {
          empid: user.empid || user.id,
          date: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
          }
        }
      });
      
      if (todayAttendance) {
        contextData += `\nUser's Today Attendance:
- Check-in: ${todayAttendance.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString() : "Not checked in"}
- Check-out: ${todayAttendance.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString() : "Not checked out"}`;
      }
    }

    if (intent.primaryIntent === "holidays") {
      const nextHoliday = await prisma.calendar_events.findFirst({
        where: {
          event_date: { gte: new Date() },
          event_type: "holiday"
        },
        orderBy: { event_date: "asc" }
      });
      
      if (nextHoliday) {
        const daysUntil = Math.ceil((new Date(nextHoliday.event_date) - new Date()) / (1000 * 60 * 60 * 24));
        contextData += `\nNext Holiday: ${nextHoliday.title} in ${daysUntil} days (${new Date(nextHoliday.event_date).toLocaleDateString()})`;
      }
    }

  } catch (error) {
    console.error("Error fetching contextual data:", error);
  }

  return contextData;
}

async function callBedrockAmazonQ(question, context, config) {
  if (!bedrockClient) {
    throw new Error("Bedrock client not initialized");
  }

  const prompt = `You are an HR assistant for an HRMS system. Answer the question based on the user's role and provided context.

Question: "${question}"

Context and Documentation:
${context}

Instructions:
- Keep responses SHORT (max 3-4 sentences)
- Tailor response based on user's role (admin vs employee)
- For employees: Focus on their personal data only
- For admins: Can provide company-wide information
- Use emojis sparingly
- Be direct and concise
- If no specific data available, briefly guide to HR or dashboard

Response:`;

  const input = {
    modelId: "amazon.titan-text-express-v1",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      inputText: prompt,
      textGenerationConfig: {
        maxTokenCount: 200,
        temperature: 0.5,
        topP: 0.8
      }
    })
  };

  try {
    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.results[0].outputText.trim();
  } catch (error) {
    console.error("Bedrock API error:", error);
    throw error;
  }
}

async function callGroqLLM(question, context) {
  if (!groq) {
    throw new Error("Groq client not initialized");
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: "You are an HR assistant. Provide SHORT, role-specific responses (max 3-4 sentences). For employees: personal data only. For admins: company-wide data allowed. Be direct and concise."
      },
      {
        role: "user",
        content: `Question: "${question}"\n\nContext:\n${context}\n\nProvide a brief, role-appropriate response.`
      }
    ],
    temperature: 0.5,
    max_tokens: 150
  });

  return completion.choices[0].message.content.trim();
}

export async function getLLMAnswerFromGitHub(question, intent, user = null, config = null) {
  try {
    // Initialize clients with current config
    initializeClients(config);

    // Get relevant documentation with GitHub link
    const docResult = await getDocumentFromGitHub(intent);
    const documentation = docResult?.content || "No specific documentation available.";
    const githubLink = docResult?.githubLink || null;
    
    // Get contextual user data
    const contextualData = await getContextualData(question, user, intent);
    
    // Combine context
    const fullContext = `${documentation}\n${contextualData}`;

    let answer = null;

    // Try Bedrock first if configured
    if (config?.preferredLLM === "BEDROCK" && bedrockClient) {
      try {
        answer = await callBedrockAmazonQ(question, fullContext, config);
      } catch (error) {
        console.error("Bedrock failed, trying Groq:", error.message);
      }
    }

    // Fallback to Groq if Bedrock failed or not preferred
    if (!answer && groq) {
      try {
        answer = await callGroqLLM(question, fullContext);
      } catch (error) {
        console.error("Groq failed:", error.message);
      }
    }

    // Return answer with GitHub link if documentation was used
    return githubLink ? { answer, github_link: githubLink } : answer;

  } catch (error) {
    console.error("LLM processing error:", error);
    return null;
  }
}
