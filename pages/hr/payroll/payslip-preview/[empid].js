import { useRouter } from "next/router";
import { useEffect, useRef, useState, useCallback } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import SideBar from "@/Components/SideBar";
import { Building2 } from 'lucide-react';

export default function PayslipPreview() {
  const router = useRouter();
  const { empid, month, year, download } = router.query;
  const [employee, setEmployee] = useState(null);
  const [payslip, setPayslip] = useState(null);
  const slipRef = useRef(null);

  useEffect(() => {
    if (!empid || !month || !year) return;

    fetch(`/api/hr/employees/payroll-details?empid=${empid}`)
      .then(r => r.json())
      .then(setEmployee);

    fetch(`/api/hr/payroll/get?empid=${empid}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const rec = data.find(
            r => r.month === month && String(r.year) === String(year)
          );
          setPayslip(rec || null);
        } else {
          console.error('Payroll data error:', data);
          setPayslip(null);
        }
      })
      .catch(error => {
        console.error('Error fetching payroll:', error);
        setPayslip(null);
      });
  }, [empid, month, year]);

  const downloadPDF = useCallback(async () => {
    if (!slipRef.current) return;

    await new Promise((res) => setTimeout(res, 500));

    const canvas = await html2canvas(slipRef.current, { 
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    // Convert canvas size from px to mm with better scaling
    const imgW = canvas.width * 0.264583;
    const imgH = canvas.height * 0.264583;

    // Calculate scale to fit width with minimal margins
    const margin = 10; // 10mm margin on each side
    const availableW = pdfW - (2 * margin);
    const scale = availableW / imgW;
    const finalW = imgW * scale;
    const finalH = imgH * scale;

    // Position with minimal top margin
    const marginX = margin;
    const marginY = 5; // Minimal top margin

    pdf.addImage(imgData, "PNG", marginX, marginY, finalW, finalH);
    pdf.save(`Payslip-${empid}-${month}-${year}.pdf`);
  }, [empid, month, year]);

  useEffect(() => {
    if (download === 'true' && payslip && employee) {
      setTimeout(() => {
        downloadPDF();
      }, 1000);
    }
  }, [download, payslip, employee, downloadPDF]);

  if (!employee || !payslip) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p style={{ color: "#6B7280" }}>Loading payslip…</p>
      </div>
    );
  }

  // Parse allowance and deduction details
  const allowanceDetails = payslip.allowance_details ? JSON.parse(payslip.allowance_details) : [];
  const deductionDetails = payslip.deduction_details ? JSON.parse(payslip.deduction_details) : [];

  // Calculate totals from details
  const totalCustomAllowances = allowanceDetails.reduce((total, allowance) => total + (allowance.amount || 0), 0);
  const totalCustomDeductions = deductionDetails.reduce((total, deduction) => total + (deduction.amount || 0), 0);

  // Calculate total deductions from custom deductions only
  const totalDeductionsWithFixed = totalCustomDeductions;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F3F4F6" }}>
      <SideBar /> {/* Add the Sidebar component here */}

      <div style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Breadcrumb Navigation */}
        <nav style={{ alignSelf: "flex-start", marginBottom: "1rem", fontSize: "0.875rem", color: "#6B7280" }}>
          <button onClick={() => router.push('/hr/payroll/payroll-view')} style={{ color: "#6B7280", textDecoration: "none", cursor: "pointer" }}>
            Payroll Management
          </button>
          <span> / </span>
          <button onClick={() => router.push(`/hr/payroll/${empid}`)} style={{ color: "#6B7280", textDecoration: "none", cursor: "pointer" }}>
            {employee?.name || empid}
          </button>
          <span> / </span>
          <span style={{ color: "#111827", fontWeight: "500" }}>Payslip {month} {year}</span>
        </nav>
        <div
          ref={slipRef}
          style={{
            width: "100%",
            maxWidth: "800px",
            background: "#ffffff",
            border: "1px solid #D1D5DB",
            borderRadius: "0.5rem",
            padding: "1.5rem",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            margin: "0 auto"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Building2 size={window.innerWidth < 640 ? 32 : 48} color="#4F46E5" />
                <span style={{ fontSize: window.innerWidth < 640 ? "1rem" : "1.25rem", fontWeight: "bold", color: "#4F46E5", textTransform: "uppercase" }}>HRMS</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <h1 style={{ fontSize: window.innerWidth < 640 ? "1.25rem" : "1.5rem", fontWeight: "bold", color: "#4F46E5", textTransform: "uppercase" }}>PAYSLIP</h1>
                <p style={{ fontSize: "0.875rem", color: "#4B5563", textTransform: "uppercase" }}>{month} {year}</p>
              </div>
            </div>
          </div>

          {/* Employee Details Section */}
          
            <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "#F9FAFB", borderRadius: "0.5rem", border: "1px solid #E5E7EB" }}>
              <h3 style={{ fontSize: "0.875rem", fontWeight: "600", color: "#374151", marginBottom: "0.75rem", textTransform: "uppercase" }}>Employee Details</h3>
              <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 640 ? "1fr" : "1fr 1fr", gap: "0.5rem", fontSize: "0.75rem" }}>
                <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Name:</strong> <span style={{ textTransform: "uppercase" }}>{employee.name}</span></p>
              <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Email:</strong> <span style={{ wordBreak: "break-all" }}>{employee.email}</span></p>
              <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Contact:</strong> <span style={{ textTransform: "uppercase" }}>{employee.contact_number || 'NOT PROVIDED'}</span></p>
              <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Role:</strong> <span style={{ textTransform: "uppercase" }}>{employee.role}</span></p>
              <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Position:</strong> <span style={{ textTransform: "uppercase" }}>{employee.position}</span></p>
              <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Payslip Period:</strong> <span style={{ textTransform: "uppercase" }}>{month}, {year}</span></p>
            </div>
            </div>
         

          {/* Bank Details Section */}
          {employee.bankDetails && (
            <div style={{ marginTop: "1.5rem",  marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#F9FAFB", borderRadius: "0.5rem", border: "1px solid #E5E7EB" }}>
              <h3 style={{ fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.75rem", textTransform: "uppercase" }}>Bank Details</h3>
              <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 640 ? "1fr" : "1fr 1fr", gap: "0.5rem", fontSize: "0.75rem" }}>
                <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Account Holder:</strong> <span style={{ textTransform: "uppercase" }}>{employee.bankDetails.account_holder_name || 'N/A'}</span></p>
                <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Bank Name:</strong> <span style={{ textTransform: "uppercase" }}>{employee.bankDetails.bank_name || 'N/A'}</span></p>
                <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Branch:</strong> <span style={{ textTransform: "uppercase" }}>{employee.bankDetails.branch_name || 'N/A'}</span></p>
                <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Account Number:</strong> <span>{employee.bankDetails.account_number || 'N/A'}</span></p>
                <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>IFSC Code:</strong> <span style={{ textTransform: "uppercase" }}>{employee.bankDetails.ifsc_code || 'N/A'}</span></p>
                </div>
            </div>
          )}

          {/* Earnings and Deductions Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #D1D5DB",  marginBottom: "1.5rem" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #D1D5DB", padding: "0.75rem", backgroundColor: "#F9FAFB", fontSize: "14px", fontWeight: "600", textAlign: "left", textTransform: "uppercase", color: "#374151" }}>EARNINGS</th>
                <th style={{ border: "1px solid #D1D5DB", padding: "0.75rem", backgroundColor: "#F9FAFB", fontSize: "14px", fontWeight: "600", textAlign: "right", textTransform: "uppercase", color: "#374151" }}>AMOUNT (₹)</th>
                <th style={{ border: "1px solid #D1D5DB", padding: "0.75rem", backgroundColor: "#F9FAFB", fontSize: "14px", fontWeight: "600", textAlign: "left", textTransform: "uppercase", color: "#374151" }}>DEDUCTIONS</th>
                <th style={{ border: "1px solid #D1D5DB", padding: "0.75rem", backgroundColor: "#F9FAFB", fontSize: "14px", fontWeight: "600", textAlign: "right", textTransform: "uppercase", color: "#374151" }}>AMOUNT (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textTransform: "uppercase" }}>BASIC SALARY</td>
                <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textAlign: "right" }}>{Number(payslip.basic_salary).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textTransform: "uppercase" }}>{deductionDetails.length > 0 ? deductionDetails[0]?.name.toUpperCase() : ''}</td>
                <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textAlign: "right" }}>{deductionDetails.length > 0 ? Number(deductionDetails[0]?.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ''}</td>
              </tr>
              {payslip.hra > 0 && (
                <tr>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textTransform: "uppercase" }}>HOUSE RENT ALLOWANCE</td>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textAlign: "right" }}>{Number(payslip.hra).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textTransform: "uppercase" }}>{deductionDetails[1] ? deductionDetails[1].name.toUpperCase() : ''}</td>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textAlign: "right" }}>{deductionDetails[1] ? Number(deductionDetails[1].amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ''}</td>
                </tr>
              )}
              {payslip.da > 0 && (
                <tr>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textTransform: "uppercase" }}>DEARNESS ALLOWANCE</td>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textAlign: "right" }}>{Number(payslip.da).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textTransform: "uppercase" }}>{deductionDetails[2] ? deductionDetails[2].name.toUpperCase() : ''}</td>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textAlign: "right" }}>{deductionDetails[2] ? Number(deductionDetails[2].amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ''}</td>
                </tr>
              )}
              {payslip.bonus > 0 && (
                <tr>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textTransform: "uppercase" }}>BONUS</td>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textAlign: "right" }}>{Number(payslip.bonus).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px" }}></td>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px" }}></td>
                </tr>
              )}
              {allowanceDetails.filter(a => !['House Rent Allowance (HRA)', 'Dearness Allowance (DA)'].includes(a.name)).map((allowance, idx) => {
                const deductionIdx = idx + (payslip.hra > 0 ? 1 : 0) + (payslip.da > 0 ? 1 : 0) + 1;
                return (
                  <tr key={idx}>
                    <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textTransform: "uppercase" }}>{allowance.name.toUpperCase()}</td>
                    <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textAlign: "right" }}>{Number(allowance.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textTransform: "uppercase" }}>{deductionDetails[deductionIdx] ? deductionDetails[deductionIdx].name.toUpperCase() : ''}</td>
                    <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textAlign: "right" }}>{deductionDetails[deductionIdx] ? Number(deductionDetails[deductionIdx].amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ''}</td>
                  </tr>
                );
              })}
              <tr style={{ backgroundColor: "#F3F4F6" }}>
                <td style={{ border: "1px solid #D1D5DB", padding: "0.75rem", fontSize: "14px", fontWeight: "600", textTransform: "uppercase" }}>TOTAL ALLOWANCES</td>
                <td style={{ border: "1px solid #D1D5DB", padding: "0.75rem", fontSize: "14px", fontWeight: "600", textAlign: "right" }}>{totalCustomAllowances.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                <td style={{ border: "1px solid #D1D5DB", padding: "0.75rem", fontSize: "14px", fontWeight: "600", textTransform: "uppercase" }}>TOTAL DEDUCTIONS</td>
                <td style={{ border: "1px solid #D1D5DB", padding: "0.75rem", fontSize: "14px", fontWeight: "600", textAlign: "right" }}>{totalCustomDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: window.innerWidth < 640 ? "column" : "row", justifyContent: "space-between", gap: "1rem" }}>
            <p style={{ fontWeight: "500", color: "#4B5563", fontSize: window.innerWidth < 640 ? "0.75rem" : "0.875rem", textTransform: "uppercase" }}>
              Generated on: {new Date(payslip.generated_on).toLocaleDateString()}
            </p>
            <p style={{ fontSize: window.innerWidth < 640 ? "1rem" : "1.25rem", fontWeight: "bold", color: "#15803D", textTransform: "uppercase" }}>
              Net Pay: ₹{Number(payslip.net_pay).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          

          <div style={{ borderTop: "1px solid #D1D5DB", marginTop: "2rem", paddingTop: "1rem", textAlign: "center", fontSize: window.innerWidth < 640 ? "0.625rem" : "0.75rem", color: "#6B7280", textTransform: "uppercase" }}>
            <p>Company Name · Address line 1 · Address line 2 · Contact</p>
          </div>
        </div>

        <button
          onClick={downloadPDF}
          style={{
            marginTop: "1.5rem",
            padding: window.innerWidth < 640 ? "0.75rem 1rem" : "0.5rem 1.5rem",
            backgroundColor: "#4F46E5",
            color: "#fff",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontSize: window.innerWidth < 640 ? "0.875rem" : "1rem",
            fontWeight: "500",
            textTransform: "uppercase",
            width: window.innerWidth < 640 ? "100%" : "auto"
          }}
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  const numValue = Number(value) || 0;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
      <span style={{ textTransform: "uppercase", fontSize: "inherit", wordBreak: "break-word" }}>{label}</span>
      <span style={{ fontSize: "inherit", fontWeight: "500", minWidth: "fit-content" }}>₹{numValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );
}
