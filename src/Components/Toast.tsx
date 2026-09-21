"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";

const Toast = ({ message, type = "success", onClose }: any) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all duration-300 ${
        type === "success"
          ? "bg-green-50 text-green-800 border-green-200"
          : "bg-red-50 text-red-800 border-red-200"
      }`}
    >
      {type === "success" ? (
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      )}
      <span>{message}</span>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
