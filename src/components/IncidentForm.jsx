import { useReport } from "../context/useReport.js";
import {
  CLASSIFICATIONS,
  NATURAL_DISASTER_SUB_OPTIONS,
} from "../data/incidentTypes.js";
import { Flame, CloudSun } from "lucide-react";

const STANDALONE_OPTIONS = CLASSIFICATIONS.filter((item) => !item.value.startsWith("bencana_alam"));

/**
 * Form klasifikasi kejadian + jumlah korban.
 * Kebakaran vs Non-Kebakaran memiliki nilai berbeda karena
 * menjadi dasar distribusi WhatsApp dan perhitungan jarak.
 */
export default function IncidentForm({ errors = {} }) {
  const { report, updateReport } = useReport();

  const isNaturalDisasterFamily = report.classification.startsWith("bencana_alam");

  function handleClassification(value) {
    updateReport({ classification: value });
  }

  function handleVictimCount(raw) {
    // Simpan string apa adanya agar field tidak memaksa nilai saat diketik
    updateReport({ victimCount: raw });
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-900">Klasifikasi Kejadian</h2>

      <div role="radiogroup" aria-label="Klasifikasi kejadian" className="grid gap-2.5 sm:grid-cols-2">
        {STANDALONE_OPTIONS.map((option) => (
          <ClassificationChip
            key={option.value}
            option={option}
            active={report.classification === option.value}
            onSelect={handleClassification}
          />
        ))}

        {/* Kategori induk: Bencana Alam — pilih satu sub klasifikasi */}
        <div
          className={`grid gap-2.5 rounded-xl border-2 p-4 sm:col-span-2
            ${isNaturalDisasterFamily ? "border-fireorange bg-fireorange/10" : "border-slate-200 bg-white"}`}
        >
          <p className="text-sm font-bold text-slate-900">
            Bencana Alam
            {!isNaturalDisasterFamily && (
              <span className="ml-2 font-normal text-slate-400">
                — pilih salah satu di bawah
              </span>
            )}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {NATURAL_DISASTER_SUB_OPTIONS.map((sub, index) => {
              const SubIcon = index === 0 ? Flame : CloudSun;
              const active = report.classification === sub.value;
              return (
                <button
                  key={sub.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => handleClassification(sub.value)}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left font-semibold transition-all active:scale-[0.97]
                    ${active ? "border-fireorange bg-fireorange text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"}`}
                >
                  <SubIcon className="h-5 w-5 shrink-0" />
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {errors.classification && (
        <p className="mt-2 text-sm font-medium text-red-600">{errors.classification}</p>
      )}

      {/* Jumlah korban */}
      <div className="mt-6">
        <label htmlFor="victim-count" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Jumlah Korban
        </label>
        <input
          id="victim-count"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={report.victimCount}
          onChange={(e) => handleVictimCount(e.target.value)}
          placeholder="Contoh: 3"
          className={`h-14 w-full rounded-xl border-2 bg-white px-4 text-base outline-none focus:border-primary
            ${errors.victimCount ? "border-red-400" : "border-slate-300"}`}
        />
        {errors.victimCount && (
          <p className="mt-2 text-sm font-medium text-red-600">{errors.victimCount}</p>
        )}
      </div>
    </section>
  );
}

function ClassificationChip({ option, active, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onSelect(option.value)}
      className={`rounded-xl border-2 p-4 text-left font-semibold transition-all active:scale-[0.98]
        ${active ? "border-fireorange bg-fireorange/10 text-fireorange-dark" : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"}`}
    >
      {option.label}
    </button>
  );
}
