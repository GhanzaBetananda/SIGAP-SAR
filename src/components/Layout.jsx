import { ChevronLeft, Siren } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

/** Header + footer bersama untuk seluruh halaman. */
export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      <header className="safe-area-top sticky top-0 z-30 bg-slate-900 text-white shadow-lg shadow-slate-900/30">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {/* Tombol kembali saat sedang berada di alur pelaporan */}
          {!isHome && (
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label="Kembali"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white active:scale-90 active:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Badge logo SAR dengan denyut halus */}
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-2xl bg-orange-500/50 [animation-duration:2.5s]" />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/40">
              <Siren className="h-6 w-6 text-white" />
            </span>
          </span>

          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-base font-extrabold tracking-wide">
              PANIC BUTTON SAR
            </p>
            <p className="truncate text-[11px] text-slate-400">
              Pelaporan Awal Kejadian — BASARNAS × Manggala Agni
            </p>
          </div>

          {/* Badge status siaga */}
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-bold tracking-widest text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            SIAGA
          </span>
        </div>

        {/* Garis aksen oranye khas SAR */}
        <div className="h-1 bg-gradient-to-r from-orange-700 via-orange-400 to-orange-700" />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-4">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="safe-area-bottom mx-auto max-w-3xl px-4 py-4 text-center text-xs text-slate-500">
          <p>
            Prototype frontend — data sementara disimpan dengan React State (simulasi
            frontend).
          </p>
        </div>
      </footer>
    </div>
  );
}
