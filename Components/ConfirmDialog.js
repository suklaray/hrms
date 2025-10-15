import { motion, AnimatePresence } from "framer-motion";

const ConfirmDialog = ({ open, message, onConfirm, onCancel }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-sm text-center"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              {message || "Are you sure?"}
            </h2>
            <div className="flex justify-center gap-4 mt-5">
              <button
                onClick={onCancel}
                className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition"
              >
                No
              </button>
              <button
                onClick={onConfirm}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
              >
                Yes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
