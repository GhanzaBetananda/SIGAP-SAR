import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import PanicButton from "../components/PanicButton.jsx";
import Stepper from "../components/Stepper.jsx";
import { useReport } from "../context/useReport.js";
import {
  AlertTriangle,
  ClipboardList,
  LifeBuoy,
  Mic,
  Send,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { report, initialValidation } = useReport();
  const initialComplete = initialValidation.valid;

  function handlePanicPress() {
    // Panic button selalu membuka alur pelaporan; form wajib diisi dulu
    navigate("/lapor-awal");
  }

  return (
    <Layout>
      <Stepper current={initialComplete ? 2 : 1} />

      <section className="mt-6 text-center">
        <p className="mx-auto flex max-w-md items-start gap-2 rounded-xl border-2 border-orange-200 bg-orange-50 p-3 text-left text-xs text-orange-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Gunakan hanya pada kejadian darurat nyata. Seluruh informasi awal wajib diisi
          sebelum laporan dapat dikirim.
        </p>

        {/* Baris logo instansi (urutan: 456, 472, BASARNAS) */}
        <div className="mt-6 flex items-center justify-center gap-4">
          {[
            { src: "/456.png", alt: "Logo 456" },
            { src: "/472.png", alt: "Logo 472" },
            { src: "/BASARNAS.png", alt: "Logo BASARNAS" },
          ].map((logo) => (
            <img
              key={logo.src}
              src={logo.src}
              alt={logo.alt}
              className="h-14 w-14 rounded-full bg-white object-contain p-1 shadow-md ring-1 ring-slate-200 sm:h-16 sm:w-16"
            />
          ))}
        </div>

        <h1 className="mt-5 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          Melapor dari TKP
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Isi informasi awal, rekam suara, lalu laporan disiapkan untuk BASARNAS dan
          Manggala Agni melalui WhatsApp sesuai klasifikasi kejadian.
        </p>

        <div className="my-8 flex justify-center">
          <PanicButton onClick={handlePanicPress} />
        </div>

        {report.submittedAt && (
          <p className="mb-6 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            Laporan terakhir telah disiapkan pada simulasi frontend. Lanjutkan ke halaman
            Panic Button untuk melihat tautan WhatsApp.
          </p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StepCard
          icon={<ClipboardList className="h-6 w-6" />}
          title="1. Informasi Awal"
          items={["Identitas pelapor", "Klasifikasi kejadian", "Groban korban & GPS TKP"]}
        />
        <StepCard
          icon={<Mic className="h-6 w-6" />}
          title="2. Panic Button"
          items={["Rekam Voice Note", "Kronologi detail", "Hitung jarak ke kantor"]}
        />
        <StepCard
          icon={<Send className="h-6 w-6" />}
          title="3. Distribusi"
          items={["Kebakaran: BASARNAS + Manggala Agni", "Non-kebakaran: BASARNAS", "Tautan wa.me siap kirim"]}
        />
      </section>
    </Layout>
  );
}

function StepCard({ icon, title, items }) {  return (
    <div className="rounded-2xl bg-white p-5 text-left shadow-sm">
      <span className="mb-3 inline-flex rounded-lg bg-basarnasblue p-2.5 text-white">{icon}</span>
      <p className="font-bold text-slate-900">{title}</p>
      <ul className="mt-2 space-y-1 text-xs text-slate-500">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-1.5">
            <LifeBuoy className="mt-0.5 h-3 w-3 shrink-0 text-orange-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
