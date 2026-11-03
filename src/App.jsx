import { Navigate, Route, Routes } from "react-router-dom";
import { ReportProvider } from "./context/ReportProvider.jsx";
import { AuthProvider, useAuth } from "./context/AuthProvider.jsx";
import Home from "./pages/Home.jsx";
import PanicReport from "./pages/PanicReport.jsx";
import Login from "./pages/Login.jsx";
import AdminHistory from "./pages/AdminHistory.jsx";
import { isAdminDomain } from "./utils/domains.js";

/**
 * Satu bundle Vite, dua sisi:
 * - Admin: host "admin.*" (atau VITE_ADMIN_HOST) -> Panel Admin.
 * - Publik : seluruh halaman pelapor terkunci sampai pelapor login.
 */
export default function App() {
  return (
    <ReportProvider>
      <AuthProvider>
        {isAdminDomain() ? <AdminRoutes /> : <PublicRoutes />}
      </AuthProvider>
    </ReportProvider>
  );
}

/** Rute panel admin (domain admin terpisah). */
function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminHistory />} />
      <Route path="/admin/*" element={<AdminHistory />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

/** Rute sisi pelapor — terkunci sampai login berhasil. */
function PublicRoutes() {
  const { session } = useAuth();

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/panic" element={<PanicReport />} />
      {/* Informasi Awal digabung ke halaman Panic (identitas dari akun) */}
      <Route path="/lapor-awal" element={<Navigate to="/panic" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
