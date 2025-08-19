import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import SideBar from "@/Components/SideBar";

export default function CustomerConnect() {
    const [messages, setMessages] = useState([]);
    const [selected, setSelected] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [activeMessageId, setActiveMessageId] = useState(null);
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
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-indigo-200">
        <SideBar />

        <div className="flex-grow p-6">
            <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-indigo-800 text-center w-full">
                CUSTOMER CONNECT
            </h1>
            </div>

            {selected.length > 0 && (
            <div className="flex justify-end items-center gap-3 mb-2 text-sm text-red-600 font-semibold">
                <span>{selected.length} selected</span>
                <button onClick={handleDelete} title="Delete selected">
                <Trash2 className="hover:text-red-800 transition" />
                </button>
            </div>
            )}

            <div className="overflow-visible relative rounded-xl shadow-xl bg-white z-0">
            <table className="min-w-full text-center text-sm border-collapse">
                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white uppercase text-xs tracking-wider">
                <tr>
                    <th className="p-4">
                    <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                    />
                    </th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Message</th>
                    <th className="p-4">Date</th>
                </tr>
                </thead>
                <tbody>
                {messages.map((msg, index) => (
                    <tr
                    key={msg.id}
                    className={`${
                        selected.includes(msg.id) ? "bg-indigo-200" : index % 2 === 0 ? "bg-white" : "bg-indigo-50"
                    } hover:bg-blue-200 transition-all duration-200`}
                    >
                        <td className="p-4 align-middle">
                            <input
                            type="checkbox"
                            checked={selected.includes(msg.id)}
                            onChange={() => toggleSelection(msg.id)}
                            />
                        </td>
                        <td className="p-4">{msg.name}</td>
                        <td className="p-4">{msg.email}</td>
                        <td className="p-4">{msg.subject}</td>
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





                    <td className="p-4">
                        {new Date(msg.created_at).toLocaleString()}
                    </td>
                    </tr>
                ))}
                {messages.length === 0 && (
                    <tr>
                    <td colSpan="6" className="p-6 text-center text-gray-500">
                        No messages found.
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
