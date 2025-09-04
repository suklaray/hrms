import { useEffect, useState } from 'react';
import axios from 'axios';
import Head from 'next/head';
import EmpSidebar from '@/Components/empSidebar';
import { Calendar, Clock, FileText, Send, CheckCircle, XCircle, AlertCircle, History, Plus, Eye, Download } from 'lucide-react';

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

  useEffect(() => {
    axios.get('/api/leave/types').then(res => setLeaveTypes(res.data));

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

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    // Clear error for this field
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
    if (form.reason.length > 200) newErrors.reason = 'Reason cannot exceed 200 characters';
    
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

      alert('Leave request submitted successfully! Check the History tab to view your pending request.');
      setForm(prev => ({
        ...prev,
        leave_type: '',
        from_date: '',
        to_date: '',
        reason: '',
        attachment: null,
      }));
      setErrors({});

      const res = await axios.get('/api/leave/status', { withCredentials: true });
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
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border border-blue-100">
              <div className="p-8 border-b border-blue-100 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <FileText className="w-6 h-6 mr-3" />
                  Apply for Leave
                </h3>
                <p className="text-blue-100 mt-1">Submit your leave request with ease</p>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Employee Name</label>
                    <input
                      type="text"
                      value={form.name}
                      readOnly
                      className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 font-medium shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Employee ID</label>
                    <input
                      type="text"
                      value={form.empid}
                      readOnly
                      className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 font-medium shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Leave Type <span className="text-red-500 text-lg">*</span>
                  </label>
                  {leaveTypes.length > 0 ? (
                    <select
                      name="leave_type"
                      value={form.leave_type}
                      onChange={handleChange}
                      className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm ${
                        errors.leave_type ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <option value="">Select Leave Type</option>
                      {leaveTypes.map((type) => {
                        const displayName = type.type_name.replace(/_/g, ' ');
                        return (
                          <option key={type.id} value={displayName}>
                            {displayName} ({type.max_days} days - {type.paid ? 'Paid' : 'Unpaid'})
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-center">
                      No leave types available. Contact HR to set up leave types.
                    </div>
                  )}
                  {errors.leave_type && <p className="text-red-500 text-sm mt-1">{errors.leave_type}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      From Date <span className="text-red-500 text-lg">*</span>
                    </label>
                    <input
                      type="date"
                      name="from_date"
                      value={form.from_date}
                      onChange={handleChange}
                      min={getTodayDate()}
                      className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm ${
                        errors.from_date ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 hover:border-blue-300'
                      }`}
                    />
                    {errors.from_date && <p className="text-red-500 text-sm mt-1 font-medium">{errors.from_date}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      To Date <span className="text-red-500 text-lg">*</span>
                    </label>
                    <input
                      type="date"
                      name="to_date"
                      value={form.to_date}
                      onChange={handleChange}
                      min={form.from_date || getTodayDate()}
                      max={getMaxToDate()}
                      disabled={!form.from_date || !selectedLeaveType}
                      className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 shadow-sm ${
                        errors.to_date ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 hover:border-blue-300'
                      } ${
                        !form.from_date || !selectedLeaveType ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                      }`}
                    />
                    {errors.to_date && <p className="text-red-500 text-sm mt-1 font-medium">{errors.to_date}</p>}
                    {selectedLeaveType && form.from_date && (
                      <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg">
                        📅 Maximum {selectedLeaveType.max_days} days allowed. Last selectable: {new Date(getMaxToDate()).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Reason for Leave <span className="text-red-500 text-lg">*</span>
                  </label>
                  <textarea
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    placeholder="Please provide a detailed reason for your leave request..."
                    rows={5}
                    maxLength={200}
                    className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm resize-none ${
                      errors.reason ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <div>
                      {errors.reason && <p className="text-red-500 text-sm font-medium">{errors.reason}</p>}
                    </div>
                    <p className={`text-xs font-medium ${
                      form.reason.length > 180 ? 'text-red-500' : 'text-gray-500'
                    }`}>{form.reason.length}/200 characters</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Attachment (Optional)</label>
                  <input
                    type="file"
                    name="attachment"
                    accept=".pdf"
                    onChange={handleChange}
                    className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
                      errors.attachment ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  />
                  <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg">
                    📄 Only PDF files are allowed (Max 10MB)
                  </p>
                  {errors.attachment && <p className="text-red-500 text-sm mt-1 font-medium">{errors.attachment}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg font-semibold text-lg ${
                    loading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transform hover:-translate-y-0.5'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Submit Leave Request</span>
                    </>
                  )}
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
              <div className="overflow-x-auto">
                {leaveStatusList.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied On</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leaveStatusList.map((leave, index) => {
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
                          <tr key={index} className={`hover:bg-gray-50 transition-colors ${
                            isPastLeave ? 'bg-gray-50 text-gray-500' : 'bg-white'
                          }`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{leave.leave_type}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{fromDate.toLocaleDateString()}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{toDate.toLocaleDateString()}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{days} day{days > 1 ? 's' : ''}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(leave.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(leave.from_date).toLocaleDateString()}
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
                                      className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
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
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
