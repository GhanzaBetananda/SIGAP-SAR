// ============================================================
// SESI LOGIN PELAPOR (SIMULASI FRONTEND)
// Setelah login, identitas pelapor diambil dari data akun —
// Informasi Awal (pilih kategori/nama/wilayah) tidak lagi
// diperlukan pada alur pelaporan.
// Ganti dengan autentikasi backend saat integrasi.
// ============================================================

import { ACCOUNTS } from "../data/accounts.js";

const SESSION_KEY = "sigapsar_reporter_session";

/**
 * Mencocokkan username & password terhadap daftar akun.
 * @returns {object|null} data sesi bila cocok, null bila tidak
 */
export function loginReporter(username, password) {
  const account = ACCOUNTS.find(
    (item) =>
      item.username.toUpperCase() === (username || "").trim().toUpperCase() &&
      item.password === password,
  );
  if (!account) return null;

  const session = {
    username: account.username,
    name: account.name,
    reporterCategory: account.reporterCategory,
    region: account.region || "",
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage nonaktif — sesi tetap berlaku selama tab hidup */
  }
  return session;
}

/** Data sesi pelapor aktif (atau null). */
export function getSessionReporter() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

/** Keluar: hapus sesi pelapor. */
export function logoutReporter() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* abaikan */
  }
}
