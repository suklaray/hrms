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
  const itemsPerPage = 10;

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

      <main className="flex-1 p-8 overflow-auto">
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 uppercase">Employee Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-gray-500 uppercase font-medium">Employee ID:</span>
                <span className="sm:ml-2 font-medium uppercase">{empid}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-gray-500 uppercase font-medium">Name:</span>
                <span className="sm:ml-2 font-medium uppercase">{employee.name}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-gray-500 uppercase font-medium">Email:</span>
                <span className="sm:ml-2 font-medium break-all">{employee.email}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-gray-500 uppercase font-medium">Contact:</span>
                <span className="sm:ml-2 font-medium uppercase">{employee.contact_number || 'NOT PROVIDED'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-gray-500 uppercase font-medium">Role:</span>
                <span className="sm:ml-2 font-medium uppercase">{employee.role}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-gray-500 uppercase font-medium">Position:</span>
                <span className="sm:ml-2 font-medium uppercase">{employee.position || 'NOT SPECIFIED'}</span>
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
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase">Period</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase">Basic Salary</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase">HRA</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase">DA</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase">Allowances</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase">Deductions</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase">Net Pay</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length > 0 ? (() => {
                  const totalPages = Math.ceil(records.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const paginatedRecords = records.slice(startIndex, startIndex + itemsPerPage);
                  
                  return paginatedRecords.map((row, index) => (
                    <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-3 sm:py-4 px-3 sm:px-6">
                        <div className="font-medium text-gray-900 text-xs sm:text-sm uppercase">{row.month} {row.year}</div>
                      </td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 font-medium text-xs sm:text-sm">₹{parseFloat(row.basic_salary).toFixed(2)}</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">₹{parseFloat(row.hra).toFixed(2)}</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">₹{parseFloat(row.da).toFixed(2)}</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-green-600 font-medium text-xs sm:text-sm">₹{parseFloat(row.allowances).toFixed(2)}</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-red-600 font-medium text-xs sm:text-sm">₹{parseFloat(row.deductions).toFixed(2)}</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6">
                        <span className="text-sm sm:text-lg font-bold text-blue-600">₹{parseFloat(row.net_pay).toFixed(2)}</span>
                      </td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6">
                        <a
                          href={`/hr/payroll/payslip-preview/${empid}?month=${row.month}&year=${row.year}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium uppercase"
                        >
                          <FaEye className="mr-1 sm:mr-2 text-xs sm:text-sm" />
                          <span className="hidden sm:inline">View Payslip</span>
                          <span className="sm:hidden">View</span>
                        </a>
                      </td>
                    </tr>
                  ));
                })() : (
                  <tr>
                    <td colSpan="8" className="py-8 sm:py-12 px-4 sm:px-6 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 sm:w-16 h-12 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-6 sm:w-8 h-6 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium text-sm sm:text-base uppercase">No payroll records found</p>
                        <p className="text-gray-400 text-xs sm:text-sm mt-1 uppercase">Payroll records will appear here once generated</p>
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
