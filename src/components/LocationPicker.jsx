import { useCallback, useRef } from "react";
import Swal from "sweetalert2";
import { useReport } from "../context/useReport.js";
import { useAuth } from "../context/AuthProvider.jsx";
import { detectTkpDistrict } from "../utils/geo.js";
import { districtLabel, matchDistrict } from "../data/districts.js";
import { Crosshair, Loader2, MapPin, TriangleAlert } from "lucide-react";

/**
 * Pengambilan koordinat TKP melalui Browser Geolocation API.
 * Menampilkan latitude, longitude, status, akurasi, tombol
 * ambil/perbarui lokasi, dan deteksi kecamatan TKP otomatis
 * (reverse geocoding) termasuk peringatan bila TKP berada di
 * kecamatan/desa yang berbeda dari wilayah akun pelapor.
 */
export default function LocationPicker({ errors = {} }) {
  const { report, updateReport } = useReport();
  const { session } = useAuth();
  const lastPositionRef = useRef(0);

  const captureLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      updateReport({
        locationStatus: "error",
        locationError: "Perangkat/browser tidak mendukung Geolocation API.",
      });
      Swal.fire({
        icon: "error",
        title: "Lokasi Tidak Didukung",
        text: "Browser Anda tidak mendukung pengambilan lokasi. Gunakan browser modern dan aktifkan GPS.",
        confirmButtonColor: "#ea580c",
      });
      return;
    }

    // Mencegah 2 request paralel dari render ulang (StrictMode/retake cepat)
    if (lastPositionRef.current && Date.now() - lastPositionRef.current < 1000) return;
    lastPositionRef.current = Date.now();

    updateReport({ locationStatus: "loading", locationError: "", tkpDistrict: "" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        updateReport({
          latitude,
          longitude,
          locationAccuracy: position.coords.accuracy,
          locationStatus: "ready",
          locationError: "",
        });
        // Deteksi kecamatan TKP di latar belakang (gagal = abaikan)
        detectTkpDistrict(latitude, longitude).then((district) => {
          if (district) updateReport({ tkpDistrict: district });
        });
      },
      (error) => {
        const messageMap = {
          1: "Izin akses lokasi ditolak. Aktifkan izin lokasi pada browser/HP lalu coba lagi.",
          2: "Sinyal lokasi tidak tersedia. Coba pindah ke tempat terbuka dan tekan ulang tombol lokasi.",
          3: "Waktu pengambilan lokasi habis. Pastikan GPS aktif lalu coba lagi.",
        };
        const message = messageMap[error.code] || `Gagal mengambil lokasi: ${error.message}`;
        updateReport({ locationStatus: "error", locationError: message });
        Swal.fire({
          icon: "error",
          title: "Gagal Mengambil Lokasi",
          text: message,
          confirmButtonColor: "#ea580c",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [updateReport]);

  const isLoading = report.locationStatus === "loading";
  const isReady = report.locationStatus === "ready";

  // Peringatan bila TKP terdeteksi di luar wilayah pelapor (Potensi SAR/Kampung Rescue)
  const accountDistrict = session?.reporterCategory !== "pegawai_basarnas" ? matchDistrict(session?.region ?? "") : "";
  const regionMismatch =
    isReady && Boolean(accountDistrict) && Boolean(report.tkpDistrict) && report.tkpDistrict !== accountDistrict;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-1 text-lg font-bold text-slate-900">Koordinat Lokasi Kejadian (TKP)</h2>
      <p className="mb-4 text-sm text-slate-500">
        Koordinat diambil otomatis dari GPS perangkat Anda. Berikan izin akses lokasi saat
        diminta oleh browser.
      </p>

      <button
        type="button"
        onClick={captureLocation}
        disabled={isLoading}
        className={`flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-bold text-white transition-all
          ${isLoading ? "cursor-wait bg-slate-400" : "bg-primary hover:bg-primary-dark active:scale-[0.98] active:bg-primary-dark"}`}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Crosshair className="h-5 w-5" />
        )}
        {isLoading ? "Mengambil lokasi..." : isReady ? "Perbarui Lokasi" : "Ambil Lokasi Saat Ini"}
      </button>

      {errors.location && (
        <p className="mt-3 text-sm font-medium text-red-600">{errors.location}</p>
      )}

      <dl className={`mt-4 grid gap-2 text-sm ${isReady ? "text-slate-800" : "text-slate-400"}`}>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
          <dt className="font-medium">Latitude</dt>
          <dd className="font-mono">{isReady ? report.latitude : "-"}</dd>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
          <dt className="font-medium">Longitude</dt>
          <dd className="font-mono">{isReady ? report.longitude : "-"}</dd>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
          <dt className="font-medium">Kecamatan TKP</dt>
          <dd className="text-right">
            {isLoading && <span className="text-slate-400">Diperiksa…</span>}
            {!isLoading && report.tkpDistrict && (
              <span className="font-bold text-slate-800">{districtLabel(report.tkpDistrict)}</span>
            )}
            {!isLoading && !report.tkpDistrict && (
              <span className={isReady ? "text-slate-400" : ""}>
                {isReady ? "Tidak terdeteksi" : "-"}
              </span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
          <dt className="font-medium">Status</dt>
          <dd className="text-right">
            {isLoading && (
              <span className="font-semibold text-fireorange">Mengambil GPS…</span>
            )}
            {isReady && (
              <span className="font-semibold text-forestgreen">
                Koordinat siap (±{Math.round(report.locationAccuracy ?? 0)} m)
              </span>
            )}
            {report.locationStatus === "error" && (
              <span className="font-semibold text-red-600">Gagal</span>
            )}
            {report.locationStatus === "idle" && <span>Belum diambil</span>}
          </dd>
        </div>
      </dl>

      {regionMismatch && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border-2 border-fireorange/25 bg-fireorange/10 px-3 py-2.5 text-xs text-fireorange-dark">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Wilayah akun Anda: {districtLabel(accountDistrict)}. TKP terdeteksi di{" "}
          {districtLabel(report.tkpDistrict)} — pastikan lokasi kejadian sudah benar
          sebelum melapor.
        </p>
      )}

      {isReady && (
        <a
          href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-4 text-sm font-semibold text-slate-700 active:scale-[0.98] hover:border-fireorange/40 hover:text-fireorange-dark"
        >
          <MapPin className="h-4 w-4" />
          Cek posisi di Google Maps
        </a>
      )}
    </section>
  );
}
