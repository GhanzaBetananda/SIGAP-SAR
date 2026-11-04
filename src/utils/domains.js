// ============================================================
// PEMISAHAN DOMAIN: PUBLIK vs ADMIN BASARNAS vs ADMIN MANGGALA AGNI
// Satu : aplikasi pelapor (mis. sigapsar.vercel.app)
// Dua  : panel admin BASARNAS — host berawalan "admin." atau
//        dioverride via VITE_ADMIN_HOST.
// Tiga : panel admin Manggala Agni (Kementerian Perhubungan) —
//        host = satsetmanggalaagni.vercel.app atau dioverride via
//        VITE_MANGGALA_HOST. Proyek yang menyaji harus diberi
//        env tersebut agar tidak tertukar dengan sisi lainnya.
// ============================================================

const ENV_ADMIN_HOST = import.meta.env?.VITE_ADMIN_HOST ?? "";
const ENV_MANGGALA_HOST = import.meta.env?.VITE_MANGGALA_HOST ?? "";

// Domain produksi panel Manggala Agni (dipakai untuk tautan balik)
const DEFAULT_MANGGALA_HOST = "satsetmanggalaagni.vercel.app";

/** Host aktif tanpa protokol, termasuk port (penting saat dev). */
export function currentHost() {
  return window.location.host;
}

/** Host domain admin BASARNAS yang dipakai untuk tautan dari sisi publik. */
export function adminHost() {
  return ENV_ADMIN_HOST || `admin.${window.location.hostname}`;
}

/** Domain panel admin Manggala Agni (untuk tautan lintas panel). */
export function manggalaHost() {
  return ENV_MANGGALA_HOST || DEFAULT_MANGGALA_HOST;
}

/** Host domain publik (dipakai untuk tautan dari panel admin). */
export function publicHost() {
  return window.location.hostname
    .replace(/^admin\./, "")
    .replace(/^satsetmanggalaagni\./, "");
}

/** True bila dibuka via domain admin BASARNAS. */
export function isAdminDomain() {
  return (
    window.location.hostname.startsWith("admin.") ||
    (Boolean(ENV_ADMIN_HOST) && currentHost() === ENV_ADMIN_HOST)
  );
}

/** True bila dibuka via domain admin Manggala Agni. */
export function isManggalaDomain() {
  return (
    window.location.hostname.startsWith("satsetmanggalaagni.") ||
    currentHost() === manggalaHost()
  );
}

/** URL absolut ke panel admin BASARNAS di domain admin. */
export function adminUrl() {
  return `https://${adminHost()}/admin`;
}

/** URL absolut ke panel admin Manggala Agni. */
export function manggalaUrl() {
  return `https://${manggalaHost()}/admin`;
}

/** URL absolut ke aplikasi pelapor di domain publik. */
export function publicUrl() {
  return `https://${publicHost()}/`;
}
