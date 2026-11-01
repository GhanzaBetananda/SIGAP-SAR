import { useCallback, useMemo, useState } from "react";
import {
  EMPTY_REPORT,
  ReportContext,
  readSimulatedReports,
  writeSimulatedReports,
} from "./reportState.js";
import { validateInitialReport } from "../utils/validation.js";

/** Provider state laporan untuk seluruh halaman. */
export function ReportProvider({ children }) {
  const [report, setReport] = useState(EMPTY_REPORT);
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
