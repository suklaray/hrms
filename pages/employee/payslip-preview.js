import { useRouter } from "next/router";
import { useEffect, useRef, useState, useCallback } from "react";
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

  const totalCustomAllowances = allowanceDetails.reduce((total, allowance) => total + (allowance.value || 0), 0);
  const totalCustomDeductions = deductionDetails.reduce((total, deduction) => total + (deduction.value || 0), 0);

  const pf = payslip.pf || 0;
  const ptax = payslip.ptax || 0;
  const esic = payslip.esic || 0;

  const totalDeductionsWithFixed = totalCustomDeductions + (pf + ptax + esic);

  return (
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
          className="w-full max-w-4xl bg-white border border-gray-200 rounded-lg p-8 shadow-lg"
        >
          <div className="flex justify-between mb-6">
            <div className="flex items-center gap-2">
              <Building2 size={48} className="text-indigo-600" />
              <span className="text-xl font-bold text-indigo-600">HRMS</span>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-indigo-600">PAYSLIP</h1>
              <p className="text-sm text-gray-600">{month} {year}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <p><strong>Employee ID:</strong> {employee.empid}</p>
            <p><strong>Name:</strong> {employee.name}</p>
            <p><strong>Email:</strong> {employee.email}</p>
            <p><strong>Contact:</strong> {employee.contact_number}</p>
            <p><strong>Role:</strong> {employee.role}</p>
            <p><strong>Position:</strong> {employee.position}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <h2 className="font-semibold text-indigo-600 mb-2">Earnings</h2>
              <div className="space-y-1">
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
              <h2 className="font-semibold text-indigo-600 mb-2">Deductions</h2>
              <div className="space-y-1">
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

          <div className="mt-6 flex justify-between">
            <p className="font-medium text-gray-600">
              Generated on: {new Date(payslip.generated_on).toLocaleDateString()}
            </p>
            <p className="text-xl font-bold text-green-600">
              Net Pay: ₹{Number(payslip.net_pay).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="border-t border-gray-200 mt-8 pt-4 text-center text-xs text-gray-500">
            <p>Company Name · Address line 1 · Address line 2 · Contact</p>
          </div>
        </div>

        <button
          onClick={downloadPDF}
          className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>₹{Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );
}