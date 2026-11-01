// ============================================================
// KALKULATOR JARAK LOKASI (METODE HAVERSINE)
// ============================================================

import { BASARNAS_OFFICE, MANGGALA_AGNI_OFFICE } from "../config/officeLocation.js";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Menghitung jarak (km) antara dua koordinat dengan metode Haversine.
 * @param {{latitude:number, longitude:number}} coordA
 * @param {{latitude:number, longitude:number}} coordB
 * @returns {number} jarak dalam kilometer
 */
export function haversineKm(coordA, coordB) {
  const dLat = toRadians(coordB.latitude - coordA.latitude);
  const dLon = toRadians(coordB.longitude - coordA.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(coordA.latitude)) *
      Math.cos(toRadians(coordB.latitude)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function formatDistanceKm(km) {
  if (km === null || km === undefined || !Number.isFinite(km)) return "-";
  return `${km.toFixed(2)} km`;
}

/**
 * Menghitung jarak TKP terhadap kantor instansi terkait.
 * @param {{latitude:number, longitude:number}|null} tkp koordinat TKP
 * @param {boolean} includeManggalaAgni true jika kejadian kebakaran
 * @returns {{basarnas:number, manggalaAgni:number|null}|null}
 */
export function calculateDistances(tkp, includeManggalaAgni) {
  if (!tkp || !Number.isFinite(tkp.latitude) || !Number.isFinite(tkp.longitude)) {
    return null;
  }

  const result = {
    basarnas: haversineKm(tkp, BASARNAS_OFFICE),
    manggalaAgni: null,
  };

  if (includeManggalaAgni) {
    result.manggalaAgni = haversineKm(tkp, MANGGALA_AGNI_OFFICE);
  }

  return result;
}
