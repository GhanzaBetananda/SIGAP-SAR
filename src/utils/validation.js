// ============================================================
// VALIDASI FORM LAPORAN
// ============================================================

import { isFireIncident } from "../data/incidentTypes.js";

const COORD_MIN = { latitude: -90, longitude: -180 };
const COORD_MAX = { latitude: 90, longitude: 180 };

function hasValidCoordinates(report) {
  const { latitude, longitude } = report;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return (
    latitude >= COORD_MIN.latitude &&
    latitude <= COORD_MAX.latitude &&
    longitude >= COORD_MIN.longitude &&
    longitude <= COORD_MAX.longitude
  );
}

/**
 * Validasi Informasi Awal (halaman 1).
 * @returns {{valid:boolean, errors:Record<string,string>}}
 */
export function validateInitialReport(report) {
  const errors = {};

  if (!report.reporterCategory) {
    errors.reporterCategory = "Pilih identitas pelapor terlebih dahulu.";
  } else if (report.reporterCategory === "pegawai_basarnas") {
    if (!report.employeeName) {
      errors.employeeName = "Pilih nama pegawai BASARNAS.";
    }
  } else if (report.reporterCategory === "potensi_sar") {
    if (!report.district) {
      errors.district = "Pilih kecamatan terlebih dahulu.";
    }
    if (!report.potentialSarName) {
      errors.potentialSarName = "Pilih atau cari nama Potensi SAR.";
    }
  }

  if (!report.classification) {
    errors.classification = "Pilih klasifikasi kejadian.";
  }

  const victimCount = Number(report.victimCount);
  if (report.victimCount === "" || report.victimCount === null) {
    errors.victimCount = "Jumlah korban wajib diisi.";
  } else if (!Number.isFinite(victimCount) || victimCount < 0 || !Number.isInteger(victimCount)) {
    errors.victimCount = "Jumlah korban harus berupa angka bulat tidak negatif.";
  }

  if (!hasValidCoordinates(report)) {
    errors.location = "Koordinat TKP belum tersedia. Ambil lokasi melalui GPS perangkat.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validasi halaman Panic Button (voice note & detail kejadian).
 * @returns {{valid:boolean, errors:Record<string,string>}}
 */
export function validatePanicReport(report) {
  const errors = {};

  if (!report.voiceNoteUrl) {
    errors.voiceNote = "Laporan suara (Voice Note) wajib direkam.";
  }

  if (!report.detail || report.detail.trim().length === 0) {
    errors.detail = "Detail atau kronologi kejadian wajib diisi.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export { isFireIncident };
