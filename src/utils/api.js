// ============================================================
// LAPISAN API — jembatan frontend ke backend Apps Script + Sheet
// Database: Google Sheet dengan tab "laporan" & tab "siap".
//
// Semua fungsi aman intel: jika APPS_SCRIPT_URL kosong (mode
// simulasi) atau server gagal, nilai null/fallback dikembalikan
// agar alur frontend tidak pernah macet.
// ============================================================

import { APPS_SCRIPT_URL } from "../config/backend.js";
import { overwriteReadyStaff } from "./sarReadiness.js";
import { readSimulatedReports, writeSimulatedReports } from "../context/reportState.js";

/** true bila Apps Script sudah diisi (mode sebenarnya). */
export const apiEnabled = Boolean(APPS_SCRIPT_URL);

/**
 * Panggil Web App Apps Script. Method POST dengan content-type
 * text/plain agar tidak tersandung CORS preflight (Apps Script
 * tidak menangani OPTIONS).
 */
async function callApi(action, payload = {}) {
  if (!apiEnabled) return null;
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload }),
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`API ${action} gagal (HTTP ${response.status})`);
  const json = await response.json();
  if (!json || json.ok !== true) throw new Error(json?.message ?? `API ${action} gagal`);
  return json.data ?? null;
}

function warn(action, error) {
  console.warn(`[api] ${action} gagal — memakai data lokal.`, error);
}

/**
 * Normalisasi respons list dari backend: bentuk {items:[...]} ATAU
 * array langsung. Bukan keduanya → null (dianggap tidak valid).
 */
function unwrapItems(server) {
  if (Array.isArray(server?.items)) return server.items;
  if (Array.isArray(server)) return server;
  return null;
}

// ---------------- Laporan ----------------

/** Semua laporan dari server (atau null bila mode simulasi). */
export function fetchReports() {
  return callApi("getLaporan")
    .then(unwrapItems)
    .catch((error) => {
      warn("getLaporan", error);
      return null;
    });
}

/** Kirim laporan baru ke server (idempotent per nomor tiket). */
export function saveReportOnServer(report) {
  return callApi("createLaporan", { laporan: report }).catch((error) => {
    warn("createLaporan", error);
    return null;
  });
}

/** Perbarui sebagian kolom laporan (status, responses, waOpened). */
export function patchReportOnServer(ticketId, patch) {
  return callApi("updateLaporan", { ticketId, patch }).catch((error) => {
    warn("updateLaporan", error);
    return null;
  });
}

/**
 * Muat daftar laporan: server dulu (bila aktif), hasilnya dicerminkan
 * ke localStorage agar komponen lain tetap selaras; gagal -> pakai lokal.
 */
export async function loadReportsData() {
  if (apiEnabled) {
    try {
      const server = await callApi("getLaporan");
      const items = unwrapItems(server);
      if (items) {
        writeSimulatedReports(items);
        return items;
      }
    } catch (error) {
      warn("getLaporan", error);
    }
  }
  return readSimulatedReports();
}

// ---------------- Kesiapan petugas ----------------

/** Daftar petugas siap dari server (atau null bila mode simulasi). */
export function fetchReadyStaff() {
  return callApi("getSiap")
    .then(unwrapItems)
    .catch((error) => {
      warn("getSiap", error);
      return null;
    });
}

/**
 * Muat petugas siap dari server bila aktif, lalu cermin ke localStorage.
 * @returns {Promise<Array|null>} daftar server, atau null ketika offline
 */
export async function syncReadyStaff() {
  if (!apiEnabled) return null;
  try {
    const server = await callApi("getSiap");
    const items = unwrapItems(server);
    if (items) {
      overwriteReadyStaff(items);
      return items;
    }
  } catch (error) {
    warn("getSiap", error);
  }
  return null;
}

/**
 * Kirim status siap petugas ke server (dua arah: isi/remove).
 * @param {{username,name,latitude,longitude,checkedInAt}} record
 * @param {boolean} remove true = cabut status siap
 */
export function pushReadyStaff(record, remove = false) {
  return callApi("setSiap", { item: record, remove }).catch((error) => {
    warn("setSiap", error);
    return null;
  });
}
