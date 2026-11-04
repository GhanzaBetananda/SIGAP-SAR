// ============================================================
// PELAMPIRAN FOTO TKP (opsional, masih frontend-only)
// Foto dikompres lewat canvas (maks 1280px, JPEG q=0.7) sebelum
// disimpan sebagai dataURL agar muat di localStorage simulasi.
// Saat backend ada: ganti kirim dataURL dengan FormData + API.
// ============================================================

import { useRef } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useReport } from "../context/useReport.js";

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

/** Kompres foto menjadi dataURL JPEG berdimensi terbatas. */
function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Berkas bukan gambar."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      image.onerror = () => reject(new Error("Gagal membaca gambar."));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Gagal membaca berkas."));
    reader.readAsDataURL(file);
  });
}

export default function PhotoPicker() {
  const { report, updateReport } = useReport();
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  async function handleChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressPhoto(file);
      updateReport({ photoUrl: dataUrl, photoName: file.name || "foto-tkp.jpg" });
    } catch {
      updateReport({ photoUrl: "", photoName: "" });
    } finally {
      event.target.value = "";
    }
  }

  function removePhoto() {
    updateReport({ photoUrl: "", photoName: "" });
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-1 text-lg font-bold text-slate-900">Foto TKP (Opsional)</h2>
      <p className="mb-4 text-sm text-slate-500">
        Satu foto kondisi di lokasi membantu petugas menilai kejadian lebih cepat.
        Otomatis dikompres untuk pengiriman.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white hover:bg-primary-dark active:scale-[0.97] active:bg-primary-dark"
        >
          <Camera className="h-5 w-5" /> Kamera
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex h-12 items-center gap-2 rounded-xl border-2 border-slate-300 px-5 text-sm font-semibold text-slate-700 active:scale-[0.97] hover:border-fireorange/40 hover:text-fireorange-dark"
        >
          <ImagePlus className="h-5 w-5" /> Galeri / Berkas
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {report.photoUrl && (
        <div className="mt-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-semibold text-forestgreen">
            Foto tersimpan {report.photoName ? `(${report.photoName})` : ""}
          </p>
          <img
            src={report.photoUrl}
            alt="Foto TKP"
            className="max-h-64 w-full rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={removePhoto}
            className="mt-3 flex h-12 items-center gap-2 rounded-lg border-2 border-slate-300 px-4 text-sm font-semibold text-red-600 active:scale-95 hover:border-red-400"
          >
            <Trash2 className="h-4 w-4" /> Hapus Foto
          </button>
        </div>
      )}
    </section>
  );
}
