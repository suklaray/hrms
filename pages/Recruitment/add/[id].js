import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import SideBar from "@/Components/SideBar";
import {
  FaUser, FaEnvelope, FaBriefcase, FaCalendarAlt,
  FaRegClock, FaImage
} from 'react-icons/fa';

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

  const [message, setMessage] = useState('');
  const [emailExists, setEmailExists] = useState(false);

  useEffect(() => {
    if (id) {
      axios.get(`/api/candidate/${id}`).then((res) => {
        const { name, email, profile_photo } = res.data;
        setForm((prev) => ({
          ...prev,
          name,
          email,
          profile_photo: profile_photo || '',
        }));
      });
    }
  }, [id]);

  const handleChange = async (e) => {
    const { name, value } = e.target;

    if (name === 'email') {
      setForm((prev) => ({ ...prev, email: value }));

      if (value.includes('@')) {
        // Check if email already exists
        const res = await axios.post('/api/recruitment/check-email', { email: value });
        setEmailExists(res.data.exists);
      }

    } else if (name === 'experience') {
      const num = value === '' ? '' : parseInt(value, 10);
      if (num === '' || (num >= 0 && num <= 99)) {
        setForm((prev) => ({ ...prev, [name]: num }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await axios.post("/api/recruitment/add-employee", form);
      const data = res.data;

      if (res.status === 200) {
        setForm({
          name: '',
          email: '',
          position: '',
          date_of_joining: '',
          experience: '',
          profile_photo: '',
          role: '',
        });

        setMessage(`New Employee Added Successfully with EMPID - ${data.empid} and Password - ${data.password}. Please copy the password.`);
      } else {
        setMessage("Failed to add employee.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error adding employee.");
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
              <input
                className="w-full border border-indigo-300 p-2 rounded bg-gray-100"
                value={form.name}
                readOnly
              />
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center text-sm font-medium mb-1 text-indigo-700">
                <FaEnvelope className="mr-2 text-indigo-500" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full border border-indigo-300 p-2 rounded"
                readOnly={!!id}
              />
              {emailExists && (
                <p className="text-red-600 text-sm mt-1">Email already exists</p>
              )}
            </div>

            {/* Role */}
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
                value={form.position}
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
                value={form.date_of_joining}
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

            {/* Submit Button */}{/* Submit Button */}
            <button
              type="submit"    
              className="mt-4 bg-indigo-600 text-white py-2 px-6 rounded hover:bg-indigo-700 transition"
              disabled={emailExists}
            >
              Submit
            </button>
          </form>

          {/* Message Display */}
          {message && (
            <p className="mt-6 text-green-700 font-medium text-center whitespace-pre-line">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEmployee;
