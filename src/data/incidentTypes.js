// ============================================================
// KLASIFIKASI KEJADIAN
// Nilai kebakaran dan non-kebakaran dibedakan karena menjadi
// dasar distribusi laporan WhatsApp dan perhitungan jarak.
// ============================================================

export const CLASSIFICATIONS = [
  { value: "penerbangan", label: "Penerbangan" },
  { value: "pelayaran", label: "Pelayaran" },
  { value: "kondisi_membahayakan_manusia", label: "Kondisi Membahayakan Manusia" },
  { value: "penanganan_khusus", label: "Penanganan Khusus" },
  { value: "bencana_alam_kebakaran", label: "Bencana Alam — Kebakaran" },
  { value: "bencana_alam_non_kebakaran", label: "Bencana Alam — Non-Kebakaran" },
];

// Sub-pilihan khusus untuk klasifikasi "Bencana Alam"
export const NATURAL_DISASTER_SUB_OPTIONS = [
  { value: "bencana_alam_kebakaran", label: "Kebakaran" },
  { value: "bencana_alam_non_kebakaran", label: "Non-Kebakaran" },
];

export const NATURAL_DISASTER_PARENT = "bencana_alam";

export function getIncidentLabel(classificationValue) {
  const found = CLASSIFICATIONS.find((item) => item.value === classificationValue);
  return found ? found.label : "";
}

// Kejadian kebakaran = hanya "Bencana Alam — Kebakaran"
export function isFireIncident(classificationValue) {
  return classificationValue === "bencana_alam_kebakaran";
}
