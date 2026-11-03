import {
  Mic,
  PencilLine,
  Flame,
} from "lucide-react";
import { getIncidentLabel, isFireIncident } from "../data/incidentTypes.js";
import { REPORTER_CATEGORIES } from "../utils/whatsappGenerator.js";

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Rekap informasi laporan. Dipakai di halaman Panic Report agar
 * pengguna dapat melihat kembali informasi awal sebelum submit,
 * dan sebagai ringkasan dalam konfirmasi SweetAlert2.
 */
export default function ReportSummary({ report, onEdit }) {
  const fire = isFireIncident(report.classification);

  const fields = [
    {
      label: "Kategori Pelapor",
      value: REPORTER_CATEGORIES[report.reporterCategory] || "-",
    },
    {
      label: "Nama Pelapor",
      value:
        report.reporterCategory === "pegawai_basarnas"
          ? report.employeeName
          : report.reporterCategory === "potensi_sar"
            ? report.potentialSarName
            : report.reporterCategory === "kampung_rescue"
              ? report.kampungRescueName
              : "-",
    },
    ...(report.reporterCategory === "potensi_sar"
      ? [{ label: "Kecamatan", value: report.district }]
      : []),
    ...(report.reporterCategory === "kampung_rescue"
      ? [{ label: "Desa", value: report.kampungRescueDesa }]
      : []),
    { label: "Klasifikasi Kejadian", value: getIncidentLabel(report.classification) || "-" },
    { label: "Jumlah Korban", value: String(report.victimCount) },
    { label: "Latitude", value: String(report.latitude) },
    { label: "Longitude", value: String(report.longitude) },
    {
      label: "Voice Note",
      value: report.voiceNoteUrl
        ? `Tersedia (${formatDuration(report.voiceNoteDuration)})`
        : "Belum direkam",
      icon: Mic,
    },
  ];

  return (
    <section className="rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Ringkasan Informasi Laporan</h2>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:text-orange-700"
          >
            <PencilLine className="h-4 w-4" /> Ubah Informasi Awal
          </button>
        )}
        {fire && (
          <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
            <Flame className="h-3.5 w-3.5" /> Kejadian Kebakaran — 2 tujuan WA
          </span>
        )}
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2.5"
          >
            <dt className="font-medium text-slate-500">{field.label}</dt>
            <dd className="text-right font-bold text-slate-900">{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
