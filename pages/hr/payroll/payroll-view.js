import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import SideBar from "@/Components/SideBar";

import { Search, Calendar, Users, Eye, Download, Filter, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PayrollView() {

  const [payrolls, setPayrolls] = useState([]);
  const [filteredPayrolls, setFilteredPayrolls] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ month: '', year: '' });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchPayrolls = async () => {
      try {
        const res = await fetch('/api/hr/payroll/all');
        const data = await res.json();
        setPayrolls(data);
        setFilteredPayrolls(data);
      } catch (error) {
        console.error('Error fetching payrolls:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayrolls();
  }, []);

  useEffect(() => {
    let filtered = payrolls;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.empid?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date
    if (dateFilter.month) {
      filtered = filtered.filter(item => item.month === dateFilter.month);
    }
    if (dateFilter.year) {
      filtered = filtered.filter(item => item.year.toString() === dateFilter.year);
    }

    // Filter by tab
    if (activeTab === 'recent') {
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear();
      filtered = filtered.filter(item => {
        return item.month === currentMonth && item.year === currentYear;
      });
    }

    setFilteredPayrolls(filtered);
    setCurrentPage(1);
  }, [payrolls, searchTerm, dateFilter, activeTab]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredPayrolls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayrolls = filteredPayrolls.slice(startIndex, startIndex + itemsPerPage);

  const getStats = () => {
    const total = payrolls.length;
    const thisMonth = payrolls.filter(item => {
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear();
      return item.month === currentMonth && item.year === currentYear;
    }).length;
    
    // Calculate total amount based on current filters
    let amountData;
    let periodText;
    
    // If month filter is applied, show monthly amount
    if (dateFilter.month) {
      const year = dateFilter.year || new Date().getFullYear();
      amountData = filteredPayrolls;
      periodText = `${dateFilter.month} ${year}`;
    } else if (activeTab === 'recent') {
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear();
      amountData = payrolls.filter(item => item.month === currentMonth && item.year === currentYear);
      periodText = `${currentMonth} ${currentYear}`;
    } else {
      // Default to current month when nothing is selected
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear();
      amountData = payrolls.filter(item => item.month === currentMonth && item.year === currentYear);
      periodText = `${currentMonth} ${currentYear}`;
    }
    
    const totalAmount = amountData.reduce((sum, item) => sum + (parseFloat(item.net_pay) || 0), 0);
    return { total, thisMonth, totalAmount, periodText };
  };

  const stats = getStats();

  return (
    <>
      <Head>
        <title>Payroll Management - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-indigo-600" />
                Payroll Management
              </h1>
              <p className="text-gray-600">View and manage employee payroll records</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Records</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Month</p>
                  <p className="text-3xl font-bold text-green-600">{stats.thisMonth}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-3xl font-bold text-indigo-600">₹{stats.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.periodText}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <span className="text-2xl font-bold text-indigo-600">₹</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Payrolls ({payrolls.length})
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'recent'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Current Month ({stats.thisMonth})
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-64"
                />
              </div>

              <select
                value={dateFilter.month}
                onChange={(e) => setDateFilter(prev => ({ ...prev, month: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Months</option>
                {['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>

              <select
                value={dateFilter.year}
                onChange={(e) => setDateFilter(prev => ({ ...prev, year: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Years</option>
                {[new Date().getFullYear(), 2024, 2023, 2022, 2021, 2020].filter((year, index, arr) => arr.indexOf(year) === index).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <div className="ml-auto text-sm text-gray-600">
                Showing {paginatedPayrolls.length} of {filteredPayrolls.length} records
                {totalPages > 1 && (
                  <span> (Page {currentPage} of {totalPages})</span>
                )}
              </div>
            </div>
          </div>

          {/* Payroll Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading payroll records...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedPayrolls.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">ID: {item.empid}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.position}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.month} {item.year}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-green-600">₹{parseFloat(item.net_pay).toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.payslip_status === 'generated' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.payslip_status === 'generated' ? 'Generated' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.generated_on ? new Date(item.generated_on).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Link href={`/hr/payroll/${item.empid}`}>
                              <button className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer">
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                            </Link>
                            <Link href={`/hr/payroll/payslip-preview/${item.empid}?month=${item.month}&year=${item.year}`}>
                              <button className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                                <Download className="w-4 h-4" />
                                Download
                              </button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginatedPayrolls.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center text-gray-500 py-8">
                          {searchTerm || dateFilter.month || dateFilter.year ? 'No payrolls match your filters.' : 'No payroll records found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {currentPage} of {totalPages} ({filteredPayrolls.length} total records)
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
                          ? 'bg-indigo-600 text-white'
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
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
