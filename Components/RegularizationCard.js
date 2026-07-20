import { Clock, AlertCircle, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

// mode: "employee" | "hr"
export default function RegularizationCard({ missedCheckout, onOpenModal }) {
  // const [hrStats, setHrStats] = useState(null);
  // const [loading, setLoading] = useState(mode === "hr");

  // useEffect(() => {
  //   if (mode !== "hr") return;
  //   fetch("/api/hr/regularization?status=PENDING", { credentials: "include" })
  //     .then(async (r) => {
  //       const data = await r.json();
  //       if (!r.ok) {
  //         console.error("RegularizationCard fetch failed:", r.status, data);
  //         return;
  //       }
  //       setHrStats({ pending: data.requests?.length ?? 0 });
  //     })
  //     .catch((err) => console.error("RegularizationCard error:", err))
  //     .finally(() => setLoading(false));
  // }, [mode]);

  // ── HR card ──────────────────────────────────────────────────────────────
  // if (mode === "hr") {
  //   return (
  //     <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col justify-between">
  //       <div className="flex items-center justify-between mb-4">
  //         <h2 className="text-lg font-semibold text-gray-900">Regularization</h2>
  //         <div className="p-2 bg-amber-50 rounded-lg">
  //           <Clock className="w-5 h-5 text-amber-600" />
  //         </div>
  //       </div>

  //       {loading ? (
  //         <div className="flex items-center justify-center h-20">
  //           <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
  //         </div>
  //       ) : (
  //         <div className="space-y-3">
  //           <p className="text-xs text-gray-500">
  //             {hrStats?.pending > 0
  //               ? `${hrStats.pending} request${hrStats.pending > 1 ? "s" : ""} awaiting your review`
  //               : "No pending regularization requests"}
  //           </p>
  //         </div>
  //       )}

  //       <button
  //         onClick={onOpenModal}
  //         className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
  //       >
  //         Review Requests
  //         <ChevronRight className="w-4 h-4" />
  //       </button>
  //     </div>
  //   );
  // }

  // ── Employee card ─────────────────────────────────────────────────────────
  const hasMissed = !!missedCheckout;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Regularization</h2>
        <div className={`p-2 rounded-lg ${hasMissed ? "bg-amber-50" : "bg-green-50"}`}>
          {hasMissed
            ? <AlertCircle className="w-5 h-5 text-amber-600" />
            : <CheckCircle className="w-5 h-5 text-green-600" />}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-gray-500">
          {hasMissed
            ? `You missed check-out on ${new Date(missedCheckout.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}. Submit a regularization request.`
            : "No missed check-outs. Your attendance is up to date."}
        </p>
      </div>

      <button
        onClick={hasMissed ? onOpenModal : undefined}
        disabled={!hasMissed}
        className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          hasMissed
            ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {hasMissed ? "Submit Request" : "All Clear"}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
