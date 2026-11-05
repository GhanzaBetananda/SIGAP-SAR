import { useCallback, useMemo, useState } from "react";
import {
  EMPTY_REPORT,
  ReportContext,
  accountIdentityPatch,
  readSimulatedReports,
  writeSimulatedReports,
} from "./reportState.js";
import { getSessionReporter } from "../utils/auth.js";
import { validateInitialReport } from "../utils/validation.js";

/** Provider state laporan untuk seluruh halaman. */
export function ReportProvider({ children }) {
  // Sesi bisa dipulihkan dari sessionStorage setelah refresh — jika ada,
  // identitas pelapor diisi ulang agar field tidak kosong sejak awal.
  const [report, setReport] = useState(() => {
    const session = getSessionReporter();
    return session
      ? { ...EMPTY_REPORT, ...accountIdentityPatch(session) }
      : EMPTY_REPORT;
  });
  const [simulatedReports, setSimulatedReports] = useState(readSimulatedReports);

  const updateReport = useCallback((patch) => {
    setReport((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetReport = useCallback(() => {
    setReport(EMPTY_REPORT);
  }, []);

  // Simulasi "penyimpanan ke website BASARNAS" secara lokal
  const saveReportLocally = useCallback((completeReport) => {
    setSimulatedReports((prev) => {
      const next = [...prev, completeReport];
      writeSimulatedReports(next);
      return next;
    });
  }, []);

  const initialValidation = useMemo(() => validateInitialReport(report), [report]);

  const value = useMemo(
    () => ({
      report,
      updateReport,
      resetReport,
      simulatedReports,
      saveReportLocally,
      initialValidation,
    }),
    [report, updateReport, resetReport, simulatedReports, saveReportLocally, initialValidation],
  );

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export default ReportProvider;
