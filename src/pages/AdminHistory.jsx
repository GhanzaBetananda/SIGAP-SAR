// ============================================================
// PANEL ADMIN BASARNAS — HISTORY LAPORAN PANIC BUTTON
// Halaman milik "domain berbeda" (mis. admin.sigapsar...):
//
// Fitur: statistik, filter+pencarian, nomor tiket, foto TKP,
// alur status pelaporan (Baru -> Diproses -> Selesai), dan
// peringatan suara+banner saat laporan baru masuk.
// Sumber data saat ini: localStorage perangkat ini (simulasi).
// Ganti loadReports()/updateStatus() dengan fetch API s
// saat backend tersedia.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Flame,
  Inbox,
  ListChecks,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Siren,
  TriangleAlert,
  Users,
} from "lucide-react";
import {
  readSimulatedReports,
  writeSimulatedReports,
} from "../context/reportState.js";
import { getIncidentLabel, isFireIncident } from "../data/incidentTypes.js";
import { districtLabel } from "../data/districts.js";
import { REPORTER_CATEGORIES, reporterName } from "../utils/whatsappGenerator.js";
import { formatDistanceKm } from "../utils/distanceCalculator.js";
import { publicUrl, manggalaUrl } from "../utils/domains.js";
import {
  adminLogin,
  adminLogout,
  getAdminAgency,
  AGENCY_LABELS,
} from "../config/adminAuth.js";
import { STATUS_LABELS, STATUS_STYLES } from "../components/ReportHistorySection.jsx";

const LOGOS_BASARNAS = [
  { src: "/456.png", alt: "Logo 456" },
  { src: "/472.png", alt: "Logo 472" },
  { src: "/BASARNAS.png", alt: "Logo BASARNAS" },
];

const LOGOS_MANGGALA = [
  { src: "/kemenhut.jpg", alt: "Logo Kementerian Kehutanan" },
  { src: "/manggala.png", alt: "Logo Manggala Agni" },
];

/** Set logo sesuai instansi domain. */
function logoSet(agency) {
  return agency === "manggala_agni" ? LOGOS_MANGGALA : LOGOS_BASARNAS;
}

const FIRE = "fire";
const NON_FIRE = "non_fire";

/** Dua nada pendek sebagai alarm laporan baru (tanpa berkas audio). */
function playAlertTone() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [0, 0.25].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.12, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.2);
    });
    setTimeout(() => ctx.close?.(), 800);
  } catch {
    /* audio diblokir browser — banner tetap muncul */
  }
}

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
  if (report.reporterCategory === "potensi_sar") return districtLabel(report.district);
  if (report.reporterCategory === "kampung_rescue") return report.kampungRescueDesa;
  return "";
}

function statusDistribusi(report) {
  return isFireIncident(report.classification)
    ? "BASARNAS + Manggala Agni"
    : "BASARNAS";
}

/**
 * Gerbang admin: halaman login ditampilkan selama belum terautentikasi.
 * Prop agency mengikuti domain — sesi tab yang tertancap instansi
 * berbeda dianggap belum login agar tidak tertukar antarinstansi.
 */
export default function AdminHistory({ agency = "basarnas" }) {
  const [agencySession, setAgencySession] = useState(() => getAdminAgency());

  useEffect(() => {
    const active = getAdminAgency();
    if (active && active !== agency) adminLogout();
  }, [agency]);

  if (!agencySession || agencySession !== agency) {
    return (
      <AdminLogin
        agency={agency}
        onSuccess={() => setAgencySession(getAdminAgency())}
      />
    );
  }
  return (
    <AdminDashboard
      agency={agency}
      onLogout={() => setAgencySession(null)}
    />
  );
}

/**
 * Halaman login khusus panel admin — instansi sasaran ditulis jelas.
 */
function AdminLogin({ agency, onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const loggedAgency = adminLogin(username, password, agency);
    if (loggedAgency) {
      setError("");
      onSuccess();
    } else {
      setError("Username atau password salah.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-lightbg">
      <div className="h-1 bg-gradient-to-r from-primary via-goldyellow to-fireorange" />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-center gap-1.5">
            {logoSet(agency).map((logo) => (
              <img
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                className="h-10 w-10 rounded-full bg-white object-contain p-0.5 ring-1 ring-slate-200"
              />
            ))}
          </div>

          <h1 className="mt-4 text-center text-lg font-extrabold tracking-wide text-primary">
            ADMIN SAT SET
          </h1>
          <p className="mt-1 text-center text-xs leading-snug text-slate-500">
            Panel internal — {AGENCY_LABELS[agency] || agency}
            <br />
            {agency === "manggala_agni"
              ? "Manggala Agni, Kementerian Kehutanan"
              : "Badan SAR Nasional (BASARNAS)"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div>
              <label htmlFor="admin-username" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoFocus
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-base outline-none focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-base outline-none focus:border-primary"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!username || !password}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white transition-all hover:bg-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShieldCheck className="h-5 w-5" />
              Masuk Panel Admin
            </button>
          </form>
        </div>
      </div>

      <footer className="border-t border-slate-200/70 bg-white py-4 text-center text-xs text-slate-500">
        ADMIN SAT SET — Akses terbatas bagi petugas berwenang ({AGENCY_LABELS[agency]})
      </footer>
    </div>
  );
}

function AdminDashboard({ agency = "basarnas", onLogout }) {
  const isAgni = agency === "manggala_agni";
  const agencyTitle = isAgni ? "ADMIN MANGGALA AGNI" : "ADMIN SAT SET";
  const agencyBadge = isAgni ? "MANGGALA AGNI — KEMHUB" : "PANEL INTERNAL BASARNAS";
  const agencyHint = isAgni
    ? "History Laporan Kebakaran (Diteruskan dari BASARNAS)"
    : "History Laporan Panic Button";
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [newCount, setNewCount] = useState(0);
  const prevCountRef = useRef(0);

  const loadReports = useCallback(() => {
    const history = readSimulatedReports()
      .filter((item) => Boolean(item.submittedAt))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    // Peringatan laporan baru: bunyi + banner (bukan pada pemuatan awal)
    if (prevCountRef.current > 0 && history.length > prevCountRef.current) {
      setNewCount((prev) => prev + (history.length - prevCountRef.current));
      playAlertTone();
    }
    prevCountRef.current = history.length;

    setReports(history);
    setUpdatedAt(new Date());
  }, []);

  /** Ubah status penanganan laporan (baru -> diproses -> selesai). */
  const updateStatus = useCallback(
    (ticketId, status) => {
      const next = readSimulatedReports().map((report) =>
        report.ticketId === ticketId ? { ...report, status } : report,
      );
      writeSimulatedReports(next);
      loadReports();
    },
    [loadReports],
  );

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 15000);
    return () => clearInterval(interval);
  }, [loadReports]);

  // Panel Manggala Agni hanya menerima laporan kebakaran (sasiran distribusi)
  const scopedReports = isAgni
    ? reports.filter((report) => isFireIncident(report.classification))
    : reports;

  const filtered = scopedReports.filter((report) => {
    const fire = isFireIncident(report.classification);
    if (filter === FIRE && !fire) return false;
    if (filter === NON_FIRE && fire) return false;
    if (filter === "baru" && (report.status ?? "baru") !== "baru") return false;
    if (filter === "diproses" && (report.status ?? "baru") !== "diproses") return false;
    if (filter === "selesai" && (report.status ?? "baru") !== "selesai") return false;

    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [
      report.ticketId,
      reporterName(report),
      REPORTER_CATEGORIES[report.reporterCategory],
      reporterRegion(report),
      getIncidentLabel(report.classification),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const stats = {
    total: scopedReports.length,
    fire: scopedReports.filter((r) => isFireIncident(r.classification)).length,
    nonFire: scopedReports.filter((r) => !isFireIncident(r.classification)).length,
    victims: scopedReports.reduce((sum, r) => sum + (Number(r.victimCount) || 0), 0),
    diproses: scopedReports.filter((r) => (r.status ?? "baru") === "diproses").length,
    selesai: scopedReports.filter((r) => (r.status ?? "baru") === "selesai").length,
  };

  const FILTERS = isAgni
    ? [
        { value: "all", label: "Semua", count: stats.total },
        { value: "baru", label: "Baru", count: stats.total - stats.diproses - stats.selesai },
        { value: "diproses", label: "Diproses", count: stats.diproses },
        { value: "selesai", label: "Selesai", count: stats.selesai },
      ]
    : [
        { value: "all", label: "Semua", count: stats.total },
        { value: FIRE, label: "Kebakaran", count: stats.fire },
        { value: NON_FIRE, label: "Non-Kebakaran", count: stats.nonFire },
      ];

  return (
    <div className="flex min-h-dvh flex-col bg-lightbg">
      {/* Header admin */}
      <header className="safe-area-top sticky top-0 z-30 border-b border-slate-200/70 bg-white/95 shadow-sm shadow-slate-900/5 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-3 py-3.5 sm:gap-3 sm:px-4">
          <span className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {logoSet(agency).map((logo) => (
              <img
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                className="h-7 w-7 rounded-full bg-white object-contain p-0.5 ring-1 ring-slate-200 sm:h-9 sm:w-9"
              />
            ))}
          </span>

          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex flex-wrap items-center gap-x-2 text-sm font-extrabold tracking-wide text-primary sm:text-base">
              {agencyTitle}
              <span className="rounded-full bg-fireorange/10 px-2 py-0.5 text-[9px] font-bold tracking-widest text-fireorange sm:text-[10px]">
                {agencyBadge}
              </span>
            </p>
            <p className="text-[10px] leading-snug text-slate-500 sm:text-[11px]">
              {agencyHint}
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

        <div className="h-1 bg-gradient-to-r from-primary via-goldyellow to-fireorange" />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-5">
        {/* Banner alarm laporan baru */}
        {newCount > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-fireorange/30 bg-fireorange/10 p-3 text-sm font-semibold text-fireorange-dark">
            <span className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 animate-pulse" />
              {newCount} laporan baru masuk! Segera lakukan pemeriksaan.
            </span>
            <button
              type="button"
              onClick={() => setNewCount(0)}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-fireorange-dark shadow-sm"
            >
              Tandai sudah dibaca
            </button>
          </div>
        )}

        {/* Ringkasan statistik */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<ListChecks className="h-5 w-5" />}
            label={isAgni ? "Total Laporan Kebakaran" : "Total Laporan"}
            value={stats.total}
            tint="bg-primary"
          />
          {!isAgni && (
            <StatCard
              icon={<Flame className="h-5 w-5" />}
              label="Kebakaran"
              value={stats.fire}
              tint="bg-red-600"
            />
          )}
          {!isAgni && (
            <StatCard
              icon={<Siren className="h-5 w-5" />}
              label="Non-Kebakaran"
              value={stats.nonFire}
              tint="bg-fireorange"
            />
          )}
          {isAgni && (
            <StatCard
              icon={<RefreshCw className="h-5 w-5" />}
              label="Sedang Diproses"
              value={stats.diproses}
              tint="bg-fireorange"
            />
          )}
          {isAgni && (
            <StatCard
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Selesai"
              value={stats.selesai}
              tint="bg-forestgreen"
            />
          )}
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
                    ? "border-primary bg-primary text-white"
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
            placeholder="Cari tiket / pelapor / wilayah..."
            className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-base outline-none focus:border-primary sm:max-w-xs"
          />
        </section>

        {/* Daftar history laporan */}
        <section className="mt-5">
          {updatedAt && (
            <p className="mb-3 text-xs text-slate-400">
              Diperbarui {formatDateTime(updatedAt.toISOString())} — data dibaca dari
              perangkat ini (simulasi frontend; backend akan menyajikan laporan seluruh
              pelapor).
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
                    <th className="px-4 py-3 font-bold">Tiket</th>
                    <th className="px-4 py-3 font-bold">Pelapor</th>
                    <th className="px-4 py-3 font-bold">Klasifikasi</th>
                    <th className="px-4 py-3 text-center font-bold">Korban</th>
                    <th className="px-4 py-3 font-bold">Jarak</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">TKP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((report) => {
                    const key = report.ticketId ?? report.submittedAt;
                    return (
                      <tr key={key} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-bold text-primary">
                            {report.ticketId ?? "-"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatDateTime(report.submittedAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{reporterName(report)}</p>
                          <p className="text-xs text-slate-500">
                            {REPORTER_CATEGORIES[report.reporterCategory] || "-"}
                            {reporterRegion(report) ? ` — ${reporterRegion(report)}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <ClassificationBadge classification={report.classification} />
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">
                          {report.victimCount}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                          {formatDistanceKm(
                            isAgni
                              ? (report.distances?.manggalaAgni ?? null)
                              : (report.distances?.basarnas ?? null),
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={report.status ?? "baru"}
                            onChange={(e) =>
                              updateStatus(report.ticketId, e.target.value)
                            }
                            aria-label={`Status ${report.ticketId ?? ""}`}
                            className={`w-32 rounded-lg border-2 px-2 py-1.5 text-xs font-bold outline-none ${
                              STATUS_STYLES[report.status ?? "baru"]
                            } ${
                              (report.status ?? "baru") === "baru"
                                ? "border-fireorange/30"
                                : (report.status ?? "baru") === "diproses"
                                  ? "border-primary/30"
                                  : "border-forestgreen/40"
                            }`}
                          >
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {report.photoUrl && (
                              <a
                                href={report.photoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block shrink-0"
                              >
                                <img
                                  src={report.photoUrl}
                                  alt="Foto TKP"
                                  className="h-9 w-9 rounded-lg object-cover ring-1 ring-slate-200"
                                />
                              </a>
                            )}
                            <a
                              href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-dark"
                            >
                              <MapPin className="h-3.5 w-3.5" /> Maps
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Kartu untuk layar HP */}
              <div className="divide-y divide-slate-100 md:hidden">
                {filtered.map((report) => (
                  <AdminReportCard
                    key={report.ticketId ?? report.submittedAt}
                    report={report}
                    agency={agency}
                    onStatusChange={(status) => updateStatus(report.ticketId, status)}
                  />
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
          <span className="flex items-center gap-1.5 font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isAgni
              ? "Panel Admin SAT SET — Manggala Agni, Kementerian Kehutanan"
              : "Panel Admin SAT SET — Basarnas Banyuwangi"}
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
        fire ? "bg-red-50 text-red-700" : "bg-fireorange/10 text-fireorange-dark"
      }`}
    >
      {fire && <Flame className="h-3 w-3" />}
      {label}
    </span>
  );
}

/** Kartu laporan untuk layar HP: lengkap dengan tiket, status, & foto. */
function AdminReportCard({ report, agency, onStatusChange }) {
  const isAgni = agency === "manggala_agni";
  const fire = isFireIncident(report.classification);
  const mapsUrl = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
  const status = report.status ?? "baru";

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-primary">
            {report.ticketId ?? "-"}
          </p>
          <p className="mt-0.5 truncate font-bold text-slate-900">{reporterName(report)}</p>
          <p className="truncate text-xs text-slate-500">
            {REPORTER_CATEGORIES[report.reporterCategory] || "-"}
            {reporterRegion(report) ? ` — ${reporterRegion(report)}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <ClassificationBadge classification={report.classification} />
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[status]}`}
          >
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>
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
          <dt className="text-slate-500">
            {isAgni ? "Jarak Manggala Agni" : "Jarak BASARNAS"}
          </dt>
          <dd className="font-bold text-slate-800">
            {formatDistanceKm(
              isAgni
                ? (report.distances?.manggalaAgni ?? null)
                : (report.distances?.basarnas ?? null),
            )}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-slate-500">Distribusi ke</dt>
          <dd className="font-bold text-slate-800">
            {isAgni ? "Manggala Agni (kebakaran)" : statusDistribusi(report)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label={`Status ${report.ticketId ?? ""}`}
          className={`h-11 flex-1 rounded-xl border-2 px-3 text-sm font-bold outline-none
            ${status === "baru" ? "border-fireorange/30" : status === "diproses" ? "border-primary/30" : "border-forestgreen/40"}`}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex gap-2">
        {report.photoUrl && (
          <a
            href={report.photoUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center gap-2 rounded-xl border-2 border-slate-200 px-4 text-sm font-semibold text-slate-700"
          >
            <img
              src={report.photoUrl}
              alt="Foto TKP"
              className="h-7 w-7 rounded-md object-cover"
            />
            Foto TKP
          </a>
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white
            ${fire ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary-dark"}`}
        >
          <MapPin className="h-4 w-4" /> Lihat TKP di Google Maps
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </a>
      </div>
    </div>
  );
}
