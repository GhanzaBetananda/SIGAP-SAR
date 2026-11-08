// ============================================================
// KESIAPAN PETUGAS SAR (SIMULASI FRONTEND)
// Pegawai BASARNAS menekan "Saya Siap Membantu" → GPS diambil
// sekali (bukan dipantau) → status & koordinat tersimpan.
//
// Panel admin TIDAK menelepon dari website — hanya melihat daftar
// petugas berstatus SIAP yang diurutkan berdasarkan jarak ke TKP
// laporan, lalu menghubungi mereka di luar aplikasi.
//
// Status siap kadaluarsa otomatis (default 2 jam) agar daftar
// tidak menahan petugas yang sudah tidak berada di posisi itu.
// Simulasi localStorage — saat integrasi Apps Script + Sheet,
// tabel "statusSiaga" memuat: username, nama, lat, lng, waktu.
// ============================================================

import { haversineKm } from "./distanceCalculator.js";

const READINESS_KEY = "sigapsar_sar_readiness";

// Status "siap" kedaluwarsa setelah 2 jam
export const READY_TTL_MS = 2 * 60 * 60 * 1000;

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(READINESS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeStore(next) {
  try {
    localStorage.setItem(READINESS_KEY, JSON.stringify(next));
  } catch {
    /* storage tidak tersedia — status tetap hidup selama tab ini */
  }
}

/** Daftar petugas yang status "siap"-nya masih segar (belum kadaluarsa). */
export function readReadyStaff() {
  const cutoff = Date.now() - READY_TTL_MS;
  return readStore().filter(
    (item) => item.checkedInAt && new Date(item.checkedInAt).getTime() >= cutoff,
  );
}

/** Apakah petugas dengan username ini sedang berstatus siap. */
export function isReady(username) {
  return readReadyStaff().some((item) => item.username === username);
}

/** Data lengkap status siap milik satu petugas (atau null). */
export function readyRecord(username) {
  return readReadyStaff().find((item) => item.username === username) || null;
}

/**
 * Timpa seluruh daftar lokal (cermin hasil sinkron server).
 * @param {Array} list daftar dari backend
 */
export function overwriteReadyStaff(list) {
  writeStore(
    (list ?? []).map((item) => ({
      username: item.username ?? "",
      name: item.name ?? "",
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      checkedInAt: item.checkedInAt ?? null,
    })),
  );
}

/**
 * Catat status siap + koordinat petugas (panggil dengan location=null
 * untuk mencabut status "siap").
 */
export function setReady(username, name, location) {
  const others = readStore().filter((item) => item.username !== username);
  if (!location) {
    writeStore(others);
    return;
  }
  writeStore([
    ...others,
    {
      username,
      name,
      latitude: location.latitude,
      longitude: location.longitude,
      checkedInAt: new Date().toISOString(),
    },
  ]);
}

/**
 * Petugas siap yang diurutkan berdasarkan jarak ke sebuah titik TKP.
 * @param {number} tkpLatitude
 * @param {number} tkpLongitude
 * @returns {Array<{username,name,latitude,longitude,checkedInAt,distanceKm}>}
 */
export function nearestReadyStaff(tkpLatitude, tkpLongitude) {
  if (!Number.isFinite(tkpLatitude) || !Number.isFinite(tkpLongitude)) return [];
  const tkp = { latitude: tkpLatitude, longitude: tkpLongitude };
  return readReadyStaff()
    .map((item) => ({
      ...item,
      distanceKm: haversineKm(tkp, {
        latitude: item.latitude,
        longitude: item.longitude,
      }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
