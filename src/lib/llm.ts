import fs from "fs";
import path from "path";
import { isSuperAdmin } from "@/lib/rbac";

import * as XLSX from "xlsx";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import Groq from "groq-sdk";

const dataDir = path.join(process.cwd(), "hr-assistant-data");
const MAX_FILE_PREVIEW = 500;

let bedrockClient = null;
let groq = null;

// Initialize LLM clients
function initializeClients() {
  if (
    process.env.AWS_ACCESS_KEY &&
    process.env.AWS_SECRET_KEY &&
    process.env.AWS_REGION
  ) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
      },
    });
  }
  if (process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
}

// --- Read file content ---
async function readFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === ".txt") return fs.readFileSync(filePath, "utf8");
    if (ext === ".pdf") {
      try {
        const buffer = fs.readFileSync(filePath);
        const pdfParse: any = await import("pdf-parse");
        const parseFn = pdfParse.default || pdfParse;
        const data = await parseFn(buffer);
        return data.text || "";
      } catch (err) {
        console.error(`PDF parsing failed for ${filePath}:`, err.message);
        return "";
      }
    }
    if (ext === ".xlsx") {
      const workbook = XLSX.readFile(filePath);
      let text = "";
      workbook.SheetNames.forEach((name) => {
        const sheet = workbook.Sheets[name];
        text += XLSX.utils.sheet_to_csv(sheet) + "\n";
      });
      return text;
    }
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err.message);
    return "";
  }
  return "";
}

// --- Search files ---
async function searchFiles(query) {
  if (!fs.existsSync(dataDir)) return [];
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => !f.endsWith(".meta.json"));
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  const results = [];

  for (const filename of files) {
    const filePath = path.join(dataDir, filename);
    const content = await readFileContent(filePath);
    if (!content) continue;

    const filenameLower = filename.toLowerCase();
    const contentLower = content.toLowerCase();
    let score = 0;

    queryWords.forEach((word) => {
      if (filenameLower.includes(word)) score += 4;
      if (contentLower.includes(word)) score += 2;
    });

    if (filenameLower.includes(queryLower)) score += 10;

    // Boost key HR files
    if (
      queryLower.includes("company") &&
      filenameLower.includes("company_policy")
    )
      score += 15;
    if (
      queryLower.includes("employee") &&
      filenameLower.includes("employee_policy")
    )
      score += 12;
    if (
      queryLower.includes("holiday") &&
      filenameLower.includes("holiday_list")
    )
      score += 12;
    if (queryLower.includes("payroll") && filenameLower.includes("payroll"))
      score += 10;
    if (queryLower.includes("benefit") && filenameLower.includes("benefit"))
      score += 10;

    if (score > 0) results.push({ filename, content, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

// --- Get relevant file ---
export async function getRelevantFile(intent, question = "") {
  const files = await searchFiles(question);
  if (!files.length) return null;

  const top = files[0];
  const second = files[1];

  if (second && top.score - second.score < 5) {
    return {
      ambiguous: true,
      message: `I found multiple related documents (${top.filename.replace(
        /\.[^/.]+$/,
        ""
      )} and ${second.filename.replace(/\.[^/.]+$/, "")}). Please specify which one you’d like to view.`,
      candidates: [top.filename, second.filename],
    };
  }

  return {
    filename: top.filename,
    content: top.content,
    downloadUrl: `/api/bot/download?file=${encodeURIComponent(top.filename)}`,
    score: top.score,
  };
}

// --- Navigation context with structured responses ---
function createNavigationContext(intent, isAdmin, employeeType, relevantFile) {
  const guides = {
    payslip: {
      view: "💰 To view your payslip, go to Dashboard → Payslip & Doc. Click 'View' to open details or 'Download' for PDF.",
      amount: "💵 Your salary details are in Dashboard → Payslip & Docs. Select the desired month to see breakdown of earnings and deductions.",
      history: "📊 To view payslip history, go to Dashboard → Payslip & Docs. You can access previous months' payslips and download them.",
      default: "💰 For payslip queries, visit Dashboard → Payslip & Docs. You can view current and previous payslips, and download PDF copies."
    },
    leave: {
      status: "📋 To check your leave status, go to Dashboard → Leave Request → History tab. You can view all submitted requests and their approval status.",
      balance: "🏖️ To check your leave balance, go to Dashboard → Attendance & Leave → Leave Balance tab. You'll see remaining days by leave type.",
      history: "📊 To view your leave history, go to Dashboard → Leave Request → History tab. You can filter by date range and leave type.",
      apply: "📝 To apply for leave, go to Dashboard → Attendance & Leave → Apply Leave button. Fill the form and submit for approval.",
      default: "🏖️ For leave-related queries, visit Dashboard → Attendance & Leave section. You can check balance, apply for leave, or view history."
    },
    attendance: {
      today: "⏰ To check today's attendance, go to Dashboard → Attendance & Leave → Attendance Records. You'll see your check-in/out times.",
      history: "📊 To view attendance history, go to Dashboard → Attendance & Leave → Attendance Records tab. Filter by date range as needed.",
      default: "⏰ For attendance queries, visit Dashboard → Attendance & Leave section. You can view daily records and monthly summaries."
    },
    holidays: {
      upcoming: "🎉 To see upcoming holidays, go to Dashboard → Calendar section. All official holidays and events are listed there.",
      list: "📅 The complete holiday calendar is available in Dashboard → Calendar section. Click on View Calendar and you can see yearly calendar and holidays.",
      default: "🎉 For holiday information, check Dashboard → Calendar section or contact HR at hr@company.com for the official holiday list."
    },
    profile: {
      update: "🖊️ To update your profile information, go to Dashboard → Profile Management. Click on change profile image to change the profile image. Click on update document for updating the document.",
      default: "👤 For profile-related queries, visit Dashboard → Profile Management. You can update your contact information and profile picture."
    },
    policy: "📋 For company policies, contact HR Department (hr@company.com, +91-XXXX-XXXX-XX, 2nd Floor) for complete policy documents.",
    benefits: "🎁 For benefits information, contact HR Department for detailed benefits package and enrollment details.",
    technical: "🔧 For technical support, contact IT Support (it-support@company.com, Ext. 1234, Ground Floor).",
    contact: "📞 HR Contact: hr@company.com, Phone: +91-XXXX-XXXX-XX, Office: 2nd Floor, Hours: 10 AM - 6 PM.",
    general: "👋 I'm here to help with HR queries like leave, payslip, attendance, holidays, and policies. What would you like to know?"
  };

  // Get structured response based on intent and sub-intent
  let baseResponse;
  const intentConfig = guides[intent.primaryIntent];

  if (typeof intentConfig === 'object' && intent.subIntent && intentConfig[intent.subIntent]) {
    baseResponse = intentConfig[intent.subIntent];
  } else if (typeof intentConfig === 'object') {
    baseResponse = intentConfig.default;
  } else {
    baseResponse = intentConfig || guides.general;
  }

  const fileInfo = relevantFile?.content
    ? `\n\n📄 Preview:\n${String(relevantFile.content)
      .slice(0, MAX_FILE_PREVIEW)
      .replace(/\n/g, " ")}${relevantFile.content.length > MAX_FILE_PREVIEW ? "..." : ""
    }\n\n💾 Download: ${relevantFile.downloadUrl}`
    : "";

  return {
    context: baseResponse + fileInfo,
    sourceFile: relevantFile?.filename,
    downloadUrl: relevantFile?.downloadUrl,
  };
}

// --- LLM Answer ---
export async function getLLMAnswerFromRepo(question, intent, user = null) {
  try {
    initializeClients();

    const userRole = user?.role?.toLowerCase() || "employee";
    const employeeType = user?.employee_type || user?.type || "Regular";
    const isAdmin = isSuperAdmin(user);

    // ✅ Fetch relevant file first
    const relevantFile = await getRelevantFile(intent, question);

    // Intent-aware file filtering
    const intentToFileMap = {
      payroll: ["payroll", "salary", "payslip"],
      leave: ["leave", "holiday", "vacation"],
      attendance: ["attendance", "checkin", "checkout"],
      policy: ["company_policy", "employee_policy"],
      benefits: ["benefit", "insurance", "pf", "esi"],
      technical: ["technical", "it", "system"],
      grievance: ["grievance", "complaint"],
      performance: ["performance", "review", "evaluation"],
    };

    let fileToReturn = null;
    if (relevantFile && !relevantFile.ambiguous) {
      const allowedKeywords = intentToFileMap[intent.primaryIntent] || [];
      if (
        allowedKeywords.some((kw) =>
          relevantFile.filename.toLowerCase().includes(kw)
        )
      ) {
        fileToReturn = relevantFile;
      }
    }

    if (fileToReturn) {
      return {
        answer: `📘 According to company documents:\n${String(
          fileToReturn.content
        ).slice(0, MAX_FILE_PREVIEW)}${fileToReturn.content.length > MAX_FILE_PREVIEW ? "..." : ""
          }\n\n💾 Download: ${fileToReturn.downloadUrl}`,
        sourceFile: fileToReturn.filename,
        downloadUrl: fileToReturn.downloadUrl,
      };
    }

    if (relevantFile?.ambiguous) {
      return {
        answer: relevantFile.message,
        candidates: relevantFile.candidates,
      };
    }

    // Otherwise fallback to LLM
    const contextResult = createNavigationContext(
      intent,
      isAdmin,
      employeeType,
      relevantFile
    );
    const context = contextResult.context;
    const downloadUrl = contextResult.downloadUrl;

    let answer = null;
    if (groq) {
      answer = await groq.chat.completions
        .create({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: "You are an HR Assistant. Provide short, direct navigation instructions with emojis. Keep responses under 80 words. Use the exact format provided in context.",
            },
            {
              role: "user",
              content: `Question: "${question}"\n\nUse this exact response: ${context}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 80,
        })
        .then((res) => res.choices[0].message.content.trim());
    }

    if (!answer && bedrockClient) {
      const prompt = `You are an HR Assistant. Provide short navigation instructions with emojis. Use this exact response: ${context}`;
      const command = new InvokeModelCommand({
        modelId: "amazon.titan-text-express-v1",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          inputText: prompt,
          textGenerationConfig: { maxTokenCount: 80, temperature: 0.3 },
        }),
      });
      const response = await bedrockClient.send(command);
      answer = JSON.parse(
        new TextDecoder().decode(response.body)
      ).results[0].outputText.trim();
    }

    // Use context directly if LLM fails
    if (!answer) {
      answer = context;
    }

    // Add download link if available
    if (downloadUrl) {
      // answer += `\n\n💾 Download: ${downloadUrl}`;
      return { answer, downloadUrl, sourceFile: contextResult.sourceFile };
    }

    return { answer };
  } catch (err) {
    console.error("LLM error:", err);
    return { answer: "An error occurred while processing your request." };
  }
}
