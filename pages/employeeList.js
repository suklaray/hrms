import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";
import { FaEye, FaTrash, FaSearch, FaUsers, FaUserTie, FaUserShield, FaCrown } from "react-icons/fa";
import { getUserFromToken } from "@/lib/getUserFromToken";
import prisma from "@/lib/prisma";

export async function getServerSideProps(context) {
  const { req } = context;
  const token = req?.cookies?.token || "";
  const user = getUserFromToken(token);
  const allowedRoles = ["hr", "admin", "superadmin"];

  if (!user || !allowedRoles.includes(user.role)) {
    return {
      redirect: {
        destination: "/unauthorized",
        permanent: false,
      },
    };
  }

  let userData = null;
  try {
    userData = await prisma.users.findUnique({
      where: { empid: user.empid || user.id },
      select: {
        empid: true,
        name: true,
        email: true,
        profile_photo: true,
        position: true,
        role: true
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  return {
    props: {
      user: {
        id: user.id,
        empid: userData?.empid || user.empid,
        name: userData?.name || user.name,
        role: (userData?.role || user.role).toLowerCase(),
        email: userData?.email || user.email,
        profile_photo: userData?.profile_photo || null,
        position: userData?.position || null,
      },
    },
  };
}

export default function EmployeeListPage({ user }) {
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/auth/employees");
        const data = await res.json();

        if (!res.ok || !Array.isArray(data)) {
          console.error("Error loading employees:", data.error || "Invalid data format");
          setEmployees([]);
        } else {
          setEmployees(data);
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        setEmployees([]);
      }
    };

    fetchEmployees();
  }, []);

  const handleLogout = () => {
    router.push("/login");
  };

  const handleView = (id) => {
    router.push(`/employee/view/${id}`);
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Are you sure you want to delete this employee?");
    if (!confirm) return;

    try {
      const res = await fetch(`/api/auth/employee/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEmployees(employees.filter((emp) => emp.id !== id));
      } else {
        console.error("Delete failed");
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  const countByRole = (roleName) =>
    employees.filter(emp => emp.role?.toLowerCase() === roleName.toLowerCase()).length;

  const canViewRole = (targetRole) => {
    const role = user.role.toLowerCase();
    const target = targetRole.toLowerCase();
    if (role === "superadmin") return true;
    if (role === "admin" && (target === "hr" || target === "employee")) return true;
    if (role === "hr" && target === "employee") return true;
    return false;
  };

  const filteredEmployees = employees.filter((emp) => {
    const target = emp.role?.toLowerCase();
    const matchesSearch = searchTerm === "" || 
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empid?.toString().includes(searchTerm) ||
      emp.position?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === "All") {
      return canViewRole(target) && matchesSearch;
    }
    return emp.role?.toLowerCase() === filter.toLowerCase() && canViewRole(target) && matchesSearch;
  });

  const roles = [
    { label: "All", icon: FaUsers, color: "bg-blue-500" },
    { label: "HR", icon: FaUserTie, color: "bg-green-500" },
    { label: "Admin", icon: FaUserShield, color: "bg-purple-500" },
    { label: "SuperAdmin", icon: FaCrown, color: "bg-yellow-500" },
    { label: "Employee", icon: FaUsers, color: "bg-indigo-500" },
  ];

  // Show "All" button only if user can view more than one role
  const allowedRolesForUser = roles
    .map(({ label }) => label)
    .filter(role => canViewRole(role));

  const showAllButton = allowedRolesForUser.length > 1;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Directory</h1>
          <p className="text-gray-600">Manage and view all employees in your organization</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees by name, email, ID, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Filter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {roles.map(({ label, icon: Icon, color }) => {
            const count = label === "All" ? employees.length : countByRole(label);
            return (
              <button
                key={label}
                onClick={() => setFilter(label)}
                className={`p-4 rounded-xl transition-all hover:scale-105 ${
                  filter === label 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'bg-white text-gray-700 shadow-md hover:shadow-lg border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <Icon className={`text-2xl ${filter === label ? 'text-white' : 'text-indigo-600'}`} />
                </div>
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs opacity-75">({count})</div>
              </button>
            );
          })}
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-gray-600">
            Showing <span className="font-semibold">{filteredEmployees.length}</span> of <span className="font-semibold">{employees.length}</span> employees
            {searchTerm && (
              <span> matching &quot;<span className="font-semibold">{searchTerm}</span>&quot;</span>
            )}
          </p>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-600">
                              {emp.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                          <div className="text-sm text-gray-500">ID: {emp.empid}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{emp.email}</div>
                      <div className="text-sm text-gray-500">
                        {emp.date_of_joining ? `Joined ${new Date(emp.date_of_joining).toLocaleDateString('en-GB')}` : "Date not set"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{emp.position || "Not assigned"}</div>
                      <div className="text-sm text-gray-500">{emp.experience}y experience</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        emp.role === 'superadmin' ? 'bg-yellow-100 text-yellow-800' :
                        emp.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        emp.role === 'hr' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          emp.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleView(emp.id)}
                          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 rounded-lg transition-colors"
                          title="View Employee"
                        >
                          <FaEye size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg transition-colors"
                          title="Delete Employee"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <FaUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No employees found</h3>
                        <p className="text-sm">
                          {searchTerm ? `No employees match "${searchTerm}"` : "No employees found for this filter."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
