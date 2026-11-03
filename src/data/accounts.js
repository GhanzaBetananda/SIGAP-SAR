// ============================================================
// DUMMY DATA: AKUN PELAPOR SIGAPSAR
// Setiap akun membawa identitas pelapor sehingga Informasi Awal
// dihilangkan — nama/kategori/wilayah dipanggil dari akun login.
// Ganti dengan data akun riil saat integrasi ke backend.
// ============================================================

export const ACCOUNTS = [
  {
    username: "BAS001",
    password: "basarnas123",
    name: "Andi Saputra",
    reporterCategory: "pegawai_basarnas",
    region: "",
  },
  {
    username: "POTMUNCAR",
    password: "muncar123",
    name: "Yusuf Aditia",
    reporterCategory: "potensi_sar",
    region: "Muncar",
  },
  {
    username: "POTSONGGON",
    password: "songgon123",
    name: "Wahyu Setiawan",
    reporterCategory: "potensi_sar",
    region: "Songgon",
  },
  {
    username: "KRMANDAR",
    password: "mandar123",
    name: "Abdul Rahman",
    reporterCategory: "kampung_rescue",
    region: "Desa Kampung Mandar",
  },
  {
    username: "KRSONGGON",
    password: "songgon123",
    name: "I Made Wiarta",
    reporterCategory: "kampung_rescue",
    region: "Desa Songgon",
  },
];
