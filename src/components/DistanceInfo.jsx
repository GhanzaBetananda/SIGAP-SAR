import { Building2, Flame, Ruler } from "lucide-react";
import { formatDistanceKm } from "../utils/distanceCalculator.js";
import { isFireIncident } from "../data/incidentTypes.js";

/**
 * Hasil perhitungan jarak TKP ke kantor instansi (Haversine).
 * Non-Kebakaran -> hanya BASARNAS.
 * Kebakaran     -> BASARNAS + Manggala Agni.
 */
export default function DistanceInfo({ report, distances }) {
  const fire = isFireIncident(report.classification);

  if (!distances) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-2 text-lg font-bold text-slate-900">Jarak Lokasi</h2>
        <p className="text-sm text-slate-500">
          Jarak belum dapat dihitung. Koordinat TKP belum tersedia.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Jarak Lokasi</h2>
        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          <Ruler className="h-3.5 w-3.5" /> Haversine
        </span>
      </div>

      <div className={`grid gap-3 ${fire ? "sm:grid-cols-2" : ""}`}>
        <DistanceCard
          icon={<Building2 className="h-6 w-6" />}
          officeName="Kantor BASARNAS"
          value={formatDistanceKm(distances.basarnas)}
          accent={fire ? "slate" : "orange"}
        />
        {fire && (
          <DistanceCard
            icon={<Flame className="h-6 w-6" />}
            officeName="Kantor Manggala Agni"
            value={formatDistanceKm(distances.manggalaAgni)}
            accent="red"
          />
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Koordinat kantor saat ini menggunakan data dummy dan dapat diubah di{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">src/config/officeLocation.js</code>.
      </p>
    </section>
  );
}

function DistanceCard({ icon, officeName, value, accent }) {
  const accentClasses = {
    orange: "bg-fireorange/15 text-fireorange-dark",
    red: "bg-red-100 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-slate-200 p-4">
      <span className={`rounded-lg p-2.5 ${accentClasses[accent]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-500">{officeName}</p>
        <p className="text-xl font-extrabold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
