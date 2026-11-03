// ============================================================
// PANEL ADMIN BASARNAS — HISTORY LAPORAN PANIC BUTTON
// Halaman milik "domain berbeda" (mis. admin.panicbutton...):
// dipisahkan dari alur pelapor publik dan dilayani lewat route
// /admin yang dipetakan via vercel.json (rewrites).
//
// Sumber data saat ini: laporan terkirim pada perangkat ini
// (localStorage, simulasi frontend). Saat backend tersedia,
// cukup ganti sumber data di loadReports() dengan fetch API.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  Flame,
  Inbox,
  ListChecks,
  LogOut,
  Lock,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Siren,
  UserRound,
  Users,
} from "lucide-react";
import { readSimulatedReports } from "../context/reportState.js";
import { getIncidentLabel, isFireIncident } from "../data/incidentTypes.js";
import { REPORTER_CATEGORIES, reporterName } from "../utils/whatsappGenerator.js";
import { formatDistanceKm } from "../utils/distanceCalculator.js";
import { publicUrl } from "../utils/domains.js";
import {
  adminLogin,
  adminLogout,
  isAdminAuthenticated,
} from "../config/adminAuth.js";

const LOGOS = [
  { src: "/456.png", alt: "Logo 456" },
  { src: "/472.png", alt: "Logo 472" },
  { src: "/BASARNAS.png", alt: "Logo BASARNAS" },
];

const FIRE = "fire";
const NON_FIRE = "non_fire";

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

/** Teks singkat wilayah pelapor (kecamatan / desa). */
function reporterRegion(report) {
  if (report.reporterCategory === "potensi_sar") return report.district;
  if (report.reporterCategory === "kampung_rescue") return report.kampungRescueDesa;
  return "";
}

function statusDistribusi(report) {
  return isFireIncident(report.classification)
    ? "BASARNAS + Manggala Agni"
    : "BASARNAS";
}

/**
 * Gerbang admin: halaman login ditampilkan selama belum terautentikasi,
 * panel history baru terbuka setelah login berhasil.
 */
export default function AdminHistory() {
  const [authenticated, setAuthenticated] = useState(() => isAdminAuthenticated());

  if (!authenticated) {
    return <AdminLogin onSuccess={() => setAuthenticated(true)} />;
  }
  return <AdminDashboard onLogout={() => setAuthenticated(false)} />;
}

/**
 * Halaman login khusus panel admin.
 */
function AdminLogin({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (adminLogin(username, password)) {
      setError("");
      onSuccess();
    } else {
      setError("Username atau password salah.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <div className="h-1 bg-gradient-to-r from-basarnasblue via-basarnasblue to-sarorange" />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          {/* Baris logo instansi */}
          <div className="flex items-center justify-center gap-1.5">
            {[ "/456.png", "/472.png", "/BASARNAS.png" ].map((src) => (
              <img
                key={src}
                src={src}
                alt={src.includes("BASARNAS") ? "Logo BASARNAS" : `Logo ${src}`}
                className="h-10 w-10 rounded-full bg-white object-contain p-0.5 ring-1 ring-slate-200"
              />
            ))}
          </div>

          <h1 className="mt-4 text-center text-lg font-extrabold tracking-wide text-basarnasblue">
            ADMIN BASARNAS
          </h1>
          <p className="mt-1 text-center text-xs text-slate-500">
            Panel internal — masuk dengan akun petugas
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div>
              <label htmlFor="admin-username" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Username
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  autoFocus
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-4 text-base outline-none focus:border-basarnasblue"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-4 text-base outline-none focus:border-basarnasblue"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            {/* Tombol login */}
            <button
              type="submit"
              disabled={!username || !password}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-basarnasblue text-base font-bold text-white transition-all hover:bg-basarnasblue-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShieldCheck className="h-5 w-5" />
              Masuk Panel Admin
            </button>
          </form>
        </div>
      </div>

      <footer className="border-t border-slate-200/70 bg-white py-4 text-center text-xs text-slate-500">
        ADMIN BASARNAS — Akses terbatas bagi petugas berwenang
      </footer>
    </div>
  );
}

function AdminDashboard({ onLogout }) {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadReports = useCallback(() => {
    const history = readSimulatedReports()
      .filter((item) => Boolean(item.submittedAt))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    setReports(history);
    setUpdatedAt(new Date());
  }, []);

  useEffect(() => {
    loadReports();
    // Segarkan otomatis agar laporan baru terlihat tanpa reload manual
    const interval = setInterval(loadReports, 15000);
    return () => clearInterval(interval);
  }, [loadReports]);

  const filtered = reports.filter((report) => {
    const fire = isFireIncident(report.classification);
    if (filter === FIRE && !fire) return false;
    if (filter === NON_FIRE && fire) return false;

    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [
      reporterName(report),
      REPORTER_CATEGORIES[report.reporterCategory],
      reporterRegion(report),
      getIncidentLabel(report.classification),
      reporterName(report) + " " + reporterRegion(report),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const stats = {
    total: reports.length,
    fire: reports.filter((r) => isFireIncident(r.classification)).length,
    nonFire: reports.filter((r) => !isFireIncident(r.classification)).length,
    victims: reports.reduce((sum, r) => sum + (Number(r.victimCount) || 0), 0),
  };

  const FILTERS = [
    { value: "all", label: "Semua", count: stats.total },
    { value: FIRE, label: "Kebakaran", count: stats.fire },
    { value: NON_FIRE, label: "Non-Kebakaran", count: stats.nonFire },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      {/* Header admin — gaya berbeda dari aplikasi pelapor publik */}
      <header className="safe-area-top sticky top-0 z-30 border-b border-slate-200/70 bg-white/95 shadow-sm shadow-slate-900/5 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-3 py-3.5 sm:gap-3 sm:px-4">
          <span className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {LOGOS.map((logo) => (
              <img
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                className="h-7 w-7 rounded-full bg-white object-contain p-0.5 ring-1 ring-slate-200 sm:h-9 sm:w-9"
              />
            ))}
          </span>

          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex flex-wrap items-center gap-x-2 text-sm font-extrabold tracking-wide text-basarnasblue sm:text-base">
              ADMIN BASARNAS
              <span className="rounded-full bg-sarorange/10 px-2 py-0.5 text-[9px] font-bold tracking-widest text-sarorange sm:text-[10px]">
                PANEL INTERNAL
              </span>
            </p>
            <p className="text-[10px] leading-snug text-slate-500 sm:text-[11px]">
              History Laporan Panic Button
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              adminLogout();
              onLogout();
            }}
            aria-label="Keluar"
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>

          <button
            type="button"
            onClick={loadReports}
            aria-label="Segarkan data"
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>

        {/* Garis aksen dibalik sesuai posisi domain admin */}
        <div className="h-1 bg-gradient-to-r from-basarnasblue via-basarnasblue to-sarorange" />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-5">
        {/* Ringkasan statistik */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<ListChecks className="h-5 w-5" />}
            label="Total Laporan"
            value={stats.total}
            tint="bg-basarnasblue"
          />
          <StatCard
            icon={<Flame className="h-5 w-5" />}
            label="Kebakaran"
            value={stats.fire}
            tint="bg-red-600"
          />
          <StatCard
            icon={<Siren className="h-5 w-5" />}
            label="Non-Kebakaran"
            value={stats.nonFire}
            tint="bg-sarorange"
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Total Korban"
            value={stats.victims}
            tint="bg-slate-800"
          />
        </section>

        {/* Filter + pencarian */}
        <section className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors
                  ${filter === item.value
                    ? "border-basarnasblue bg-basarnasblue text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}
              >
                {item.label}
                <span className="ml-1.5 text-xs opacity-70">{item.count}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pelapor / kecamatan / klasifikasi..."
            className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-base outline-none focus:border-basarnasblue sm:max-w-xs"
          />
        </section>

        {/* Daftar history laporan */}
        <section className="mt-5">
          {updatedAt && (
            <p className="mb-3 text-xs text-slate-400">
              Diperbarui {formatDateTime(updatedAt.toISOString())} — data dibaca dari
              laporan terkirim pada perangkat ini (simulasi frontend; backend akan
              menyajikan laporan dari seluruh pelapor).
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
              <Inbox className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-bold text-slate-700">Belum ada laporan</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Laporan yang dikirim melalui Panic Button pada perangkat ini akan
                muncul di sini secara otomatis.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              {/* Tabel untuk layar lebar */}
              <table className="hidden w-full text-left text-sm md:table">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-bold">Waktu</th>
                    <th className="px-4 py-3 font-bold">Pelapor</th>
                    <th className="px-4 py-3 font-bold">Klasifikasi</th>
                    <th className="px-4 py-3 text-center font-bold">Korban</th>
                    <th className="px-4 py-3 font-bold">Jarak ke BASARNAS</th>
                    <th className="px-4 py-3 font-bold">TKP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((report) => (
                    <ReportRow key={report.id ?? report.submittedAt} report={report} variant="table" />
                  ))}
                </tbody>
              </table>

              {/* Kartu untuk layar HP */}
              <div className="divide-y divide-slate-100 md:hidden">
                {filtered.map((report) => (
                  <ReportRow key={report.id ?? report.submittedAt} report={report} variant="card" />
                ))}
              </div>
            </div>
          )}
        </section>

        {reports.length > 0 && filtered.length !== reports.length && (
          <p className="mt-3 text-center text-xs text-slate-400">
            Menampilkan {filtered.length} dari {reports.length} laporan (difilter).
          </p>
        )}
      </main>

      <footer className="border-t border-slate-200/70 bg-white">
        <div className="safe-area-bottom mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-5 text-center text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-semibold text-basarnasblue">
            <ShieldCheck className="h-3.5 w-3.5" /> Panel Admin — panicbutton.basarnas
          </span>
          <span className="text-slate-300">|</span>
          <a href={publicUrl()} className="underline-offset-2 hover:underline">
            Buka aplikasi pelapor (domain publik)
          </a>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, tint }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <span className={`inline-flex rounded-lg ${tint} p-2 text-white`}>{icon}</span>
      <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function ClassificationBadge({ classification }) {
  const fire = isFireIncident(classification);
  const label = getIncidentLabel(classification) || "-";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        fire ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"
      }`}
    >
      {fire && <Flame className="h-3 w-3" />}
      {label}
    </span>
  );
}

/** Satu baris laporan: tabel (md+) atau kartu (HP). */
function ReportRow({ report, variant }) {
  const fire = isFireIncident(report.classification);
  const mapsUrl = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
  const region = reporterRegion(report);
  const category = REPORTER_CATEGORIES[report.reporterCategory] || "-";
  const name = reporterName(report);

  if (variant === "table") {
    return (
      <tr className="transition-colors hover:bg-slate-50/80">
        <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-700">
          {formatDateTime(report.submittedAt)}
        </td>
        <td className="px-4 py-3">
          <p className="font-bold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">
            {category}
            {region ? ` — ${region}` : ""}
          </p>
        </td>
        <td className="px-4 py-3">
          <ClassificationBadge classification={report.classification} />
        </td>
        <td className="px-4 py-3 text-center font-bold text-slate-900">
          {report.victimCount}
        </td>
        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
          {formatDistanceKm(report.distances?.basarnas ?? null)}
        </td>
        <td className="px-4 py-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-basarnasblue px-3 py-1.5 text-xs font-bold text-white hover:bg-basarnasblue-dark"
          >
            <MapPin className="h-3.5 w-3.5" /> Google Maps
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
        </td>
      </tr>
    );
  }

  // Kartu untuk layar HP
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{name}</p>
          <p className="truncate text-xs text-slate-500">
            {category}
            {region ? ` — ${region}` : ""}
          </p>
        </div>
        <ClassificationBadge classification={report.classification} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-slate-500">Waktu</dt>
          <dd className="font-bold text-slate-800">{formatDateTime(report.submittedAt)}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-slate-500">Korban</dt>
          <dd className="font-bold text-slate-800">{report.victimCount} jiwa</dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-slate-500">Jarak BASARNAS</dt>
          <dd className="font-bold text-slate-800">
            {formatDistanceKm(report.distances?.basarnas ?? null)}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-slate-500">Distribusi ke</dt>
          <dd className="font-bold text-slate-800">{statusDistribusi(report)}</dd>
        </div>
      </dl>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className={`mt-3 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white
          ${fire ? "bg-red-600 hover:bg-red-700" : "bg-basarnasblue hover:bg-basarnasblue-dark"}`}
      >
        <MapPin className="h-4 w-4" /> Lihat TKP di Google Maps
        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
      </a>
    </div>
  );
}
