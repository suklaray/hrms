import { useState, useEffect } from 'react';

export default function WorkReportModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    tasks_completed: '',
    tasks_tomorrow: '',
    issues: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      // Check if report already exists for today
      fetchTodayReport();
    }
  }, [isOpen]);

  const fetchTodayReport = async () => {
    try {
      const response = await fetch('/api/employee/work-report');
      if (response.ok) {
        const reports = await response.json();
        const today = new Date().toDateString();
        const todayReport = reports.find(report => 
          new Date(report.report_date).toDateString() === today
        );
        
        if (todayReport) {
          setFormData({
            tasks_completed: todayReport.tasks_completed,
            tasks_tomorrow: todayReport.tasks_tomorrow,
            issues: todayReport.issues || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching today report:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!formData.tasks_completed.trim()) {
      newErrors.tasks_completed = 'Today\'s completed tasks are required';
    }
    if (!formData.tasks_tomorrow.trim()) {
      newErrors.tasks_tomorrow = 'Tomorrow\'s tasks are required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/employee/work-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        onSubmit(result);
        onClose();
        setFormData({ tasks_completed: '', tasks_tomorrow: '', issues: '' });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit work report');
      }
    } catch (error) {
      console.error('Error submitting work report:', error);
      alert('Failed to submit work report');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Daily Work Report</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Today&apos;s Completed Tasks *
              </label>
              <textarea
                name="tasks_completed"
                value={formData.tasks_completed}
                onChange={handleChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.tasks_completed ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe what tasks you completed today..."
                required
              />
              {errors.tasks_completed && (
                <p className="text-red-500 text-sm mt-1">{errors.tasks_completed}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tomorrow&apos;s Planned Tasks *
              </label>
              <textarea
                name="tasks_tomorrow"
                value={formData.tasks_tomorrow}
                onChange={handleChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.tasks_tomorrow ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe what tasks you plan to work on tomorrow..."
                required
              />
              {errors.tasks_tomorrow && (
                <p className="text-red-500 text-sm mt-1">{errors.tasks_tomorrow}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issues/Blockers (Optional)
              </label>
              <textarea
                name="issues"
                value={formData.issues}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any issues, blockers, or help needed..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}