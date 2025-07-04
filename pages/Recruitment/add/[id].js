import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import SideBar from "@/Components/SideBar";
import { FaUser, FaEnvelope, FaBriefcase, FaCalendarAlt, FaRegClock, FaImage, FaIdCard, FaLock } from 'react-icons/fa';

const AddEmployee = () => {
  const router = useRouter();
  const { id } = router.query;

  const [form, setForm] = useState({
    name: '',
    email: '',
    position: '',
    date_of_joining: '',
    experience: '',
    profile_photo: '',
    role: '',
  });

  const [empid, setEmpid] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (id) {
      axios.get(`/api/candidate/${id}`).then((res) => {
        const { name, email, profile_photo } = res.data;
        setForm((prev) => ({ ...prev, name, email, profile_photo: profile_photo || '' }));
        setEmpid(generateEmpid(name));
        setPassword(generatePassword(8));
      });
    }
  }, [id]);

  const generateEmpid = (name) => {
    return `${name?.split(' ')[0].toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const generatePassword = (length) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'experience') {
      const num = value === '' ? '' : parseInt(value, 10);
      if (num === '' || (num >= 0 && num <= 99)) {
        setForm((prev) => ({
          ...prev,
          [name]: num
        }));
      }
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      empid,
      password,
    };

    try {
      await axios.post('/api/recruitment/add-employee', data);
      alert('Employee added successfully');
      router.push('/dashboard');
    } catch (err) {
      alert('Error adding employee');
      console.error(err);
    }
  };

  
  return (
      <div className="flex">
        <SideBar />
  
        <div className="flex-1 p-8 bg-indigo-50 min-h-screen">
          <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-2xl p-8">
            <h1 className="text-3xl font-bold mb-6 text-center text-indigo-700">Add New Employee</h1>
  
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5">
              {/* Full Name */}
              <div>
                <label className="flex items-center text-sm font-medium mb-1 text-indigo-700">
                  <FaUser className="mr-2 text-indigo-500" />
                  Full Name
                </label>
                <input className="w-full border border-indigo-300 p-2 rounded bg-gray-100" value={form.name} readOnly />
              </div>
  
              {/* Email */}
              <div>
                <label className="flex items-center text-sm font-medium mb-1 text-indigo-700">
                  <FaEnvelope className="mr-2 text-indigo-500" />
                  Email
                </label>
                <input className="w-full border border-indigo-300 p-2 rounded bg-gray-100" value={form.email} readOnly />
              </div>
  
              <div>
                <label className="flex items-center text-sm font-medium mb-1 text-indigo-700">
                  <FaBriefcase className="mr-2 text-indigo-500" />
                  Role
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  required
                  className="w-full border border-indigo-300 p-2 rounded"
                >
                  <option value="" disabled>Select Role</option>
                  <option value="hr">HR</option>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>


              {/* Position */}
              <div>
                <label className="flex items-center text-sm font-medium mb-1 text-indigo-700">
                  <FaBriefcase className="mr-2 text-indigo-500" />
                  Position
                </label>
                <input
                  className="w-full border border-indigo-300 p-2 rounded"
                  name="position"
                  placeholder="e.g. Software Engineer"
                  onChange={handleChange}
                  required
                />
              </div>
  
              {/* Date of Joining */}
              <div>
                <label className="flex items-center text-sm font-medium mb-1 text-indigo-700">
                  <FaCalendarAlt className="mr-2 text-indigo-500" />
                  Date of Joining
                </label>
                <input
                  className="w-full border border-indigo-300 p-2 rounded"
                  type="date"
                  name="date_of_joining"
                  onChange={handleChange}
                  required
                />
              </div>
              
              {/* Experience */}
              <div>
                <label className="flex items-center text-sm font-medium mb-1 text-indigo-700">
                  <FaRegClock className="mr-2 text-indigo-500" />
                  Experience (in years)
                </label>
                <input
                  className="w-full border border-indigo-300 p-2 rounded"
                  type="number"
                  name="experience"
                  placeholder="e.g. 2"
                  onChange={handleChange}
                  value={form.experience} 
                  min="0"
                  max="99"
                />
              </div>

              {/* Profile Photo URL */}
              <div>
                <label className="flex items-center text-sm font-medium mb-1 text-indigo-700">
                  <FaImage className="mr-2 text-indigo-500" />
                  Profile Photo URL
                </label>
                <input
                    className="w-full border border-indigo-300 p-2 rounded"
                    type="text"
                    name="profile_photo"
                    placeholder="Paste image URL (optional)"
                    value={form.profile_photo}
                    onChange={handleChange}
                    readOnly
                  />
              </div>
              {/* Employee ID */}
              <div>
                <label className="flex items-center text-sm font-medium mb-1 text-indigo-700">
                  <FaIdCard className="mr-2 text-indigo-500" />
                  Employee ID
                </label>
                <input className="w-full border border-indigo-300 p-2 rounded bg-gray-100" value={empid} readOnly />
              </div>
  
              {/* Auto-generated Password */}
              <div>
                <label className="flex items-center text-sm font-medium mb-1 text-indigo-700">
                  <FaLock className="mr-2 text-indigo-500" />
                  Auto-generated Password
                </label>
                <input className="w-full border border-indigo-300 p-2 rounded bg-gray-100" value={password} readOnly />
              </div>
  
              {/* Submit Button */}
              <button
                type="submit"
                className="mt-4 bg-indigo-600 text-white py-2 px-6 rounded hover:bg-indigo-700 transition"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      </div>
    );  
};

export default AddEmployee;
