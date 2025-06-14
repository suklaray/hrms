import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function ViewDetails() {
    const [employee, setEmployee] = useState(null);
    const [message, setMessage] = useState("");
    const router = useRouter();

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("employee"));
        if (!storedUser) {
            router.push("/login");
            return;
        }

        fetchEmployeeDetails(storedUser.email);
    }, [router]);

    const fetchEmployeeDetails = async (email) => {
        try {
            const res = await fetch("/api/employees/details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) {
                setMessage(data.error);
                return;
            }

            setEmployee(data.employee);
        } catch (error) {
            setMessage("Failed to fetch employee details.");
        }
    };

    if (!employee) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-700">Loading employee details...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl">
                <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Employee Details</h2>

                {message && <p className="text-red-500 text-center mb-4">{message}</p>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Column 1: Profile Picture & Basic Info */}
                    <div className="flex flex-col items-center bg-gray-100 rounded-lg p-4">
                        <div className="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center text-sm text-gray-500">
                            Profile Image
                        </div>
                        <h3 className="mt-4 font-bold text-gray-800">{employee.name}</h3>
                        <p className="text-gray-600">{employee.position}</p>
                        <p className="text-sm text-gray-500 mt-1">{employee.email}</p>
                        <p className="text-sm text-gray-500">{employee.role}</p>
                    </div>

                    {/* Column 2: Personal Information */}
                    <div className="bg-gray-100 rounded-lg p-4 shadow-sm">
                        <h3 className="text-lg font-semibold mb-3 text-indigo-700">Personal Information</h3>
                        <p><strong>Status:</strong> {employee.status}</p>
                        <p><strong>Experience:</strong> {employee.experience} years</p>
                        <p><strong>Gender:</strong> {employee.gender || "N/A"}</p>
                        <p><strong>Contact:</strong> {employee.contact || "N/A"}</p>
                        <p><strong>Date of Joining:</strong> {employee.date_of_joining}</p>
                    </div>

                    {/* Column 3: Address */}
                    <div className="bg-gray-100 rounded-lg p-4 shadow-sm">
                        <h3 className="text-lg font-semibold mb-3 text-indigo-700">Address</h3>
                        <p><strong>City:</strong> {employee.city || "N/A"}</p>
                        <p><strong>State:</strong> {employee.state || "N/A"}</p>
                        <p><strong>Country:</strong> {employee.country || "N/A"}</p>
                        <p><strong>Employee ID:</strong> {employee.empid}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
