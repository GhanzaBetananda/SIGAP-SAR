// ============================================================
// PAPAN TUGAS PEGAWAI BASARNAS (SAR DUTY BOARD)
// Tampilan khusus akun pegawai_basarnas — terpisah dari alur
// pelapor biasa (potensi_sar / kampung_rescue):
//   - ringkasan ketersediaan (siap / tidak siap membantu)
//   - daftar laporan terbaru yang masuk ke instansi
//   - jarak TKP tiap laporan dari posisi "siap" petugas
//   - tombol buka lokasi TKP di Google Maps
// Sumber data: localStorage (simulasi). Saat backend Apps Script
// jadi, ganti pembacaan data dengan fetch API tanpa rombak UI.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  Flame,
  Inbox,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { loadReportsData, syncReadyStaff } from "../utils/api.js";
import { getIncidentLabel, isFireIncident } from "../data/incidentTypes.js";
import { formatDistanceKm, haversineKm } from "../utils/distanceCalculator.js";
import { readyRecord } from "../utils/sarReadiness.js";
import { STATUS_LABELS, STATUS_STYLES } from "./ReportHistorySection.jsx";

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapsLink(report) {
  return `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
}

export default function SarDutyBoard({ session }) {
  /** Kumpulkan data papan (laporan terbaru + status siap) dari server. */
  const collectBoardData = useCallback(async () => {
    const saved = await loadReportsData();
    // Samakan daftar petugas siap dengan server (bila backend aktif)
    await syncReadyStaff();
    const sorted = saved
      .filter((item) => item.submittedAt)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 10); // 10 laporan terbaru agar papan tetap ringkas
    return { reports: sorted, record: readyRecord(session.username) };
  }, [session.username]);

  const [board, setBoard] = useState({ reports: [], record: null });
  const { reports, record } = board;

  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const next = await collectBoardData();
      if (alive) setBoard(next);
    };
    sync();
    const interval = setInterval(sync, 15000);
    window.addEventListener("storage", sync);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener("storage", sync);
    };
  }, [collectBoardData]);

  const ready = Boolean(record);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      {/* Header + status ketersediaan */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Papan Tugas SAR</h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
            ready
              ? "bg-forestgreen/10 text-forestgreen"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          {ready ? "Ketersediaan: SIAP membantu" : "Ketersediaan: tidak siap"}
        </span>
      </div>
      <p className="mt-0.5 mb-4 text-sm text-slate-500">
        {ready
          ? `Posisi Anda terekam ${formatDateTime(record.checkedInAt)} — jarak ke tiap TKP dihitung dari posisi ini.`
          : "Saat Anda menyatakan siap di kartu ketersediaan di atas, jarak ke tiap TKP muncul di sini."}
      </p>

      {/* Daftar laporan */}
      {reports.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">
          <Inbox className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-600">
            Belum ada laporan masuk
          </p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {reports.map((report) => {
            const fire = isFireIncident(report.classification);
            // Jarak dari posisi petugas siap ke lokasi kejadian
            const selfDistance =
              record &&
              Number.isFinite(report.latitude) &&
              haversineKm(
                { latitude: record.latitude, longitude: record.longitude },
                { latitude: report.latitude, longitude: report.longitude },
              );

            return (
              <li
                key={report.ticketId ?? report.submittedAt}
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-primary">
                        {report.ticketId ?? "-"}
                      </span>
                      {fire && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          <Flame className="h-2.5 w-2.5" /> KEBAKARAN
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {getIncidentLabel(report.classification) || "-"} ·{" "}
                      {report.victimCount} korban · {formatDateTime(report.submittedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        STATUS_STYLES[report.status ?? "baru"]
                      }`}
                    >
                      {STATUS_LABELS[report.status ?? "baru"] ?? "-"}
                    </span>

                    {/* Jarak posisi petugas → TKP */}
                    {selfDistance != null && Number.isFinite(selfDistance) && (
                      <span className="whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                        {formatDistanceKm(selfDistance)} dari Anda
                      </span>
                    )}

                    {/* Buka lokasi TKP di peta */}
                    <a
                      href={mapsLink(report)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Buka lokasi TKP ${report.ticketId ?? ""}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-xs font-bold text-white hover:bg-slate-700 active:scale-95"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Lokasi TKP
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
        <RefreshCw className="h-3 w-3" />
        Diperbarui otomatis setiap 15 detik — 10 laporan terbaru (simulasi frontend;
        backend akan menyajikan seluruh laporan instansi).
      </p>
    </section>
  );
}
