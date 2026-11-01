import { useCallback, useRef } from "react";
import Swal from "sweetalert2";
import { useReport } from "../context/useReport.js";
import { Crosshair, Loader2, MapPin } from "lucide-react";

/**
 * Pengambilan koordinat TKP melalui Browser Geolocation API.
 * Menampilkan latitude, longitude, status, akurasi, dan tombol
 * ambil/perbarui lokasi.
 */
export default function LocationPicker({ errors = {} }) {
  const { report, updateReport } = useReport();
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

    updateReport({ locationStatus: "loading", locationError: "" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateReport({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          locationAccuracy: position.coords.accuracy,
          locationStatus: "ready",
          locationError: "",
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
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-base font-bold text-white transition-colors
          ${isLoading ? "cursor-wait bg-slate-400" : "bg-slate-900 hover:bg-slate-800"}`}
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
          <dt className="font-medium">Status</dt>
          <dd className="text-right">
            {isLoading && (
              <span className="font-semibold text-orange-600">Mengambil GPS…</span>
            )}
            {isReady && (
              <span className="font-semibold text-emerald-600">
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

      {isReady && (
        <a
          href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-orange-400 hover:text-orange-700"
        >
          <MapPin className="h-4 w-4" />
          Cek posisi di Google Maps
        </a>
      )}
    </section>
  );
}
