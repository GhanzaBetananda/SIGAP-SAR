// ============================================================
// RIWAYAT LAPORAN PELAPOR
// Membaca laporan milik akun yang login (localStorage simulasi)
// beserta status penanganannya dari panel admin:
//   baru -> diproses -> selesai
// Saat backend ada: ganti readSimulatedReports dengan fetch
// "riwayat saya" milik akun.
// ============================================================

import { useEffect, useState } from "react";
import { readSimulatedReports } from "../context/reportState.js";
import { getIncidentLabel, isFireIncident } from "../data/incidentTypes.js";

export const STATUS_LABELS = {
  baru: "Laporan Baru",
  diproses: "Sedang Diproses",
  selesai: "Selesai",
};

export const STATUS_STYLES = {
  baru: "bg-orange-50 text-orange-700",
  diproses: "bg-basarnasblue/10 text-basarnasblue",
  selesai: "bg-emerald-50 text-emerald-700",
};

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportHistorySection({ username }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    function refresh() {
      const mine = readSimulatedReports()
        .filter((report) => !username || report.reporterUsername === username)
        .sort((a, b) => new Date(b.submittedAt ?? 0) - new Date(a.submittedAt ?? 0));
      setReports(mine.slice(0, 5)); // 5 terakhir agar dashboard tetap ringkas
    }
    refresh();
    // Ikuti pembaruan storage (mis. admin mengubah status di tab lain)
    window.addEventListener("storage", refresh);
    const interval = setInterval(refresh, 15000);
    return () => {
      window.removeEventListener("storage", refresh);
      clearInterval(interval);
    };
  }, [username]);

  if (reports.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Riwayat Laporan Saya</h2>
        <p className="mt-1 text-sm text-slate-500">
          Belum ada laporan. Laporan yang Anda kirim akan tampil di sini beserta
          nomor tiket dan status penanganannya.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">Riwayat Laporan Saya</h2>
      <p className="mt-0.5 mb-4 text-sm text-slate-500">
        Nomor tiket & status dari BASARNAS. Kunjungi kantor untuk laporan lebih dari
        5 terakhir.
      </p>

      <div className="grid gap-3">
        {reports.map((report) => {
          const status = report.status ?? "baru";
          return (
            <div
              key={report.ticketId ?? report.submittedAt}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-basarnasblue">
                  {report.ticketId ?? "-"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {getIncidentLabel(report.classification) || "-"} —{" "}
                  {formatDateTime(report.submittedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isFireIncident(report.classification) && (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                    Kebakaran
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[status]}`}
                >
                  {STATUS_LABELS[status] ?? status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
