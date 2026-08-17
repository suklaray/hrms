import { useState } from "react";
import { X } from "lucide-react";

const SKILLS_OPTIONS = [
  "React", "Next.js", "Node.js", "TypeScript", "JavaScript", "Python",
  "Java", "SQL", "MongoDB", "PostgreSQL", "AWS", "Docker", "Figma",
  "Adobe XD", "Communication", "Leadership", "Project Management",
  "Agile", "Scrum", "REST APIs", "GraphQL", "Git", "CI/CD",
];

export default function MultiSelect({ selected, onChange, placeholder }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = SKILLS_OPTIONS.filter(
    (o) => o.toLowerCase().includes(search.toLowerCase()) && !selected.includes(o)
  );
  const canAddCustom = search.trim() &&
    !SKILLS_OPTIONS.some((o) => o.toLowerCase() === search.toLowerCase()) &&
    !selected.includes(search.trim());

  const add = (skill) => { onChange([...selected, skill]); setSearch(""); };
  const remove = (skill) => onChange(selected.filter((s) => s !== skill));
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && search.trim()) {
      e.preventDefault();
      if (canAddCustom) add(search.trim());
      else if (filtered.length > 0) add(filtered[0]);
    }
  };

  return (
    <div className="relative">
      <div
        className="min-h-[42px] w-full border border-gray-200 rounded-xl bg-gray-50 px-3 py-2 flex flex-wrap gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-transparent"
        onClick={() => setOpen(true)}
      >
        {selected.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-lg">
            {s}
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(s); }} className="hover:text-indigo-900 cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text" value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
        />
      </div>
      {open && (filtered.length > 0 || canAddCustom) && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
            {filtered.map((o) => (
              <li key={o} onClick={() => add(o)} className="px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors">{o}</li>
            ))}
            {canAddCustom && (
              <li onClick={() => add(search.trim())} className="px-4 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 cursor-pointer transition-colors border-t border-gray-100">
                + Add "{search.trim()}"
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
