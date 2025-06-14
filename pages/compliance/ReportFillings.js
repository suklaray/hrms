import { useState } from 'react';
import SideBar from "@/Components/SideBar";
import { useRouter } from 'next/router';

export default function ReportsAndFilings() {
const [searchQuery, setSearchQuery] = useState('');
const [forms, setForms] = useState([
  {
    id: 'FORM001',
    name: 'Income Tax Return',
    department: 'Tax',
    deadline: '2025-04-30',
    link: 'https://www.incometaxindia.gov.in/',
  },
  {
    id: 'FORM002',
    name: 'Provident Fund Submission',
    department: 'Finance',
    deadline: '2025-05-15',
    link: 'https://www.epfindia.gov.in/',
  },
  {
    id: 'FORM003',
    name: 'ESI Filing',
    department: 'HR',
    deadline: '2025-06-01',
    link: 'https://www.esic.nic.in/',
  },
  {
    id: 'FORM004',
    name: 'Professional Tax Return',
    department: 'Finance',
    deadline: '2025-07-10',
    link: 'https://mahagst.gov.in/en',
  },
  {
    id: 'FORM005',
    name: 'Form 16 Distribution',
    department: 'Tax',
    deadline: '2025-06-15',
    link: 'https://www.incometaxindia.gov.in/pages/tax-information-services.aspx',
  },
  {
    id: 'FORM006',
    name: 'Gratuity Form (Form F)',
    department: 'HR',
    deadline: 'Upon Resignation',
    link: 'https://labour.gov.in/act/form-f',
  },
  {
    id: 'FORM007',
    name: 'Bonus Payment Statement',
    department: 'Finance',
    deadline: '2025-10-31',
    link: 'https://labour.gov.in/bonus',
  },
  {
    id: 'FORM008',
    name: 'Labour Welfare Fund Return',
    department: 'HR',
    deadline: '2025-12-31',
    link: 'https://www.karmasandhan.com/labour-welfare-fund-returns/',
  },
  {
    id: 'FORM009',
    name: 'TDS Quarterly Filing',
    department: 'Finance',
    deadline: '2025-07-15',
    link: 'https://www.tin-nsdl.com/',
  },
  {
    id: 'FORM010',
    name: 'Form 11 - PF Declaration',
    department: 'HR',
    deadline: 'On Joining',
    link: 'https://www.epfindia.gov.in/site_en/Downloads.php',
  },
]);

const handleSearch = () => {
  if (!searchQuery.trim()) return;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)} site:.gov.in`;
  window.open(searchUrl, '_blank');
};

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <SideBar />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-700">Reports & Filings</h1>

        {/* Search and Filter Section */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-4">
            <input
                  type="text"
                  placeholder="Search Govt Services or Portals"
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
                >
                  Search
                </button>
            <select
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              defaultValue="All Departments"
            >
              <option value="All Departments">All Departments</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
              <option value="Tax">Tax</option>

            </select>
            <input
              type="number"
              placeholder="Year"
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200">
              Filter
            </button>
          </div>
          <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200">
            Export Reports
          </button>
        </div>

        {/* Forms/Reports Table */}
<div className="overflow-x-auto bg-white shadow rounded-xl">
  <table className="min-w-full divide-y divide-gray-200 text-center">
    <thead>
      <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white uppercase text-sm">
        <th className="px-6 py-3 font-bold">Form Name</th>
        <th className="px-6 py-3 font-bold">Department</th>
        <th className="px-6 py-3 font-bold">Deadline</th>
        <th className="px-6 py-3 font-bold">Download</th>
        <th className="px-6 py-3 font-bold">Govt. Link</th>
      </tr>
    </thead>
    <tbody className="bg-white">
      {forms.map((form, index) => (
        <tr
          key={form.id}
          className={`hover:bg-indigo-50 transition ${
            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
          }`}
        >
          <td className="px-6 py-4 text-sm text-gray-800">{form.name}</td>
          <td className="px-6 py-4 text-sm text-gray-800">{form.department}</td>
          <td className="px-6 py-4 text-sm text-gray-800">{form.deadline}</td>
          <td className="px-6 py-4 text-sm">
            <button className="text-indigo-600 hover:underline">Download</button>
          </td>
          <td className="px-6 py-4 text-sm">
            <a
              href={form.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              Visit Govt Portal
            </a>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
</div>
</div>
);
}    
