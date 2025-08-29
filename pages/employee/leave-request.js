import { useEffect, useState } from 'react';
import axios from 'axios';
import EmpSidebar from '@/Components/empSidebar';
import { Calendar, Clock, FileText, Send, CheckCircle, XCircle, AlertCircle, History, Plus } from 'lucide-react';

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
        .get(`/api/leave/status?empid=${user.empid}`)
        .then(res => setLeaveStatusList(res.data));
    });
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'attachment') {
      setForm(prev => ({ ...prev, attachment: files[0] }));
    } else if (name === 'leave_type') {
      const selectedType = leaveTypes.find(type => type.type_name.replace(/_/g, ' ') === value);
      setSelectedLeaveType(selectedType);
      setForm(prev => ({ ...prev, [name]: value, to_date: '' })); // Reset to_date when leave type changes
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
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
    const formData = new FormData();

    for (const key in form) {
      formData.append(key, form[key]);
    }

    try {
      await axios.post('/api/leave/request', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });

      alert('Leave request submitted successfully');
      setForm(prev => ({
        ...prev,
        leave_type: '',
        from_date: '',
        to_date: '',
        reason: '',
        attachment: null,
      }));

      const res = await axios.get(`/api/leave/status?empid=${form.empid}`);
      setLeaveStatusList(res.data);
    } catch (err) {
      console.error(err);
      alert('Submission failed');
    }
  };

  return (
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Apply for Leave
                </h3>
                <p className="text-sm text-gray-600">Submit your leave request</p>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee Name</label>
                    <input
                      type="text"
                      value={form.name}
                      readOnly
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                    <input
                      type="text"
                      value={form.empid}
                      readOnly
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                  {leaveTypes.length > 0 ? (
                    <select
                      name="leave_type"
                      value={form.leave_type}
                      onChange={handleChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                    <input
                      type="date"
                      name="from_date"
                      value={form.from_date}
                      onChange={handleChange}
                      min={getTodayDate()}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                    <input
                      type="date"
                      name="to_date"
                      value={form.to_date}
                      onChange={handleChange}
                      min={form.from_date || getTodayDate()}
                      max={getMaxToDate()}
                      disabled={!form.from_date || !selectedLeaveType}
                      required
                      className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        !form.from_date || !selectedLeaveType ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                    {selectedLeaveType && form.from_date && (
                      <p className="text-xs text-blue-600 mt-1">
                        Maximum {selectedLeaveType.max_days} days allowed. Last selectable date: {new Date(getMaxToDate()).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Leave</label>
                  <textarea
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    placeholder="Please provide a detailed reason for your leave request"
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label>
                  <input
                    type="file"
                    name="attachment"
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Leave Request</span>
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
                          switch (status) {
                            case 'Approved':
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approved
                                </span>
                              );
                            case 'Rejected':
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejected
                                </span>
                              );
                            default:
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
                                {new Date(leave.applied_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate" title={leave.reason}>
                                {leave.reason || 'No reason provided'}
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
  );
}
