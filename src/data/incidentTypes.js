// ============================================================
// KLASIFIKASI KEJADIAN
// (Mode presensiasi BASARNAS: pemecahan Kebakaran / Non-Kebakaran
//  disembunyikan, diganti satu klasifikasi "Bencana Alam" umum.)
// ============================================================

// Kode baru — Bencana Alam sebagai klasifikasi umum
export const CLASSIFICATIONS = [
  { value: "penerbangan", label: "Penerbangan" },
  { value: "pelayaran", label: "Pelayaran" },
  { value: "kondisi_membahayakan_manusia", label: "Kondisi Membahayakan Manusia" },
  { value: "penanganan_khusus", label: "Penanganan Khusus" },
  { value: "bencana_alam", label: "Bencana Alam" },
];

// [PRESNAS 2026-11-09] — dimatikan sementara; aktifkan kembali saat
// integrasi Manggala Agni. Baris "bencana_alam" di atas lalu dihapus.
// export const CLASSIFICATIONS = [
//   { value: "penerbangan", label: "Penerbangan" },
//   { value: "pelayaran", label: "Pelayaran" },
//   { value: "kondisi_membahayakan_manusia", label: "Kondisi Membahayakan Manusia" },
//   { value: "penanganan_khusus", label: "Penanganan Khusus" },
//   { value: "bencana_alam_kebakaran", label: "Bencana Alam — Kebakaran" },
//   { value: "bencana_alam_non_kebakaran", label: "Bencana Alam — Non-Kebakaran" },
// ];

// Sub-pilihan khusus untuk klasifikasi "Bencana Alam"
// [PRESNAS 2026-11-09] — matikan sementara saat presens (lihat atas).
// Jangan dihapus — aktifkan kembali saat integrasi Manggala Agni.
// export const NATURAL_DISASTER_SUB_OPTIONS = [
//   { value: "bencana_alam_kebakaran", label: "Kebakaran" },
//   { value: "bencana_alam_non_kebakaran", label: "Non-Kebakaran" },
// ];

export const NATURAL_DISASTER_PARENT = "bencana_alam";

export function getIncidentLabel(classificationValue) {
  const found = CLASSIFICATIONS.find((item) => item.value === classificationValue);
  return found ? found.label : "";
}

// Kejadian kebakaran = hanya "Bencana Alam — Kebakaran"
export function isFireIncident(classificationValue) {
  return classificationValue === "bencana_alam_kebakaran";
}
