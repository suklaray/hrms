import fs from "fs";
import path from "path";

import XLSX from "xlsx";

const dataDir = path.join(process.cwd(), "hr-assistant-data");

// Function to read file content based on extension
async function readFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === ".txt") {
      return fs.readFileSync(filePath, "utf8");
    }

    if (ext === ".pdf") {
      try {
        const buffer = fs.readFileSync(filePath);
        const pdfParse = await import("pdf-parse");
        const data = await (pdfParse.default || pdfParse)(buffer);
        return data.text || "";
      } catch (err) {
        console.error(`PDF parsing failed for ${filePath}:`, err.message);
        return "";
      }
    }

    if (ext === ".xlsx") {
      const workbook = XLSX.readFile(filePath);
      let text = "";
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        text += XLSX.utils.sheet_to_csv(sheet) + "\n";
      });
      return text;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return "";
  }

  return "";
}

// Search and rank HR files
export async function searchFiles(query) {
  if (!fs.existsSync(dataDir)) return [];

  const filesList = fs
    .readdirSync(dataDir)
    .filter((f) => !f.endsWith(".meta.json"));
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  const scoredFiles = [];

  for (const filename of filesList) {
    const filePath = path.join(dataDir, filename);
    const content = await readFileContent(filePath);

    const filenameLower = filename.toLowerCase();
    const contentLower = content.toLowerCase();
    let score = 0;

    // Word-level scoring
    queryWords.forEach((word) => {
      if (filenameLower.includes(word)) score += 4;
      if (contentLower.includes(word)) score += 2;
    });

    // Bonus for full phrase match
    if (filenameLower.includes(queryLower)) score += 10;

    // Prefer exact match for key documents
    if (
      queryLower.includes("company") &&
      filenameLower.includes("company_policy")
    )
      score += 12;
    if (
      queryLower.includes("holiday") &&
      filenameLower.includes("holiday_list")
    )
      score += 12;
    if (
      queryLower.includes("employee") &&
      filenameLower.includes("employee_policy")
    )
      score += 8;

    if (score > 0) scoredFiles.push({ filename, content, score });
  }

  return scoredFiles.sort((a, b) => b.score - a.score);
}

// Determine the most relevant file
export async function getRelevantFile(intent, question = "") {
  const intentKeywords = {
    leave: [
      "leave",
      "vacation",
      "holiday",
      "absence",
      "time off",
      "sick leave",
      "casual leave",
      "paid leave",
      "unpaid leave",
      "leave balance",
      "apply leave",
      "maternity",
      "paternity",
      "comp off",
      "day off",
      "annual leave",
      "weekend off",
    ],

    policy: [
      "policy",
      "policies",
      "rule",
      "rules",
      "guideline",
      "procedure",
      "process",
      "protocol",
      "regulation",
      "standard",
      "company",
      "employee",
      "code of conduct",
      "dress code",
      "workplace ethics",
      "harassment",
      "grievance policy",
      "discipline",
      "attendance policy",
      "leave policy",
      "security policy",
      "it policy",
    ],

    payroll: [
      "payroll",
      "salary",
      "pay",
      "wage",
      "payout",
      "compensation",
      "ctc",
      "net pay",
      "gross pay",
      "payslip",
      "payment",
      "earnings",
      "deductions",
      "arrears",
      "increment",
      "bonus",
      "overtime",
      "monthly pay",
      "salary structure",
    ],

    attendance: [
      "attendance",
      "time",
      "checkin",
      "checkout",
      "work hours",
      "shift",
      "schedule",
      "timing",
      "late mark",
      "half day",
      "absent",
      "present",
      "biometric",
      "attendance record",
      "working hours",
      "punch in",
      "punch out",
    ],

    benefits: [
      "benefit",
      "benefits",
      "insurance",
      "health",
      "medical",
      "pf",
      "epf",
      "esi",
      "bonus",
      "allowance",
      "gratuity",
      "wellness",
      "life cover",
      "retirement",
      "incentive",
      "reimbursement",
      "claim",
      "health plan",
      "wellbeing",
      "employee support",
    ],

    technical: [
      "technical",
      "it",
      "computer",
      "system",
      "network",
      "software",
      "hardware",
      "login",
      "password",
      "reset",
      "error",
      "access",
      "vpn",
      "email",
      "portal",
      "bug",
      "issue",
      "crash",
      "support",
      "helpdesk",
    ],

    grievance: [
      "grievance",
      "complaint",
      "issue",
      "problem",
      "harassment",
      "dispute",
      "conflict",
      "misconduct",
      "unfair",
      "behavior",
      "bullying",
      "concern",
      "escalate",
      "feedback",
      "report issue",
    ],

    performance: [
      "performance",
      "review",
      "evaluation",
      "appraisal",
      "rating",
      "feedback",
      "goals",
      "target",
      "achievement",
      "promotion",
      "raise",
      "increment",
      "score",
      "KPI",
      "OKR",
      "assessment",
      "self review",
      "peer review",
    ],
  };

  const baseKeywords = intentKeywords[intent.primaryIntent] || [];
  const query = [question, ...baseKeywords].join(" ").trim();

  const files = await searchFiles(query);

  if (files.length === 0) return null;

  const top = files[0];
  const second = files[1];

  // Ambiguity check
  if (second && top.score - second.score < 5) {
    return {
      ambiguous: true,
      message: `I found multiple related documents (${top.filename.replace(
        /\.[^/.]+$/,
        ""
      )} and ${second.filename.replace(
        /\.[^/.]+$/,
        ""
      )}). Please specify which one you’d like to view.`,
      candidates: [top.filename, second.filename],
    };
  }

  return top;
}
