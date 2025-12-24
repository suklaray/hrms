import { useState, useEffect, useCallback  } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { FileText, Download, Calendar, AlertCircle, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { getUserFromToken } from "@/lib/getUserFromToken";
import prisma from "@/lib/prisma";

export async function getServerSideProps(context) {
  const { req } = context;
  const token = req?.cookies?.token || "";
  const user = getUserFromToken(token);

  if (!user || !["superadmin", "admin", "hr"].includes(user.role)) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  let userData = null;
  try {
    userData = await prisma.users.findUnique({
      where: { empid: user.empid || user.id },
      select: {
        empid: true,
        name: true,
        email: true,
        role: true
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  return {
    props: {
      user: {
        empid: userData?.empid || user.empid,
        name: userData?.name || user.name,
        role: (userData?.role || user.role).toLowerCase(),
        email: userData?.email || user.email,
      },
    },
  };
}

export default function PayslipLists({ user }) {
  const [payslips, setPayslips] = useState([]);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();
  const itemsPerPage = 10;

// Wrap fetchPayslips with useCallback
const fetchPayslips = useCallback(async () => {
  try {
    setLoading(true);
    const response = await fetch(`/api/payslip/payslip-lists?page=${currentPage}&limit=${itemsPerPage}`, {
      credentials: "include",
    });
    
    if (response.ok) {
      const data = await response.json();
      setPayslips(data.payslips || []);
      setTotalPages(data.totalPages || 1);
    }
  } catch (error) {
    console.error("Error fetching payslips:", error);
  } finally {
    setLoading(false);
  }
}, [currentPage, itemsPerPage]);

// Update useEffect
useEffect(() => {
  fetchPayslips();
}, [fetchPayslips]);

  const handleViewPayslip = (month, year) => {
    router.push(`/payslip/payslip-preview?month=${month}&year=${year}&empid=${user.empid}`);
  };

const handleDownloadPayslip = async (month, year) => {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `/payslip/payslip-preview?month=${month}&year=${year}&empid=${user.empid}&download=true`;
    document.body.appendChild(iframe);
    
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 3000);
  } catch (error) {
    console.error('Download failed:', error);
  }
};


  const paginatedPayslips = payslips;

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <>
      <Head>
        <title>My Payslips - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Payslips</h1>
                <p className="text-gray-600">Download and view your salary statements</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Your Payslips
                </h3>
                <p className="text-sm text-gray-600">Download your monthly salary statements</p>
                {payslips.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Showing {paginatedPayslips.length} of {payslips.length} payslips
                    {totalPages > 1 && (
                      <span> (Page {currentPage} of {totalPages})</span>
                    )}
                  </p>
                )}
              </div>

              <div className="p-6">
                {message && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <p className="text-red-700">{message}</p>
                  </div>
                )}

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading payslips...</p>
                  </div>
                ) : payslips.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Payslips Available</h3>
                    <p className="text-gray-500">Your payslips will appear here once they are generated</p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              #
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Month
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Year
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Net Pay
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedPayslips.map((payslip, index) => (
                            <tr key={payslip.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(currentPage - 1) * itemsPerPage + index + 1}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 capitalize">
                                  {payslip.month}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {payslip.year}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ₹{payslip.net_pay}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {/* <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  payslip.payslip_status === 'generated' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {payslip.payslip_status === 'generated' ? 'Generated' : 'Pending'}
                                </span> */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 mb-1">
                                      Generated
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      On : {new Date(payslip.generated_on).toLocaleDateString()}
                                    </span>
                                  </div>
                                </td>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleViewPayslip(payslip.month, payslip.year)}
                                    className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </button>
                                  {/* <button
                                    onClick={() => handleDownloadPayslip(payslip.month, payslip.year)}
                                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Download
                                  </button> */}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing page {currentPage} of {totalPages}
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
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
