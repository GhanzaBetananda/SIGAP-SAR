// ============================================================
// STATE GLOBAL LAPORAN (React Context)
// Pengganti backend pada tahap frontend; ganti dengan API call
// saat integrasi backend tanpa membangun ulang komponen.
// ============================================================

import { createContext } from "react";

export const EMPTY_REPORT = {
  // Identitas pelapor
  reporterCategory: "", // "pegawai_basarnas" | "potensi_sar" | "kampung_rescue"
  employeeName: "",
  district: "",
  potentialSarName: "",
  kampungRescueDesa: "",
  kampungRescueName: "",

  // Informasi kejadian
  classification: "",
  victimCount: "",

  // Lokasi TKP (Browser Geolocation API)
  latitude: null,
  longitude: null,
  locationAccuracy: null,
  locationStatus: "idle", // "idle" | "loading" | "ready" | "error"
  locationError: "",
  tkpDistrict: "", // kecamatan TKP hasil deteksi otomatis (reverse geocoding)

  // Foto TKP (opsional, dikompres menjadi dataURL JPEG)
  photoUrl: "",
  photoName: "",

  // Panic Button
  voiceNoteUrl: "",
  voiceNoteDuration: 0,
  detail: "",

  // Status submit (simulasi frontend)
  submittedAt: null,
};

// Penyimpanan simulasi laporan terkirim (frontend-only)
const SIMULATED_REPORTS_KEY = "panic_button_simulated_reports";
// Batas jumlah laporan yang disimpan agar localStorage tidak penuh
const MAX_SAVED_REPORTS = 50;

export const ReportContext = createContext(null);

/**
 * Draf patch identitas pelapor yang dibangun dari data sesi akun.
 * Dipakai saat login DAN saat sesi dipulihkan (mis. halaman di-refresh),
 * agar field identitas laporan selalu konsisten dan tidak kosong.
 * @param {{name: string, reporterCategory: string, region: string}} session
 */
export function accountIdentityPatch(session) {
  const patch = {
    reporterCategory: session.reporterCategory,
    // Reset data spesifik laporan lama
    tkpDistrict: "",
    photoUrl: "",
    photoName: "",
  };
  if (session.reporterCategory === "pegawai_basarnas") {
    patch.employeeName = session.name;
    patch.district = "";
    patch.potentialSarName = "";
    patch.kampungRescueDesa = "";
    patch.kampungRescueName = "";
  } else if (session.reporterCategory === "potensi_sar") {
    patch.potentialSarName = session.name;
    patch.district = session.region;
    patch.employeeName = "";
    patch.kampungRescueDesa = "";
    patch.kampungRescueName = "";
  } else {
    patch.kampungRescueName = session.name;
    patch.kampungRescueDesa = session.region;
    patch.employeeName = "";
    patch.district = "";
    patch.potentialSarName = "";
  }
  return patch;
}

export function readSimulatedReports() {
  try {
    return JSON.parse(localStorage.getItem(SIMULATED_REPORTS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function writeSimulatedReports(reports) {
  // Pangkas laporan terlama agar di bawah batas kuota
  let trimmed = reports.slice(-MAX_SAVED_REPORTS);
  try {
    localStorage.setItem(SIMULATED_REPORTS_KEY, JSON.stringify(trimmed));
  } catch {
    // Kuota penuh (mis. foto besar): buang laporan terlama satu per satu
    try {
      while (trimmed.length > 10) {
        trimmed = trimmed.slice(1);
        localStorage.setItem(SIMULATED_REPORTS_KEY, JSON.stringify(trimmed));
      }
    } catch {
      /* storage benar-benar tidak tersedia — data tetap hidup di state memori */
    }
  }
}

/**
 * Berapa laporan masih aktif (belum selesai) dalam rentang waktu tertentu.
 * Dipakai untuk status kesiagaan instansi di header.
 * @param {number} withinHours
 */
export function countActiveIncidents(withinHours = 24) {
  const cutoff = Date.now() - withinHours * 60 * 60 * 1000;
  return readSimulatedReports().filter(
    (report) =>
      report.submittedAt &&
      report.status !== "selesai" &&
      new Date(report.submittedAt).getTime() >= cutoff,
  ).length;
}
