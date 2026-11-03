// ============================================================
// LOGIN PANEL ADMIN (SIMULASI FRONTEND)
// Kredensial ditentukan untuk panel admin sigapsar.
//
// PENTING: ini hanya simulasi frontend — nama pengguna/kata
// sandi tertanam di bundle sehingga BISA dilihat siapapun yang
// membuka sumber halaman. Ganti dengan autentikasi backend
// (mis. JWT/session server) saat integrasi backend.
// ============================================================

export const ADMIN_CREDENTIALS = {
  username: "KPPBANYUWANGI",
  password: "ADMINSIGAPSAR",
};

const SESSION_KEY = "sigapsar_admin_session";

/** True jika sudah login pada tab browser ini (berakhir saat tab ditutup). */
export function isAdminAuthenticated() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Cek username & password. Return true dan tandai sesi login bila cocok.
 * @param {string} username
 * @param {string} password
 * @returns {boolean}
 */
export function adminLogin(username, password) {
  const ok =
    username.trim().toUpperCase() === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password;
  if (ok) {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* storage nonaktif — login tetap berjalan in-memory */
    }
  }
  return ok;
}

/** Keluar dari sesi admin. */
export function adminLogout() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* abaikan */
  }
}
