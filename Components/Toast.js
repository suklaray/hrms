import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";

const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-8 rounded-2xl shadow-lg font-semibold text-gray-800 w-[90%] sm:w-auto sm:min-w-[320px] justify-center ${
            type === "success" ? "bg-green-200" : "bg-red-200"
          }`}
        >
          {type === "success" ? (
            <CheckCircle className="w-8 h-8" />
          ) : (
            <XCircle className="w-8 h-8" />
          )}
          <p className="text-sm sm:text-base text-center">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
