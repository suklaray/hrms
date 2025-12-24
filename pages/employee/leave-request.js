import { useEffect, useState } from 'react';
import axios from 'axios';
import Head from 'next/head';
import EmpSidebar from '@/Components/empSidebar';
import { Calendar, Clock, FileText, Send, CheckCircle, XCircle, AlertCircle, History, Plus, Eye, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { set } from 'date-fns';

export default function LeaveRequest() {
  const [form, setForm] = useState({
    empid: '',
    name: '',
    leave_type: '',
    from_date: '',
    to_date: '',
    reason: '',
    attachment: null,
  });

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveStatusList, setLeaveStatusList] = useState([]);
  const [activeTab, setActiveTab] = useState('apply');
  const [selectedLeaveType, setSelectedLeaveType] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [dayCount, setDayCount] = useState(0);

  useEffect(() => {
    axios.get('/api/leave/types').then(res => setLeaveTypes(res.data));
    
    // Fetch leave balances
    axios.get('/api/leave/balances', { withCredentials: true })
      .then(res => setLeaveBalances(res.data))
      .catch(err => console.error('Error fetching leave balances:', err));

    axios.get('/api/auth/employee/me', { withCredentials: true }).then(res => {
      const user = res.data.user;
      setForm(prev => ({
        ...prev,
        empid: user.empid,
        name: user.name,
        email: user.email,
      }));

      axios
        .get('/api/leave/status', { withCredentials: true })
        .then(res => setLeaveStatusList(res.data));
    });
  }, []);



  const calculateDays = () => {
    if (form.from_date && form.to_date) {
      const fromDate = new Date(form.from_date);
      const toDate = new Date(form.to_date);
      
      if (toDate >= fromDate) {
        if (form.from_date === form.to_date) {
          setDayCount(1);
        } else {
          const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
          setDayCount(days);
        }
      } else {
        setDayCount(0);
      }
    } else {
      setDayCount(0);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
   if (name === 'attachment') {
  const file = files?.[0];

  if (!file) {
    setForm(prev => ({ ...prev, attachment: null }));
    return;
  }

  if (file.type !== 'application/pdf') {
    setErrors(prev => ({ ...prev, attachment: 'Only PDF files are allowed' }));
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setErrors(prev => ({ ...prev, attachment: 'File size must be under 5MB' }));
    return;
  }

  // VALID FILE
  setErrors(prev => ({ ...prev, attachment: '' }));
  setForm(prev => ({ ...prev, attachment: file }));
    } else if (name === 'leave_type') {
      const selectedType = leaveTypes.find(type => type.type_name.replace(/_/g, ' ') === value);
      setSelectedLeaveType(selectedType);
      setForm(prev => ({ ...prev, [name]: value, to_date: '' }));
    } else if (name === 'from_date') {
      setForm(prev => ({ ...prev, [name]: value, to_date: value })); // Auto-set to_date to same date
    } else if (name === 'reason') {
      if (value.length > 200) {
        setErrors(prev => ({ ...prev, reason: 'Reason cannot exceed 200 characters' }));
        return;
      }
      setForm(prev => ({ ...prev, [name]: value }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    
    // Recalculate days when dates change
    if (name === 'from_date' || name === 'to_date') {
      setTimeout(calculateDays, 100);
    }
  };


  const validateForm = () => {
    const newErrors = {};
    
    if (!form.leave_type) newErrors.leave_type = 'Leave type is required';
    if (!form.from_date) newErrors.from_date = 'From date is required';
    if (!form.to_date) newErrors.to_date = 'To date is required';
    if (!form.reason.trim()) newErrors.reason = 'Reason is required';
    if (form.reason.length > 200) newErrors.reason = 'Reason cannot exceed 200 characters';
     const file = form.attachment;
  if (file) {
    if (file.type !== 'application/pdf') {
      newErrors.attachment = 'Only PDF files are allowed';
    } else if (file.size > 5 * 1024 * 1024) {
      newErrors.attachment = 'File size should be less than 5MB';
    }
  }
  if (errors.attachment) return false;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getMaxToDate = () => {
    if (!form.from_date || !selectedLeaveType) return '';
    
    const fromDate = new Date(form.from_date);
    const maxDate = new Date(fromDate);
    maxDate.setDate(fromDate.getDate() + selectedLeaveType.max_days - 1);
    
    return maxDate.toISOString().split('T')[0];
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    const formData = new FormData();
    for (const key in form) {
      formData.append(key, form[key]);
    }

    try {
      await axios.post('/api/leave/request', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });

      toast.success('Leave request submitted successfully! Check the History tab to view your pending request.');
      setForm(prev => ({
        ...prev,
        leave_type: '',
        from_date: '',
        to_date: '',
        applied_at: '',
        reason: '',
        attachment: null,
      }));
      setErrors({});

      const res = await axios.get('/api/leave/status', { withCredentials: true });
      setLeaveStatusList(res.data);
      setActiveTab('history');
    } catch (err) {
      console.error(err);
      toast.error('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <>
      <Head>
        <title>Leave Request - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
      <EmpSidebar />
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
              <p className="text-gray-600">Apply for leave and track your requests</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Leave Balance Display - Add this right after the form header */}
        {leaveBalances.length > 0 && (
          <div className="mx-8 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">Your Leave Balance</h4>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg border border-blue-100">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-blue-800 uppercase">Leave Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-blue-800 uppercase">Total Days</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-blue-800 uppercase">Used</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-blue-800 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {leaveBalances.map((balance, index) => (
                    <tr key={index} className="hover:bg-blue-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {balance.type_name.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {balance.max_days}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {balance.used}
                      </td>
                      <td className="px-4 py-2 text-sm font-semibold text-green-600">
                        {balance.remaining}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


        <div className="p-6">
          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('apply')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'apply'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Apply Leave
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'history'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <History className="w-4 h-4 inline mr-2" />
                  Leave History
                </button>

              </nav>
            </div>
          </div>

          {activeTab === 'apply' ? (
          /* Leave Request Form */
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-blue-600 rounded-t-xl">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Apply for Leave
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                  <input
                    type="text"
                    value={form.name}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={form.empid}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>
              </div> */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="leave_type"
                  value={form.leave_type}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-lg ${
                    errors.leave_type ? 'border-red-400' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((type) => {
                    const displayName = type.type_name.replace(/_/g, ' ');
                    return (
                      <option key={type.id} value={displayName}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
                {errors.leave_type && <p className="text-red-500 text-sm mt-1">{errors.leave_type}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="from_date"
                    value={form.from_date}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-lg ${
                      errors.from_date ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                  {errors.from_date && <p className="text-red-500 text-sm mt-1">{errors.from_date}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="to_date"
                    value={form.to_date}
                    onChange={handleChange}
                    min={form.from_date}
                    className={`w-full p-2 border rounded-lg ${
                      errors.to_date ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              {/* Day Count Display */}
              {/* {(form.from_date && form.to_date) && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-900">Leave Duration:</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-blue-600">{dayCount}</span>
                      <span className="text-sm text-blue-700 ml-1">{dayCount === 1 ? 'day' : 'days'}</span>
                    </div>
                  </div>
                  {dayCount > 0 && (
                    <p className="text-xs text-blue-600 mt-2">
                      From {new Date(form.from_date).toLocaleDateString()} to {new Date(form.to_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )} */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  placeholder="Enter reason for leave..."
                  rows={3}
                  maxLength={200}
                  className={`w-full p-2 border rounded-lg resize-none ${
                    errors.reason ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                <div className="flex justify-between mt-1">
                  {errors.reason && <p className="text-red-500 text-sm">{errors.reason}</p>}
                  <p className="text-xs text-gray-500">{form.reason.length}/200</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (Optional)</label>
                <input
                  type="file"
                  name="attachment"
                  accept=".pdf"
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                {errors.attachment && <p className="text-red-500 text-sm mt-1">{errors.attachment}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 px-4 rounded-lg font-medium cursor-pointer ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </form>
          </div>
        ) : (
            /* Leave History Table */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <History className="w-5 h-5 mr-2" />
                  Leave History
                </h3>
                <p className="text-sm text-gray-600">Track all your leave requests and their status</p>
              </div>
              {/* Pagination logic */}
              {(() => {
                const totalPages = Math.ceil(leaveStatusList.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedLeaves = leaveStatusList.slice(startIndex, startIndex + itemsPerPage);
                
                const handlePageChange = (page) => {
                  setCurrentPage(page);
                };

                return (
                  <>
                    {/* Results Summary */}
                    {leaveStatusList.length > 0 && (
                      <div className="px-6 py-3 border-b border-gray-100">
                        <p className="text-sm text-gray-600">
                          Showing {paginatedLeaves.length} of {leaveStatusList.length} leave requests
                          {totalPages > 1 && (
                            <span> (Page {currentPage} of {totalPages})</span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    <div className="overflow-x-auto">
                      {leaveStatusList.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-600 to-indigo-600">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Leave Type</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">From Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">To Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Days</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Applied On</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Document</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedLeaves.map((leave, index) => {
                        const fromDate = new Date(leave.from_date);
                        const toDate = new Date(leave.to_date);
                        const today = new Date();
                        const isPastLeave = toDate < today;
                        const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

                        const getStatusBadge = (status) => {
                          if (status === 'Approved') {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approved
                              </span>
                            );
                          } else if (status === 'Rejected') {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejected
                              </span>
                            );
                          } else if (status === 'Leave Completed') {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </span>
                            );
                          } else if (status.startsWith('On Leave')) {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <Clock className="w-3 h-3 mr-1" />
                                {status}
                              </span>
                            );
                          } else {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pending
                              </span>
                            );
                          }
                        };

                        return (
                          <tr key={index} className={`hover:bg-blue-50 transition-all duration-200 border-b border-gray-100 ${
                            isPastLeave ? 'bg-gray-50 text-gray-500' : 'bg-white'
                          }`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{leave.leave_type}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{fromDate.toLocaleDateString('en-GB')}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{toDate.toLocaleDateString('en-GB')}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{days} day{days > 1 ? 's' : ''}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(leave.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {leave.applied_at ? new Date(leave.applied_at).toLocaleDateString('en-GB') : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate" title={leave.reason}>
                                {leave.reason || 'No reason provided'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {leave.attachment ? (
                                  <>
                                    <button
                                      onClick={() => window.open(leave.attachment, '_blank')}
                                      className="p-1 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                                      title="View Document"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = leave.attachment;
                                        link.download = `leave-document-${leave.id}`;
                                        link.click();
                                      }}
                                      className="p-1 text-green-600 hover:text-green-800 transition-colors"
                                      title="Download Document"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-xs">No document</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Leave History</h3>
                    <p className="text-gray-500">Your leave requests will appear here once submitted</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing page {currentPage} of {totalPages} ({leaveStatusList.length} total requests)
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
            </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
