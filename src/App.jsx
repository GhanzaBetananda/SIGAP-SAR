import { Navigate, Route, Routes } from "react-router-dom";
import { ReportProvider } from "./context/ReportProvider.jsx";
import Home from "./pages/Home.jsx";
import InitialReport from "./pages/InitialReport.jsx";
import PanicReport from "./pages/PanicReport.jsx";
import AdminHistory from "./pages/AdminHistory.jsx";
import { isAdminDomain } from "./utils/domains.js";

/**
 * Satu bundle Vite, dua "domain" (opsi 1):
 * - Domain admin (host "admin.*") -> seluruh rute menyajikan Panel Admin.
 * - Domain publik -> rute pelapor saja; /admin dipagari kembali ke Home.
 */
export default function App() {
  if (isAdminDomain()) {
    return (
      <ReportProvider>
        <Routes>
          <Route path="/admin" element={<AdminHistory />} />
          <Route path="/admin/*" element={<AdminHistory />} />
          {/* Akses root di domain admin tetap diarahkan ke panel admin */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </ReportProvider>
    );
  }

  return (
    <ReportProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lapor-awal" element={<InitialReport />} />
        <Route path="/panic" element={<PanicReport />} />
        {/* /admin hanya boleh melalui domain admin terpisah */}
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="/admin/*" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ReportProvider>
  );
}
