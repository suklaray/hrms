import { useState, useEffect } from 'react';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import Link from 'next/link';
import { FaCalendarPlus, FaArrowLeft } from 'react-icons/fa';

export default function AddEvent() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_type: 'event'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
    // Update the validation function
  const validateForm = () => {
      const newErrors = {};
      
      if (!formData.title.trim()) {
        newErrors.title = 'Title is required';
      } else if (formData.title.trim().length < 3) {
        newErrors.title = 'Title must be at least 3 characters';
      } else if (formData.title.length > 100) {
        newErrors.title = 'Title must be 100 characters or less';
      }
      
      if (formData.description.trim() && formData.description.trim().length < 3) {
        newErrors.description = 'Description must be at least 3 characters if provided';
      } else if (formData.description && formData.description.length > 200) {
        newErrors.description = 'Description must be 200 characters or less';
      }
      
      if (!formData.event_date) {
        newErrors.event_date = 'Date is required';
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(formData.event_date)) {
          newErrors.event_date = 'Date must be in DD-MM-YYYY format';
        } else {
          const currentYear = new Date().getFullYear();
          const year = parseInt(formData.event_date.split('-')[0]);
          if (year < currentYear - 10 || year > currentYear + 10) {
            newErrors.event_date = `Year must be between ${currentYear - 10} and ${currentYear + 10}`;
          }
        }
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };
    // Update the date input
    const currentYear = new Date().getFullYear();
    const minDate = `${currentYear - 10}-01-01`;
    const maxDate = `${currentYear + 10}-12-31`;

  useEffect(() => {
    const isValid = formData.title.trim().length >= 3 && 
                   formData.title.length <= 100 && 
                   formData.event_date && 
                   formData.description.length <= 200 &&
                   (!formData.description.trim() || formData.description.trim().length >= 3);
    setIsFormValid(isValid);
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/calendar/add-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage('Event added successfully!');
        setFormData({ title: '', description: '', event_date: '', event_type: 'event' });
        setErrors({});
      } else {
        setMessage(data.message || 'Failed to add event');
      }
    } catch (error) {
      setMessage('Error adding event');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    
    setFormData({ ...formData, [name]: value });
  };

  return (
    <>
      <Head>
        <title>Add Event - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        
        <div className="flex-1 overflow-auto">
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Link
                href="/calendar/yearly-calendar"
                className=" flex items-center justify-center px-3 py-2  bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors w-fit"
              >
                <FaArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 pt-4">
                  <FaCalendarPlus className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                  Add New Event
                </h1>
                <p className="text-sm sm:text-base text-gray-600">Create a new calendar event</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      minLength={3}
                      maxLength={100}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter event title (minimum 3 characters)"
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                    <p className="text-gray-500 text-xs mt-1">{formData.title.length}/100 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      minLength={3}
                      maxLength={200}
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                        errors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter event description (optional, minimum 3 characters if provided)"
                    />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                    <p className="text-gray-500 text-xs mt-1">{formData.description.length}/200 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Date *
                    </label>

                      <input
                        type="date"
                        name="event_date"
                        value={formData.event_date}
                        onChange={handleChange}
                        min={minDate}
                        max={maxDate}
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.event_date ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    {errors.event_date && <p className="text-red-500 text-sm mt-1">{errors.event_date}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Type *
                    </label>
                    <select
                      name="event_type"
                      value={formData.event_type}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="event">Event</option>
                      <option value="holiday">Holiday</option>
                    </select>
                  </div>

                  {message && (
                    <div className={`p-3 rounded-lg text-sm ${
                      message.includes('successfully') 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {message}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                    <button
                      type="submit"
                      disabled={loading || !isFormValid}
                      className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Adding...' : 'Add Event'}
                    </button>
                    <Link
                      href="/calendar/yearly-calendar"
                      className="w-full sm:w-auto px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium rounded-lg transition-colors text-center"
                    >
                      Cancel
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
