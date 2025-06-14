import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/Components/empSidebar";


export default function Documents() {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("employee"));
    if (!storedUser) {
      router.push("/employee/login");
      return;
    }
    setUser(storedUser);
    fetchDocuments(storedUser.email);
  }, [router]);

  const fetchDocuments = async (email) => {
    try {
      const res = await fetch("/api/employee/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      setMessage("Failed to fetch documents.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar/>
      <div className="flex-1 p-6 overflow-auto">
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-xl mx-auto mt-20">
          <h2 className="text-2xl font-semibold mb-4">Payslips & Documents</h2>

          {message && <p className="text-red-500 text-center">{message}</p>}

          <div className="space-y-4">
            {documents.map((doc, index) => (
              <div key={index} className="flex justify-between items-center">
                <p>{doc.name}</p>
                <a
                  href={doc.url}
                  download
                  className="text-blue-600 hover:underline"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
