// ============================================================
// DETEKSI KECAMATAN TKP (REVERSE GEOCODING)
// Memakai layanan publik Nominatim/OpenStreetMap — tanpa API key.
// Ganti dengan API BASARNAS/Geodikdas saat integrasi backend.
// ============================================================

import { matchDistrict } from "../data/districts.js";

const GEOCODE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

/**
 * Menterjemahkan koordinat menjadi nama kecamatan Banyuwangi.
 * Return "" bila gagal/tidak cocok — fitur ini tidak wajib, jadi
 * kegagalan jaringan tidak boleh memblokir pelaporan.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string>} value kecamatan ("" bila tidak terdeteksi)
 */
export async function detectTkpDistrict(latitude, longitude) {
  try {
    const url = `${GEOCODE_ENDPOINT}?format=jsonv2&zoom=10&addressdetails=1&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return "";

    const data = await response.json();
    const address = data?.address ?? {};
    const candidate =
      address.city_district ||
      address.suburb ||
      address.town ||
      address.village ||
      address.municipality ||
      "";
    return matchDistrict(candidate);
  } catch {
    return "";
  }
}
