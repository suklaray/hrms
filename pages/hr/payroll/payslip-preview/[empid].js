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
  const totalCustomAllowances = allowanceDetails.reduce((total, allowance) => total + (allowance.value || 0), 0);
  const totalCustomDeductions = deductionDetails.reduce((total, deduction) => total + (deduction.value || 0), 0);

  // Include PF, PTAX, and ESIC in deductions
  const pf = payslip.pf || 0;
  const ptax = payslip.ptax || 0;
  const esic = payslip.esic || 0;

  // Calculate total deductions including PF, PTAX, and ESIC
  const totalDeductionsWithFixed = totalCustomDeductions + (pf + ptax + esic);

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
            width: "800px",
            background: "#ffffff",
            border: "1px solid #D1D5DB",
            borderRadius: "0.5rem",
            padding: "2rem",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Building2 size={48} color="#4F46E5" />
              <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#4F46E5" }}>HRMS</span>
            </div>
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
                {payslip.hra_include && <Row label="HRA" value={payslip.hra} />}
                {payslip.da_include && <Row label="DA" value={payslip.da} />}
                {payslip.bonus > 0 && <Row label="BONUS" value={payslip.bonus} />}
                {allowanceDetails.map((allowance, idx) => (
                  <Row key={idx} label={allowance.name.toUpperCase()} value={allowance.value} />
                ))}
              </div>
            </div>

            <div>
              <h2 style={{ fontWeight: "600", color: "#4F46E5", marginBottom: "0.5rem" }}>Deductions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {(payslip.pf_include || pf > 0) && <Row label="PF" value={pf} />}
                {(payslip.ptax_include || ptax > 0) && <Row label="PTAX" value={ptax} />}
                {(payslip.esic_include || esic > 0) && <Row label="ESIC" value={esic} />}
                {deductionDetails.map((deduction, idx) => (
                  <Row key={idx} label={deduction.name.toUpperCase()} value={deduction.value} />
                ))}
                {(pf === 0 && ptax === 0 && esic === 0 && deductionDetails.length === 0) && (
                  <Row label="NO DEDUCTIONS" value={0} />
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between" }}>
            <p style={{ fontWeight: "500", color: "#4B5563" }}>
              Generated on: {new Date(payslip.generated_on).toLocaleDateString()}
            </p>
            <p style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#15803D" }}>
              Net Pay: ₹{Number(payslip.net_pay).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      <span>₹{Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );
}
