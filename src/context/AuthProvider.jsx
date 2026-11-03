// ============================================================
// CONTEXT SESI PELAPOR
// Menyediakan { session, login, logout } untuk seluruh halaman
// sisi pelapor. Tanpa sesi aktif, seluruh rute menampilkan login.
// ============================================================

import { createContext, useContext, useState } from "react";
import {
  getSessionReporter,
  loginReporter,
  logoutReporter,
} from "../utils/auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSessionReporter);

  function login(username, password) {
    const nextSession = loginReporter(username, password);
    if (nextSession) setSession(nextSession);
    return nextSession;
  }

  function logout() {
    logoutReporter();
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  return ctx;
}

export default AuthProvider;
