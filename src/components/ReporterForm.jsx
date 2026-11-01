import { useReport } from "../context/useReport.js";
import { BASARNAS_EMPLOYEES } from "../data/employees.js";
import { DISTRICTS } from "../data/districts.js";
import { POTENTIAL_SAR } from "../data/potentialSar.js";
import SearchSelect from "./SearchSelect.jsx";
import { Building2, ChevronDown, HeartHandshake } from "lucide-react";

const CATEGORY_OPTIONS = [
  {
    value: "pegawai_basarnas",
    label: "Pegawai BASARNAS",
    description: "Laporkan sebagai pegawai kantor BASARNAS.",
    icon: Building2,
  },
  {
    value: "potensi_sar",
    label: "Potensi SAR",
    description: "Laporkan sebagai relawan Potensi SAR di kecamatan Anda.",
    icon: HeartHandshake,
  },
];

/**
 * Form identitas pelapor:
 * - Pegawai BASARNAS  -> dropdown 5 nama pegawai
 * - Potensi SAR       -> pilih kecamatan -> cari/pilih nama
 */
export default function ReporterForm({ errors = {} }) {
  const { report, updateReport } = useReport();

  const potentialSarNames = report.district ? (POTENTIAL_SAR[report.district] ?? []) : [];

  function handleCategoryChange(value) {
    // Reset isian identitas saat berganti kategori
    updateReport({
      reporterCategory: value,
      employeeName: "",
      district: "",
      potentialSarName: "",
    });
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-1 text-lg font-bold text-slate-900">Informasi Awal</h2>
      <p className="mb-5 text-sm text-slate-500">
        Wajib diisi sebelum Panic Button dapat digunakan.
      </p>

      {/* Kategori pelapor */}
      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = report.reporterCategory === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleCategoryChange(option.value)}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all active:scale-[0.98]
                ${active ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white hover:border-slate-400 active:border-slate-400"}`}
            >
              <span
                className={`mt-0.5 rounded-lg p-2 ${active ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-bold text-slate-900">{option.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      {errors.reporterCategory && (
        <p className="mt-2 text-sm font-medium text-red-600">{errors.reporterCategory}</p>
      )}

      {/* Isian identitas sesuai kategori */}
      {report.reporterCategory === "pegawai_basarnas" && (
        <div className="mt-5">
          <label htmlFor="employee-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Nama Pegawai BASARNAS
          </label>
          <div className="relative">
            <select
              id="employee-name"
              value={report.employeeName}
              onChange={(e) => updateReport({ employeeName: e.target.value })}
              className={`h-14 w-full appearance-none rounded-xl border-2 bg-white pl-4 pr-11 text-base outline-none focus:border-slate-800
                ${errors.employeeName ? "border-red-400" : report.employeeName ? "border-slate-800" : "border-slate-300"}`}
            >
              <option value="">— Pilih nama Anda —</option>
              {BASARNAS_EMPLOYEES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          </div>
          {errors.employeeName && (
            <p className="mt-2 text-sm font-medium text-red-600">{errors.employeeName}</p>
          )}
        </div>
      )}

      {report.reporterCategory === "potensi_sar" && (
        <div className="mt-5 grid gap-4">
          <div>
            <label htmlFor="district" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Kecamatan
            </label>
            <div className="relative">
              <select
                id="district"
                value={report.district}
                onChange={(e) =>
                  updateReport({ district: e.target.value, potentialSarName: "" })
                }
                className={`h-14 w-full appearance-none rounded-xl border-2 bg-white pl-4 pr-11 text-base outline-none focus:border-slate-800
                  ${errors.district ? "border-red-400" : report.district ? "border-slate-800" : "border-slate-300"}`}
              >
                <option value="">— Pilih kecamatan —</option>
                {DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            </div>
            {errors.district && (
              <p className="mt-2 text-sm font-medium text-red-600">{errors.district}</p>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Nama Potensi SAR
            </span>
            <SearchSelect
              options={potentialSarNames}
              value={report.potentialSarName}
              onChange={(name) => updateReport({ potentialSarName: name })}
              disabled={!report.district}
            />
            {errors.potentialSarName && (
              <p className="mt-2 text-sm font-medium text-red-600">{errors.potentialSarName}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
