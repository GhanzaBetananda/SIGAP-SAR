// ============================================================
// RIWAYAT LAPORAN PELAPOR
// Membaca laporan milik akun yang login (localStorage simulasi)
// beserta status penanganannya dari panel admin:
//   baru -> diproses -> selesai
// Saat backend ada: ganti readSimulatedReports dengan fetch
// "riwayat saya" milik akun.
// ============================================================

import { useEffect, useState } from "react";
import { loadReportsData } from "../utils/api.js";
import { getIncidentLabel, isFireIncident } from "../data/incidentTypes.js";

// Status laporan kini otomatis dari tanggapan instansi (baru ->
// diterima -> diterjunkan -> selesai) — label tambahan di bawah
// menjaga menu dropdown/filter yang masih berbasis "diproses".
export const STATUS_LABELS = {
  baru: "Laporan Baru",
  diproses: "Sedang Diproses",
  diterima: "Diterima",
  diterjunkan: "Tim Diterjunkan",
  selesai: "Selesai",
};

export const STATUS_STYLES = {
  baru: "bg-fireorange/10 text-fireorange-dark",
  diproses: "bg-primary/10 text-primary",
  diterima: "bg-goldyellow/20 text-yellow-700",
  diterjunkan: "bg-primary/10 text-primary",
  selesai: "bg-forestgreen/10 text-forestgreen",
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
    // Ambil dari server (bila backend aktif) lalu filter milik akun ini;
    // gagal/offline akan otomatis memakai cermin localStorage.
    async function refresh() {
      const all = await loadReportsData();
      const mine = all
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
                <p className="font-mono text-sm font-bold text-primary">
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
