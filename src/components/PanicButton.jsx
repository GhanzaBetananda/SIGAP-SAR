import { Siren } from "lucide-react";

/**
 * Tombol Panic Button besar — elemen paling menonjol.
 * Dipakai sebagai tombol utama di Home (menuju form) dan
 * sebagai tombol SUBMIT di halaman Panic Report.
 */
export default function PanicButton({
  label = "PANIC BUTTON",
  sublabel = "Tekan untuk lapor darurat",
  onClick,
  disabled = false,
  type = "button",
  size = "lg",
}) {
  const dimensions =
    size === "lg"
      ? "h-52 w-52 text-xl sm:h-60 sm:w-60 sm:text-2xl"
      : "h-44 w-44 text-lg sm:h-52 sm:w-52 sm:text-xl";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`group relative flex ${dimensions} select-none flex-col items-center justify-center rounded-full border-4 border-orange-300/60 bg-gradient-to-b from-orange-500 to-orange-600 text-center font-extrabold uppercase tracking-widest text-white shadow-[0_10px_40px_-5px_rgba(249,115,22,0.55)] transition-transform
          ${disabled ? "cursor-not-allowed grayscale" : "active:scale-90"}`}
      >
        {!disabled && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-orange-500/40" />
        )}
        <Siren
          className={size === "lg" ? "mb-1 h-9 w-9" : "mb-1 h-7 w-7"}
          strokeWidth={2.5}
        />
        <span className="px-4 leading-tight">{label}</span>
      </button>
      <p className={`text-sm font-medium ${disabled ? "text-slate-400" : "text-orange-700"}`}>
        {sublabel}
      </p>
    </div>
  );
}
