import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SideBar from '@/Components/SideBar';
import { Settings, Save, ArrowLeft } from 'lucide-react';

export default function ManageLeaveTypes() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState([
    { type_name: 'Sick_Leave', display_name: 'Sick Leave', max_days: '', paid: true },
    { type_name: 'Casual_Leave', display_name: 'Casual Leave', max_days: '', paid: true },
    { type_name: 'Earned_Leave', display_name: 'Earned Leave', max_days: '', paid: true },
    { type_name: 'Maternity_Leave', display_name: 'Maternity Leave', max_days: '', paid: true },
    { type_name: 'Unpaid_Leave', display_name: 'Unpaid Leave', max_days: '', paid: false },
  ]);

  const handleChange = (index, field, value) => {
    const updated = [...leaveTypes];
    updated[index][field] = field === 'paid' ? value === 'true' : value;
    setLeaveTypes(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      for (const type of leaveTypes) {
        if (type.max_days) {
          await fetch('/api/leave/seed-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type_name: type.type_name,
              max_days: parseInt(type.max_days),
              paid: type.paid
            })
          });
        }
      }
      alert('Leave types configured successfully');
      router.push('/hr/view-leave-requests');
    } catch (error) {
      alert('Error configuring leave types');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar handleLogout={() => router.push('/login')} />
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Settings className="w-6 h-6 mr-2" />
                Configure Leave Types
              </h1>
              <p className="text-gray-600">Set maximum days and payment status for each leave type</p>
            </div>
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="space-y-6">
              {leaveTypes.map((type, index) => (
                <div key={type.type_name} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{type.display_name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Days</label>
                      <input
                        type="number"
                        value={type.max_days}
                        onChange={(e) => handleChange(index, 'max_days', e.target.value)}
                        placeholder="Enter maximum days"
                        min="1"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                      <select
                        value={type.paid.toString()}
                        onChange={(e) => handleChange(index, 'paid', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="true">Paid Leave</option>
                        <option value="false">Unpaid Leave</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Leave Types</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}