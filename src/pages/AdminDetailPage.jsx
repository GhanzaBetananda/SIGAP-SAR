// ==========================================================//
// HALAMAN DETAIL OPERASI — INFOGRAFIK POSKO
// Menampilkan rincian operasi per hari (personil, peralatan
// dengan jumlah, foto dokumentasi, dan kesimpulan) dalam tata
// letak infografis yang siap ditampilkan sebagai pedoman di posko.
// ============================================================

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Clock,
  MapPin,
  Package,
  Users,
  X,
  CheckCircle2,
  Image,
  FileText,
  LayoutGrid,
} from "lucide-react";
import {
  loadReportsData,
} from "../utils/api.js";
import {
  responseFor,
  totalPersonnelAll,
  totalEquipmentUnitsAll,
  totalEquipmentUnits,
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

function formatDateOnly(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
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
  const mapsUrl = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;

  const totalPersonnel = totalPersonnelAll(operasi);
  const totalEquipment = totalEquipmentUnitsAll(operasi);
  const totalFotos = operasi.reduce(
    (sum, o) => sum + (o.fotos?.length ?? 0),
    0,
  );

  return (
    <div className="flex min-h-dvh flex-col bg-lightbg">
      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/95 backdrop-blur shadow-sm px-6 py-4">
        <div className="mx-auto max-w-3xl lg:max-w-none flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 lg:px-8">
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

      <main className="mx-auto w-full max-w-3xl lg:max-w-none px-6 lg:px-8 pb-12 pt-6">
        {/* Ringkasan laporan — kartu infografis */}
        <section className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-slate-900 uppercase">
                <FileText className="h-4 w-4 text-primary" />
                Ringkasan Laporan
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Informasi awal kejadian dari TKP
              </p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              <Package className="h-3.5 w-3.5" /> {operasi.length} Hari Operasi
            </span>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
              <dt className="text-[10px] font-bold text-slate-500 uppercase">Pelapor</dt>
              <dd className="mt-1 font-bold text-slate-900 truncate sm:text-sm">
                {((report.employeeName || report.potentialSarName || report.kampungRescueName) ?? "-")}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4 sm:col-span-2">
              <dt className="text-[10px] font-bold text-slate-500 uppercase">Klasifikasi Kejadian</dt>
              <dd className="mt-1 font-bold text-slate-900 sm:text-sm">
                {report.classification ?? "-"}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
              <dt className="text-[10px] font-bold text-slate-500 uppercase">Waktu Laporan</dt>
              <dd className="mt-1 font-bold text-slate-900 sm:text-sm">
                {formatDateTime(report.submittedAt)}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4 sm:col-span-2">
              <dt className="text-[10px] font-bold text-slate-500 uppercase">Detail Kejadian</dt>
              <dd className="mt-1 font-bold text-slate-900 whitespace-pre-wrap sm:text-sm">
                {report.detail ?? "-"}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
              <dt className="text-[10px] font-bold text-slate-500 uppercase">Lokasi TKP</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-bold text-slate-900 sm:text-sm">
                {report.latitude && report.longitude ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Buka di Google Maps
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
              <dt className="text-[10px] font-bold text-slate-500 uppercase">Distribusi</dt>
              <dd className="mt-1 font-bold text-slate-900 sm:text-sm">
                {agency === "basarnas" ? "BASARNAS" : "MANGGALA AGNI"}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
              <dt className="text-[10px] font-bold text-slate-500 uppercase">Status</dt>
              <dd className="mt-1 font-bold text-slate-900 sm:text-sm">
                {report.status ?? "baru"}
              </dd>
            </div>
          </dl>

          {/* Statistik ringkasan operasi */}
          {operasi.length > 0 && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip
                label="Total Personil"
                value={totalPersonnel}
                suffix="orang"
                icon={<Users className="h-4 w-4" />}
                tint="bg-primary"
              />
              <StatChip
                label="Total Peralatan"
                value={totalEquipment}
                suffix="unit"
                icon={<Package className="h-4 w-4" />}
                tint="bg-fireorange"
              />
              <StatChip
                label="Hari Operasi"
                value={operasi.length}
                suffix="hari"
                icon={<LayoutGrid className="h-4 w-4" />}
                tint="bg-forestgreen"
              />
              <StatChip
                label="Foto Operasi"
                value={totalFotos}
                suffix="foto"
                icon={<Image className="h-4 w-4" />}
                tint="bg-slate-800"
              />
            </div>
          )}
        </section>

        {/* Detail operasi per hari — kartu infografis per hari */}
        {operasi.length > 0 ? (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold tracking-wide text-slate-900 uppercase">
              <Package className="h-4 w-4" />
              Catatan Operasi Harian — {operasi.length} Hari
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {operasi.map((o) => (
                <OperasiCard key={o.hari} entry={o} />
              ))}
            </div>
            {own.finishedAt && (
              <div className="mt-6 rounded-xl bg-forestgreen/10 border border-forestgreen/20 px-4 py-3">
                <p className="flex items-center gap-1.5 text-sm font-bold text-forestgreen">
                  <CheckCircle2 className="h-4 w-4" /> Tugas Selesai —{" "}
                  {formatDateTime(own.finishedAt)}
                </p>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-300" />
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

/** Kartu infografis satu hari operasi: personil, peralatan + jumlah, foto, kesimpulan. */
function OperasiCard({ entry }) {
  const equipment = entry.equipment ?? [];
  const fotos = entry.fotos ?? [];
  const dayEqTotal = totalEquipmentUnits(equipment);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm">
      {/* Header hari */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            {entry.hari}
          </span>
          <span className="text-sm font-bold text-slate-900 leading-none">
            Hari {entry.hari}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-slate-500">
          {formatDateOnly(entry.tanggal)}
        </span>
      </div>

      {/* Personil */}
      <div className="mb-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Personil Hari Ini</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-extrabold text-primary">
            {entry.personnel ?? 0}
          </span>
          <span className="text-sm font-semibold text-slate-600">orang</span>
        </div>
      </div>

      {/* Peralatan */}
      <div className="mb-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Peralatan Dibawa</p>
        {equipment.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {equipment.map((item) => (
              <span
                key={item.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-bold text-primary"
              >
                {item.name}
                <span className="text-slate-600">× {item.qty}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
              Total {dayEqTotal} unit
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Belum ada peralatan dicatat.</p>
        )}
      </div>

      {/* Foto dokumentasi */}
      {fotos.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Dokumentasi Foto</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {fotos.map((foto, i) => (
              <img
                key={i}
                src={foto.url}
                alt={`Foto operasi hari ${entry.hari} ${i + 1}`}
                className="h-16 w-full rounded-lg object-cover border border-slate-200 bg-slate-50"
              />
            ))}
          </div>
        </div>
      )}

      {/* Kesimpulan operasi */}
      <div className="pt-3 border-t border-slate-100">
        <p className="text-[10px] font-bold text-forestgreen-dark uppercase mb-1.5 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Kesimpulan Operasi
        </p>
        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
          {entry.kesimpulan || "- Belum ada kesimpulan operasi hari ini -"}
        </p>
      </div>
    </div>
  );
}

/** Ringkasan statistik kecil berupa chip. */
function StatChip({ label, value, suffix, icon, tint }) {
  return (
    <div className={`rounded-xl border border-slate-200/60 p-3 ${tint}/10`}>
      <div className="flex items-center gap-2">
        <span className={`rounded-md ${tint} p-1.5`}>{icon}</span>
        <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase">
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-lg font-extrabold text-slate-900">
        {value} <span className="text-sm font-bold text-slate-500">{suffix}</span>
      </p>
    </div>
  );
}
