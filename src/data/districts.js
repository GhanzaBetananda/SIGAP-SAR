// ============================================================
// DATA: DAFTAR KECAMATAN KABUPATEN BANYUWANGI (25 kecamatan)
// Value disimpan BERSIH (tanpa anotasi tampilan). Label khusus
// ditampilkan lewat districtLabel(), sehingga data aman dipakai
// sebagai kunci/matching saat integrasi backend.
// ============================================================

export const DISTRICTS = [
  "Pesanggaran",
  "Bangorejo",
  "Purwoharjo",
  "Tegaldlimo",
  "Muncar",
  "Cluring",
  "Gambiran",
  "Srono",
  "Genteng",
  "Glenmore",
  "Kalibaru",
  "Singojuruh",
  "Rogojampi",
  "Kabat",
  "Glagah",
  "Banyuwangi",
  "Giri",
  "Wongsorejo",
  "Songgon",
  "Sempu",
  "Kalipuro",
  "Siliragung",
  "Tegalsari",
  "Licin",
  "Blimbingsari",
];

/** Label tampilan khusus untuk kecamatan tertentu. */
export const DISTRICT_LABELS = {
  Banyuwangi: "Banyuwangi (Kota)",
};

/**
 * Label tampilan sebuah kecamatan.
 * @param {string} name value kecamatan
 * @returns {string}
 */
export function districtLabel(name) {
  if (!name) return "";
  return DISTRICT_LABELS[name] ?? name;
}

/**
 * Mencocokkan nama kecamatan dari sumber luar (mis. hasil
 * reverse geocoding) ke value daftar — tanpa peduli huruf besar/kecil.
 * @param {string} candidate
 * @returns {string} value kecamatan yang cocok, atau ""
 */
export function matchDistrict(candidate) {
  if (!candidate) return "";
  const cleaned = String(candidate)
    .replace(/^kecamatan\s*/i, "")
    .replace(/\s+Banyuwangi$/i, "")
    .trim()
    .toLowerCase();
  const found = DISTRICTS.find(
    (district) => district.toLowerCase() === cleaned,
  );
  return found ?? "";
}
