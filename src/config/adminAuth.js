// ============================================================
// LOGIN PANEL ADMIN (SIMULASI FRONTEND)
// Mendukung dua instansi dengan akun terpisah:
//   - BASARNAS        (Badan SAR Nasional)
//   - MANGGALA AGNI   (Kementerian Kehutanan)
// Identitas instansi disimpan dalam sesi agar panel tampil
// sesuai agency domainnya.
//
// PENTING: ini hanya simulasi frontend — kredensial tertanam
// di bundle dan BISA dibaca siapa pun. Ganti dengan autentikasi
// backend saat integrasi.
// ============================================================

export const ADMIN_ACCOUNTS = [
  {
    username: "KPPBANYUWANGI",
    password: "ADMINSIGAPSAR",
    agency: "basarnas",
  },
  {
    username: "MANGGALAGNI",
    password: "ADMINAGNI2026",
    agency: "manggala_agni",
  },
];

const AGENCY_SESSION_KEY = "sigapsar_admin_agency";

export const AGENCY_LABELS = {
  basarnas: "BASARNAS",
  manggala_agni: "MANGGALA AGNI",
};

/**
 * Mencocokkan username & password terhadap akun instansi yang
 * dituju (agency harus sama). Return nama instansi bila cocok.
 * @param {string} username
 * @param {string} password
 * @param {"basarnas"|"manggala_agni"} agency
 * @returns {string|null} agency yang login
 */
export function adminLogin(username, password, agency) {
  const account = ADMIN_ACCOUNTS.find(
    (item) =>
      item.username === (username || "").trim().toUpperCase() &&
      item.password === password &&
      item.agency === agency,
  );
  if (!account) return null;
  try {
    sessionStorage.setItem(AGENCY_SESSION_KEY, account.agency);
  } catch {
    /* storage nonaktif — sesi tetap berlaku selama tab hidup */
  }
  return account.agency;
}

/** Agency yang sedang login pada tab ini, atau null. */
export function getAdminAgency() {
  try {
    const agency = sessionStorage.getItem(AGENCY_SESSION_KEY);
    return agency && AGENCY_LABELS[agency] ? agency : null;
  } catch {
    return null;
  }
}

/** Keluar dari sesi admin. */
export function adminLogout() {
  try {
    sessionStorage.removeItem(AGENCY_SESSION_KEY);
  } catch {
    /* abaikan */
  }
}
