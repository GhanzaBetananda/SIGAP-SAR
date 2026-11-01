import { Navigate, Route, Routes } from "react-router-dom";
import { ReportProvider } from "./context/ReportProvider.jsx";
import Home from "./pages/Home.jsx";
import InitialReport from "./pages/InitialReport.jsx";
import PanicReport from "./pages/PanicReport.jsx";

export default function App() {
  return (
    <ReportProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lapor-awal" element={<InitialReport />} />
        <Route path="/panic" element={<PanicReport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ReportProvider>
  );
}
