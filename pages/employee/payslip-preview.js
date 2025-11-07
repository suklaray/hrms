import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from 'next/head';
import Sidebar from "@/Components/empSidebar";
import PayslipComponent from "@/Components/payslip-component";

export default function EmployeePayslipPreview() {
  const router = useRouter();
  const { month, year, download } = router.query;
  const [employee, setEmployee] = useState(null);
  const [payslip, setPayslip] = useState(null);

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

  return (
    <>
      <Head>
        <title>Payslip Preview - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />

        <div className="flex-1 p-8">
          <nav className="mb-4 text-sm text-gray-600">
            <button onClick={() => router.push('/employee/emp-payslip')} className="text-gray-600 hover:text-gray-800">
              Payslips & Docs
            </button>
            <span> / </span>
            <span className="text-gray-900 font-medium">Payslip {month} {year}</span>
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
    </>
  );
}
