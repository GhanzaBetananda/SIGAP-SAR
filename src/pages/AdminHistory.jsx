// ============================================================
// PANEL ADMIN BASARNAS — HISTORY LAPORAN PANIC BUTTON
// Halaman milik "domain berbeda" (mis. admin.sigapsar...):
//
// Fitur: statistik, filter+pencarian, nomor tiket, foto TKP,
// alur tanggapan instansi (checklist diterima -> input anggota &
// peralatan -> diterjunkan -> selesai; laporan kebakaran dapat
// ditanggapi BASARNAS dan Manggala Agni secara silang), serta
// peringatan suara+banner saat laporan baru masuk.
// Sumber data: Apps Script + Google Sheet bila APPS_SCRIPT_URL terisi
// (src/config/backend.js), dengan localStorage sebagai cermin/fallback.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Inbox,
  ListChecks,
  LogOut,
  MapPin,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Siren,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import {
  readSimulatedReports,
  writeSimulatedReports,
} from "../context/reportState.js";
import { CLASSIFICATIONS, getIncidentLabel, isFireIncident } from "../data/incidentTypes.js";
import { districtLabel } from "../data/districts.js";
import {
  REPORTER_CATEGORIES,
  reporterName,
} from "../utils/whatsappGenerator.js";
import { formatDistanceKm } from "../utils/distanceCalculator.js";
import { publicUrl } from "../utils/domains.js";
import {
  adminLogin,
  adminLogout,
  getAdminAgency,
  getAdminUsername,
  AGENCY_LABELS,
} from "../config/adminAuth.js";
import {
  STATUS_LABELS,
  STATUS_STYLES,
} from "../components/ReportHistorySection.jsx";
import {
  applyResponse,
  RESPONSE_AGENCIES,
  responseFor,
  statusGroup,
  totalEquipmentUnits,
} from "../utils/reportResponses.js";
import { EQUIPMENT_PRESETS } from "../data/responsePresets.js";
import { nearestReadyStaff, READY_TTL_MS } from "../utils/sarReadiness.js";
import {
  loadReportsData,
  patchReportOnServer,
  syncReadyStaff,
} from "../utils/api.js";

const LOGOS_BASARNAS = [
  { src: "/456.png", alt: "Logo 456" },
  { src: "/472.png", alt: "Logo 472" },
  { src: "/BASARNAS.png", alt: "Logo BASARNAS" },
];

const LOGOS_MANGGALA = [
  { src: "/kemenhut.png", alt: "Logo Kementerian Kehutanan" },
  { src: "/manggala.png", alt: "Logo Manggala Agni" },
];

/** Set logo sesuai instansi domain. */
function logoSet(agency) {
  return agency === "manggala_agni" ? LOGOS_MANGGALA : LOGOS_BASARNAS;
}

const FIRE = "fire";

// Nama bulan untuk dropdown filter periode (indeks = bulan JS 0-11)
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
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
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + offset + 0.2,
      );
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

/** Waktu pendek (jam:menit) untuk cap aksi tanggapan. */
function formatTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Penanda tiket yang stabil (tiket atau waktu kirim sebagai cadangan). */
function ticketKey(report) {
  return report.ticketId ?? report.submittedAt;
}

/** Teks singkat wilayah pelapor (kecamatan / desa). */
function reporterRegion(report) {
  if (report.reporterCategory === "potensi_sar")
    return districtLabel(report.district);
  if (report.reporterCategory === "kampung_rescue")
    return report.kampungRescueDesa;
  return "";
}

// Kode baru (presens): distribusi tampil "BASARNAS" saja
function statusDistribusi(report) {
  return "BASARNAS";
}

// [PRESNAS 2026-11-09] — versi penanganan silang; aktifkan saat Manggala Agni menyusul:
// function statusDistribusi(report) {
//   return isFireIncident(report.classification)
//     ? "BASARNAS + Manggala Agni"
//     : "BASARNAS";
// }

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
    <AdminDashboard agency={agency} onLogout={() => setAgencySession(null)} />
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
              ? "Manggala Agni — Pasukan Penanggulangan Kebakaran Hutan dan Lahan, Ditjen Pengendalian Kebakaran Hutan dan Lahan, Kementerian Kehutanan"
              : "Badan SAR Nasional (BASARNAS)"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div>
              <label
                htmlFor="admin-username"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
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
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
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
        ADMIN SAT SET — Akses terbatas bagi petugas berwenang (
        {AGENCY_LABELS[agency]})
      </footer>
    </div>
  );
}

function AdminDashboard({ agency = "basarnas", onLogout }) {
  const isAgni = agency === "manggala_agni";
  const agencyTitle = isAgni ? "ADMIN MANGGALA AGNI" : "ADMIN SAT SET";
  const agencyBadge = isAgni ? "MANGGALA AGNI" : "PANEL INTERNAL BASARNAS";
  const agencyHint = isAgni
    ? "History Laporan Kebakaran (Diteruskan dari BASARNAS)"
    : "History Laporan Panic Button";
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [newCount, setNewCount] = useState(0);
  const prevCountRef = useRef(0);
  // Tiket yang sedang dibuka pada modal tanggapan (id tiket).
  const [detailTicket, setDetailTicket] = useState(null);
  const actor = getAdminUsername();

  /** Muat laporan dari server (atau cermin lokal) lalu urutkan. */
  const loadReports = useCallback(async () => {
    const saved = await loadReportsData();
    const history = saved
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

  /** Ubah satu laporan dengan fungsi pengubah, lalu sinkronkan ke server.
   *  Server-first: patch ke Sheet dulu; sukses → muat ulang dari server
   *  (sumber kebenaran). Gagal → jatuh ke cermin lokal (mode offline). */
  const updateReport = useCallback(
    async (ticketId, mutator) => {
      const next = readSimulatedReports().map((report) =>
        ticketKey(report) === ticketId ? mutator(report) : report,
      );
      const updated = next.find((report) => ticketKey(report) === ticketId);
      // Sheet menerima patch kolom tertentu: status & tanggapan instansi
      const patched = await patchReportOnServer(ticketId, {
        status: updated?.status,
        responses: updated?.responses,
      });
      if (!patched) {
        writeSimulatedReports(next); // fallback offline
        console.warn("[admin] patch gagal — perubahan disimpan lokal");
      }
      await loadReports();
    },
    [loadReports],
  );

  /** Checklist sekali klik: instansi menandai laporan sudah diterima. */
  const receiveReport = useCallback(
    (ticketId) => {
      updateReport(ticketId, (report) =>
        responseFor(report, agency).received
          ? report
          : applyResponse(report, agency, {
              received: true,
              receivedAt: new Date().toISOString(),
              receivedBy: actor,
            }),
      );
    },
    [updateReport, agency, actor],
  );

  /**
   * Simpan tim & peralatan instansi sendiri -> status naik menjadi
   * "diterjunkan". `payload` = { personnel, equipment, note }.
   */
  const saveDispatch = useCallback(
    (ticketId, payload) => {
      updateReport(ticketId, (report) =>
        applyResponse(report, agency, (prev) => ({
          ...payload,
          dispatchedAt: prev.dispatchedAt ?? new Date().toISOString(),
        })),
      );
    },
    [updateReport, agency],
  );

  /** Tandai tugas instansi ini selesai (instansi tetangga ikut terlihat). */
  const finishTicket = useCallback(
    (ticketId) => {
      updateReport(ticketId, (report) =>
        applyResponse(report, agency, (prev) => ({
          finishedAt: prev.finishedAt ?? new Date().toISOString(),
        })),
      );
    },
    [updateReport, agency],
  );

  /** Buka kembali tanggapan yang sudah ditandai selesai. */
  const reopenTicket = useCallback(
    (ticketId) => {
      updateReport(ticketId, (report) =>
        applyResponse(report, agency, { finishedAt: null }),
      );
    },
    [updateReport, agency],
  );

  /** Laporan yang sedang dibuka pada modal tanggapan. */
  const detailReport = detailTicket
    ? (reports.find((report) => ticketKey(report) === detailTicket) ?? null)
    : null;

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 15000);
    return () => clearInterval(interval);
  }, [loadReports]);

  // Panel Manggala Agni hanya menerima laporan kebakaran (sasiran distribusi)
  const scopedReports = isAgni
    ? reports.filter((report) => isFireIncident(report.classification))
    : reports;

  /**
   * Filter periode (bulan + tahun) dan klasifikasi kejadian —
   * Opsi dibuat STATIK (generik), tidak mengikuti isi laporan.
   * Tahun: rentang 2 tahun sebelum & sesudah tahun berjalan.
   */
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const years = [];
    for (let year = now - 2; year <= now + 2; year++) years.push(year);
    return years;
  }, []);

  const filtered = scopedReports.filter((report) => {
    const fire = isFireIncident(report.classification);
    if (filter === FIRE && !fire) return false;
    if (filter === NON_FIRE && fire) return false;
    if (monthFilter !== "all" || yearFilter !== "all") {
      const date = new Date(report.submittedAt ?? "");
      if (Number.isNaN(date.getTime())) return false;
      if (yearFilter !== "all" && date.getFullYear() !== Number(yearFilter)) {
        return false;
      }
      if (monthFilter !== "all" && date.getMonth() !== Number(monthFilter)) {
        return false;
      }
    }
    if (classFilter !== "all" && report.classification !== classFilter) {
      return false;
    }
    if (filter === "baru" && statusGroup(report.status ?? "baru") !== "baru") {
      return false;
    }
    if (
      filter === "diproses" &&
      statusGroup(report.status ?? "baru") !== "diproses"
    ) {
      return false;
    }
    if (
      filter === "selesai" &&
      statusGroup(report.status ?? "baru") !== "selesai"
    ) {
      return false;
    }

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
    nonFire: scopedReports.filter((r) => !isFireIncident(r.classification))
      .length,
    victims: scopedReports.reduce(
      (sum, r) => sum + (Number(r.victimCount) || 0),
      0,
    ),
    diproses: scopedReports.filter(
      (r) => statusGroup(r.status ?? "baru") === "diproses",
    ).length,
    selesai: scopedReports.filter(
      (r) => statusGroup(r.status ?? "baru") === "selesai",
    ).length,
  };

  // Kode baru (presens): panel BASARNAS memakai filter status,
  // tanpa filter Kebakaran / Non-Kebakaran
  const FILTERS = isAgni
    ? [
        { value: "all", label: "Semua", count: stats.total },
        {
          value: "baru",
          label: "Baru",
          count: stats.total - stats.diproses - stats.selesai,
        },
        { value: "diproses", label: "Diproses", count: stats.diproses },
        { value: "selesai", label: "Selesai", count: stats.selesai },
      ]
    : [
        { value: "all", label: "Semua", count: stats.total },
        {
          value: "baru",
          label: "Baru",
          count: stats.total - stats.diproses - stats.selesai,
        },
        { value: "diproses", label: "Diproses", count: stats.diproses },
        { value: "selesai", label: "Selesai", count: stats.selesai },
      ];

  // [PRESNAS 2026-11-09] — filter Kebakaran/Non-Kebakaran dimatikan sementara;
  // aktifkan kembali saat integrasi Manggala Agni:
  // : [
  //     { value: "all", label: "Semua", count: stats.total },
  //     { value: FIRE, label: "Kebakaran", count: stats.fire },
  //     { value: NON_FIRE, label: "Non-Kebakaran", count: stats.nonFire },
  //   ];

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
            /* Kode baru (presens): kartu Kebakaran & Non-Kebakaran
               disembunyikan untuk panel BASARNAS */
            <StatCard
              icon={<ListChecks className="h-5 w-5" />}
              label="Laporan Aktif"
              value={stats.diproses}
              tint="bg-fireorange"
            />
          )}
          {!isAgni && (
            <StatCard
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Selesai"
              value={stats.selesai}
              tint="bg-forestgreen"
            />
          )}
          {/* [PRESNAS 2026-11-09] — kartu Kebakaran / Non-Kebakaran dimatikan
              sementara; aktifkan kembali saat integrasi Manggala Agni:
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
          */}
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
        <section className="mt-5 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors
                  ${
                    filter === item.value
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                  }`}
              >
                {item.label}
                <span className="ml-1.5 text-xs opacity-70">{item.count}</span>
              </button>
            ))}
          </div>

          {/* Kode baru (presens): filter periode bulan + tahun & klasifikasi kejadian —
              opsi statik/generik: 12 bulan, rentang tahun, dan 5 klasifikasi */}
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
              Bulan
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary"
              >
                <option value="all">Semua bulan</option>
                {MONTH_NAMES.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
              Tahun
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary"
              >
                <option value="all">Semua tahun</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
              Klasifikasi Kejadian
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary"
              >
                <option value="all">Semua kejadian</option>
                {CLASSIFICATIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
              Pencarian
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari tiket / pelapor..."
                className="h-11 rounded-xl border-2 border-slate-200 bg-white px-4 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>
        </section>

        {/* Daftar history laporan */}
        <section className="mt-5">
          {updatedAt && (
            <p className="mb-3 text-xs text-slate-400">
              Diperbarui {formatDateTime(updatedAt.toISOString())} — data dibaca
              dari perangkat ini (simulasi frontend; backend akan menyajikan
              laporan seluruh pelapor).
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
              <Inbox className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-bold text-slate-700">Belum ada laporan</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Laporan yang dikirim melalui Panic Button pada perangkat ini
                akan muncul di sini secara otomatis.
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
                    <th className="px-4 py-3 font-bold">
                      Tanggapan {AGENCY_LABELS[agency]}
                    </th>
                    <th className="px-4 py-3 font-bold">TKP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((report) => {
                    const key = ticketKey(report);
                    return (
                      <tr
                        key={key}
                        onClick={() => setDetailTicket(key)}
                        className="cursor-pointer transition-colors hover:bg-primary/5"
                      >
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-bold text-primary">
                            {report.ticketId ?? "-"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatDateTime(report.submittedAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">
                            {reporterName(report)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {REPORTER_CATEGORIES[report.reporterCategory] ||
                              "-"}
                            {reporterRegion(report)
                              ? ` — ${reporterRegion(report)}`
                              : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <ClassificationBadge
                            classification={report.classification}
                          />
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
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              STATUS_STYLES[report.status ?? "baru"]
                            }`}
                          >
                            {STATUS_LABELS[report.status ?? "baru"] ?? "-"}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ResponseCell
                            report={report}
                            agency={agency}
                            onReceive={() => receiveReport(key)}
                            onOpen={() => setDetailTicket(key)}
                          />
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                    key={ticketKey(report)}
                    report={report}
                    agency={agency}
                    onReceive={() => receiveReport(ticketKey(report))}
                    onOpen={() => setDetailTicket(ticketKey(report))}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {reports.length > 0 && filtered.length !== reports.length && (
          <p className="mt-3 text-center text-xs text-slate-400">
            Menampilkan {filtered.length} dari {reports.length} laporan
            (difilter).
          </p>
        )}
      </main>

      {/* Modal tanggapan: form instansi sendiri + tanggapan instansi lain */}
      {detailReport && (
        <ReportResponseModal
          key={ticketKey(detailReport)}
          report={detailReport}
          agency={agency}
          onReceive={() => receiveReport(ticketKey(detailReport))}
          onSaveDispatch={(payload) =>
            saveDispatch(ticketKey(detailReport), payload)
          }
          onFinish={() => finishTicket(ticketKey(detailReport))}
          onReopen={() => reopenTicket(ticketKey(detailReport))}
          onClose={() => setDetailTicket(null)}
        />
      )}

      <footer className="border-t border-slate-200/70 bg-white">
        <div className="safe-area-bottom mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-5 text-center text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isAgni
              ? "Panel Admin SAT SET — Manggala Agni, Ditjen Pengendalian Kebakaran Hutan dan Lahan, Kementerian Kehutanan"
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
      <span className={`inline-flex rounded-lg ${tint} p-2 text-white`}>
        {icon}
      </span>
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
        fire
          ? "bg-red-50 text-red-700"
          : "bg-fireorange/10 text-fireorange-dark"
      }`}
    >
      {fire && <Flame className="h-3 w-3" />}
      {label}
    </span>
  );
}

/** Kartu laporan untuk layar HP: tiket, status otomatis, foto & tanggapan. */
function AdminReportCard({ report, agency, onReceive, onOpen }) {
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
          <p className="mt-0.5 truncate font-bold text-slate-900">
            {reporterName(report)}
          </p>
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
          <dd className="font-bold text-slate-800">
            {formatDateTime(report.submittedAt)}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-slate-500">Korban</dt>
          <dd className="font-bold text-slate-800">
            {report.victimCount} jiwa
          </dd>
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

      <div className="mt-3 grid grid-cols-2 gap-2">
        {/* Checklist sekali klik: laporan sudah diterima instansi ini */}
        <button
          type="button"
          onClick={onReceive}
          disabled={responseFor(report, agency).received}
          aria-label={`Konfirmasi diterima ${report.ticketId ?? ""}`}
          className={`flex h-11 items-center justify-center gap-2 rounded-xl border-2 text-sm font-bold transition-colors active:scale-[0.98] ${
            responseFor(report, agency).received
              ? "border-forestgreen/40 bg-forestgreen/10 text-forestgreen"
              : "border-slate-200 bg-white text-slate-700 hover:border-forestgreen/50"
          } disabled:cursor-default`}
        >
          {responseFor(report, agency).received ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Diterima {formatTime(responseFor(report, agency).receivedAt)}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Terima
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white hover:bg-primary-dark active:scale-[0.98]"
        >
          <ListChecks className="h-4 w-4" /> Tanggapan
        </button>
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

/** Kolom tanggapan di tabel lebar: tombol diterima sekali-klik + ringkasan. */
function ResponseCell({ report, agency, onReceive, onOpen }) {
  const own = responseFor(report, agency);
  const fire = isFireIncident(report.classification);
  const otherKey = fire
    ? Object.keys(RESPONSE_AGENCIES).find((key) => key !== agency)
    : null;
  const other = otherKey ? responseFor(report, otherKey) : null;

  if (!own.received) {
    return (
      <button
        type="button"
        onClick={onReceive}
        title="Tandai laporan sudah diterima instansi ini"
        className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-forestgreen/50 hover:text-forestgreen"
      >
        <span className="h-4 w-4 rounded border-2 border-slate-300" /> Terima
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Buka detail tanggapan"
      className="text-left"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-forestgreen/10 px-2.5 py-1 text-[11px] font-bold text-forestgreen">
        <CheckCircle2 className="h-3 w-3" /> Diterima{" "}
        {formatTime(own.receivedAt)}
      </span>
      <span className="mt-1 block text-[11px] font-semibold text-slate-500">
        {own.personnel || 0} anggota · {totalEquipmentUnits(own.equipment)} unit
        alat
      </span>
      {other && (
        <span
          className={`mt-0.5 block text-[10px] font-bold ${
            other.received ? "text-forestgreen" : "text-slate-400"
          }`}
        >
          {RESPONSE_AGENCIES[otherKey]}:{" "}
          {other.received ? "sudah respons ✓" : "belum respons"}
        </span>
      )}
    </button>
  );
}

/**
 * Modal detail + tanggapan laporan.
 * - Panel instansi sendiri: checklist diterima, lalu input jumlah anggota,
 *   peralatan (beserta jumlahnya), dan catatan -> tim diterjunkan ->
 *   tandai selesai.
 * - Panel instansi pasangan (laporan kebakaran): read-only, sehingga
 *   BASARNAS dan Manggala Agni saling melihat tanggapan masing-masing.
 */
function ReportResponseModal({
  report,
  agency,
  onReceive,
  onSaveDispatch,
  onFinish,
  onReopen,
  onClose,
}) {
  const fire = isFireIncident(report.classification);
  const otherKeys = fire
    ? Object.keys(RESPONSE_AGENCIES).filter((key) => key !== agency)
    : [];

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        {/* Header modal */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-sm font-bold text-primary">
              {report.ticketId ?? "-"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <ClassificationBadge classification={report.classification} />
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  STATUS_STYLES[report.status ?? "baru"]
                }`}
              >
                {STATUS_LABELS[report.status ?? "baru"] ?? "-"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Ringkasan laporan */}
          <dl className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Pelapor", reporterName(report)],
              [
                "Kategori",
                `${REPORTER_CATEGORIES[report.reporterCategory] || "-"}${
                  reporterRegion(report) ? ` — ${reporterRegion(report)}` : ""
                }`,
              ],
              ["Waktu lapor", formatDateTime(report.submittedAt)],
              ["Korban", `${report.victimCount ?? 0} jiwa`],
              ["Distribusi ke", statusDistribusi(report)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-bold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Petugas SAR siap-siap berdasarkan jarak ke TKP (hanya BASARNAS) */}
          {agency === "basarnas" && report.latitude != null && (
            <NearbyReadyStaff report={report} />
          )}

          <div className="mt-3 flex flex-wrap gap-2">
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
              href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white hover:bg-primary-dark"
            >
              <MapPin className="h-4 w-4" /> Lihat TKP di Google Maps
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
          </div>

          {/* Tanggapan instansi sendiri (form interaktif) */}
          <OwnResponsePanel
            report={report}
            agency={agency}
            onReceive={onReceive}
            onSaveDispatch={onSaveDispatch}
            onFinish={onFinish}
            onReopen={onReopen}
          />

          {/* Tanggapan instansi pasangan (read-only) — laporan kebakaran */}
          {otherKeys.map((key) => (
            <OtherResponsePanel key={key} report={report} otherAgency={key} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Panel tanggapan instansi yang sedang login (form interaktif). */
function OwnResponsePanel({
  report,
  agency,
  onReceive,
  onSaveDispatch,
  onFinish,
  onReopen,
}) {
  const own = responseFor(report, agency);
  const finished = Boolean(own.finishedAt);
  const presets = EQUIPMENT_PRESETS[agency] ?? [];
  const [draft, setDraft] = useState(() => ({
    personnel: own.personnel || 0,
    equipment: (own.equipment ?? []).map((item) => ({ ...item })),
    note: own.note ?? "",
  }));
  const [customName, setCustomName] = useState("");
  const [error, setError] = useState("");

  function togglePreset(name) {
    setError("");
    setDraft((prev) => {
      const exists = prev.equipment.some((item) => item.name === name);
      return {
        ...prev,
        equipment: exists
          ? prev.equipment.filter((item) => item.name !== name)
          : [...prev.equipment, { name, qty: 1 }],
      };
    });
  }

  function setQty(name, qty) {
    setDraft((prev) => ({
      ...prev,
      equipment: prev.equipment.map((item) =>
        item.name === name
          ? { ...item, qty: Math.max(1, Math.round(Number(qty) || 1)) }
          : item,
      ),
    }));
  }

  function addCustom() {
    const name = customName.trim();
    if (!name || draft.equipment.some((item) => item.name === name)) return;
    setDraft((prev) => ({
      ...prev,
      equipment: [...prev.equipment, { name, qty: 1 }],
    }));
    setCustomName("");
  }

  /** Hapus item alat kustom dari draft. */
  function removeEquipment(name) {
    setDraft((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((item) => item.name !== name),
    }));
  }

  function handleSave() {
    if (!(Number(draft.personnel) >= 1)) {
      setError("Isi jumlah anggota terlebih dahulu (minimal 1).");
      return;
    }
    setError("");
    onSaveDispatch({
      personnel: Number(draft.personnel),
      equipment: draft.equipment,
      note: draft.note.trim(),
    });
  }

  return (
    <section className="mt-5 rounded-2xl border-2 border-primary/30 bg-primary/[0.04] p-4">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-primary">
          Tanggapan {RESPONSE_AGENCIES[agency]}
        </h3>
        <StageChip response={own} />
      </header>

      {!own.received ? (
        <>
          <button
            type="button"
            onClick={onReceive}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-forestgreen text-base font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <CheckCircle2 className="h-5 w-5" /> Konfirmasi Laporan Diterima
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">
            Menandakan petugas {RESPONSE_AGENCIES[agency]} sudah menerima
            laporan ini.
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl bg-forestgreen/10 px-3 py-2 text-xs font-bold text-forestgreen">
            <CheckCircle2 className="h-4 w-4" />
            Diterima {formatDateTime(own.receivedAt)}
            {own.receivedBy ? ` oleh ${own.receivedBy}` : ""}
          </p>

          {/* Jumlah anggota */}
          <p className="mt-4 mb-1.5 text-xs font-bold text-slate-700">
            Jumlah anggota diterjunkan
          </p>
          <NumberStepper
            value={draft.personnel}
            onChange={(value) => {
              setError("");
              setDraft((prev) => ({ ...prev, personnel: value }));
            }}
          />

          {/* Peralatan */}
          <p className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Package className="h-3.5 w-3.5" /> Peralatan yang dibawa (beserta
            jumlah)
          </p>
          <div className="grid gap-1.5">
            {presets.map((name) => {
              const item = draft.equipment.find((entry) => entry.name === name);
              const checked = Boolean(item);
              return (
                <div
                  key={name}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                    checked
                      ? "border-primary/40 bg-primary/5"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    disabled={finished}
                    onClick={() => togglePreset(name)}
                    className="flex flex-1 items-center gap-2 text-left font-semibold text-slate-700 disabled:opacity-60"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                        checked
                          ? "border-primary bg-primary text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    {name}
                  </button>
                  {checked && (
                    <NumberStepper
                      compact
                      value={item.qty}
                      onChange={(value) => setQty(name, value)}
                    />
                  )}
                </div>
              );
            })}

            {/* Alat di luar preset */}
            {draft.equipment
              .filter((item) => !presets.includes(item.name))
              .map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm"
                >
                  <button
                    type="button"
                    disabled={finished}
                    onClick={() => removeEquipment(item.name)}
                    aria-label={`Hapus ${item.name}`}
                    className="rounded-md p-1 text-red-500 hover:bg-red-50 disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex-1 truncate font-semibold text-slate-700">
                    {item.name}
                  </span>
                  <NumberStepper
                    compact
                    value={item.qty}
                    onChange={(value) => setQty(item.name, value)}
                  />
                </div>
              ))}
          </div>

          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Alat lain — ketik nama alatnya..."
              className="h-11 flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!customName.trim()}
              className="flex h-11 items-center gap-1 rounded-xl bg-slate-800 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Tambah
            </button>
          </div>

          {/* Catatan */}
          <p className="mt-4 mb-1.5 text-xs font-bold text-slate-700">
            Catatan (opsional)
          </p>
          <textarea
            value={draft.note}
            rows={2}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, note: e.target.value }))
            }
            placeholder="Keterangan tambahan, mis. berangkat dari pos terdekat..."
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />

          {error && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {error}
            </p>
          )}

          {/* Aksi */}
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white transition-all hover:bg-primary-dark active:scale-[0.98]"
            >
              {own.dispatchedAt ? (
                <>
                  <RefreshCw className="h-5 w-5" /> Perbarui Data Tim
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" /> Simpan &amp; Diterjunkan
                </>
              )}
            </button>
            {own.dispatchedAt && !finished && (
              <button
                type="button"
                onClick={onFinish}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-forestgreen/50 bg-forestgreen/10 text-sm font-bold text-forestgreen transition-colors hover:bg-forestgreen/20"
              >
                <ShieldCheck className="h-4 w-4" /> Tandai Tugas Instansi Ini
                Selesai
              </button>
            )}
          </div>

          {finished && (
            <div className="mt-3 rounded-xl bg-forestgreen/10 px-3 py-2.5 text-xs text-forestgreen">
              <p className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4" /> Tugas instansi ini selesai{" "}
                {formatDateTime(own.finishedAt)}
              </p>
              <button
                type="button"
                onClick={onReopen}
                className="mt-1 underline underline-offset-2 hover:text-forestgreen-dark"
              >
                Buka kembali tanggapan
              </button>
            </div>
          )}

          <ResponseTimeline response={own} />
        </>
      )}
    </section>
  );
}

/**
 * Daftar pegawai SAR berstatus SIAP, diurutkan jarak terdekat ke TKP
 * laporan. Tombol "Hubungi via WA" sengaja TIDAK disediakan — koordinator
 * menghubungi petugas di luar website; panel hanya papan jarak & status.
 */
function NearbyReadyStaff({ report }) {
  const [staff, setStaff] = useState(() =>
    nearestReadyStaff(report.latitude, report.longitude),
  );

  // Sinkronkan daftar siap dari server (bila backend aktif) sebelum
  // dihitung jaraknya; gagal -> memakai data cermin lokal.
  useEffect(() => {
    let alive = true;
    async function loadStaff() {
      await syncReadyStaff();
      if (alive) {
        setStaff(nearestReadyStaff(report.latitude, report.longitude));
      }
    }
    loadStaff();
    return () => {
      alive = false;
    };
  }, [report.latitude, report.longitude]);

  return (
    <section className="mt-3 rounded-2xl border-2 border-goldyellow/40 bg-goldyellow/5 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-slate-700">
          Petugas TERDEKAT yang SIAP Bantu
        </h3>
        <span className="rounded-full bg-goldyellow/25 px-2.5 py-1 text-[11px] font-bold text-yellow-700">
          {staff.length} petugas siap
        </span>
      </header>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
        Status siap ({Math.round(READY_TTL_MS / 3600000)} jam sejak pegawai
        menekan tombol) dan diurutkan dari jarak terdekat ke TKP. Hubungi
        petugas langsung di luar aplikasi ini.
      </p>

      {staff.length === 0 ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-2.5 text-xs text-slate-500">
          Belum ada pegawai SAR yang menandai dirinya siap. Pegawai dapat
          menekan "Saya Siap Membantu" di aplikasi pelapor.
        </p>
      ) : (
        <ol className="mt-3 grid gap-1.5">
          {staff.map((person, index) => (
            <li
              key={person.username}
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                {index + 1}
              </span>
              <span className="font-bold text-slate-800">{person.name}</span>
              <span className="ml-auto font-bold text-primary">
                {formatDistanceKm(person.distanceKm)}
              </span>
              <span className="flex w-full items-center gap-1 text-[11px] text-slate-400 sm:w-auto">
                <CheckCircle2 className="h-3 w-3 text-forestgreen" />
                siap sejak {formatTime(person.checkedInAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Chip tahap tanggapan satu instansi: Belum direspons s.d. Selesai. */
function StageChip({ response }) {
  let stage = "Belum direspons";
  let cls = "bg-slate-100 text-slate-500";
  if (response.finishedAt) {
    stage = "Selesai";
    cls = "bg-forestgreen/10 text-forestgreen";
  } else if (response.dispatchedAt) {
    stage = "Diterjunkan";
    cls = "bg-primary/10 text-primary";
  } else if (response.receivedAt || response.received) {
    stage = "Diterima";
    cls = "bg-goldyellow/20 text-yellow-700";
  }
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}
    >
      {stage}
    </span>
  );
}

/** Panel tanggapan instansi pasangan — hanya baca, tidak bisa diedit. */
function OtherResponsePanel({ report, otherAgency }) {
  const own = responseFor(report, otherAgency);

  return (
    <section className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-slate-600">
          Tanggapan {RESPONSE_AGENCIES[otherAgency]}
        </h3>
        <StageChip response={own} />
      </header>

      {!(own.receivedAt || own.received) ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5" /> Belum ada tanggapan — menunggu
          konfirmasi.
        </p>
      ) : (
        <div className="mt-2 grid gap-1.5 text-xs text-slate-600">
          <p>
            <span className="font-bold text-slate-700">Diterima:</span>{" "}
            {formatDateTime(own.receivedAt)}
            {own.receivedBy ? ` — ${own.receivedBy}` : ""}
          </p>
          <p>
            <span className="font-bold text-slate-700">Anggota:</span>{" "}
            {own.personnel ? `${own.personnel} orang` : "-"}
          </p>
          <div>
            <span className="font-bold text-slate-700">Peralatan:</span>
            <div className="mt-1">
              <EquipmentSummary equipment={own.equipment} />
            </div>
          </div>
          {own.note && (
            <p className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] italic text-slate-500">
              “{own.note}”
            </p>
          )}
          <p>
            <span className="font-bold text-slate-700">Diterjunkan:</span>{" "}
            {own.dispatchedAt ? formatDateTime(own.dispatchedAt) : "-"}
          </p>
          {own.finishedAt && (
            <p className="font-bold text-forestgreen">
              Tugas selesai {formatDateTime(own.finishedAt)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** Daftar alat ringkas (.nama × jumlah) — dipakai panel read-only. */
function EquipmentSummary({ equipment }) {
  if (!equipment || equipment.length === 0) {
    return (
      <span className="text-xs text-slate-400">Tidak mencantumkan alat.</span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {equipment.map((item) => (
        <span
          key={item.name}
          className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700"
        >
          {item.name} ×{item.qty ?? 1}
        </span>
      ))}
    </div>
  );
}

/** Riwayat aksi tanggapan instansi sendiri pada modal. */
function ResponseTimeline({ response }) {
  const events = [
    response.receivedAt && {
      label: "Laporan diterima",
      detail: response.receivedBy ? `oleh ${response.receivedBy}` : "",
      time: response.receivedAt,
    },
    response.dispatchedAt && {
      label: "Tim & peralatan diterjunkan",
      detail: `${response.personnel || 0} anggota · ${totalEquipmentUnits(
        response.equipment,
      )} unit alat`,
      time: response.dispatchedAt,
    },
    response.finishedAt && {
      label: "Tugas instansi ini selesai",
      detail: "",
      time: response.finishedAt,
    },
  ].filter(Boolean);
  if (events.length === 0) return null;

  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        Riwayat aksi
      </p>
      <ol className="grid gap-1.5">
        {events.map((event, index) => (
          <li
            key={`${event.label}-${index}`}
            className="flex flex-wrap items-center gap-2 text-xs text-slate-600"
          >
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-semibold text-slate-700">{event.label}</span>
            {event.detail && (
              <span className="text-slate-400">— {event.detail}</span>
            )}
            <span className="ml-auto whitespace-nowrap text-slate-400">
              {formatTime(event.time)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Input angka dengan tombol +/− (anggota & jumlah alat). */
function NumberStepper({ value, onChange, compact = false, max = 500 }) {
  const num = Number(value) || 0;
  const set = (next) =>
    onChange(Math.min(max, Math.max(compact ? 1 : 0, Math.round(next))));
  const styles = compact
    ? {
        wrap: "flex h-8 items-center rounded-lg border border-slate-200 bg-white",
        btn: "h-full w-7 text-slate-500 hover:text-primary",
        input:
          "w-8 border-x border-slate-200 text-center text-xs font-bold text-slate-800 outline-none",
      }
    : {
        wrap: "flex h-11 items-center rounded-xl border-2 border-slate-200 bg-white",
        btn: "h-full w-10 text-slate-500 hover:text-primary",
        input:
          "w-14 border-x border-slate-200 text-center text-base font-bold text-slate-800 outline-none",
      };

  return (
    <div className={`shrink-0 ${styles.wrap}`}>
      <button
        type="button"
        aria-label="Kurangi"
        onClick={() => set(num - 1)}
        className={styles.btn}
      >
        <Minus className="mx-auto h-4 w-4" />
      </button>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={num}
        onChange={(e) => set(Number(e.target.value))}
        className={styles.input}
      />
      <button
        type="button"
        aria-label="Tambah"
        onClick={() => set(num + 1)}
        className={styles.btn}
      >
        <Plus className="mx-auto h-4 w-4" />
      </button>
    </div>
  );
}
