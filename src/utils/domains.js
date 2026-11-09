// ============================================================
// PEMISAHAN DOMAIN: PUBLIK vs ADMIN BASARNAS vs ADMIN MANGGALA AGNI
// Satu : aplikasi pelapor (mis. sigapsar.vercel.app)
// Dua  : panel admin BASARNAS — host berawalan "admin." atau
//        dioverride via VITE_ADMIN_HOST.
// Tiga : panel admin Manggala Agni (Pasukan Penanggulangan Karhutla,
//        Kementerian Kehutanan) —
//        host = satsetmanggalaagni.vercel.app atau dioverride via
//        VITE_MANGGALA_HOST. Proyek yang menyaji harus diberi
//        env tersebut agar tidak tertukar dengan sisi lainnya.
// ============================================================

const ENV_ADMIN_HOST = import.meta.env?.VITE_ADMIN_HOST ?? "";
const ENV_MANGGALA_HOST = import.meta.env?.VITE_MANGGALA_HOST ?? "";

// Domain produksi panel Manggala Agni (dipakai untuk tautan balik)
const DEFAULT_MANGGALA_HOST = "satsetmanggalaagni.vercel.app";

// [FIX 2026-11-09] Domain Vercel bisa di-rename kapan saja, sehingga
// deteksi hanya lewat awalan "admin." tidak cukup. Domain admin BASARNAS
// yang sudah di-rename ditulis di daftar ini.
const EXTRA_ADMIN_HOSTS = [
  "satsetsar-admin.vercel.app", // admin BASARNAS (hasil rename dari sigapsar)
];

// Peta domain admin → domain publik (pelapor) pasangannya, dipakai
// publicHost() untuk tautan balik "Buka Aplikasi Publik" dari panel admin.
// Perbarui di sini bila domain publiknya juga berubah.
const ADMIN_TO_PUBLIC_HOST = {
  "satsetsar-admin.vercel.app": "sigapsar.vercel.app", // TODO: sesuaikan bila domain pelapor berbeda
};

// Sama untuk panel Manggala Agni bila domainnya di-rename.
const EXTRA_MANGGALA_HOSTS = [
  // contoh: "satset-manggala-agni.vercel.app",
];

/** Host aktif tanpa protokol, termasuk port (penting saat dev). */
export function currentHost() {
  return window.location.host;
}

/** Host domain admin BASARNAS yang dipakai untuk tautan dari sisi publik. */
export function adminHost() {
  // Kode baru: dari aplikasi pelapor, cari pasangan admin dalam peta rename
  const publicAdmin = Object.entries(ADMIN_TO_PUBLIC_HOST).find(
    ([, publicDomain]) => publicDomain === window.location.hostname,
  );
  if (publicAdmin) return publicAdmin[0];

  return ENV_ADMIN_HOST || `admin.${window.location.hostname}`;
}

/** Domain panel admin Manggala Agni (untuk tautan lintas panel). */
export function manggalaHost() {
  return ENV_MANGGALA_HOST || DEFAULT_MANGGALA_HOST;
}

/** Host domain publik (dipakai untuk tautan dari panel admin). */
export function publicHost() {
  // Kode baru: domain admin hasil rename dipetakan manual ke domain publik
  const adminPublic = ADMIN_TO_PUBLIC_HOST[currentHost()];
  if (adminPublic) return adminPublic;

  // [FIX 2026-11-09] tangani juga domain berawalan "admin-..." dsb.
  return window.location.hostname
    .replace(/^admin[.-]/, "")
    .replace(/^satsetmanggalaagni[.-]/, "");
}

/** True bila dibuka via domain admin BASARNAS. */
export function isAdminDomain() {
  return (
    // Kode baru: terima semua awalan "admin" ("admin.", "admin-", "admin...")
    window.location.hostname.startsWith("admin") ||
    EXTRA_ADMIN_HOSTS.includes(currentHost()) ||
    (Boolean(ENV_ADMIN_HOST) && currentHost() === ENV_ADMIN_HOST)
  );
}

// [FIX 2026-11-09] versi lama — hanya cocok untuk awalan "admin.";
// aktifkan bila ingin kembali aturan ketat:
// export function isAdminDomain() {
//   return (
//     window.location.hostname.startsWith("admin.") ||
//     (Boolean(ENV_ADMIN_HOST) && currentHost() === ENV_ADMIN_HOST)
//   );
// }

/** True bila dibuka via domain admin Manggala Agni. */
export function isManggalaDomain() {
  return (
    window.location.hostname.startsWith("satsetmanggalaagni") ||
    EXTRA_MANGGALA_HOSTS.includes(currentHost()) ||
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
