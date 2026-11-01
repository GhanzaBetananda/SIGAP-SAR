import { useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

/**
 * Dropdown daftar nama dengan kolom pencarian (untuk Potensi SAR).
 * Daftar muncul setelah kecamatan dipilih.
 */
export default function SearchSelect({
  options = [],
  value,
  onChange,
  placeholder = "Cari & pilih nama...",
  disabled = false,
  disabledPlaceholder = "Pilih kecamatan terlebih dahulu",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((name) => name.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-14 w-full items-center justify-between gap-2 rounded-xl border-2 bg-white px-4 text-left text-base ${disabled ? "cursor-not-allowed border-slate-200 text-slate-400" : value ? "border-slate-800" : "border-slate-300 hover:border-slate-500"}`}
      >
        <span className="truncate">
          {disabled
            ? disabledPlaceholder
            : value || <span className="text-slate-400">{placeholder}</span>}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ketik nama..."
              className="w-full bg-transparent py-1 outline-none placeholder:text-slate-400"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500">Nama tidak ditemukan.</li>
            )}
            {filtered.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`block w-full px-4 py-3 text-left text-sm hover:bg-orange-50 ${value === name ? "bg-orange-100 font-semibold text-orange-800" : "text-slate-700"}`}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <input type="hidden" value={value ?? ""} readOnly />
    </div>
  );
}
