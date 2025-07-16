import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/Components/empSidebar";

export default function EmpPayslip() {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchUserAndDocuments() {
      try {
        const userRes = await fetch("/api/auth/employee/me", {
          credentials: "include",
        });
        if (!userRes.ok) return router.push("/employee/login");

        const { user } = await userRes.json();
        setUser(user);

        const docsRes = await fetch("/api/auth/employee/emp-payslip", {
          method: "POST",
          credentials: "include",
        });

        const { documents } = await docsRes.json();
        setDocuments(documents || []);
      } catch (err) {
        console.error(err);
        setMessage("Failed to fetch documents.");
      }
    }

    fetchUserAndDocuments();
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6 overflow-auto">
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-5xl mx-auto mt-12">
          <h2 className="text-2xl font-bold text-center mb-6 text-indigo-800">
            Payslips
          </h2>

          {message && <p className="text-red-500 text-center">{message}</p>}

          {documents.length === 0 ? (
            <p className="text-gray-500 text-center">No payslips found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center border border-gray-300 rounded-lg overflow-hidden shadow">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-500 to-sky-400 text-white text-base">
                    <th className="py-3 px-4 border-r">SL No</th>
                    <th className="py-3 px-4 border-r">Month</th>
                    <th className="py-3 px-4 border-r">Year</th>
                    <th className="py-3 px-4">Payslip</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, index) => (
                    <tr
                      key={index}
                      className="bg-white border-t hover:bg-gray-100 transition"
                    >
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{doc.month}</td>
                      <td className="py-3 px-4">{doc.year}</td>
                      <td className="py-3 px-4">
                        <a
                          href={doc.payslip_pdf}
                          download
                          className="text-indigo-600 font-medium hover:underline"
                        >
                          Download Payslip
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
