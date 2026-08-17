import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

export default function Pagination({ total, page, perPage, onPageChange, onPerPageChange }) {
  const totalPages = Math.ceil(total / perPage);
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
      <span className="text-sm text-gray-500">Rows per page:</span>

      <div className="relative">
        <select
          value={perPage}
          onChange={(e) => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}
          className="appearance-none pl-3 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
        >
          {[10, 50, 100, 500].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>

      <span className="text-sm text-gray-500">{from}-{to} of {total}</span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
