// ============================================================
// TANGGAPAN INSTANSI (CHECKLIST DITERIMA + TIM & PERALATAN)
// Struktur per laporan (disimpan dalam satu record laporan yang sama,
// sehingga tanggapan BASARNAS terlihat oleh Manggala Agni dan sebaliknya):
//   report.responses.basarnas / report.responses.manggala_agni = {
//     received: bool, receivedAt, receivedBy,   // checklist sudah diterima
//     personnel: number,            // jumlah anggota yang diterjunkan
//     equipment: [{name, qty}],     // alat yang dibawa beserta jumlahnya
//     note: string,                 // catatan tim / keterangan
//     dispatchedAt,                 // waktu pertama kali tim diterjunkan
//     finishedAt,                   // waktu tugas instansi ini selesai
//   }
// Status laporan (baru -> diterima -> diterjunkan -> selesai) otomatis
// dihitung dari objek tanggapan — tidak lagi dipilih manual di dropdown.
// Saat backend (Apps Script + Sheet) tersedia, tanggapan tetap bagian
// dari record laporan yang sama.
// ============================================================

import { isFireIncident } from "../data/incidentTypes.js";

/** Label instansi yang pernah menanggapi laporan. */
export const RESPONSE_AGENCIES = {
  basarnas: "BASARNAS",
  manggala_agni: "MANGGALA AGNI",
};

export function emptyResponse() {
  return {
    received: false,
    receivedAt: null,
    receivedBy: "",
    personnel: 0,
    equipment: [],
    note: "",
    dispatchedAt: null,
    finishedAt: null,
  };
}

/** Tanggapan suatu instansi pada sebuah laporan (boleh kosong). */
export function responseFor(report, agency) {
  return { ...emptyResponse(), ...(report?.responses?.[agency] ?? {}) };
}

/**
 * Instansi yang ditugaskan menangani laporan sesuai aturan distribusi:
 * kebakaran -> BASARNAS + Manggala Agni, selain itu hanya BASARNAS.
 */
export function involvedAgencies(report) {
  return report && isFireIncident(report.classification)
    ? Object.keys(RESPONSE_AGENCIES)
    : ["basarnas"];
}

/**
 * Total unit peralatan yang diterjunkan (jumlah seluruh jenis alat).
 * @param {Array<{qty?: number|string}>} equipment
 */
export function totalEquipmentUnits(equipment) {
  return (equipment ?? []).reduce(
    (sum, item) => sum + (Number(item?.qty) || 0),
    0,
  );
}

/** Status laporan otomatis dari tanggapan tiap instansi. */
export function deriveStatus(report) {
  if (!report) return "baru";
  const responses = involvedAgencies(report).map((agency) =>
    responseFor(report, agency),
  );
  if (responses.every((item) => item.finishedAt)) return "selesai";
  if (responses.some((item) => item.dispatchedAt)) return "diterjunkan";
  if (responses.some((item) => item.receivedAt || item.received)) {
    return "diterima";
  }
  return "baru";
}

/**
 * Simpan perubahan tanggapan satu instansi pada laporan, lalu
 * perbarui status laporan secara otomatis.
 * @param {object} report
 * @param {"basarnas"|"manggala_agni"} agency
 * @param {object|function} patch Nilai baru atau fungsi (prev) => nilai baru.
 */
export function applyResponse(report, agency, patch) {
  const prev = responseFor(report, agency);
  const changes = typeof patch === "function" ? patch(prev) : patch;
  const updated = {
    ...report,
    responses: {
      ...(report.responses ?? {}),
      [agency]: { ...prev, ...changes },
    },
  };
  updated.status = deriveStatus(updated);
  return updated;
}

/** Kelompok status untuk tab filter admin: baru / diproses / selesai. */
export function statusGroup(status) {
  if (status === "selesai") return "selesai";
  if (["diterima", "diproses", "diterjunkan"].includes(status)) {
    return "diproses";
  }
  return "baru";
}
