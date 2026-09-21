"use client";

import { Suspense } from "react";
// pages/payroll/payslip-preview/[empid].js
import { useRouter } from "@/lib/compatRouter";
import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import PayslipComponent from "@/Components/payslip-component";



function PayslipPreview() {
  const router = useRouter();
  const { empid, month, year, download } = router.query;
  const [employee, setEmployee] = useState(null);
  const [payslip, setPayslip] = useState(null);

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

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F3F4F6" }}>
      <SideBar />

      <div style={{ flex: 1, padding: "2rem" }}>
        {/* Breadcrumb Navigation */}
        <nav style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "#6B7280" }}>
          <button onClick={() => router.push('/payroll/payroll-view')} style={{ color: "#6B7280", textDecoration: "none", cursor: "pointer" }}>
            Payroll Management
          </button>
          <span> / </span>
          <button onClick={() => router.push(`/hr/payroll/${empid}`)} style={{ color: "#6B7280", textDecoration: "none", cursor: "pointer" }}>
            {employee?.name || empid}
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


export default function ClientPageWrapper(props: any) {
  return (
    <Suspense fallback={null}>
      <PayslipPreview {...props} />
    </Suspense>
  );
}
