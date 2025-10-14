// Enhanced File-Based HR Data Search Module
import fs from "fs";
import path from "path";

const HR_DATA_DIR = path.join(process.cwd(), "hr-assistant-data");

// Enhanced HR file search with content matching
export async function searchHRFiles(intent, question) {
  if (!fs.existsSync(HR_DATA_DIR)) return null;
  
  const files = fs.readdirSync(HR_DATA_DIR).filter(f => !f.endsWith('.meta.json'));
  const queryLower = question.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  const results = [];
  
  for (const file of files) {
    const filePath = path.join(HR_DATA_DIR, file);
    const content = await readHRFileContent(filePath);
    
    if (!content) continue;
    
    const score = calculateRelevanceScore(file, content, intent, queryWords);
    
    if (score > 0) {
      results.push({
        filename: file,
        path: filePath,
        content,
        score,
        downloadUrl: `/api/bot/download?file=${encodeURIComponent(file)}`,
        relevantSection: extractRelevantSection(content, queryWords)
      });
    }
  }
  
  // Return best match
  return results.sort((a, b) => b.score - a.score)[0] || null;
}

// Calculate relevance score based on filename and content
function calculateRelevanceScore(filename, content, intent, queryWords) {
  let score = 0;
  const filenameLower = filename.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Intent-based keyword mapping
  const intentKeywords = {
    payslip: ['payslip', 'salary', 'pay', 'wage', 'earning', 'compensation'],
    leave: ['leave', 'vacation', 'holiday', 'absence', 'pto', 'time off'],
    attendance: ['attendance', 'checkin', 'checkout', 'punch', 'time', 'schedule'],
    policy: ['policy', 'rule', 'guideline', 'procedure', 'regulation'],
    benefits: ['benefit', 'insurance', 'medical', 'pf', 'esi', 'provident'],
    holiday: ['holiday', 'festival', 'celebration', 'calendar', 'public holiday'],
    contact: ['contact', 'phone', 'email', 'address', 'hr', 'support'],
    profile: ['profile', 'personal', 'information', 'details', 'employee']
  };
  
  const keywords = intentKeywords[intent.primaryIntent] || [];
  
  // Filename matching (high weight)
  keywords.forEach(keyword => {
    if (filenameLower.includes(keyword)) score += 10;
  });
  
  // Content keyword matching
  keywords.forEach(keyword => {
    const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
    score += matches * 3;
  });
  
  // Query word matching in content
  queryWords.forEach(word => {
    if (contentLower.includes(word)) score += 2;
    if (filenameLower.includes(word)) score += 5;
  });
  
  // Boost for exact phrase matches
  if (contentLower.includes(queryWords.join(' '))) score += 8;
  
  return score;
}

// Extract relevant section from content
function extractRelevantSection(content, queryWords) {
  const sentences = content.split(/[.!?]\s+/);
  const relevantSentences = [];
  
  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    const matchCount = queryWords.filter(word => sentenceLower.includes(word)).length;
    
    if (matchCount > 0) {
      relevantSentences.push({ sentence: sentence.trim(), matches: matchCount });
    }
  }
  
  // Return top 3 most relevant sentences
  return relevantSentences
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 3)
    .map(item => item.sentence)
    .join('. ');
}

// Legacy function for backward compatibility
export function checkHRFile(intent, question) {
  return searchHRFiles(intent, question);
}

// Enhanced file content reader with multiple format support
export async function readHRFileContent(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.txt' || ext === '.csv') {
      return fs.readFileSync(filePath, 'utf8');
    }
    
    if (ext === '.pdf') {
      try {
        const buffer = fs.readFileSync(filePath);
        const pdfParse = await import('pdf-parse');
        const data = await (pdfParse.default || pdfParse)(buffer);
        return data.text || '';
      } catch (err) {
        console.error(`PDF parsing failed: ${err.message}`);
        return '';
      }
    }
    
    if (ext === '.xlsx' || ext === '.xls') {
      try {
        const XLSX = await import('xlsx');
        const workbook = XLSX.readFile(filePath);
        let text = '';
        workbook.SheetNames.forEach(name => {
          const sheet = workbook.Sheets[name];
          text += XLSX.utils.sheet_to_csv(sheet) + '\n';
        });
        return text;
      } catch (err) {
        console.error(`Excel parsing failed: ${err.message}`);
        return '';
      }
    }
    
    if (ext === '.docx') {
      try {
        const mammoth = await import('mammoth');
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        return result.value || '';
      } catch (err) {
        console.error(`DOCX parsing failed: ${err.message}`);
        return '';
      }
    }
    
    // Try to read as text for unknown extensions
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      return '';
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return '';
  }
}