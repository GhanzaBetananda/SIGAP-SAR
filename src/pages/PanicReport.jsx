import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import Layout from "../components/Layout.jsx";
import Stepper from "../components/Stepper.jsx";
import PanicButton from "../components/PanicButton.jsx";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import DistanceInfo from "../components/DistanceInfo.jsx";
import IncidentForm from "../components/IncidentForm.jsx";
import LocationPicker from "../components/LocationPicker.jsx";
import { useReport } from "../context/useReport.js";
import { useAuth } from "../context/AuthProvider.jsx";
import { readSimulatedReports } from "../context/reportState.js";
import PhotoPicker from "../components/PhotoPicker.jsx";
import { validatePanicReport, validateInitialReport } from "../utils/validation.js";
import { calculateDistances } from "../utils/distanceCalculator.js";
import { getWhatsAppTargets, buildSummaryText, REPORTER_CATEGORIES, escapeHtml } from "../utils/whatsappGenerator.js";
import { isFireIncident } from "../data/incidentTypes.js";
import { Lock, Send, UserRound } from "lucide-react";
import { generateTicketId } from "../utils/tickets.js";

export default function PanicReport() {
  const { session } = useAuth();
  const { report, updateReport, saveReportLocally } = useReport();
  const [errors, setErrors] = useState({});
  const [waTargets, setWaTargets] = useState([]);

  const fire = isFireIncident(report.classification);

  // Perhitungan jarak TKP ke kantor instansi terkait (Haversine)
  const distances = useMemo(
    () => calculateDistances(report, fire),
    [report, fire],
  );

  function handleSubmit() {
    // 1. Validasi identitas pelapor (dari akun) + detail kejadian & lokasi
    const identityValidation = validateInitialReport(report);
    if (!identityValidation.valid) {
      setErrors(identityValidation.errors);
      const errorList = Object.values(identityValidation.errors)
        .map((message) => `<li style="text-align:left">${message}</li>`)
        .join("");
      Swal.fire({
        icon: "warning",
        title: "Data Belum Lengkap",
        html: `<ul class="swal-error-list">${errorList}</ul>`,
        confirmButtonColor: "#ea580c",
        confirmButtonText: "Perbaiki",
      });
      return;
    }

    // 2. Validasi voice note & kronologi
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

    // 3. Konfirmasi + ringkasan laporan
    Swal.fire({
      icon: "question",
      title: "Kirim Laporan?",
      html: `<pre style="text-align:left;white-space:pre-wrap;font-family:inherit" class="swal-summary">${escapeHtml(buildSummaryText(report))}</pre>`,
      showCancelButton: true,
      confirmButtonText: "Ya, Kirim Laporan",
      cancelButtonText: "Periksa Kembali",
      confirmButtonColor: "#ea580c",
    }).then((result) => {
      if (!result.isConfirmed) return;

      // 3. Simulasi penyimpanan laporan pada frontend (state lokal + localStorage)
      // 3. Simulasi penyimpanan laporan (id tiket + status awal + pelapor)
      const ticketId = generateTicketId(readSimulatedReports());
      saveReportLocally({
        ...report,
        ticketId,
        status: "baru",
        reporterUsername: session?.username ?? "",
        distances,
        submittedAt: new Date().toISOString(),
      });
      updateReport({ ticketId, submittedAt: new Date().toISOString() });

      // 4. Siapkan tautan WhatsApp sesuai klasifikasi kejadian
      const targets = getWhatsAppTargets(report, distances);
      setWaTargets(targets);
      setErrors({});

      Swal.fire({
        icon: "success",
        title: "Laporan Berhasil Disiapkan",
        html: `<div style="text-align:left"><p>Nomor tiket laporan Anda: <strong>${escapeHtml(ticketId)}</strong> — catat nomor ini untuk mengecek status laporan.</p><p class="mt-2"><strong>Tautan WhatsApp siap dibuka:</strong></p><ul>${targets.map((target) => `<li>${escapeHtml(target.label)}</li>`).join("")}</ul><p class="mt-2" style="font-size:0.9em">Tekan tombol kirim secara manual di aplikasi WhatsApp.</p></div>`,
        confirmButtonColor: "#ea580c",
        confirmButtonText: "Buka Distribusi WhatsApp",
      });
    });
  }

  return (
    <Layout>
      <Stepper current={report.submittedAt ? 3 : 2} />

      <div className="mt-6 space-y-4">
        {/* Identitas pelapor — otomatis dari data akun yang login */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
            <UserRound className="h-5 w-5 text-primary" />
            Identitas Pelapor
          </h2>
          <p className="mb-3 text-sm text-slate-500">
            Diambil dari akun login — tidak perlu diisi ulang.
          </p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
              <dt className="font-medium text-slate-500">Nama Pelapor</dt>
              <dd className="text-right font-bold text-slate-900">
                {session?.name || "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
              <dt className="font-medium text-slate-500">Kategori</dt>
              <dd className="text-right font-bold text-slate-900">
                {REPORTER_CATEGORIES[session?.reporterCategory] || "-"}
              </dd>
            </div>
            {session?.region && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 sm:col-span-2">
                <dt className="font-medium text-slate-500">
                  {session.reporterCategory === "potensi_sar" ? "Kecamatan" : "Desa"}
                </dt>
                <dd className="text-right font-bold text-slate-900">{session.region}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Klasifikasi kejadian + jumlah korban */}
        <IncidentForm errors={errors} />

        {/* Koordinat TKP via GPS */}
        <LocationPicker errors={errors} />

        {/* Lampiran foto TKP (opsional) */}
        <PhotoPicker />

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
            className={`w-full resize-y rounded-xl border-2 bg-white px-4 py-3 text-base outline-none focus:border-primary
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
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Setelah ditekan, laporan disimpan pada simulasi frontend lalu tautan
              WhatsApp disiapkan sesuai klasifikasi kejadian
              {fire ? " (BASARNAS + Manggala Agni)" : " (BASARNAS)"}.
            </p>
          </div>
        </div>

        {/* Distribusi WhatsApp muncul setelah submit */}
        {report.submittedAt && waTargets.length > 0 && (
          <section className="rounded-2xl border border-primary/15 bg-primary p-5 text-white shadow-sm sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
              <Send className="h-5 w-5 text-fireorange" />
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
                  className="flex min-h-[56px] items-center justify-between gap-3 rounded-xl bg-fireorange px-5 py-4 font-bold text-white transition-colors hover:bg-fireorange active:scale-[0.97] active:bg-fireorange"
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
