import { useState } from "react";
import { Clock } from "lucide-react";
import { toast } from "react-toastify";

export default function RegularizationModal({ attendance, onClose, onSubmitted }) {
  const attendanceDate = new Date(attendance.date);
  const checkInDate = new Date(attendance.check_in);
  const fmt = (d) => d.toISOString().split('T')[0];
  const fmtTime = (d) => d.toTimeString().slice(0, 5);

  const [form, setForm] = useState({
    check_in_time: `${fmt(attendanceDate)}T${fmtTime(checkInDate)}`,
    requested_checkout: `${fmt(attendanceDate)}T`,
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requested_checkout.split('T')[1]) { toast.error('Please enter check-out time'); return; }
    if (!form.reason.trim()) { toast.error('Reason is required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/regularization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          attendance_id: attendance.id,
          attendance_date: fmt(attendanceDate),
          check_in_time: form.check_in_time,
          requested_checkout: form.requested_checkout,
          reason: form.reason
        })
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to submit'); return; }
      toast.success('Regularization request submitted!');
      onSubmitted?.();
    } catch { toast.error('Failed to submit'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Attendance Regularization</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="mx-5 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            Missed check-out on <strong>{attendanceDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
            <input type="datetime-local" value={form.check_in_time}
              onChange={(e) => setForm(p => ({ ...p, check_in_time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requested Check-out <span className="text-red-500">*</span></label>
            <input type="datetime-local" value={form.requested_checkout}
              onChange={(e) => setForm(p => ({ ...p, requested_checkout: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea value={form.reason}
              onChange={(e) => { if (e.target.value.length <= 500) setForm(p => ({ ...p, reason: e.target.value })); }}
              rows={3} placeholder="Why did you miss check-out?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            <p className="text-xs text-gray-400 text-right mt-1">{form.reason.length}/500</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium">
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}