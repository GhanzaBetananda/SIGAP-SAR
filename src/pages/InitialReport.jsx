import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Layout from "../components/Layout.jsx";
import Stepper from "../components/Stepper.jsx";
import StickyActionBar from "../components/StickyActionBar.jsx";
import ReporterForm from "../components/ReporterForm.jsx";
import IncidentForm from "../components/IncidentForm.jsx";
import LocationPicker from "../components/LocationPicker.jsx";
import { useReport } from "../context/useReport.js";
import { validateInitialReport } from "../utils/validation.js";
import { ArrowRight, Eraser } from "lucide-react";

export default function InitialReport() {
  const navigate = useNavigate();
  const { report, resetReport, initialValidation } = useReport();
  const [errors, setErrors] = useState(initialValidation.errors);

  function handleContinue() {
    // Validasi seluruh informasi awal sebelum Panic Button dapat digunakan
    const validation = validateInitialReport(report);

    if (!validation.valid) {
      setErrors(validation.errors);
      const errorList = Object.values(validation.errors)
        .map((message) => `<li style="text-align:left">${message}</li>`)
        .join("");
      Swal.fire({
        icon: "warning",
        title: "Informasi Belum Lengkap",
        html: `<ul class="swal-error-list">${errorList}</ul>`,
        confirmButtonColor: "#ea580c",
        confirmButtonText: "Perbaiki",
      });
      return;
    }

    setErrors({});
    navigate("/panic");
  }

  function handleReset() {
    Swal.fire({
      icon: "question",
      title: "Kosongkan Formulir?",
      text: "Seluruh isian informasi awal akan dihapus.",
      showCancelButton: true,
      confirmButtonText: "Ya, kosongkan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ea580c",
    }).then((result) => {
      if (result.isConfirmed) {
        resetReport();
        setErrors({});
      }
    });
  }

  return (
    <Layout>
      <Stepper current={1} />

      <div className="mt-4 space-y-4">
        <ReporterForm errors={errors} />
        <IncidentForm errors={errors} />
        <LocationPicker errors={errors} />
        {/* Jarak aman agar konten tidak tertutup sticky action bar */}
        <div className="h-4 pb-24 sm:pb-20" aria-hidden="true" />
      </div>

      {/* Tombol utama di zona jempol (bawah layar) */}
      <StickyActionBar>
        <button
          type="button"
          onClick={handleReset}
          aria-label="Kosongkan formulir"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-700 active:scale-95 active:border-slate-500"
        >
          <Eraser className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 text-base font-bold text-white shadow-lg shadow-orange-600/30 transition-transform active:scale-[0.98] active:bg-orange-700"
        >
          Lanjut ke Panic Button
          <ArrowRight className="h-5 w-5" />
        </button>
      </StickyActionBar>
    </Layout>
  );
}



