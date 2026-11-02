import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Layout from "../components/Layout.jsx";
import Stepper from "../components/Stepper.jsx";
import PanicButton from "../components/PanicButton.jsx";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import DistanceInfo from "../components/DistanceInfo.jsx";
import ReportSummary from "../components/ReportSummary.jsx";
import { useReport } from "../context/useReport.js";
import { validatePanicReport } from "../utils/validation.js";
import { calculateDistances } from "../utils/distanceCalculator.js";
import { getWhatsAppTargets, buildSummaryText } from "../utils/whatsappGenerator.js";
import { isFireIncident } from "../data/incidentTypes.js";
import { Lock, Send } from "lucide-react";

export default function PanicReport() {
  const navigate = useNavigate();
  const { report, updateReport, saveReportLocally, initialValidation } = useReport();
  const [errors, setErrors] = useState({});
  const [waTargets, setWaTargets] = useState([]);

  // Panic Button hanya dapat diakses setelah informasi awal lengkap
  useEffect(() => {
    if (!initialValidation.valid) {
      Swal.fire({
        icon: "warning",
        title: "Informasi Awal Belum Lengkap",
        text: "Lengkapi dulu informasi awal agar Panic Button dapat digunakan.",
        confirmButtonColor: "#ea580c",
        confirmButtonText: "Isi Informasi Awal",
      }).then(() => navigate("/lapor-awal", { replace: true }));
    }
  }, [initialValidation.valid, navigate]);

  const fire = isFireIncident(report.classification);

  // Perhitungan jarak TKP ke kantor instansi terkait (Haversine)
  const distances = useMemo(
    () => calculateDistances(report, fire),
    [report, fire],
  );

  function handleSubmit() {
    // 1. Validasi seluruh informasi laporan
    const validation = validatePanicReport(report);
    if (!validation.valid) {
      setErrors(validation.errors);
      Swal.fire({
        icon: "warning",
        title: "Laporan Belum Lengkap",
        html: Object.values(validation.errors)
          .map((message) => `<div style="text-align:left">${message}</div>`)
          .join("<br/>"),
        confirmButtonColor: "#ea580c",
        confirmButtonText: "Perbaiki",
      });
      return;
    }

    // 2. Konfirmasi + ringkasan laporan
    Swal.fire({
      icon: "question",
      title: "Kirim Laporan?",
      html: `<pre style="text-align:left;white-space:pre-wrap;font-family:inherit" class="swal-summary">${buildSummaryText(report)}</pre>`,
      showCancelButton: true,
      confirmButtonText: "Ya, Kirim Laporan",
      cancelButtonText: "Periksa Kembali",
      confirmButtonColor: "#ea580c",
    }).then((result) => {
      if (!result.isConfirmed) return;

      // 3. Simulasi penyimpanan laporan pada frontend (state lokal + localStorage)
      saveReportLocally({
        ...report,
        distances,
        submittedAt: new Date().toISOString(),
      });
      updateReport({ submittedAt: new Date().toISOString() });

      // 4. Siapkan tautan WhatsApp sesuai klasifikasi kejadian
      const targets = getWhatsAppTargets(report, distances);
      setWaTargets(targets);
      setErrors({});

      const targetList = targets
        .map((target) => `<li style="text-align:left">${target.label}</li>`)
        .join("");
      Swal.fire({
        icon: "success",
        title: "Laporan Berhasil Disiapkan",
        html: `<div style="text-align:left"><p>Data laporan disimpan pada simulasi frontend.</p><p class="mt-2"><strong>Tautan WhatsApp siap dibuka:</strong></p><ul>${targetList}</ul><p class="mt-2" style="font-size:0.9em">Tekan tombol kirim secara manual di aplikasi WhatsApp.</p></div>`,
        confirmButtonColor: "#ea580c",
        confirmButtonText: "Buka Distribusi WhatsApp",
      });
    });
  }

  return (
    <Layout>
      <Stepper current={3} />

      <div className="mt-6 space-y-4">
        {/* Rekap informasi awal agar dapat dilihat ulang sebelum submit */}
        <ReportSummary report={report} onEdit={() => navigate("/lapor-awal")} />

        <VoiceRecorder errors={errors} />

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Detail Kejadian</h2>
          <p className="mb-3 text-sm text-slate-500">
            Jelaskan kronologi dan kondisi di TKP secara manual.
          </p>
          <textarea
            rows={5}
            value={report.detail}
            onChange={(e) => updateReport({ detail: e.target.value })}
            placeholder="Tuliskan kronologi kejadian, kondisi korban, dan informasi tambahan..."
            className={`w-full resize-y rounded-xl border-2 bg-white px-4 py-3 text-base outline-none focus:border-basarnasblue
              ${errors.detail ? "border-red-400" : "border-slate-300"}`}
          />
          {errors.detail && (
            <p className="mt-2 text-sm font-medium text-red-600">{errors.detail}</p>
          )}
        </section>

        <DistanceInfo report={report} distances={distances} />

        {/* Panic Button menjadi tombol submit laporan — elemen paling menonjol */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
            <PanicButton
              label="Kirim Laporan"
              sublabel="Pastikan seluruh isian telah benar"
              onClick={handleSubmit}
              size="md"
            />
            <p className="flex items-start gap-2 text-center text-xs leading-relaxed text-slate-500">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-basarnasblue" />
              Setelah ditekan, laporan disimpan pada simulasi frontend lalu tautan
              WhatsApp disiapkan sesuai klasifikasi kejadian
              {fire ? " (BASARNAS + Manggala Agni)" : " (BASARNAS)"}.
            </p>
          </div>
        </div>

        {/* Distribusi WhatsApp muncul setelah submit */}
        {report.submittedAt && waTargets.length > 0 && (
          <section className="rounded-2xl border border-basarnasblue/15 bg-basarnasblue p-5 text-white shadow-sm sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
              <Send className="h-5 w-5 text-sarorange" />
              Distribusi Laporan WhatsApp
            </h2>
            <p className="mb-4 text-sm text-white/80">
              Buka setiap tautan berikut lalu tekan tombol kirim di aplikasi WhatsApp.
              Sistem tidak menganggap laporan terkirim hanya karena tautan dibuka.
            </p>

            <div className="grid gap-3">
              {waTargets.map((target) => (
                <a
                  key={target.id}
                  href={target.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[56px] items-center justify-between gap-3 rounded-xl bg-orange-500 px-5 py-4 font-bold text-white transition-colors hover:bg-orange-600 active:scale-[0.97] active:bg-orange-600"
                >
                  <span>{target.label}</span>
                  <span className="hidden truncate font-mono text-xs opacity-80 sm:block">
                    {`+${target.number}`}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Jarak agar konten akhir tidak menempel footer saat scroll cepat */}
        <div className="h-2 pb-6" aria-hidden="true" />
      </div>
    </Layout>
  );
}
