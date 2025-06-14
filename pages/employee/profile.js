// pages/employee/profile.js
import React, { useEffect, useState } from 'react';
import { AiOutlineEye, AiOutlineEdit } from 'react-icons/ai';
import SideBar from '/Components/empSidebar';
import axios from 'axios';
import Image from 'next/image';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      //try {
        //const res = await axios.get('/api/employee/profile', {
          //headers: { Authorization: `Bearer ${token}` },
      //  });
      //  setProfile(res.data);
      //} catch (err) {
        //console.error('Fetch error:', err);
     // }
    };

    fetchProfile();
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
      <SideBar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-indigo-700 mb-8 text-center">My Profile</h1>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-xl rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-indigo-200 text-gray-700 text-left">
                <th className="py-3 px-6">Profile Photo</th>
                <th className="py-3 px-6">Emp ID</th>
                <th className="py-3 px-6">Name</th>
                <th className="py-3 px-6">Email</th>
                <th className="py-3 px-6">Contact No</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profile && (
                <tr className="border-b hover:bg-indigo-50 transition">
                  <td className="py-4 px-6">
                    <Image
                      src={profile.profile_photo || '/profile.png'}
                      alt="Profile"
                      width={56}
                      height={56}
                      className="rounded-full border-2 border-indigo-600 shadow"
                    />
                  </td>
                  <td className="py-4 px-6">{profile.empid}</td>
                  <td className="py-4 px-6">{profile.name}</td>
                  <td className="py-4 px-6">{profile.email}</td>
                  <td className="py-4 px-6 text-center space-x-4">
                    <button title="View">
                      <AiOutlineEye size={20} className="text-indigo-600 hover:text-indigo-800" />
                    </button>
                    <button title="Edit">
                      <AiOutlineEdit size={20} className="text-green-600 hover:text-green-800" />
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
