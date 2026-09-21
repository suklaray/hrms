"use client";

import React from "react";

const ConfirmDialog = ({ open, message, onConfirm, onCancel }: any) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-sm text-center transform transition-all scale-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          {message || "Are you sure?"}
        </h2>
        <div className="flex justify-center gap-4 mt-5">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition cursor-pointer"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
