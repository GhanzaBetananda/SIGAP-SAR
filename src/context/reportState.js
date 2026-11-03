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

  // Panic Button
  voiceNoteUrl: "",
  voiceNoteDuration: 0,
  detail: "",

  // Status submit (simulasi frontend)
  submittedAt: null,
};

// Penyimpanan simulasi laporan terkirim (frontend-only)
const SIMULATED_REPORTS_KEY = "panic_button_simulated_reports";

export const ReportContext = createContext(null);

export function readSimulatedReports() {
  try {
    return JSON.parse(localStorage.getItem(SIMULATED_REPORTS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function writeSimulatedReports(reports) {
  try {
    localStorage.setItem(SIMULATED_REPORTS_KEY, JSON.stringify(reports));
  } catch {
    /* storage penuh/nonaktif — simulasi tetap berjalan in-memory */
  }
}
