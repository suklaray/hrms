import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import SideBar from "@/Components/SideBar";
import Image from 'next/image';

export default function PayslipPreview() {
  const router = useRouter();
  const { empid, month, year } = router.query;
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
      .then(rows => {
        const rec = rows.find(
          r => r.month === month && String(r.year) === String(year)
        );
        setPayslip(rec || null);
      });
  }, [empid, month, year]);

  const downloadPDF = async () => {
    if (!slipRef.current) return;

    await new Promise((res) => setTimeout(res, 500));

    const canvas = await html2canvas(slipRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    // Convert canvas size from px to mm
    const imgW = canvas.width * 0.264583; // 1px = 0.264583mm
    const imgH = canvas.height * 0.264583;

    // Calculate scaled image size to fit inside A4 while preserving aspect ratio
    const scale = Math.min(pdfW / imgW, pdfH / imgH);
    const finalW = imgW * scale;
    const finalH = imgH * scale;

    // Center the image
    const marginX = (pdfW - finalW) / 2;
    const marginY = (pdfH - finalH) / 2;

    pdf.addImage(imgData, "PNG", marginX, marginY, finalW, finalH);
    pdf.save(`Payslip-${empid}-${month}-${year}.pdf`);
  };

  if (!employee || !payslip) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p style={{ color: "#6B7280" }}>Loading payslip…</p>
      </div>
    );
  }

  // Ensure allowances and deductions are arrays
  const allowances = Array.isArray(payslip.allowances) ? payslip.allowances : [];
  const deductions = Array.isArray(payslip.deductions) ? payslip.deductions : [];

  // Filter allowances and deductions based on inclusion status
  const filteredAllowances = allowances.filter(allowance => allowance.include);
  const filteredDeductions = deductions.filter(deduction => deduction.include);

  // Calculate total allowances and total deductions
  const totalAllowances = filteredAllowances.reduce((total, allowance) => total + (allowance.value || 0), 0);
  const totalDeductions = filteredDeductions.reduce((total, deduction) => total + (deduction.value || 0), 0);

  // Include PF, PTAX, and ESIC in deductions
  const pf = payslip.pf || 0;
  const ptax = payslip.ptax || 0;
  const esic = payslip.esic || 0;

  // Calculate total deductions including PF, PTAX, and ESIC
  const totalDeductionsWithFixed = totalDeductions + (pf + ptax + esic);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F3F4F6" }}>
      <SideBar /> {/* Add the Sidebar component here */}

      <div style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          ref={slipRef}
          style={{
            width: "800px",
            background: "#ffffff",
            border: "1px solid #D1D5DB",
            borderRadius: "0.5rem",
            padding: "2rem",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <Image src="/profile_icon.jpg" alt="Logo" width={48} height={48} />
            <div style={{ textAlign: "right" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#4F46E5" }}>PAYSLIP</h1>
              <p style={{ fontSize: "0.875rem", color: "#4B5563" }}>{month} {year}</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            <p><strong>Employee ID:</strong> {employee.empid}</p>
            <p><strong>Name:</strong> {employee.name}</p>
            <p><strong>Email:</strong> {employee.email}</p>
            <p><strong>Contact:</strong> {employee.contact_number}</p>
            <p><strong>Role:</strong> {employee.role}</p>
            <p><strong>Position:</strong> {employee.position}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", fontSize: "0.875rem" }}>
            <div>
              <h2 style={{ fontWeight: "600", color: "#4F46E5", marginBottom: "0.5rem" }}>Earnings</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <Row label="BASIC SALARY" value={payslip.basic_salary} />
                <Row label="HRA" value={payslip.hra} />
                <Row label="BONUS" value={payslip.bonus} />
                <Row label="DA" value={payslip.da} />
                <Row label="OTHER ALLOWANCES" value={totalAllowances} />
              </div>
            </div>

            <div>
              <h2 style={{ fontWeight: "600", color: "#4F46E5", marginBottom: "0.5rem" }}>Deductions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <Row label="PF" value={pf} />
                <Row label="PTAX" value={ptax} />
                <Row label="ESIC" value={esic} />
                <Row label="OTHER DEDUCTIONS" value={totalDeductions} />
                <Row label="TOTAL DEDUCTIONS" value={totalDeductionsWithFixed} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between" }}>
            <p style={{ fontWeight: "500", color: "#4B5563" }}>
              Generated on: {new Date(payslip.generated_on).toLocaleDateString()}
            </p>
            <p style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#15803D" }}>
              Net Pay: ₹{payslip.net_pay.toLocaleString("en-IN")}
            </p>
          </div>

          <div style={{ borderTop: "1px solid #D1D5DB", marginTop: "2rem", paddingTop: "1rem", textAlign: "center", fontSize: "0.75rem", color: "#6B7280" }}>
            <p>Company Name · Address line 1 · Address line 2 · Contact</p>
          </div>
        </div>

        <button
          onClick={downloadPDF}
          style={{
            marginTop: "1.5rem",
            padding: "0.5rem 1.5rem",
            backgroundColor: "#4F46E5",
            color: "#fff",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer"
          }}
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <span>₹{Number(value).toLocaleString("en-IN")}</span>
    </div>
  );
}
