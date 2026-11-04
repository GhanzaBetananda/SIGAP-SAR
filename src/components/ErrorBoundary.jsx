// ============================================================
// ERROR BOUNDARY GLOBAL
// Menangkap error render React agar seluruh aplikasi tidak
// blank total; pengguna diberi layar bantuan yang rapi.
// ============================================================

import { Component } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <TriangleAlert className="mx-auto h-10 w-10 text-fireorange" />
          <h1 className="mt-3 text-lg font-extrabold text-slate-900">
            Terjadi Kesalahan Aplikasi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Muat ulang halaman untuk melanjutkan. Data laporan tersimpan aman pada
            perangkat Anda.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-dark active:scale-95"
          >
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </button>
        </div>
      </div>
    );
  }
}
