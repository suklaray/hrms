import { useRouter } from "next/router";
import { useEffect, useRef, useState, useCallback } from "react";
import Head from 'next/head';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Sidebar from "@/Components/empSidebar";
import { Building2 } from 'lucide-react';

export default function EmployeePayslipPreview() {
  const router = useRouter();
  const { month, year, download } = router.query;
  const [employee, setEmployee] = useState(null);
  const [payslip, setPayslip] = useState(null);
  const slipRef = useRef(null);

  useEffect(() => {
    if (!month || !year) return;

    fetch('/api/employee/payslip-details', { credentials: 'include' })
      .then(r => r.json())
      .then(setEmployee);

    fetch('/api/employee/payroll-data', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const rec = data.find(
            r => r.month === month && String(r.year) === String(year)
          );
          setPayslip(rec || null);
        }
      })
      .catch(error => {
        console.error('Error fetching payroll:', error);
        setPayslip(null);
      });
  }, [month, year]);

  const downloadPDF = useCallback(async () => {
    if (!slipRef.current) return;

    await new Promise((res) => setTimeout(res, 500));

    const canvas = await html2canvas(slipRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    const imgW = canvas.width * 0.264583;
    const imgH = canvas.height * 0.264583;

    const scale = Math.min(pdfW / imgW, pdfH / imgH);
    const finalW = imgW * scale;
    const finalH = imgH * scale;

    const marginX = (pdfW - finalW) / 2;
    const marginY = (pdfH - finalH) / 2;

    pdf.addImage(imgData, "PNG", marginX, marginY, finalW, finalH);
    pdf.save(`Payslip-${employee?.empid}-${month}-${year}.pdf`);
  }, [employee?.empid, month, year]);

  useEffect(() => {
    if (download === 'true' && payslip && employee) {
      setTimeout(() => {
        downloadPDF();
      }, 1000);
    }
  }, [download, payslip, employee, downloadPDF]);

  if (!employee || !payslip) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex justify-center items-center">
          <p className="text-gray-600">Loading payslip…</p>
        </div>
      </div>
    );
  }

  const allowanceDetails = payslip.allowance_details ? JSON.parse(payslip.allowance_details) : [];
  const deductionDetails = payslip.deduction_details ? JSON.parse(payslip.deduction_details) : [];

  const totalCustomAllowances = allowanceDetails.reduce((total, allowance) => total + (allowance.amount || 0), 0);
  const totalCustomDeductions = deductionDetails.reduce((total, deduction) => total + (deduction.amount || 0), 0);
  const pf = payslip.pf || 0;
  const ptax = payslip.ptax || 0;
  const esic = payslip.esic || 0;

  const totalDeductionsWithFixed = totalCustomDeductions + (pf + ptax + esic);

  return (
    <>
      <Head>
        <title>Payslip Preview - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 p-8 flex flex-col items-center">
        <nav className="self-start mb-4 text-sm text-gray-600">
          <button onClick={() => router.push('/employee/emp-payslip')} className="text-gray-600 hover:text-gray-800">
            Payslips & Docs
          </button>
          <span> / </span>
          <span className="text-gray-900 font-medium">Payslip {month} {year}</span>
        </nav>

        <div
  ref={slipRef}
  style={{
    width: "100%",
    maxWidth: "800px",
    background: "#ffffff",
    border: "1px solid #D1D5DB",
    borderRadius: "0.5rem",
    padding: "1rem",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
  }}
>
  {/* Header section */}
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

  {/* Employee details */}
  <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 640 ? "1fr" : "1fr 1fr", gap: "0.5rem", fontSize: window.innerWidth < 640 ? "0.75rem" : "0.875rem", marginBottom: "1.5rem" }}>
    <p><strong style={{ textTransform: "uppercase" }}>Employee ID:</strong> <span style={{ textTransform: "uppercase" }}>{employee.empid}</span></p>
    <p><strong style={{ textTransform: "uppercase" }}>Name:</strong> <span style={{ textTransform: "uppercase" }}>{employee.name}</span></p>
    <p><strong style={{ textTransform: "uppercase" }}>Email:</strong> <span style={{ wordBreak: "break-all" }}>{employee.email}</span></p>
    <p><strong style={{ textTransform: "uppercase" }}>Contact:</strong> <span style={{ textTransform: "uppercase" }}>{employee.contact_number || 'NOT PROVIDED'}</span></p>
    <p><strong style={{ textTransform: "uppercase" }}>Role:</strong> <span style={{ textTransform: "uppercase" }}>{employee.role}</span></p>
    <p><strong style={{ textTransform: "uppercase" }}>Position:</strong> <span style={{ textTransform: "uppercase" }}>{employee.position}</span></p>
  </div>

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
    </>
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
