import { useEffect, useState } from "react";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";
import { Users, CheckCircle, Clock, DollarSign, Calendar, Eye, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {toast} from 'react-toastify';

export default function GeneratePayrollPage() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, generated: 0, pending: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState(''); // Add search state
  const router = useRouter();
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/hr/employees");
        if (!res.ok) throw new Error("Failed to fetch employees");
        const { employees = [] } = await res.json();
        setEmployees(employees);
        
        // Calculate stats
        const total = employees.length;
        const generated = employees.filter(emp => emp.payrollGenerated).length;
        const pending = total - generated;
        setStats({ total, generated, pending });
      } catch (err) {
        console.error(err);
        toast.error("Failed to load employees.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  useEffect(() => {
    const { status, empid } = router.query;
    if (status === "success" && empid) {
      toast.success(`Payroll generated for Employee ID: ${empid}`);
    }
  }, [router.query]);

  const handleGeneratePayroll = (empid) => {
    router.push(`/hr/payroll/form/${empid}`);
  };

  const getCurrentMonth = () => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  // Updated filtering logic to include search
  const filteredEmployees = employees.filter(emp => {
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'generated' && emp.payrollGenerated) ||
      (statusFilter === 'pending' && !emp.payrollGenerated);
    
    const matchesSearch = searchTerm === '' ||
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const StatCard = ({ title, value, icon: Icon, color, bgColor, onClick, isActive }) => (
    <div 
      className={`${bgColor} rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 cursor-pointer transition-all duration-200 ${isActive ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Generate Payroll - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar handleLogout={() => {}} />
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <button onClick={() => router.push('/hr/payroll/payroll-view')} className="hover:text-indigo-600 transition-colors">
                Payroll Management
              </button>
              <span>/</span>
              <span className="text-gray-900 font-medium">Generate Payroll</span>
            </nav>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payroll Generation</h1>
                <p className="text-gray-600 text-sm sm:text-base">Generate payroll for {getCurrentMonth()}</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{getCurrentMonth()}</span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <StatCard
                title="Total Employees"
                value={stats.total}
                icon={Users}
                color="bg-blue-500"
                bgColor="bg-white"
                filter="all"
                isActive={statusFilter === 'all'}
                onClick={() => handleFilterChange('all')}
              />
              <StatCard
                title="Payroll Generated"
                value={stats.generated}
                icon={CheckCircle}
                color="bg-green-500"
                bgColor="bg-white"
                filter="generated"
                isActive={statusFilter === 'generated'}
                onClick={() => handleFilterChange('generated')}
              />
              <StatCard
                title="Pending Generation"
                value={stats.pending}
                icon={Clock}
                color="bg-orange-500"
                bgColor="bg-white"
                filter="pending"
                isActive={statusFilter === 'pending'}
                onClick={() => handleFilterChange('pending')}
              />
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search employees by name, ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Employee List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Employee Payroll Status
                </h2>
                {filteredEmployees.length > 0 && (() => {
                  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
                  
                  return (
                    <p className="text-sm text-gray-600 mt-2">
                      Showing {paginatedEmployees.length} of {filteredEmployees.length} employees
                      {totalPages > 1 && (
                        <span> (Page {currentPage} of {totalPages})</span>
                      )}
                    </p>
                  );
                })()}
              </div>

              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500">Loading employees...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Contact</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Last Payment</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Current Month</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
                        
                        return paginatedEmployees.map((emp) => (
                          <tr key={emp.empid} className="hover:bg-gray-50">
                            <td className="px-4 sm:px-6 py-4">
                              <div className="flex items-center">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                                </div>
                                <div className="ml-3 sm:ml-4">
                                  <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                                  <div className="text-xs sm:text-sm text-gray-500">ID: {emp.empid}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                              <div className="text-sm text-gray-900">{emp.email}</div>
                              <div className="text-sm text-gray-500">{emp.phone}</div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                              <div className="text-sm text-gray-900">
                                {emp.lastPaymentDate ? new Date(emp.lastPaymentDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Never'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {emp.lastPaymentDate ? new Date(emp.lastPaymentDate).toLocaleDateString() : 'No previous payment'}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 text-indigo-500 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{getCurrentMonth()}</div>
                                  <div className="text-xs text-gray-500">Payment Period</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              {emp.payslipStatus === 'generated' ? (
                                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  <span className="hidden sm:inline">Generated</span>
                                  <span className="sm:hidden">Gen</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                  <Clock className="w-3 h-3 mr-1" />
                                  <span className="hidden sm:inline">Pending</span>
                                  <span className="sm:hidden">Pend</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              <button
                                onClick={() => handleGeneratePayroll(emp.empid)}
                                className="inline-flex items-center px-2 sm:px-3 py-2 border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-xs sm:text-sm leading-4 font-medium rounded-md transition-colors cursor-pointer"
                              >
                                <span className="mr-1">₹</span>
                                <span className="hidden sm:inline">Generate</span>
                                <span className="sm:hidden">Gen</span>
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Pagination */}
              {!isLoading && (() => {
                const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
                
                const handlePageChange = (page) => {
                  setCurrentPage(page);
                };
                
                return totalPages > 1 ? (
                  <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700">
                      Showing page {currentPage} of {totalPages} ({filteredEmployees.length} total employees)
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
                        <ChevronLeft className="w-4 h-4" />
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
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
