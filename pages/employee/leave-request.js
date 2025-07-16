import { useEffect, useState } from 'react';
import axios from 'axios';
import EmpSidebar from '@/Components/empSidebar';

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
    <div className="flex">
      <EmpSidebar />
      <div className="flex-grow p-8 bg-indigo-50 flex gap-8">
        {/* Leave Request Form */}
        <div className="w-2/3">
          <form
            onSubmit={handleSubmit}
            className="space-y-6 bg-white p-10 rounded-lg shadow-lg"
          >
            <h1 className="text-3xl font-bold text-center text-indigo-800">
              Apply for Leave
            </h1>

            <input
              type="text"
              value={form.name}
              readOnly
              className="w-full p-3 border-2 border-gray-200 rounded-lg bg-gray-100"
            />
            <input
              type="text"
              value={form.empid}
              readOnly
              className="w-full p-3 border-2 border-gray-200 rounded-lg bg-gray-100"
            />

            <select
              name="leave_type"
              value={form.leave_type}
              onChange={handleChange}
              required
              className="w-full p-3 border-2 border-gray-200 rounded-lg"
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.type_name}>
                  {type.type_name}
                </option>
              ))}
            </select>

            <div className="flex gap-4">
              <input
                type="date"
                name="from_date"
                value={form.from_date}
                onChange={handleChange}
                required
                className="w-full p-3 border-2 border-gray-200 rounded-lg"
              />
              <input
                type="date"
                name="to_date"
                value={form.to_date}
                onChange={handleChange}
                required
                className="w-full p-3 border-2 border-gray-200 rounded-lg"
              />
            </div>

            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              placeholder="Reason for leave"
              className="w-full p-3 border-2 border-gray-200 rounded-lg"
              required
            />

            <input
              type="file"
              name="attachment"
              onChange={handleChange}
              className="w-full p-3 border-2 border-gray-200 rounded-lg"
            />

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              Submit Request
            </button>
          </form>
        </div>

        {/* Leave Status Panel */}
        <div className="w-1/3 bg-white p-6 rounded-2xl shadow-xl overflow-y-auto max-h-[600px] border border-indigo-100">
          <h1 className="text-2xl font-bold text-center text-indigo-800 mb-6">
            Your Leave Requests
          </h1>

          {leaveStatusList.length > 0 ? (
            <div className="space-y-4">
              {leaveStatusList.map((leave, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-xl p-4 bg-indigo-50 shadow-sm"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-indigo-700">{leave.leave_type}</span>
                    <span
                      className={`text-sm px-3 py-1 rounded-full font-semibold ${
                        leave.status === 'Approved'
                          ? 'bg-green-100 text-green-700'
                          : leave.status === 'Rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {leave.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">From: {leave.from_date}</p>
                  <p className="text-sm text-gray-700">To: {leave.to_date}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No leave requests found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
