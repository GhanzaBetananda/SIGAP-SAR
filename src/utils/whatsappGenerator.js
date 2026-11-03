// ============================================================
// PEMBENTUK PESAN & TAUTAN WHATSAPP (CLICK TO CHAT)
// Nomor tujuan diambil dari src/config/whatsapp.js — jangan
// menuliskan nomor langsung di komponen halaman.
// ============================================================

import { BASARNAS_WA_NUMBER, MANGGALA_AGNI_WA_NUMBER } from "../config/whatsapp.js";
import { getIncidentLabel, isFireIncident } from "../data/incidentTypes.js";
import { formatDistanceKm } from "./distanceCalculator.js";

export const REPORTER_CATEGORIES = {
  pegawai_basarnas: "Pegawai BASARNAS",
  potensi_sar: "Potensi SAR",
  kampung_rescue: "Kampung Rescue",
};

export function reporterName(report) {
  if (report.reporterCategory === "pegawai_basarnas") return report.employeeName || "-";
  if (report.reporterCategory === "potensi_sar") return report.potentialSarName || "-";
  if (report.reporterCategory === "kampung_rescue") return report.kampungRescueName || "-";
  return "-";
}

function reporterCategoryLabel(report) {
  let label = REPORTER_CATEGORIES[report.reporterCategory] || "-";
  if (report.reporterCategory === "potensi_sar" && report.district) {
    label += ` — Kecamatan ${report.district}`;
  }
  if (report.reporterCategory === "kampung_rescue" && report.kampungRescueDesa) {
    label += ` — ${report.kampungRescueDesa}`;
  }
  return label;
}

function googleMapsLink(report) {
  return `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Menyusun isi pesan WhatsApp secara dinamis berdasarkan data laporan.
 * @param {object} report data laporan
 * @param {{basarnas:number, manggalaAgni:number|null}} distances hasil Haversine
 * @returns {string} teks pesan (belum di-encode)
 */
export function buildReportMessage(report, distances) {
  const fire = isFireIncident(report.classification);

  const lines = [
    "LAPORAN AWAL KEJADIAN SAR",
    "",
    "IDENTITAS PELAPOR",
    `Nama: ${reporterName(report)}`,
    `Kategori Pelapor: ${reporterCategoryLabel(report)}`,
    "",
    "INFORMASI KEJADIAN",
    `Klasifikasi Kejadian: ${getIncidentLabel(report.classification) || "-"}`,
    `Jumlah Korban: ${report.victimCount}`,
    "",
    "LOKASI KEJADIAN",
    `Latitude: ${report.latitude}`,
    `Longitude: ${report.longitude}`,
    `Link Google Maps: ${googleMapsLink(report)}`,
    "",
    "JARAK LOKASI",
    `Jarak dari Kantor BASARNAS: ${formatDistanceKm(distances?.basarnas ?? null)}`,
  ];

  if (fire) {
    lines.push(
      `Jarak dari Kantor Manggala Agni: ${formatDistanceKm(distances?.manggalaAgni ?? null)}`,
    );
  }

  lines.push(
    "",
    "DETAIL KEJADIAN",
    report.detail?.trim() || "-",
    "",
    "VOICE NOTE",
    report.voiceNoteUrl
      ? `Tersedia — rekaman suara durasi ${formatDuration(report.voiceNoteDuration)}. Berkas voice note akan dilampirkan melalui sistem BASARNAS (integrasi backend).`
      : "Tidak tersedia.",
  );

  return lines.join("\n");
}

/**
 * Membuat URL WhatsApp Click to Chat.
 * @param {string} number nomor format internasional tanpa "+"
 * @param {string} message pesan laporan
 */
export function buildWhatsAppUrl(number, message) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Menentukan daftar tujuan WhatsApp berdasarkan klasifikasi kejadian.
 * Non-kebakaran  -> 1 tujuan (BASARNAS)
 * Kebakaran      -> 2 tujuan (BASARNAS + Manggala Agni)
 */
export function getWhatsAppTargets(report, distances) {
  const message = buildReportMessage(report, distances);

  const targets = [
    {
      id: "basarnas",
      label: "Kirim ke WhatsApp BASARNAS",
      number: BASARNAS_WA_NUMBER,
      url: buildWhatsAppUrl(BASARNAS_WA_NUMBER, message),
    },
  ];

  if (isFireIncident(report.classification)) {
    targets.push({
      id: "manggala_agni",
      label: "Kirim ke WhatsApp Manggala Agni",
      number: MANGGALA_AGNI_WA_NUMBER,
      url: buildWhatsAppUrl(MANGGALA_AGNI_WA_NUMBER, message),
    });
  }

  return targets;
}

/** Ringkasan versi teks untuk konfirmasi SweetAlert2. */
export function buildSummaryText(report) {
  const category = REPORTER_CATEGORIES[report.reporterCategory] || "-";
  const name =
    report.reporterCategory === "pegawai_basarnas"
      ? report.employeeName
      : report.reporterCategory === "potensi_sar"
        ? report.potentialSarName
        : report.kampungRescueName;
  return [
    `Pelapor: ${name || "-"} (${category})`,
    `Klasifikasi: ${getIncidentLabel(report.classification) || "-"}`,
    `Jumlah korban: ${report.victimCount}`,
    `Koordinat TKP: ${report.latitude}, ${report.longitude}`,
  ].join("\n");
}
