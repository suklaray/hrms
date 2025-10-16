import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import axios from "axios";
import SideBar from "@/Components/SideBar";
import Breadcrumb from "@/Components/Breadcrumb";
import { FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaSave, FaTimes, FaFileAlt } from "react-icons/fa";
import { toast } from "react-toastify";

export default function EditCandidate() {
  const router = useRouter();
  const { id } = router.query;
  const [candidate, setCandidate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact_number: "",
    interview_date: "",
    interview_timing: "",
    resume: null
  });
  const [errors, setErrors] = useState({});
  const [originalEmail, setOriginalEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const fetchCandidate = useCallback(async () => {
    try {
      const res = await axios.get(`/api/recruitment/getCandidateById?id=${id}`);
      setCandidate(res.data);
      setOriginalEmail(res.data.email || "");
      setFormData({
        name: res.data.name || "",
        email: res.data.email || "",
        contact_number: res.data.contact_number || "",
        interview_date: res.data.interview_date ? res.data.interview_date.split('T')[0] : "",
        interview_timing: res.data.interview_timing || "",
        resume: null
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching candidate:", error);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchCandidate();
    }
  }, [id, fetchCandidate]);

  const handleChange = (e) => {
    const { name, value, files, type } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      if (file) {
        if (file.size < 5 * 1024) {
          setErrors(prev => ({ ...prev, [name]: 'File size must be greater than 5KB' }));
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          setErrors(prev => ({ ...prev, [name]: 'File size must be less than 10MB' }));
          return;
        }
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
          setErrors(prev => ({ ...prev, [name]: 'Only PDF, JPG, PNG files are allowed' }));
          return;
        }
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
      setFormData(prev => ({ ...prev, [name]: file }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (value.trim()) {
        validateField(name, value);
      } else {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  const validateField = async (name, value) => {
    let error = '';
    
    switch (name) {
      case 'contact_number':
        if (value && !/^\d{10}$/.test(value)) {
          error = 'Contact number must be exactly 10 digits';
        }
        break;
        
      case 'interview_date':
        if (value) {
          const selectedDate = new Date(value);
          const today = new Date();
          const twoYearsFromNow = new Date();
          twoYearsFromNow.setFullYear(today.getFullYear() + 2);
          
          today.setHours(0, 0, 0, 0);
          selectedDate.setHours(0, 0, 0, 0);
          
          if (selectedDate < today) {
            error = 'Interview date cannot be in the past. Please select a future date.';
          } else if (selectedDate > twoYearsFromNow) {
            error = 'Interview date cannot be more than 2 years from today.';
          }
        }
        break;
    }
    
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  useEffect(() => {
    const hasErrors = Object.values(errors).some(error => error !== '');
    setIsFormValid(!hasErrors);
  }, [formData, errors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    setSaving(true);
    try {
      const submitData = new FormData();
      submitData.append('candidate_id', id);
      submitData.append('contact_number', formData.contact_number);
      submitData.append('interview_date', formData.interview_date);
      submitData.append('interview_timing', formData.interview_timing);
      if (formData.resume) {
        submitData.append('resume', formData.resume);
      }
      
      await axios.put('/api/recruitment/updateCandidate', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Candidate updated successfully!');
      router.push(`/Recruitment/${id}`);
    } catch (error) {
      console.error('Error updating candidate:', error);
      toast.error('Failed to update candidate. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Edit Candidate Profile - HRMS</title>
        </Head>
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <SideBar />
        <div className="flex-1 p-4 lg:p-8">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Candidate Profile - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <SideBar />
      <div className="flex-1 p-4 lg:p-8">
        <Breadcrumb items={[
          { label: 'Recruitment', href: '/Recruitment/recruitment' },
          { label: candidate?.name || 'Candidate', href: `/Recruitment/${id}` },
          { label: 'Edit Profile' }
        ]} />

        <div className="mt-6 mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Edit Candidate Profile</h1>
          <p className="text-gray-600">Update candidate information</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 lg:px-8 py-6">
              <h2 className="text-xl lg:text-2xl font-bold text-white">Candidate Information</h2>
              <p className="text-indigo-100 mt-1">Edit the fields below to update candidate details</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6" encType="multipart/form-data">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <FaUser className="mr-2 text-indigo-500" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <FaEnvelope className="mr-2 text-indigo-500" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    placeholder="Enter email address"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <FaPhone className="mr-2 text-indigo-500" />
                    Contact Number
                  </label>
                  <input
                    type="text"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    maxLength={10}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      errors.contact_number ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter 10-digit contact number"
                  />
                  {errors.contact_number && <p className="text-red-500 text-sm mt-1">{errors.contact_number}</p>}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <FaCalendarAlt className="mr-2 text-indigo-500" />
                    Interview Date
                  </label>
                  <input
                    type="date"
                    name="interview_date"
                    value={formData.interview_date}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      errors.interview_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.interview_date && <p className="text-red-500 text-sm mt-1">{errors.interview_date}</p>}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <FaCalendarAlt className="mr-2 text-indigo-500" />
                    Interview Time
                  </label>
                  <input
                    type="time"
                    name="interview_timing"
                    value={formData.interview_timing}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <FaFileAlt className="mr-2 text-indigo-500" />
                    Resume (Optional)
                  </label>
                  <input
                    type="file"
                    name="resume"
                    onChange={handleChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      errors.resume ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.resume && <p className="text-red-500 text-sm mt-1">{errors.resume}</p>}
                  <p className="text-gray-500 text-xs mt-1">Min 5KB, Max 10MB, PDF/JPG/PNG only</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving || !isFormValid}
                  className={`flex-1 sm:flex-none flex items-center justify-center px-6 py-3 font-semibold rounded-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all ${
                    isFormValid && !saving
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 cursor-pointer'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  <FaSave className="mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                
                <button
                  type="button"
                  onClick={() => router.push(`/Recruitment/${id}`)}
                  className="flex-1 sm:flex-none flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all cursor-pointer"
                >
                  <FaTimes className="mr-2" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}