// ============================================================
// LOGIN PELAPOR — SAT SET (Sistem Aplikasi Tanggap & Siaga Evakuasi Terpadu)
// Seluruh fitur pelaporan terkunci sampai pelapor masuk. Identitas
// pelapor (nama/kategori/wilayah) diambil dari data akun sehingga
// "Informasi Awal" tidak lagi perlu diisi manual.
// ============================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Lock, LogIn, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthProvider.jsx";
import { useReport } from "../context/useReport.js";
import { ACCOUNTS } from "../data/accounts.js";

const LOGOS = [
  { src: "/456.png", alt: "Logo 456" },
  { src: "/472.png", alt: "Logo 472" },
  { src: "/BASARNAS.png", alt: "Logo BASARNAS" },
];

/** Menyalin identitas akun ke state laporan agar seluruh halaman konsisten. */
function identityPatch(session) {
  const patch = {
    reporterCategory: session.reporterCategory,
    // Reset data spesifik laporan lama
    tkpDistrict: "",
    photoUrl: "",
    photoName: "",
  };
  if (session.reporterCategory === "pegawai_basarnas") {
    patch.employeeName = session.name;
    patch.district = "";
    patch.potentialSarName = "";
    patch.kampungRescueDesa = "";
    patch.kampungRescueName = "";
  } else if (session.reporterCategory === "potensi_sar") {
    patch.potentialSarName = session.name;
    patch.district = session.region;
    patch.employeeName = "";
    patch.kampungRescueDesa = "";
    patch.kampungRescueName = "";
  } else {
    patch.kampungRescueName = session.name;
    patch.kampungRescueDesa = session.region;
    patch.employeeName = "";
    patch.district = "";
    patch.potentialSarName = "";
  }
  return patch;
}

export default function Login() {
  const { login } = useAuth();
  const { updateReport } = useReport();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const session = login(username, password);
    if (!session) {
      setError("Username atau password salah.");
      return;
    }
    // Identitas pelapor langsung diisi dari data akun login
    updateReport(identityPatch(session));
    navigate("/", { replace: true });
  }

  const categoryName = {
    pegawai_basarnas: "Pegawai BASARNAS",
    potensi_sar: "Potensi SAR",
    kampung_rescue: "Kampung Rescue",
  };

  return (
    <div className="flex min-h-dvh flex-col bg-lightbg">
      <div className="h-1 bg-gradient-to-r from-primary via-fireorange to-goldyellow" />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          {/* Baris logo instansi */}
          <div className="flex items-center justify-center gap-1.5">
            {LOGOS.map((logo) => (
              <img
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                className="h-10 w-10 rounded-full bg-white object-contain p-0.5 ring-1 ring-slate-200"
              />
            ))}
          </div>

          <h1 className="mt-4 text-center text-lg font-extrabold tracking-wide text-primary">
            SAT SET
          </h1>
          <p className="mt-1 text-center text-xs leading-snug text-slate-500">
            Sistem Aplikasi Tanggap &amp; Siaga Evakuasi Terpadu  BASARNAS Banyuwangi
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div>
              <label htmlFor="login-username" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Username
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username akun Anda"
                  autoFocus
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-4 text-base outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password akun Anda"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-4 text-base outline-none focus:border-primary"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!username || !password}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-fireorange text-base font-bold text-white shadow-lg shadow-fireorange/30 transition-all hover:bg-fireorange-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LogIn className="h-5 w-5" />
              Masuk
            </button>
          </form>

          {/* Daftar akun demo — hanya untuk simulasi frontend */}
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => setShowDemo((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-xs font-semibold text-slate-600"
            >
              Akun demo (simulasi)
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${showDemo ? "rotate-180" : ""}`}
              />
            </button>
            {showDemo && (
              <ul className="space-y-1.5 px-4 pb-3 text-xs text-slate-600">
                {ACCOUNTS.map((account) => (
                  <li
                    key={account.username}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5"
                  >
                    <span className="font-bold text-slate-800">{account.username}</span>
                    <span className="text-slate-500">
                      {categoryName[account.reporterCategory]} — <code>{account.password}</code>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-200/70 bg-white py-4 text-center text-xs text-slate-500">
        copyright Basarnas 2026. All rights reserved.
      </footer>
    </div>
  );
}
