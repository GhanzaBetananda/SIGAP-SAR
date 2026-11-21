// ============================================================
// PELAMPIRAN FOTO OPERASI HARIAN (maksimal 4 foto per entri hari)
// Foto dikompres lewat canvas (maks 1280px, JPEG q=0.7) sebelum
// disimpan sebagai dataURL. Digunakan pada panel admin saat input
// catatan operasi harian, ditempatkan di atas kesimpulan operasi.
// ============================================================

import { useRef } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;
const MAX_PHOTOS = 4;

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

export default function OperasiPhotoPicker({ photos = [], onChange }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const full = photos.length >= MAX_PHOTOS;

  async function handleChange(event) {
    const files = Array.from(event.target.files ?? []);
    let next = photos;
    for (const file of files) {
      if (next.length >= MAX_PHOTOS) break;
      try {
        const dataUrl = await compressPhoto(file);
        next = [...next, { url: dataUrl, name: file.name || "foto-operasi.jpg" }];
      } catch {
        // lewati berkas yang gagal dikompres
      }
    }
    onChange(next);
    event.target.value = "";
  }

  function removePhoto(index) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
      <p className="mb-2 text-[10px] font-bold text-slate-600 uppercase">
        Foto Operasi (maksimal {MAX_PHOTOS})
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          disabled={full}
          onClick={() => cameraInputRef.current?.click()}
          className={`flex h-11 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            full
              ? "border-slate-200 text-slate-400"
              : "border-primary text-primary hover:bg-primary/5 active:scale-[0.97]"
          }`}
        >
          <Camera className="h-4 w-4" /> Kamera
        </button>
        <button
          type="button"
          disabled={full}
          onClick={() => galleryInputRef.current?.click()}
          className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            full
              ? "border-slate-200 text-slate-400"
              : "border-slate-200 text-slate-700 hover:border-fireorange/40 hover:text-fireorange-dark active:scale-[0.97]"
          }`}
        >
          <ImagePlus className="h-4 w-4" /> Galeri
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleChange}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleChange}
          className="hidden"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="relative aspect-[4/5] rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
          >
            <img
              src={photo.url}
              alt={`Foto operasi ${index + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              aria-label={`Hapus foto ${index + 1}`}
              className="absolute top-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-sm hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <div className="aspect-[4/5] rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
            +
          </div>
        )}
      </div>
    </div>
  );
}
