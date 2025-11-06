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
    event_type: 'event',
    visible_to: []
  });
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
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
        const selectedDate = new Date(formData.event_date);
        const today = new Date();
        const tenYearsFromNow = new Date();
        tenYearsFromNow.setFullYear(today.getFullYear() + 10);
        
        // Reset time for accurate comparison
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          newErrors.event_date = 'Event date must be in the future';
        } else if (selectedDate > tenYearsFromNow) {
          newErrors.event_date = 'Event date cannot be more than 10 years in the future';
        }
      }

      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };
    // Update the date input
    const today = new Date();
    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(today.getFullYear() + 10);

    const minDate = today.toISOString().split('T')[0];
    const maxDate = tenYearsFromNow.toISOString().split('T')[0];


  useEffect(() => {
    const isValid = formData.title.trim().length >= 3 && 
                   formData.title.length <= 100 && 
                   formData.event_date && 
                   formData.description.length <= 200 &&
                   (!formData.description.trim() || formData.description.trim().length >= 3);
    setIsFormValid(isValid);
  }, [formData]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/task-management/tasks');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

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
        body: JSON.stringify({
          ...formData,
          visible_to: formData.visible_to.join(',')
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage('Event added successfully!');
        setFormData({ title: '', description: '', event_date: '', event_type: 'event', visible_to: [] });
        setSelectedEmployees([]);
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
    
    if (name === 'visible_to') {
      // Handle multi-select for visible_to
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const initialFormState = {
    title: '',
    description: '',
    event_date: '',
    event_type: 'event',
    visible_to: []
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.empid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEmployeeSelect = (employee) => {
    // Don't allow individual selection if "All Employees" is selected
    if (selectedEmployees.some(emp => emp.empid === 'all')) {
      return;
    }
    
    const isSelected = selectedEmployees.some(emp => emp.empid === employee.empid);
    if (isSelected) {
      const updated = selectedEmployees.filter(emp => emp.empid !== employee.empid);
      setSelectedEmployees(updated);
      setFormData({ ...formData, visible_to: updated.map(emp => emp.email) });
    } else {
      const updated = [...selectedEmployees, employee];
      setSelectedEmployees(updated);
      setFormData({ ...formData, visible_to: updated.map(emp => emp.email) });
    }
    setSearchTerm('');
  };

  const handleAllSelect = () => {
    setSelectedEmployees([{ empid: 'all', name: 'All Employees', email: 'all' }]);
    setFormData({ ...formData, visible_to: ['all'] });
    setSearchTerm('');
    setShowDropdown(false);
  };

  const removeEmployee = (empidToRemove) => {
    const updated = selectedEmployees.filter(emp => emp.empid !== empidToRemove);
    setSelectedEmployees(updated);
    setFormData({ ...formData, visible_to: updated.map(emp => emp.email) });
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visible To *
                    </label>
                    <div className="relative">
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px] flex flex-wrap gap-1 items-center">
                        {selectedEmployees.map((employee) => (
                          <span key={employee.empid} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                            {employee.name}
                            <button
                              type="button"
                              onClick={() => removeEmployee(employee.empid)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowDropdown(e.target.value.trim() !== '');
                          }}
                          onFocus={() => setShowDropdown(searchTerm.trim() !== '')}
                          disabled={selectedEmployees.some(emp => emp.empid === 'all')}
                          className="flex-1 min-w-[120px] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder={selectedEmployees.some(emp => emp.empid === 'all') ? "All employees selected" : "Search employees..."}
                        />
                      </div>
                      
                      {showDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          <div
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b"
                            onClick={handleAllSelect}
                          >
                            <div className="font-medium">All Employees</div>
                            <div className="text-sm text-gray-500">Visible to everyone</div>
                          </div>
                          {!selectedEmployees.some(emp => emp.empid === 'all') && (
                            <>
                              {filteredEmployees.map((employee) => (
                                <div
                                  key={employee.email}
                                  className={`px-3 py-2 hover:bg-gray-100 cursor-pointer ${
                                    selectedEmployees.some(emp => emp.email === employee.email) ? 'bg-blue-50' : ''
                                  }`}
                                  onClick={() => handleEmployeeSelect(employee)}
                                >
                                  <div className="font-medium">{employee.name}</div>
                                  <div className="text-sm text-gray-500">{employee.email} • {employee.empid} • {employee.role}</div>
                                </div>
                              ))}
                              {filteredEmployees.length === 0 && searchTerm && (
                                <div className="px-3 py-2 text-gray-500">No employees found</div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-1">Select specific employees or choose &quot;All Employees&quot;</p>
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
                    <button
                        type="button"
                        onClick={() => {
                          setFormData(initialFormState); 
                          setErrors({}); 
                          setMessage(''); 
                        }}
                        className="w-full sm:w-auto px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>


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
