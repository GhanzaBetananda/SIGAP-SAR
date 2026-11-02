import { Siren, Ban } from "lucide-react";

/** Header + footer bersama untuk seluruh halaman. */
export default function Layout({ children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-900 text-white">
        <div className="safe-area-top mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 shadow-lg shadow-orange-500/40">
            <Siren className="h-5 w-5 text-white" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-extrabold tracking-wide">PANIC BUTTON SAR</p>
            <p className="text-[11px] text-slate-400">
              Pelaporan Awal Kejadian BASARNAS 
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-4">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="safe-area-bottom mx-auto max-w-3xl px-4 py-4 text-center text-xs text-slate-500">
          <p className="flex items-center justify-center gap-1.5">
            <Ban className="h-3.5 w-3.5" />
            Copyright 2026 BASARNAS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
