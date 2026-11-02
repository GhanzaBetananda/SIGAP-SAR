import { ChevronLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

/** Daftar logo instansi yang tampil berjajar (urutan: 456, 472, BASARNAS). */
const LOGOS = [
  { src: "/456.png", alt: "Logo 456" },
  { src: "/472.png", alt: "Logo 472" },
  { src: "/BASARNAS.png", alt: "Logo BASARNAS" },
];

/** Header + footer bersama untuk seluruh halaman. */
export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="safe-area-top sticky top-0 z-30 border-b border-slate-200/70 bg-white/95 shadow-sm shadow-slate-900/5 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5">
          {/* Tombol kembali saat sedang berada di alur pelaporan */}
          {!isHome && (
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label="Kembali"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:scale-90"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Baris logo instansi (urutan: 456, 472, BASARNAS) */}
          <span className="flex h-11 shrink-0 items-center gap-1.5">
            {LOGOS.map((logo) => (
              <img
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                className="h-9 w-9 rounded-full bg-white object-contain p-0.5 ring-1 ring-slate-200"
              />
            ))}
          </span>

          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-base font-extrabold tracking-wide text-basarnasblue">
              PANIC BUTTON SAR
            </p>
            <p className="truncate text-[11px] text-slate-500">
              Sistem Pelaporan Awal Kejadian BASARNAS
            </p>
          </div>

          {/* Badge status siaga */}
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-basarnasblue/15 bg-basarnasblue/5 px-2.5 py-1.5 text-[10px] font-bold tracking-widest text-basarnasblue">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sarorange opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sarorange" />
            </span>
            SIAGA
          </span>
        </div>

        {/* Garis aksen biru–oranye khas BASARNAS */}
        <div className="h-1 bg-gradient-to-r from-basarnasblue via-sarorange to-basarnasblue" />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-4">{children}</main>

      <footer className="border-t border-slate-200/70 bg-white">
        <div className="safe-area-bottom mx-auto max-w-3xl px-4 py-5 text-center text-xs text-slate-500">
          <div className="mb-3 flex items-center justify-center gap-3">
            {LOGOS.map((logo) => (
              <img
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                className="h-8 w-8 rounded-full object-contain ring-1 ring-slate-200"
              />
            ))}
          </div>
          <p>copyright Basarnas 2026. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
