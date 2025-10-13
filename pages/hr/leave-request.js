import { useEffect, useState } from 'react';
import axios from 'axios';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import { Calendar, Clock, FileText, Send, CheckCircle, XCircle, AlertCircle, History, Plus } from 'lucide-react';

export default function HRLeaveRequest() {
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

  useEffect(() => {
    axios.get('/api/leave/types').then(res => setLeaveTypes(res.data));

    axios.get('/api/auth/me', { withCredentials: true }).then(res => {
      const user = res.data.user;
      setForm(prev => ({
        ...prev,
        empid: user.empid,
        name: user.name,
        email: user.email,
      }));

      axios
        .get('/api/hr/leave/status', { withCredentials: true })
        .then(res => setLeaveStatusList(res.data))
        .catch(err => {
          console.error('Error fetching leave status:', err);
          setLeaveStatusList([]);
        });
    });
  }, []);

  const calculateLeaveDays = (fromDate, toDate) => {
    if (!fromDate || !toDate) return 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    if (name === 'attachment') {
      const file = files[0];
      if (file && file.type !== 'application/pdf') {
        setErrors(prev => ({ ...prev, attachment: 'Only PDF files are allowed' }));
        return;
      }
      setForm(prev => ({ ...prev, attachment: file }));
    } else if (name === 'leave_type') {
      const selectedType = leaveTypes.find(type => type.type_name.replace(/_/g, ' ') === value);
      setSelectedLeaveType(selectedType);
      setForm(prev => ({ ...prev, [name]: value, to_date: '' }));
    } else if (name === 'from_date') {
      setForm(prev => ({ ...prev, [name]: value }));
      if (form.to_date && value > form.to_date) {
        setForm(prev => ({ ...prev, to_date: '' }));
      }
    } else if (name === 'to_date') {
      if (selectedLeaveType && form.from_date) {
        const leaveDays = calculateLeaveDays(form.from_date, value);
        if (leaveDays > selectedLeaveType.max_days) {
          setErrors(prev => ({ ...prev, to_date: `Maximum ${selectedLeaveType.max_days} days allowed` }));
          return;
        }
      }
      setForm(prev => ({ ...prev, [name]: value }));
    } else if (name === 'reason') {
      if (value.length > 200) {
        setErrors(prev => ({ ...prev, reason: 'Reason cannot exceed 200 characters' }));
        return;
      }
      setForm(prev => ({ ...prev, [name]: value }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.leave_type) newErrors.leave_type = 'Leave type is required';
    if (!form.from_date) newErrors.from_date = 'From date is required';
    if (!form.to_date) newErrors.to_date = 'To date is required';
    if (!form.reason.trim()) newErrors.reason = 'Reason is required';
    
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
      await axios.post('/api/hr/leave/request', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });

      alert('HR leave request submitted successfully! Awaiting admin approval.');
      setForm(prev => ({
        ...prev,
        leave_type: '',
        from_date: '',
        to_date: '',
        reason: '',
        attachment: null,
      }));
      setErrors({});

      const res = await axios.get('/api/hr/leave/status', { withCredentials: true });
      setLeaveStatusList(res.data);
      setActiveTab('history');
    } catch (err) {
      console.error(err);
      alert('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>HR Leave Request - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">HR Leave Management</h1>
            <p className="text-gray-600">Apply for leave (requires admin approval)</p>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('apply')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'apply'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
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
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <History className="w-4 h-4 inline mr-2" />
                    Leave History
                  </button>
                </nav>
              </div>
            </div>

            {activeTab === 'apply' ? (
              <div className="bg-white rounded-2xl shadow-lg border">
                <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <FileText className="w-6 h-6 mr-3" />
                    Apply for Leave (HR)
                  </h3>
                  <p className="text-blue-100 mt-1">HR leaves require admin/superadmin approval</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={form.name}
                        readOnly
                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                      <input
                        type="text"
                        value={form.empid}
                        readOnly
                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Leave Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="leave_type"
                      value={form.leave_type}
                      onChange={handleChange}
                      className={`w-full p-3 border rounded-lg ${errors.leave_type ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Select Leave Type</option>
                      {leaveTypes.map((type) => (
                        <option key={type.id} value={type.type_name.replace(/_/g, ' ')}>
                          {type.type_name.replace(/_/g, ' ')} (Max: {type.max_days} days)
                        </option>
                      ))}
                    </select>
                    {errors.leave_type && <p className="text-red-500 text-sm mt-1">{errors.leave_type}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        From Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="from_date"
                        value={form.from_date}
                        onChange={handleChange}
                        min={getTodayDate()}
                        onKeyDown={(e) => e.preventDefault()}
                        className={`w-full p-3 border rounded-lg ${errors.from_date ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.from_date && <p className="text-red-500 text-sm mt-1">{errors.from_date}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        To Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="to_date"
                        value={form.to_date}
                        onChange={handleChange}
                        min={form.from_date || getTodayDate()}
                        max={getMaxToDate()}
                        onKeyDown={(e) => e.preventDefault()}
                        className={`w-full p-3 border rounded-lg ${errors.to_date ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.to_date && <p className="text-red-500 text-sm mt-1">{errors.to_date}</p>}
                      {form.from_date && form.to_date && (
                        <p className="text-blue-600 text-sm mt-1">
                          Total days: {calculateLeaveDays(form.from_date, form.to_date)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="reason"
                      value={form.reason}
                      onChange={handleChange}
                      rows="4"
                      maxLength="200"
                      className={`w-full p-3 border rounded-lg ${errors.reason ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Please provide reason for leave..."
                    />
                    <div className="flex justify-between mt-1">
                      {errors.reason && <p className="text-red-500 text-sm">{errors.reason}</p>}
                      <p className="text-gray-500 text-sm">{form.reason.length}/200 characters</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (PDF only)</label>
                    <input
                      type="file"
                      name="attachment"
                      accept=".pdf"
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                    {errors.attachment && <p className="text-red-500 text-sm mt-1">{errors.attachment}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <Clock className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 mr-2" />
                    )}
                    {loading ? 'Submitting...' : 'Submit Leave Request'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold">Leave History</h3>
                  {leaveStatusList.length > 0 && (() => {
                    const totalPages = Math.ceil(leaveStatusList.length / itemsPerPage);
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedData = leaveStatusList.slice(startIndex, startIndex + itemsPerPage);
                    
                    return (
                      <p className="text-sm text-gray-600 mt-2">
                        Showing {paginatedData.length} of {leaveStatusList.length} leave requests
                        {totalPages > 1 && (
                          <span> (Page {currentPage} of {totalPages})</span>
                        )}
                      </p>
                    );
                  })()}
                </div>
                <div className="overflow-x-auto">
                  {leaveStatusList.length > 0 ? (
                    <>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(() => {
                            const totalPages = Math.ceil(leaveStatusList.length / itemsPerPage);
                            const startIndex = (currentPage - 1) * itemsPerPage;
                            const paginatedData = leaveStatusList.slice(startIndex, startIndex + itemsPerPage);
                            
                            return paginatedData.map((leave) => (
                              <tr key={leave.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {leave.leave_type}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(leave.from_date).toLocaleDateString()} - {new Date(leave.to_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {calculateLeaveDays(leave.from_date, leave.to_date)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                    leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {leave.status === 'Approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                                    {leave.status === 'Rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                    {leave.status === 'Pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                                    {leave.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{leave.reason}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                      
                      {/* Pagination */}
                      {(() => {
                        const totalPages = Math.ceil(leaveStatusList.length / itemsPerPage);
                        
                        return totalPages > 1 ? (
                          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                              Showing page {currentPage} of {totalPages} ({leaveStatusList.length} total requests)
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  currentPage === 1
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                Previous
                              </button>
                              
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
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
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  currentPage === totalPages
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Leave History</h3>
                      <p className="text-gray-500">Your leave requests will appear here once submitted</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}