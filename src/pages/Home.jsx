import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Layout from "../components/Layout.jsx";
import PanicButton from "../components/PanicButton.jsx";
import Stepper from "../components/Stepper.jsx";
import { useReport } from "../context/useReport.js";
import { useAuth } from "../context/AuthProvider.jsx";
import { ReportHistorySection } from "../components/ReportHistorySection.jsx";
import SarDutyBoard from "../components/SarDutyBoard.jsx";
import { readyRecord, setReady, READY_TTL_MS } from "../utils/sarReadiness.js";
import { pushReadyStaff } from "../utils/api.js";
import {
  AlertTriangle,
  ClipboardList,
  LifeBuoy,
  MapPin,
  Mic,
  RefreshCw,
  Send,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { report } = useReport();
  const { session } = useAuth();

  // Tab tampilan — hanya untuk pegawai BASARNAS: "Pelaporan" (alur
  // pelapor biasa) vs "Siaga" (ketersediaan + papan tugas).
  const isSarStaff = session.reporterCategory === "pegawai_basarnas";
  const [tab, setTab] = useState("pelaporan");

  function switchTab(next) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePanicPress() {
    // Pelapor sudah login (identitas dari akun) — langsung ke halaman panic
    navigate("/panic");
  }

  // Pelaporan selalu tampil; tab "Siaga" hanya berlaku bagi pegawai SAR
  const showSiaga = isSarStaff && tab === "siaga";

  return (
    <Layout>
      {/* Pemilih tampilan — hanya untuk pegawai BASARNAS */}
      {isSarStaff && (
        <div
          role="tablist"
          aria-label="Tampilan akun pegawai"
          className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm"
        >
          <TabButton
            active={!showSiaga}
            onClick={() => switchTab("pelaporan")}
            icon={<ClipboardList className="h-4 w-4" />}
            label="Pelaporan"
          />
          <TabButton
            active={showSiaga}
            onClick={() => switchTab("siaga")}
            icon={<MapPin className="h-4 w-4" />}
            label="Siaga"
          />
        </div>
      )}

      {showSiaga ? (
        /* Tab SIAGA: ketersediaan + papan laporan untuk petugas */
        <div className="mt-6 grid gap-4">
          <SarReadinessCard session={session} />
          <SarDutyBoard session={session} />
        </div>
      ) : (
        <>
          <Stepper current={1} />

          <section className="mt-6 text-center">
            <p className="mx-auto flex max-w-md items-start gap-2 rounded-xl border-2 border-fireorange/25 bg-fireorange/10 p-3 text-left text-xs text-fireorange-dark">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Gunakan hanya pada kejadian darurat nyata. Seluruh informasi awal wajib diisi
              sebelum laporan dapat dikirim.
            </p>

            {/* Baris logo instansi (urutan: 456, 472, BASARNAS) */}
            <div className="mt-6 flex items-center justify-center gap-4">
              {[
                { src: "/456.png", alt: "Logo 456" },
                { src: "/472.png", alt: "Logo 472" },
                { src: "/BASARNAS.png", alt: "Logo BASARNAS" },
              ].map((logo) => (
                <img
                  key={logo.src}
                  src={logo.src}
                  alt={logo.alt}
                  className="h-14 w-14 rounded-full bg-white object-contain p-1 shadow-md ring-1 ring-slate-200 sm:h-16 sm:w-16"
                />
              ))}
            </div>

            <h1 className="mt-5 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
              Melapor dari TKP
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Login sebagai akun Anda, lengkapi detail kejadian, rekam suara, lalu laporan
              disiapkan untuk BASARNAS dan Manggala Agni melalui WhatsApp sesuai klasifikasi.
            </p>

            <div className="my-8 flex justify-center">
              <PanicButton onClick={handlePanicPress} />
            </div>

            {report.submittedAt && (
              <p className="mb-6 rounded-xl bg-forestgreen/10 p-3 text-sm font-semibold text-forestgreen">
                {report.ticketId
                  ? `Laporan tiket ${report.ticketId} telah disiapkan — lakukan kirim manual pada tautan WhatsApp.`
                  : "Laporan terakhir telah disiapkan — kirim manual pada tautan WhatsApp."}
              </p>
            )}
          </section>

          {/* Riwayat & status laporan milik akun ini */}
          <ReportHistorySection username={session.username} />

          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            <StepCard
              icon={<ClipboardList className="h-6 w-6" />}
              title="1. Detail Kejadian"
              items={["Klasifikasi & jumlah korban", "GPS TKP otomatis", "Jarak ke kantor instansi"]}
            />
            <StepCard
              icon={<Mic className="h-6 w-6" />}
              title="2. Panic Button"
              items={["Rekam Voice Note (opsional)", "Kronologi detail (opsional)", "Ringkasan sebelum kirim"]}
            />
            <StepCard
              icon={<Send className="h-6 w-6" />}
              title="3. Distribusi"
              items={["Kebakaran: BASARNAS + Manggala Agni", "Non-kebakaran: BASARNAS", "Tautan wa.me siap kirim"]}
            />
          </section>
        </>
      )}
    </Layout>
  );
}

/** Tombol tab pilih tampilan (Pelaporan / Siaga). */
function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors ${
        active
          ? "bg-primary text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StepCard({ icon, title, items }) {  return (
    <div className="rounded-2xl bg-white p-5 text-left shadow-sm">
      <span className="mb-3 inline-flex rounded-lg bg-primary p-2.5 text-white">{icon}</span>
      <p className="font-bold text-slate-900">{title}</p>
      <ul className="mt-2 space-y-1 text-xs text-slate-500">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-1.5">
            <LifeBuoy className="mt-0.5 h-3 w-3 shrink-0 text-fireorange" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Kartu kesiapan pegawai BASARNAS: tekan "Saya Siap Membantu" untuk
 * merekam lokasi sendiri sekali (opsi GPS perangkat). Panel admin hanya
 * membaca daftar ini — koordinator menghubungi petugas di luar website.
 */
function SarReadinessCard({ session }) {
  const [state, setState] = useState(() => {
    const record = readyRecord(session.username);
    return { ready: Boolean(record), checkedInAt: record?.checkedInAt ?? null };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function refreshFromStore() {
    const record = readyRecord(session.username);
    setState({ ready: Boolean(record), checkedInAt: record?.checkedInAt ?? null });
  }

  function handleClick() {
    // Tombol utama: menyatakan siap atau memperbarui lokasi
    captureLocation();
  }

  function captureLocation() {
    // Minta GPS perangkat sekali saat petugas menyatakan/memperbarui siap
    if (!navigator.geolocation) {
      setError("Perangkat tidak mendukung fitur lokasi.");
      return;
    }
    setBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReady(session.username, session.name, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        refreshFromStore();
        // Sinkronkan status siap ke sheet "siap" (bila backend aktif)
        const record = readyRecord(session.username);
        if (record) pushReadyStaff(record);
        setBusy(false);
      },
      (geoError) => {
        setBusy(false);
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Izin lokasi ditolak — aktifkan izin lokasi pada browser untuk menyatakan siap."
            : "Lokasi tidak dapat diambil. Coba lagi atau gunakan area terbuka.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <section
      className={`rounded-2xl border-2 p-5 shadow-sm sm:p-6 ${
        state.ready ? "border-forestgreen/40 bg-forestgreen/5" : "border-slate-200/80 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <MapPin className={`h-5 w-5 ${state.ready ? "text-forestgreen" : "text-primary"}`} />
            Kesiapan Membantu Penyelamatan
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {state.ready
              ? `Anda SIAP membantu — lokasi terekam ${
                  state.checkedInAt ? formatClock(state.checkedInAt) : ""
                }. Status berlaku ±${Math.round(READY_TTL_MS / 3600000)} jam sebelum kadaluarsa.`
              : "Nyatakan status Anda agar muncul pada daftar petugas terdekat saat ada laporan."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className={`flex h-12 items-center gap-2 rounded-xl px-5 text-base font-bold text-white transition-all active:scale-[0.97] disabled:opacity-60 ${
            state.ready
              ? "bg-slate-600 hover:bg-slate-700"
              : "bg-forestgreen hover:brightness-110"
          }`}
        >
          {busy ? (
            "Mengambil lokasi..."
          ) : state.ready ? (
            <>
              <RefreshCw className="h-5 w-5" /> Perbarui Lokasi
            </>
          ) : (
            <>
              <MapPin className="h-5 w-5" /> Saya Siap Membantu
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      {state.ready && (
        <button
          type="button"
          onClick={() => {
            setReady(session.username, session.name, null);
            // Cabut juga di sheet "siap" (bila backend aktif)
            pushReadyStaff({ username: session.username }, true);
            refreshFromStore();
          }}
          className="mt-2 text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-red-600"
        >
          Saya sudah tidak siap (hapus lokasi saya)
        </button>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Lokasi hanya direkam saat Anda menekan tombol ini — tidak dipantau terus-menerus.
      </p>
    </section>
  );
}

function formatClock(iso) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
