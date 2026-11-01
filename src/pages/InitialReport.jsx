import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Layout from "../components/Layout.jsx";
import Stepper from "../components/Stepper.jsx";
import ReporterForm from "../components/ReporterForm.jsx";
import IncidentForm from "../components/IncidentForm.jsx";
import LocationPicker from "../components/LocationPicker.jsx";
import { useReport } from "../context/useReport.js";
import { validateInitialReport } from "../utils/validation.js";
import { ArrowRight, RotateCcw } from "lucide-react";

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

      <div className="mt-6 space-y-4">
        <ReporterForm errors={errors} />
        <IncidentForm errors={errors} />
        <LocationPicker errors={errors} />

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleContinue}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-4 text-base font-bold text-white transition-colors hover:bg-orange-700"
          >
            Lanjut ke Panic Button
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-700 hover:border-slate-500"
          >
            <RotateCcw className="h-4 w-4" />
            Kosongkan
          </button>
        </div>
      </div>
    </Layout>
  );
}



