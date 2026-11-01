import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Informasi Awal" },
  { id: 2, label: "Panic Button" },
  { id: 3, label: "Distribusi WhatsApp" },
];

/** Indikator tahapan pengisian laporan. */
export default function Stepper({ current }) {
  return (
    <ol className="flex items-start gap-1 sm:gap-2">
      {STEPS.map((step) => {
        const isActive = step.id === current;
        const isDone = step.id < current;

        return (
          <li key={step.id} className="flex flex-1 flex-col items-center gap-1 text-center">
            <div className="flex w-full items-center">
              <span
                className={`h-0.5 w-full ${step.id === 1 ? "opacity-0" : isDone || isActive ? "bg-orange-500" : "bg-slate-300"}`}
              />
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors
                  ${isDone ? "border-orange-500 bg-orange-500 text-white" : isActive ? "border-orange-500 bg-white text-orange-600" : "border-slate-300 bg-white text-slate-400"}`}
              >
                {isDone ? <Check className="h-4 w-4" /> : step.id}
              </span>
              <span
                className={`h-0.5 w-full ${step.id === STEPS.length ? "opacity-0" : step.id < current ? "bg-orange-500" : "bg-slate-300"}`}
              />
            </div>
            <span
              className={`text-[11px] font-semibold sm:text-xs ${isActive || isDone ? "text-orange-700" : "text-slate-400"}`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
