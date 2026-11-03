// ============================================================
// DUMMY DATA: NAMA POTENSI SAR PER KECAMATAN (BANYUWANGI)
// Sementara diisi 4 nama placeholder per kecamatan agar
// dropdown tetap berfungsi. Ganti dengan data riil saat
// integrasi ke backend.
// ============================================================

import { DISTRICTS } from "./districts.js";

const PLACEHOLDER_NAMES_PER_DISTRICT = 4;

export const POTENTIAL_SAR = Object.fromEntries(
  DISTRICTS.map((district) => {
    const shortName = district.replace(" (Banyuwangi Kota)", "");
    return [
      district,
      Array.from(
        { length: PLACEHOLDER_NAMES_PER_DISTRICT },
        (_, i) => `Potensi SAR ${shortName} ${i + 1}`,
      ),
    ];
  }),
);
