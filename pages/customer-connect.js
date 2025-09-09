import { useEffect, useState } from "react";
import Head from 'next/head';
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import SideBar from "@/Components/SideBar";

export default function CustomerConnect() {
    const [messages, setMessages] = useState([]);
    const [selected, setSelected] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [activeMessageId, setActiveMessageId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const togglePopup = (id) => {
    setActiveMessageId((prev) => (prev === id ? null : id));
    };
    useEffect(() => {
        fetch("/api/contact/contact-list")
        .then((res) => res.json())
        .then((data) => {
            setMessages(data.feedbacks || []);
        })
        .catch((err) => console.error("Fetch error:", err));
    }, []);

    const toggleSelectAll = () => {
        if (selectAll) {
        setSelected([]);
        } else {
        setSelected(messages.map((msg) => msg.id));
        }
        setSelectAll(!selectAll);
    };

    const toggleSelection = (id) => {
        setSelected((prev) =>
        prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
    };

    const handleDelete = async () => {
        const confirmDelete = confirm(`Are you sure you want to delete ${selected.length} selected message(s)? This action cannot be undone.`);
        
        if (!confirmDelete) {
            return;
        }

        try {
        const res = await fetch("/api/contact/delete-multiple", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: selected }),
        });

        if (res.ok) {
            setMessages(messages.filter((msg) => !selected.includes(msg.id)));
            setSelected([]);
            setSelectAll(false);
        } else {
            console.error("Failed to delete");
        }
        } catch (err) {
        console.error("Delete error:", err);
        }
    };

    return (
        <>
            <Head>
                <title>Customer Connect - HRMS</title>
            </Head>
            <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Customer Connect</h1>
                <p className="text-gray-600">Manage customer inquiries and feedback</p>
              </div>

              {selected.length > 0 && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">{selected.length} selected</span>
                  <button 
                    onClick={handleDelete}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Results Summary */}
            {messages.length > 0 && (() => {
              const totalPages = Math.ceil(messages.length / itemsPerPage);
              const startIndex = (currentPage - 1) * itemsPerPage;
              const paginatedMessages = messages.slice(startIndex, startIndex + itemsPerPage);
              
              return (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Showing {paginatedMessages.length} of {messages.length} messages
                    {totalPages > 1 && (
                      <span> (Page {currentPage} of {totalPages})</span>
                    )}
                  </p>
                </div>
              );
            })()}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const totalPages = Math.ceil(messages.length / itemsPerPage);
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const paginatedMessages = messages.slice(startIndex, startIndex + itemsPerPage);
                      
                      return paginatedMessages.map((msg, index) => (
                      <tr
                        key={msg.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          selected.includes(msg.id) ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selected.includes(msg.id)}
                            onChange={() => toggleSelection(msg.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{msg.name}</div>
                            <div className="text-sm text-gray-500">{msg.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">{msg.subject}</div>
                        </td>
                        <td className="relative text-center max-w-[300px]">
                          <div
                            className="truncate text-gray-800 cursor-pointer"
                            onClick={() => togglePopup(msg.id)}
                          >
                            {msg.message.length > 50 ? msg.message.slice(0, 50) + "..." : msg.message}
                          </div>

                          {/* Popup */}
                          {activeMessageId === msg.id && (
                            <div className="absolute z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                              <div className="bg-gradient-to-l from-indigo-500 to-purple-500 p-0.5 rounded-lg shadow-xl">
                                <div className="bg-gray-50 pt-8 px-4 pb-4 rounded-md w-[300px] h-[180px] text-gray-900 relative overflow-y-auto whitespace-pre-wrap">
                                  <button
                                    onClick={() => setActiveMessageId(null)}
                                    className="absolute top-2 left-1/2 -translate-x-1/2 text-red-600 hover:text-red-800 text-sm font-bold z-50"
                                  >
                                    ✕
                                  </button>
                                  <div className="text-justify">{msg.message}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(msg.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(msg.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                      </tr>
                      ));
                    })()}
                    {messages.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <Trash2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Messages</h3>
                            <p className="text-sm">Customer messages will appear here when received</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {messages.length > 0 && (() => {
                const totalPages = Math.ceil(messages.length / itemsPerPage);
                
                const handlePageChange = (page) => {
                  setCurrentPage(page);
                };
                
                return totalPages > 1 ? (
                  <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing page {currentPage} of {totalPages} ({messages.length} total messages)
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
                        <ChevronLeft className="w-4 h-4" />
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
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      </div>
        </>
    );
}
