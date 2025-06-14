//generate payroll for each employee (individual)
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import SideBar from "@/Components/SideBar";
import { FaEye } from 'react-icons/fa';

export default function EmployeePayroll() {
  const router = useRouter();
  const { empid } = router.query;
  const [records, setRecords] = useState([]);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    if (empid) {
      // Fetch payroll records
      fetch(`/api/hr/payroll/get?empid=${empid}`)
        .then((res) => res.json())
        .then((data) => setRecords(data));

      // Fetch employee details
      fetch(`/api/hr/employees/payroll-details?empid=${empid}`)
        .then((res) => res.json())
        .then((data) => setEmployee(data))
        .catch((err) => console.error('Failed to fetch employee details:', err));
    }
  }, [empid]);

  return (
    <div className="flex">
      <SideBar />

      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-semibold text-indigo-700 mb-6">
          Employee Payroll Details
        </h1>

        {employee ? (
          <div className="bg-white shadow rounded-lg p-6 mb-8 border border-indigo-200">
            <h2 className="text-xl font-semibold text-indigo-600 mb-4">Employee Information</h2>
            <div className="grid grid-cols-2 gap-4 text-gray-700">
              <p><strong>ID:</strong> {empid}</p>
              <p><strong>Name:</strong> {employee.name}</p>
              <p><strong>Email:</strong> {employee.email}</p>
              <p><strong>Contact:</strong> {employee.contact_number}</p>
              <p><strong>Role:</strong> {employee.role}</p>
              <p><strong>Position:</strong> {employee.position}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Loading employee info...</p>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow border border-indigo-200">
            <thead className="bg-indigo-100 text-indigo-800 text-sm uppercase">
              <tr>
                <th className="py-3 px-4 text-left">Month</th>
                <th className="py-3 px-4 text-left">Year</th>
                <th className="py-3 px-4 text-left">Basic</th>
                <th className="py-3 px-4 text-left">HRA</th>
                <th className="py-3 px-4 text-left">DA</th>
                <th className="py-3 px-4 text-left">Allowances</th>
                <th className="py-3 px-4 text-left">Deductions</th>
                <th className="py-3 px-4 text-left">Net Pay</th>
                <th className="py-3 px-4 text-left">Actions</th>

              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {records.length > 0 ? (
                records.map((row, index) => (
                  <tr key={index} className="border-t hover:bg-indigo-50 transition">
                    <td className="py-3 px-4">{row.month}</td>
                    <td className="py-3 px-4">{row.year}</td>
                    <td className="py-3 px-4">₹{row.basic_salary}</td>
                    <td className="py-3 px-4">₹{row.hra}</td>
                    <td className="py-3 px-4">₹{row.da}</td>
                    <td className="py-3 px-4">₹{row.allowances}</td>
                    <td className="py-3 px-4">₹{row.deductions}</td>
                    <td className="py-3 px-4 font-semibold text-indigo-700">₹{row.net_pay}</td>
                    <td className="py-3 px-4 space-x-2">
                        <a
                          href={`/hr/payroll/payslip-preview/${empid}?month=${row.month}&year=${row.year}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className=" text-blue-700 px-2 py-1 rounded-full text-sm"
                        >
                          <FaEye className="inline-block mr-1" />
                        </a>
                      </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-6 px-4 text-center text-gray-500">
                    No payroll records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
