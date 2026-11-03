// ============================================================
// PEMISAHAN DOMAIN PUBLIK vs DOMAIN ADMIN
// Opsi 1: satu project Vercel, dua domain.
//   - Domain publik  : aplikasi pelapor (Home, lapor-awal, panic)
//   - Domain admin   : Panel Admin (history laporan)
//
// Konvensi domain admin: subdomain dengan awalan "admin."
// (mis. cek-panic.vercel.app -> admin.cek-panic.vercel.app).
// Bisa dioverride via environment variable VITE_ADMIN_HOST
// (nilai lengkap, contoh: admin.panicbutton.basarnas.go.id).
// ============================================================

const ENV_ADMIN_HOST = import.meta.env?.VITE_ADMIN_HOST ?? "";

/** Host aktif tanpa protokol, termasuk port (penting saat dev). */
export function currentHost() {
  return window.location.host;
}

/** Host domain admin yang dipakai untuk tautan dari sisi publik. */
export function adminHost() {
  return ENV_ADMIN_HOST || `admin.${window.location.hostname}`;
}

/** Host domain publik (dipakai untuk tautan dari panel admin). */
export function publicHost() {
  return window.location.hostname.replace(/^admin\./, "");
}

/**
 * True jika aplikasi saat ini dibuka via domain admin.
 * Menjaga rute admin tetap terisolasi dari domain publik.
 */
export function isAdminDomain() {
  return (
    window.location.hostname.startsWith("admin.") ||
    (Boolean(ENV_ADMIN_HOST) && currentHost() === ENV_ADMIN_HOST)
  );
}

/** URL absolut ke panel admin di domain admin. */
export function adminUrl() {
  return `https://${adminHost()}/admin`;
}

/** URL absolut ke aplikasi pelapor di domain publik. */
export function publicUrl() {
  return `https://${publicHost()}/`;
}
