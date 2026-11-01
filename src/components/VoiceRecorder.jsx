import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useReport } from "../context/useReport.js";
import {
  Mic,
  Play,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Perekam Voice Note menggunakan MediaRecorder API.
 * Hasil rekaman disimpan sementara (Blob/Object URL).
 * Catatan: perekaman berjalan pada HTTPS atau localhost.
 */
export default function VoiceRecorder({ errors = {} }) {
  const { report, updateReport } = useReport();

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Cleanup saat komponen dilepas
    return () => {
      stopStreams();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function stopStreams() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      Swal.fire({
        icon: "error",
        title: "Perekaman Tidak Didukung",
        text: "Browser Anda tidak mendukung perekaman suara. Gunakan browser modern dengan HTTPS/localhost.",
        confirmButtonColor: "#ea580c",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const duration = elapsedRef.current;
        updateReport({ voiceNoteUrl: url, voiceNoteDuration: duration });
        setElapsed(duration);
        stopStreams();
      };

      recorder.start();
      setRecording(true);
      setElapsed(0);
      elapsedRef.current = 0;
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          elapsedRef.current = prev + 1;
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      const denied = err?.name === "NotAllowedError";
      Swal.fire({
        icon: "error",
        title: "Gagal Merekam",
        text: denied
          ? "Izin mikrofon ditolak. Aktifkan izin mikrofon pada browser lalu coba lagi."
          : "Gagal mengakses mikrofon. Pastikan tidak ada aplikasi lain yang menggunakannya.",
        confirmButtonColor: "#ea580c",
      });
    }
  }

  const elapsedRef = useRef(0);

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function deleteRecording() {
    if (report.voiceNoteUrl) URL.revokeObjectURL(report.voiceNoteUrl);
    updateReport({ voiceNoteUrl: "", voiceNoteDuration: 0 });
    setElapsed(0);
    elapsedRef.current = 0;
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-1 text-lg font-bold text-slate-900">Voice Note (Laporan Suara)</h2>
      <p className="mb-4 text-sm text-slate-500">
        Rekam penjelasan singkat kondisi di TKP. Hasil rekaman menjadi bagian dari laporan.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex h-14 min-w-36 items-center justify-center gap-2 rounded-xl bg-red-600 text-base font-bold text-white hover:bg-red-700 active:scale-[0.97] active:bg-red-700"
          >
            <Mic className="h-5 w-5" />
            Mulai Rekam
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={stopRecording}
              className="flex h-14 min-w-36 items-center justify-center gap-2 rounded-xl bg-red-600 text-base font-bold text-white hover:bg-red-700 active:scale-[0.97] active:bg-red-700"
            >
              <Square className="h-5 w-5" />
              Berhenti
            </button>
            <span className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 font-mono text-lg font-bold text-red-700">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-600" />
              {formatDuration(elapsed)}
            </span>
          </>
        )}
      </div>

      {report.voiceNoteUrl && (
        <div className="mt-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-semibold text-emerald-700">
            Rekaman tersimpan (durasi {formatDuration(report.voiceNoteDuration)})
          </p>
          {/* Kontainer audio agar lebih mudah disentuh di smartphone */}
          <audio controls src={report.voiceNoteUrl} className="w-full" preload="metadata" />

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={report.voiceNoteUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 active:scale-95 active:bg-slate-800"
            >
              <Play className="h-4 w-4" /> Putar di Tab Baru
            </a>
            <button
              type="button"
              onClick={startRecording}
              className="flex h-12 items-center gap-2 rounded-lg border-2 border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:border-orange-400 hover:text-orange-700 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" /> Rekam Ulang
            </button>
            <button
              type="button"
              onClick={deleteRecording}
              className="flex h-12 items-center gap-2 rounded-lg border-2 border-slate-300 px-4 text-sm font-semibold text-red-600 hover:border-red-400 active:scale-95"
            >
              <Trash2 className="h-4 w-4" /> Hapus Rekaman
            </button>
          </div>
        </div>
      )}

      {errors.voiceNote && (
        <p className="mt-3 text-sm font-medium text-red-600">{errors.voiceNote}</p>
      )}
    </section>
  );
}
