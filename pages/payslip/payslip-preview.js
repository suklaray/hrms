import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import PayslipComponent from "@/Components/payslip-component";

export default function PayslipPreview() {
  const router = useRouter();
  const { month, year, empid, download } = router.query;
  const [employee, setEmployee] = useState(null);
  const [payslip, setPayslip] = useState(null);

  useEffect(() => {
    if (!empid || !month || !year) return;

    fetch(`/api/payslip/user-details?empid=${empid}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setEmployee);

    fetch(`/api/payslip/user-payroll?empid=${empid}&month=${month}&year=${year}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setPayslip)
      .catch(error => {
        console.error('Error fetching payroll:', error);
        setPayslip(null);
      });
  }, [empid, month, year]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F3F4F6" }}>
      <SideBar />

      <div style={{ flex: 1, padding: "2rem" }}>
        <nav style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "#6B7280" }}>
          <button onClick={() => router.push('/payslip/payslip-lists')} style={{ color: "#6B7280", textDecoration: "none", cursor: "pointer" }}>
            My Payslips
          </button>
          <span> / </span>
          <span style={{ color: "#111827", fontWeight: "500" }}>Payslip {month} {year}</span>
        </nav>

        <PayslipComponent 
          employee={employee}
          payslip={payslip}
          month={month}
          year={year}
          showDownloadButton={true}
        />
      </div>
    </div>
  );
}
