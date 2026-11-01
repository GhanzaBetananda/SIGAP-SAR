import { useContext } from "react";
import { ReportContext } from "./reportState.js";

/** Hook akses state laporan. Lempar error bila dipakai di luar provider. */
export function useReport() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error("useReport harus dipakai di dalam ReportProvider");
  }
  return context;
}
