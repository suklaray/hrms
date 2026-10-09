import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

export interface PayslipPdfData {
  empid: string;
  period_id: string;
  period_name: string;
  gross_salary: number | string;
  total_deduction: number | string;
  net_salary?: number | string;
  total_payable_amount?: number | string;
  salary_payment_date?: Date | string | null;
  generated_at?: Date | string | null;
  company?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pinCode?: string | null;
  } | null;
  users?: {
    name?: string | null;
    email?: string | null;
    contact_number?: string | null;
    position?: string | null;
    role?: string | null;
    rbacRole?: { name?: string | null } | null;
    employeeProfile?: {
      name?: string | null;
      email?: string | null;
      contact_no?: string | null;
      bank_details?: Array<{
        account_holder_name?: string | null;
        bank_name?: string | null;
        branch_name?: string | null;
        account_number?: string | null;
        ifsc_code?: string | null;
      }> | null;
    } | null;
  } | null;
  components?: Array<{
    component_name: string;
    component_ammount: number | string;
    component_type: "EARNING" | "DEDUCTION" | string;
  }>;
}

export interface GeneratedPdfResult {
  fileName: string;
  relativeUrl: string;
  fullPath: string;
  buffer: Buffer;
}

/**
 * Draws an exact vector Rupee symbol in jsPDF without external font dependencies
 */
function drawRupeeSymbol(doc: jsPDF, x: number, y: number, size: number, color?: [number, number, number]) {
  doc.saveGraphicsState();
  if (color) doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(size * 0.1);
  const w = size * 0.52;
  const h = size;
  const topY = y - h * 0.75;
  const midY = y - h * 0.52;
  const stemX = x + 0.5;

  // Top horizontal bar
  doc.line(x, topY, x + w, topY);
  // Second horizontal bar
  doc.line(x, midY, x + w * 0.75, midY);
  // Vertical stem
  const loopBottomY = y - h * 0.3;
  doc.line(stemX, topY, stemX, loopBottomY);
  // Upper loop curve
  const loopH = (loopBottomY - topY) / 2;
  doc.line(stemX, topY, stemX + w * 0.32, topY);
  doc.line(stemX + w * 0.32, topY, stemX + w * 0.4, topY + loopH);
  doc.line(stemX + w * 0.4, topY + loopH, stemX, loopBottomY);
  // Diagonal leg
  doc.line(stemX + 0.5, loopBottomY, x + w * 0.75, y);
  doc.restoreGraphicsState();
}

/**
 * Generates an A4 Payslip PDF matching the official HRMS design
 * and saves it to public/uploads/payslips/[empid]_[period_id].pdf
 */
export async function generatePayslipPdf(data: PayslipPdfData): Promise<GeneratedPdfResult> {
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 40;
  const contentWidth = pageWidth - 2 * marginX; // 515.28

  // Outer border
  doc.setDrawColor(209, 213, 219); // #D1D5DB
  doc.setLineWidth(1);
  doc.roundedRect(25, 25, pageWidth - 50, pageHeight - 50, 6, 6, "S");

  // Top Header: Logo + HRMS on Left
  doc.setDrawColor(79, 70, 229); // #4F46E5
  doc.setLineWidth(1.5);
  doc.roundedRect(50, 48, 22, 24, 3, 3, "S");
  doc.rect(58, 62, 6, 10, "S"); // door
  doc.rect(55, 53, 4, 4, "S"); // window
  doc.rect(63, 53, 4, 4, "S"); // window

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text("HRMS", 78, 66);

  // Top Header: PAYSLIP on Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(79, 70, 229);
  doc.text("PAYSLIP", pageWidth - 50, 58, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128); // #6B7280
  const periodText = String(data.period_name || "PAYSLIP PERIOD").toUpperCase();
  doc.text(periodText, pageWidth - 50, 70, { align: "right" });

  // Company Icon & Center Info
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(1.2);
  doc.rect(pageWidth / 2 - 8, 92, 16, 8, "S");
  doc.rect(pageWidth / 2 - 8, 102, 16, 8, "S");

  const companyName = String(data.company?.name || "COMPANY NAME").toUpperCase();
  const addressParts = [
    data.company?.address,
    data.company?.city,
    data.company?.state,
    data.company?.pinCode,
  ].filter(Boolean);
  const companyAddress = (addressParts.length > 0 ? addressParts.join(", ") : "COMPANY ADDRESS").toUpperCase();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(79, 70, 229);
  doc.text(companyName, pageWidth / 2, 124, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text(companyAddress, pageWidth / 2, 136, { align: "center" });

  // Employee Details Card
  let curY = 155;
  const cardH1 = 76;
  doc.setFillColor(249, 250, 251); // #F9FAFB
  doc.setDrawColor(229, 231, 235); // #E5E7EB
  doc.setLineWidth(1);
  doc.roundedRect(50, curY, contentWidth, cardH1, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81); // #374151
  doc.text("EMPLOYEE DETAILS", 62, curY + 16);

  const leftColX = 62;
  const rightColX = 290;
  let textY = curY + 32;
  const lineGap = 13;

  const renderField = (x: number, y: number, label: string, val: string | null | undefined) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(55, 65, 81);
    doc.text(label, x, y);
    const labelWidth = doc.getTextWidth(label);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    doc.text(String(val || "N/A"), x + labelWidth + 3, y);
  };

  const empName = (data.users?.name || data.users?.employeeProfile?.name || "EMPLOYEE").toUpperCase();
  const empEmail = data.users?.email || data.users?.employeeProfile?.email || "N/A";
  const empContact = data.users?.contact_number || data.users?.employeeProfile?.contact_no || "NOT PROVIDED";
  const empRole = (data.users?.rbacRole?.name || data.users?.role || "EMPLOYEE").toUpperCase();
  const empPosition = (data.users?.position || "EMPLOYEE").toUpperCase();

  renderField(leftColX, textY, "NAME: ", empName);
  renderField(rightColX, textY, "EMAIL: ", empEmail);

  textY += lineGap;
  renderField(leftColX, textY, "CONTACT: ", empContact);
  renderField(rightColX, textY, "ROLE: ", empRole);

  textY += lineGap;
  renderField(leftColX, textY, "POSITION: ", empPosition);
  renderField(rightColX, textY, "PAYSLIP PERIOD: ", periodText);

  // Bank Details Card
  curY += cardH1 + 12;
  const cardH2 = 64;
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(50, curY, contentWidth, cardH2, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text("BANK DETAILS", 62, curY + 16);

  const bank = Array.isArray(data.users?.employeeProfile?.bank_details) &&
    data.users?.employeeProfile?.bank_details.length > 0
    ? data.users.employeeProfile.bank_details[0]
    : null;

  const accHolder = (bank?.account_holder_name || "N/A").toUpperCase();
  const bankName = (bank?.bank_name || "N/A").toUpperCase();
  const branchName = (bank?.branch_name || "N/A").toUpperCase();
  const accNumber = bank?.account_number || "N/A";
  const ifscCode = (bank?.ifsc_code || "N/A").toUpperCase();

  textY = curY + 30;
  renderField(leftColX, textY, "ACCOUNT HOLDER: ", accHolder);
  renderField(rightColX, textY, "BANK NAME: ", bankName);

  textY += lineGap;
  renderField(leftColX, textY, "BRANCH: ", branchName);
  renderField(rightColX, textY, "ACCOUNT NUMBER: ", accNumber);

  textY += lineGap;
  renderField(leftColX, textY, "IFSC CODE: ", ifscCode);

  // Table
  curY += cardH2 + 15;
  const tableX = 50;
  const col1W = 150;
  const col2W = 95;
  const col3W = 175;
  const col4W = contentWidth - (col1W + col2W + col3W);
  const rowH = 18;

  // Header row
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(209, 213, 219);
  doc.rect(tableX, curY, contentWidth, 22, "FD");
  doc.line(tableX + col1W, curY, tableX + col1W, curY + 22);
  doc.line(tableX + col1W + col2W, curY, tableX + col1W + col2W, curY + 22);
  doc.line(tableX + col1W + col2W + col3W, curY, tableX + col1W + col2W + col3W, curY + 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text("EARNINGS", tableX + 8, curY + 14);

  const drawHeaderAmountWithRupee = (rightBound: number) => {
    const wPrefix = doc.getTextWidth("AMOUNT (");
    const start = rightBound - 49;
    doc.text("AMOUNT (", start, curY + 14);
    drawRupeeSymbol(doc, start + wPrefix + 1, curY + 14, 6.8, [55, 65, 81]);
    doc.text(")", start + wPrefix + 6.5, curY + 14);
  };

  drawHeaderAmountWithRupee(tableX + col1W + col2W - 8);
  doc.text("DEDUCTIONS", tableX + col1W + col2W + 8, curY + 14);
  drawHeaderAmountWithRupee(tableX + contentWidth - 8);

  curY += 22;

  // Process Earnings and Deductions
  const rawComponents = Array.isArray(data.components) ? data.components : [];
  let earnings = rawComponents
    .filter((c) => c.component_type === "EARNING")
    .map((c) => ({
      name: String(c.component_name || "EARNING").toUpperCase(),
      amount: Number(c.component_ammount || 0),
    }));

  let deductions = rawComponents
    .filter((c) => c.component_type === "DEDUCTION")
    .map((c) => ({
      name: String(c.component_name || "DEDUCTION").toUpperCase(),
      amount: Number(c.component_ammount || 0),
    }));

  if (earnings.length === 0 && Number(data.gross_salary) > 0) {
    earnings.push({
      name: "BASIC SALARY",
      amount: Number(data.gross_salary),
    });
  }

  if (deductions.length === 0 && Number(data.total_deduction) > 0) {
    deductions.push({
      name: "TOTAL DEDUCTION",
      amount: Number(data.total_deduction),
    });
  }

  const totalAllowances = earnings.reduce((sum, item) => sum + item.amount, 0) || Number(data.gross_salary || 0);
  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0) || Number(data.total_deduction || 0);
  const netPay = data.total_payable_amount !== undefined
    ? Number(data.total_payable_amount)
    : data.net_salary !== undefined
    ? Number(data.net_salary)
    : totalAllowances - totalDeductions;

  const maxRows = Math.max(earnings.length, deductions.length);
  for (let i = 0; i < maxRows; i++) {
    doc.setDrawColor(209, 213, 219);
    doc.rect(tableX, curY, contentWidth, rowH, "S");
    doc.line(tableX + col1W, curY, tableX + col1W, curY + rowH);
    doc.line(tableX + col1W + col2W, curY, tableX + col1W + col2W, curY + rowH);
    doc.line(tableX + col1W + col2W + col3W, curY, tableX + col1W + col2W + col3W, curY + rowH);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55);

    if (earnings[i]) {
      doc.text(earnings[i].name, tableX + 8, curY + 12);
      doc.text(earnings[i].amount.toFixed(2), tableX + col1W + col2W - 8, curY + 12, { align: "right" });
    }
    if (deductions[i]) {
      doc.text(deductions[i].name, tableX + col1W + col2W + 8, curY + 12);
      doc.text(deductions[i].amount.toFixed(2), tableX + contentWidth - 8, curY + 12, { align: "right" });
    }

    curY += rowH;
  }

  // Total summary row
  doc.setFillColor(243, 244, 246); // #F3F4F6
  doc.setDrawColor(209, 213, 219);
  doc.rect(tableX, curY, contentWidth, 22, "FD");
  doc.line(tableX + col1W, curY, tableX + col1W, curY + 22);
  doc.line(tableX + col1W + col2W, curY, tableX + col1W + col2W, curY + 22);
  doc.line(tableX + col1W + col2W + col3W, curY, tableX + col1W + col2W + col3W, curY + 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(31, 41, 55);
  doc.text("TOTAL ALLOWANCES", tableX + 8, curY + 14);
  doc.text(totalAllowances.toFixed(2), tableX + col1W + col2W - 8, curY + 14, { align: "right" });
  doc.text("TOTAL DEDUCTIONS", tableX + col1W + col2W + 8, curY + 14);
  doc.text(totalDeductions.toFixed(2), tableX + contentWidth - 8, curY + 14, { align: "right" });

  curY += 22;

  // Generated on & Net Pay
  curY += 22;
  const genDate = data.generated_at ? new Date(data.generated_at) : new Date();
  const dateFormatted = `${genDate.getDate()}/${genDate.getMonth() + 1}/${genDate.getFullYear()}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99); // #4B5563
  doc.text(`GENERATED ON: ${dateFormatted}`, 50, curY);

  const netPayFormatted = netPay.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(22, 163, 74); // #16A34A (green)

  const rightX = pageWidth - 50;
  doc.text(netPayFormatted, rightX, curY, { align: "right" });
  const netNumW = doc.getTextWidth(netPayFormatted);
  const rupeeX = rightX - netNumW - 9;
  drawRupeeSymbol(doc, rupeeX, curY, 10.5, [22, 163, 74]);
  doc.text("NET PAY: ", rupeeX - 2, curY, { align: "right" });

  // Footer text
  const footerY = pageHeight - 55;
  doc.setDrawColor(209, 213, 219);
  doc.line(50, footerY - 14, pageWidth - 50, footerY - 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text("THIS IS COMPUTER GENERATED PAYSLIP, SIGNATURE NOT REQUIRED", pageWidth / 2, footerY, { align: "center" });

  // Convert to Buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  // Ensure output directory exists: public/uploads/payslips/
  const safeEmpid = String(data.empid || "employee").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safePeriodId = String(data.period_id || "period").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeEmpid}_${safePeriodId}.pdf`;

  const outputDir = path.join(process.cwd(), "public", "uploads", "payslips");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fullPath = path.join(outputDir, fileName);
  fs.writeFileSync(fullPath, pdfBuffer);

  const relativeUrl = `/uploads/payslips/${fileName}`;

  return {
    fileName,
    relativeUrl,
    fullPath,
    buffer: pdfBuffer,
  };
}
