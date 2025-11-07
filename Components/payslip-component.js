// Components/PayslipComponent.js
import { useRef, useCallback } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Building2, Server } from 'lucide-react';

export default function PayslipComponent({ 
  employee, 
  payslip, 
  month, 
  year, 
  showDownloadButton = true,
  containerStyle = {},
  onDownloadComplete = null 
}) {
  const slipRef = useRef(null);

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

    const imgW = canvas.width * 0.264583;
    const imgH = canvas.height * 0.264583;

    const margin = 10;
    const availableW = pdfW - (2 * margin);
    const scale = availableW / imgW;
    const finalW = imgW * scale;
    const finalH = imgH * scale;

    const marginX = margin;
    const marginY = 5;

    pdf.addImage(imgData, "PNG", marginX, marginY, finalW, finalH);
    pdf.save(`Payslip-${employee?.empid || 'employee'}-${month}-${year}.pdf`);
    
    if (onDownloadComplete) onDownloadComplete();
  }, [employee, month, year, onDownloadComplete]);

  if (!employee || !payslip) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
        <p style={{ color: "#6B7280" }}>Loading payslip…</p>
      </div>
    );
  }

  const allowanceDetails = payslip.allowance_details ? JSON.parse(payslip.allowance_details) : [];
  const deductionDetails = payslip.deduction_details ? JSON.parse(payslip.deduction_details) : [];
  const totalCustomAllowances = allowanceDetails.reduce((total, allowance) => total + (allowance.amount || 0), 0);
  const totalCustomDeductions = deductionDetails.reduce((total, deduction) => total + (deduction.amount || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", ...containerStyle }}>
      <div
        ref={slipRef}
        style={{
          width: "100%",
          maxWidth: "900px", 
          background: "#ffffff",
          border: "1px solid #D1D5DB",
          borderRadius: "0.5rem",
          padding: "2rem", 
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          margin: "0 auto",
          minHeight: "fit-content"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>            
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Building2 size={window.innerWidth < 640 ? 32 : 48} color="#4F46E5" />
              <span style={{ fontSize: window.innerWidth < 640 ? "1rem" : "1.25rem", fontWeight: "bold", color: "#4F46E5", textTransform: "uppercase" }}>HRMS</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <h2 style={{ fontSize: window.innerWidth < 640 ? "1.25rem" : "1.5rem", fontWeight: "bold", color: "#4F46E5", textTransform: "uppercase", margin: "0" }}>PAYSLIP</h2>
              <p style={{ fontSize: "0.875rem", color: "#4B5563", textTransform: "uppercase" }}>{month} {year}</p>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem", textAlign: "center"}}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap:"0.5rem", alignItems: "center", justifyContent: "left", marginTop: "1rem" }}>
              <Server size={window.innerWidth < 640 ? 20 : 28} color="#4F46E5" />
            </div>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: window.innerWidth < 640 ? "0.875rem" : "1.5rem", fontWeight: "bold", color: "#4F46E5", textTransform: "uppercase" }}>COMPANY NAME</h1>
              <p style={{ fontSize: "0.875rem", color: "#4B5563", textTransform: "uppercase" }}>Company Address</p>
            </div>
          </div>
        </div>
        
        {/* Employee Details Section */}        
        <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "#F9FAFB", borderRadius: "0.5rem", border: "1px solid #E5E7EB" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: "600", color: "#374151", marginBottom: "0.75rem", textTransform: "uppercase" }}>Employee Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 640 ? "1fr" : "1fr 1fr", gap: "0.5rem", fontSize: "0.75rem" }}>
            <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Name:</strong> <span style={{ textTransform: "uppercase" }}>{employee.name}</span></p>
            <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Email:</strong> <span style={{ wordBreak: "break-word", fontSize: "0.7rem" }}>{employee.email}</span></p>
            <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Contact:</strong> <span style={{ textTransform: "uppercase" }}>{employee.contact_number || 'NOT PROVIDED'}</span></p>
            <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Role:</strong> <span style={{ textTransform: "uppercase" }}>{employee.role}</span></p>
            <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Position:</strong> <span style={{ textTransform: "uppercase" }}>{employee.position}</span></p>
            <p><strong style={{ textTransform: "uppercase", color: "#374151" }}>Payslip Period:</strong> <span style={{ textTransform: "uppercase" }}>{month}, {year}</span></p>
          </div>
        </div>

        {/* Bank Details Section */}
        {employee.bankDetails && (
          <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#F9FAFB", borderRadius: "0.5rem", border: "1px solid #E5E7EB" }}>
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
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #D1D5DB", marginBottom: "1.5rem" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #D1D5DB", padding: "0.75rem", backgroundColor: "#F9FAFB", fontSize: "14px", fontWeight: "600", textAlign: "left", textTransform: "uppercase", color: "#374151" }}>EARNINGS</th>
              <th style={{ border: "1px solid #D1D5DB", padding: "0.75rem", backgroundColor: "#F9FAFB", fontSize: "14px", fontWeight: "600", textAlign: "right", textTransform: "uppercase", color: "#374151" }}>AMOUNT (₹)</th>
              <th style={{ border: "1px solid #D1D5DB", padding: "0.75rem", backgroundColor: "#F9FAFB", fontSize: "14px", fontWeight: "600", textAlign: "left", textTransform: "uppercase", color: "#374151" }}>DEDUCTIONS</th>
              <th style={{ border: "1px solid #D1D5DB", padding: "0.75rem", backgroundColor: "#F9FAFB", fontSize: "14px", fontWeight: "600", textAlign: "right", textTransform: "uppercase", color: "#374151" }}>AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const earnings = [
                { name: "BASIC SALARY", amount: Number(payslip.basic_salary) }
              ];
              
              if (payslip.bonus > 0) earnings.push({ name: "BONUS", amount: Number(payslip.bonus) });
              if (payslip.hra > 0) earnings.push({ name: "HOUSE RENT ALLOWANCE", amount: Number(payslip.hra) });
              if (payslip.da > 0) earnings.push({ name: "DEARNESS ALLOWANCE", amount: Number(payslip.da) });
              
              allowanceDetails.filter(a => !['House Rent Allowance (HRA)', 'Dearness Allowance (DA)'].includes(a.name))
                .forEach(allowance => earnings.push({ name: allowance.name.toUpperCase(), amount: Number(allowance.amount) }));
              
              const maxRows = Math.max(earnings.length, deductionDetails.length);
              
              return Array.from({ length: maxRows }, (_, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textTransform: "uppercase" }}>
                    {earnings[idx]?.name || ''}
                  </td>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textAlign: "right" }}>
                    {earnings[idx] ? earnings[idx].amount.toFixed(2) : ''}
                  </td>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textTransform: "uppercase" }}>
                    {deductionDetails[idx]?.name?.toUpperCase() || ''}
                  </td>
                  <td style={{ border: "1px solid #D1D5DB", padding: "0.5rem", fontSize: "12px", textAlign: "right" }}>
                    {deductionDetails[idx] ? Number(deductionDetails[idx].amount || 0).toFixed(2) : ''}
                  </td>
                </tr>
              ));
            })()}
            
            <tr style={{ backgroundColor: "#F3F4F6" }}>
              <td style={{ border: "1px solid #D1D5DB", padding: "0.75rem", fontSize: "14px", fontWeight: "600", textTransform: "uppercase" }}>TOTAL ALLOWANCES</td>
              <td style={{ border: "1px solid #D1D5DB", padding: "0.75rem", fontSize: "14px", fontWeight: "600", textAlign: "right" }}>
                {totalCustomAllowances.toFixed(2)}
              </td>
              <td style={{ border: "1px solid #D1D5DB", padding: "0.75rem", fontSize: "14px", fontWeight: "600", textTransform: "uppercase" }}>TOTAL DEDUCTIONS</td>
              <td style={{ border: "1px solid #D1D5DB", padding: "0.75rem", fontSize: "14px", fontWeight: "600", textAlign: "right" }}>{totalCustomDeductions.toFixed(2)}</td>
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
          <p>This is computer generated payslip, signature Not required</p>
        </div>
      </div>

      {showDownloadButton && (
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
      )}
    </div>
  );
}
