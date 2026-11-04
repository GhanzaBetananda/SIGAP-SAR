// ============================================================
// NOMOR TIKET LAPORAN
// Setiap laporan terkirim mendapat nomor unik sebagai bukti dan
// referensi pelacakan status (pelapor <-> admin).
// Format: SIG-YYMMDD-XXXX (XXXX = 4 karakter tanpa karakter ambigu)
// ============================================================

const RANDOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTicketId(existing = []) {
  const used = new Set(existing.map((report) => report.ticketId));
  let ticketId;
  do {
    const now = new Date();
    const ymd = `${String(now.getFullYear()).slice(2)}${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const rand = Array.from(
      { length: 4 },
      () => RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)],
    ).join("");
    ticketId = `SIG-${ymd}-${rand}`;
  } while (used.has(ticketId));
  return ticketId;
}
