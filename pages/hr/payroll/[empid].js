//generate payroll for each employee (individual)
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { FaEye, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function EmployeePayroll() {
  const router = useRouter();
  const { empid } = router.query;
  const [records, setRecords] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
    <>
      <Head>
        <title>Employee Payroll - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <SideBar />

      <main className="flex-1 p-8">
        {/* Modern Header */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <button onClick={() => router.push('/hr/payroll/payroll-view')} className="hover:text-blue-600 transition-colors">
              Payroll Management
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">{employee?.name || empid} Details</span>
          </nav>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Employee Payroll Details
          </h1>
          <p className="text-gray-600">Complete payroll history and records</p>
        </div>

        {employee ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Employee Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Employee ID:</span>
                <span className="ml-2 font-medium">{empid}</span>
              </div>
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium">{employee.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <span className="ml-2 font-medium">{employee.email}</span>
              </div>
              <div>
                <span className="text-gray-500">Contact:</span>
                <span className="ml-2 font-medium">{employee.contact_number || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-gray-500">Role:</span>
                <span className="ml-2 font-medium">{employee.role}</span>
              </div>
              <div>
                <span className="text-gray-500">Position:</span>
                <span className="ml-2 font-medium">{employee.position || 'Not specified'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900">Payroll History</h3>
            <p className="text-gray-600 mt-1">Complete salary records and payments</p>
            {records.length > 0 && (() => {
              const totalPages = Math.ceil(records.length / itemsPerPage);
              const startIndex = (currentPage - 1) * itemsPerPage;
              const paginatedRecords = records.slice(startIndex, startIndex + itemsPerPage);
              
              return (
                <p className="text-sm text-gray-600 mt-2">
                  Showing {paginatedRecords.length} of {records.length} records
                  {totalPages > 1 && (
                    <span> (Page {currentPage} of {totalPages})</span>
                  )}
                </p>
              );
            })()}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Period</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Basic Salary</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">HRA</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">DA</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Allowances</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Deductions</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Net Pay</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length > 0 ? (() => {
                  const totalPages = Math.ceil(records.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const paginatedRecords = records.slice(startIndex, startIndex + itemsPerPage);
                  
                  return paginatedRecords.map((row, index) => (
                    <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-900">{row.month} {row.year}</div>
                      </td>
                      <td className="py-4 px-6 text-gray-700 font-medium">₹{row.basic_salary}</td>
                      <td className="py-4 px-6 text-gray-700">₹{row.hra}</td>
                      <td className="py-4 px-6 text-gray-700">₹{row.da}</td>
                      <td className="py-4 px-6 text-green-600 font-medium">₹{row.allowances}</td>
                      <td className="py-4 px-6 text-red-600 font-medium">₹{row.deductions}</td>
                      <td className="py-4 px-6">
                        <span className="text-lg font-bold text-blue-600">₹{row.net_pay}</span>
                      </td>
                      <td className="py-4 px-6">
                        <a
                          href={`/hr/payroll/payslip-preview/${empid}?month=${row.month}&year=${row.year}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <FaEye className="mr-2" />
                          View Payslip
                        </a>
                      </td>
                    </tr>
                  ));
                })() : (
                  <tr>
                    <td colSpan="8" className="py-12 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium">No payroll records found</p>
                        <p className="text-gray-400 text-sm mt-1">Payroll records will appear here once generated</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {records.length > 0 && (() => {
            const totalPages = Math.ceil(records.length / itemsPerPage);
            
            const handlePageChange = (page) => {
              setCurrentPage(page);
            };
            
            return totalPages > 1 ? (
              <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {currentPage} of {totalPages} ({records.length} total records)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <FaChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <FaChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </main>
    </div>
    </>
  );
}
