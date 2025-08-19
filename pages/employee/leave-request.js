import { useEffect, useState } from 'react';
import axios from 'axios';
import EmpSidebar from '@/Components/empSidebar';
import { Calendar, Clock, FileText, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Leave Request Form */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
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
                      {leaveTypes.map((type) => (
                        <option key={type.id} value={type.type_name.replace('_', ' ')}>
                          {type.type_name.replace('_', ' ')}
                        </option>
                      ))}
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
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
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

            {/* Leave Status Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Leave Requests
                </h3>
                <p className="text-sm text-gray-600">Your request history</p>
              </div>
              <div className="p-6">
                {leaveStatusList.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {leaveStatusList.map((leave, index) => {
                      const getStatusIcon = (status) => {
                        switch (status) {
                          case 'Approved':
                            return <CheckCircle className="w-4 h-4 text-green-600" />;
                          case 'Rejected':
                            return <XCircle className="w-4 h-4 text-red-600" />;
                          default:
                            return <AlertCircle className="w-4 h-4 text-yellow-600" />;
                        }
                      };

                      const getStatusColor = (status) => {
                        switch (status) {
                          case 'Approved':
                            return 'bg-green-50 border-green-200 text-green-800';
                          case 'Rejected':
                            return 'bg-red-50 border-red-200 text-red-800';
                          default:
                            return 'bg-yellow-50 border-yellow-200 text-yellow-800';
                        }
                      };

                      return (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 ${getStatusColor(leave.status)}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium">{leave.leave_type}</span>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(leave.status)}
                              <span className="text-xs font-medium">{leave.status}</span>
                            </div>
                          </div>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">From:</span> {new Date(leave.from_date).toLocaleDateString()}</p>
                            <p><span className="font-medium">To:</span> {new Date(leave.to_date).toLocaleDateString()}</p>
                            {leave.reason && (
                              <p><span className="font-medium">Reason:</span> {leave.reason.substring(0, 50)}{leave.reason.length > 50 ? '...' : ''}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No leave requests found</p>
                    <p className="text-sm text-gray-400">Your submitted requests will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
