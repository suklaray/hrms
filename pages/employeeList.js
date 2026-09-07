import { useEffect, useState } from "react";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";
import { FaEye, FaTrash, FaSearch, FaUsers, FaUserTie, FaUserShield, FaCrown, FaChevronLeft, FaChevronRight, FaDownload } from "react-icons/fa";
import { getUserFromToken } from "@/lib/getUserFromToken";
import prisma from "@/lib/prisma";
import {toast} from "react-toastify";
import { swalConfirm} from '@/utils/confirmDialog';
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { hasPermission } from "@/lib/rbac";

export async function getServerSideProps(context) {
  const { req } = context;
  const token = req?.cookies?.token || "";
  const user = getUserFromToken(token);

  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.EMPLOYEE_VIEW);
  if (!hasAccess) {
    return {
      redirect: {
        destination: "/403",
        permanent: false,
      },
    };
  }

  let userData = null;
  try {
    // Include the role relation to get role name from Role table
    userData = await prisma.users.findUnique({
      where: { empid: user.empid || user.id },
      select: {
        empid: true,
        name: true,
        email: true,
        profile_photo: true,
        position: true,
        roleId: true, // Keep for reference
        rbacRole: { // Get role from Role table via relation
          select: {
            name: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  // Get role name from rbacRole relation, fallback to null
  const roleName = userData?.rbacRole?.name || null;

  return {
    props: {
      user: {
        id: user.id,
        empid: userData?.empid || user.empid,
        name: userData?.name || user.name,
        role: roleName, // Use role from Role table
        email: userData?.email || user.email,
        profile_photo: userData?.profile_photo || null,
        position: userData?.position || null,
        roleId: userData?.roleId || null, // Include roleId for reference
      },
    },
  };
}

export default function EmployeeListPage({ user }) {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/auth/employees");
        const data = await res.json();

        if (!res.ok || !data.success) {
          console.error(
            "Error loading employees:",
            data.error || "Invalid data format"
          );

          setEmployees([]);
          setRoles([]);
          return;
        }

        // Employees
        setEmployees(Array.isArray(data.users) ? data.users : []);

        // Dynamic roles from Role table
        setRoles(Array.isArray(data.roles) ? data.roles : []);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        setEmployees([]);
        setRoles([]);
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
    // Check permission before allowing delete
    const canDelete = await hasPermission(user.id, PERMISSION_KEYS.EMPLOYEE_DELETE);
    if (!canDelete) {
      toast.error("You don't have permission to delete employees");
      return;
    }

    const confirm = await swalConfirm("Do you want to remove this employee and make the user inactive? You won't be able to access this employee.");
    if (!confirm) return;

    try {
      const res = await fetch(`/api/auth/employee/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEmployees(employees.filter((emp) => emp.id !== id));
        toast.success("Employee has been made inactive successfully.");
      } else {
        console.error("Delete failed");
        toast.error("Failed to make employee inactive. Please try again.");
      }
    } catch (error) {
      console.error("Error making employee inactive:", error);
      toast.error("Error occurred. Please try again.");
    }
  };
  // Helper to get role display color from role name
  const getRoleColor = (roleName) => {
    if (!roleName) return "bg-gray-100 text-gray-800";

    const role = roleName.toLowerCase();

    if (role === "superadmin") return "bg-yellow-100 text-yellow-800";
    if (role === "admin") return "bg-purple-100 text-purple-800";
    if (role === "hr") return "bg-green-100 text-green-800";
    if (role === "recruiter") return "bg-orange-100 text-orange-800";

    return "bg-blue-100 text-blue-800";
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Updated filtering to use role from roleId
  const filteredEmployees = employees.filter((emp) => {
    const target = emp.rbacRole?.name?.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empid?.toString().includes(searchTerm) ||
      emp.position?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === "All") {
      return matchesSearch;
    }

    return target === filter.toLowerCase() && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);


  // Excel download - removed user.role reference, using user.role from Role table
  const handleDownloadExcel = () => {
    // Check permission for download
    // Assuming there's a permission for export
    // Add permission check if needed

    const filteredData = employees;

    if (filteredData.length === 0) {
      toast.error("No data available to download.");
      return;
    }
    
    const excelData = filteredData.map(emp => ({
      "Employee ID": emp.empid || "",
      "Name": emp.name || "",
      "Email": emp.email || "",
      "Contact": emp.contact_number || "",
      "Role": emp.rbacRole?.name || "", // From Role table
      "Position": emp.position || "",
      "Date of Joining": emp.date_of_joining 
        ? new Date(emp.date_of_joining).toLocaleDateString("en-GB") 
        : "",
      "Experience": emp.experience || ""
    }));

    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employees");
      XLSX.writeFile(wb, `employees_${user.role || 'all'}_${new Date().toISOString().split("T")[0]}.xlsx`);
    });
  };
  const getRoleIcon = (roleName) => {
    const role = roleName?.toLowerCase();

    if (role === "superadmin") return FaCrown;
    if (role === "admin") return FaUserShield;
    if (role === "hr") return FaUserTie;
    if (role === "recruiter") return FaUsers;

    return FaUsers;
  };

  return (
    <>
      <Head>
        <title>Employee List - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Directory</h1>
          <p className="text-gray-600">Manage and view all employees in your organization</p>
          {/* Display user role from Role table */}
          {user.role && (
            <p className="text-sm text-gray-500 mt-1">
              Your role: <span className="font-semibold">{user.role}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleDownloadExcel}
            className="flex items-center justify-center gap-2 px-4 py-3 
                      bg-green-100 hover:bg-green-200 text-green-800 
                      font-medium rounded-lg transition-colors text-sm sm:text-base"
          >
            <FaDownload className="w-4 h-4 flex-shrink-0" />
            <span>Download employee List</span>
          </button>
        </div>

          {/* Dynamic Role Filter Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">

            {/* All Card */}
            <button
              onClick={() => handleFilterChange("All")}
              className={`p-4 rounded-xl transition-all hover:scale-105 cursor-pointer ${filter === "All"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-white text-gray-700 shadow-md hover:shadow-lg border border-gray-200"
                }`}
            >
              <div className="flex items-center justify-center mb-2">
                <FaUsers
                  className={`text-2xl ${filter === "All" ? "text-white" : "text-indigo-600"
                    }`}
                />
              </div>

              <div className="text-sm font-semibold">
                All
              </div>

              <div className="text-xs opacity-75">
                ({employees.length})
              </div>
            </button>

            {/* Roles from Role table */}
            {roles.map((role) => {
              const Icon = getRoleIcon(role.name);

              return (
                <button
                  key={role.id}
                  onClick={() => handleFilterChange(role.name)}
                  className={`p-4 rounded-xl transition-all hover:scale-105 cursor-pointer ${filter.toLowerCase() === role.name.toLowerCase()
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "bg-white text-gray-700 shadow-md hover:shadow-lg border border-gray-200"
                    }`}
                >
                  <div className="flex items-center justify-center mb-2">
                    <Icon
                      className={`text-2xl ${filter.toLowerCase() === role.name.toLowerCase()
                          ? "text-white"
                          : "text-indigo-600"
                        }`}
                    />
                  </div>

                  <div className="text-sm font-semibold">
                    {role.name}
                  </div>

                  <div className="text-xs opacity-75">
                    ({role.count})
                  </div>
                </button>
              );
            })}
          </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-gray-600">
            Showing <span className="font-semibold">{paginatedEmployees.length}</span> of <span className="font-semibold">{filteredEmployees.length}</span> employees
            {searchTerm && (
              <span> matching &quot;<span className="font-semibold">{searchTerm}</span>&quot;</span>
            )}
            {totalPages > 1 && (
              <span> (Page {currentPage} of {totalPages})</span>
            )}
          </p>
        </div>

        {/* Table */}
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
                {paginatedEmployees.map((emp) => (
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
                      <div className="text-sm text-gray-500">{emp.experience || 0}y experience</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(emp.rbacRole?.name)}`}>
                        {emp.rbacRole?.name || "No Role"}
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
                          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 rounded-lg transition-colors cursor-pointer"
                          title="View Employee"
                        >
                          <FaEye size={14} />
                        </button>
                        {/* Delete button - protected by permission check in handler */}
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg transition-colors cursor-pointer"
                          title="Delete Employee"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedEmployees.length === 0 && (
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {totalPages} ({filteredEmployees.length} total employees)
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <FaChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    page === currentPage
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <FaChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}