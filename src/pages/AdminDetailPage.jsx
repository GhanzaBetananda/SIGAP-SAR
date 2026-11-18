// ==========================================================//
// HALAMAN DETAIL OPERASI — DIBUKA DI TAB/JENENDA LAIN
// Menampilkan rincian personil, peralatan, dan kesimpulan
// operasi per hari untuk keperluan posko.
// ============================================================

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Clock, MapPin, Package, Users, X, CheckCircle2 } from "lucide-react";
import {
  loadReportsData,
  patchReportOnServer,
} from "../utils/api.js";
import {
  responseFor,
  totalPersonnelAll,
  totalEquipmentUnitsAll,
} from "../utils/reportResponses.js";

function formatDateTime(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDetailPage({ agency = "basarnas" }) {
  const { ticketId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const all = await loadReportsData();
        const found = all.find(
          (r) => r.ticketId === ticketId || r.submittedAt === ticketId,
        );
        if (found) setReport(found);
        else setError("Laporan tidak ditemukan.");
      } catch {
        setError("Gagal memuat data laporan.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-lightbg">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-8 w-8 rounded-full border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600">Memuat detail operasi...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-lightbg p-6">
        <div className="max-w-md text-center">
          <X className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            {error || "Data Tidak Ditemukan"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Laporan dengan tiket <code>{ticketId}</code> tidak tersedia.
          </p>
          <button
            onClick={() => window.close()}
            className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 text-sm font-bold text-white hover:bg-slate-700"
          >
            Tutup Tab
          </button>
        </div>
      </div>
    );
  }

  const own = responseFor(report, agency);
  const operasi = own.operasi ?? [];
  const fire = report.classification?.includes("kebakaran") || false;
  const mapsUrl = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;

  return (
    <div className="flex min-h-dvh flex-col bg-lightbg">
      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/95 backdrop-blur shadow-sm px-6 py-4">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-extrabold tracking-wide text-primary">
              Detail Operasi
            </h1>
            <span className="rounded-full bg-fireorange/10 px-2 py-0.5 text-[10px] font-bold text-fireorange">
              Tiket {report.ticketId ?? "-"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Clock className="h-4 w-4" /> Cetak
            </button>
            <button
              onClick={() => window.close()}
              className="flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4" /> Tutup
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 pb-12 pt-6">
        {/* Ringkasan laporan */}
        <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-extrabold tracking-wide text-slate-900 uppercase">
            Ringkasan Laporan
          </h2>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500 uppercase">Pelapor</dt>
              <dd className="font-bold text-slate-900 truncate">
                {((report.employeeName || report.potentialSarName || report.kampungRescueName) ?? "-")}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 sm:col-span-2">
              <dt className="text-slate-500 uppercase">Klasifikasi Kejadian</dt>
              <dd className="font-bold text-slate-900">
                {report.classification ?? "-"}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500 uppercase">Waktu Laporan</dt>
              <dd className="font-bold text-slate-900">
                {formatDateTime(report.submittedAt)}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 sm:col-span-2">
              <dt className="text-slate-500 uppercase">Detail Kejadian</dt>
              <dd className="font-bold text-slate-900 whitespace-pre-wrap">
                {report.detail ?? "-"}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500 uppercase">Lokasi TKP</dt>
              <dd className="font-bold text-slate-900">
                {report.latitude && report.longitude ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <MapPin className="h-4 w-4" /> Buka di Google Maps
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500 uppercase">Distribusi</dt>
              <dd className="font-bold text-slate-900">
                {agency === "basarnas" ? "BASARNAS" : "MANGGALA AGNI"}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500 uppercase">Status</dt>
              <dd className="font-bold text-slate-900">
                {report.status ?? "baru"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Detail operasi per hari */}
        {operasi.length > 0 ? (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold tracking-wide text-slate-900 uppercase">
              <Package className="h-4 w-4" />
              Catatan Operasi Harian — {operasi.length} Hari
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-bold w-12 text-center">Hari</th>
                    <th className="px-4 py-3 font-bold">Tanggal</th>
                    <th className="px-4 py-3 font-bold text-center w-20">Personil</th>
                    <th className="px-4 py-3 font-bold text-center w-32">Alat (Unit)</th>
                    <th className="px-4 py-3 font-bold">Kesimpulan Operasi</th>
                    <th className="px-4 py-3 font-bold w-24 text-center">Waktu Input</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {operasi.map((o) => (
                    <tr key={o.hari} className="text-sm">
                      <td className="px-4 py-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white mx-auto">
                          {o.hari}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {o.tanggal}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-900">
                        {o.personnel} orang
                      </td>
                      <td className="px-4 py-3 text-center">
                        {totalEquipmentUnitsAll([o])} unit
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-pre-wrap">
                        {o.kesimpulan || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono text-center">
                        {formatDateTime(o.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-bold text-sm text-slate-900">
                    <td className="px-4 py-3" colSpan="2">Total</td>
                    <td className="px-4 py-3 text-center">
                      {totalPersonnelAll(operasi)} orang
                    </td>
                    <td className="px-4 py-3 text-center">
                      {totalEquipmentUnitsAll(operasi)} unit
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>

            {own.finishedAt && (
              <div className="mt-4 rounded-xl bg-forestgreen/10 px-3 py-2.5 text-xs text-forestgreen">
                <p className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Tugas Selesai —{" "}
                  {formatDateTime(own.finishedAt)}
                </p>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 font-bold text-slate-700">Belum Ada Catatan Operasi</h3>
            <p className="mt-1 text-sm text-slate-500">
              Tim instansi belum mencatat entri operasi harian untuk laporan ini.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
