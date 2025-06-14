// pages/hr/payroll/index.js

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import SideBar from "@/Components/SideBar";
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FaEye, FaDownload } from 'react-icons/fa';

export default function PayrollView() {
  const [payrolls, setPayrolls] = useState([]);
  const payslipRef = useRef(); // Ref for PDF generation
  const [selectedPayslip, setSelectedPayslip] = useState(null); // Current item to generate

  useEffect(() => {
    const fetchPayrolls = async () => {
      const res = await fetch('/api/hr/payroll/all');
      const data = await res.json();
      setPayrolls(data);
    };
    fetchPayrolls();
  }, []);

  const generatePDF = async (item) => {
    setSelectedPayslip(item); // Set for rendering hidden template

    // Wait to render the content
    setTimeout(async () => {
      const element = payslipRef.current;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297); // A4 size
      const filename = `Payslip-${item.empid}-${item.month}-${item.year}.pdf`;
      pdf.save(filename);
    }, 100);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
      <SideBar />

      <div className="flex-1 p-8">
        <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
          <h2 className="text-3xl font-bold mb-6 text-indigo-700 text-center">Payroll Details</h2>

          <table className="min-w-full divide-y divide-indigo-200 rounded-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Emp ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Position</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Month</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Year</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Net Pay</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payrolls.map((item, index) => (
                <tr key={index} className={`hover:bg-indigo-300 ${index % 2 === 0 ? "bg-indigo-50" : "bg-indigo-200"}`}>
                  <td className="px-4 py-2">{item.empid}</td>
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2">{item.position}</td>
                  <td className="px-4 py-2">{item.month}</td>
                  <td className="px-4 py-2">{item.year}</td>
                  <td className="px-4 py-2">₹{item.net_pay}</td>
                  <td className="px-4 py-2 text-center space-x-2">
                    <Link href={`/hr/payroll/${item.empid}`} className="text-indigo-600 px-2 py-1 rounded-full">
                      <FaEye className="inline-block mr-1" /> 
                      </Link>
                      <Link
                        href={`/hr/payroll/payslip-preview/${item.empid}?month=${item.month}&year=${item.year}`}
                        className="text-green-700 px-2 py-1 rounded-full"
                      >
                        <FaDownload className="inline-block mr-1" />
                      </Link>
                  </td>
                </tr>
              ))}
              {payrolls.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-gray-500 py-6">
                    No payrolls found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
</div>
  );
}
