# Panic Button SAR

Website pelaporan awal kejadian darurat langsung dari Tempat Kejadian Perkara (TKP) untuk mendukung penyampaian informasi kepada **BASARNAS** dan **Manggala Agni**. Prototype **frontend-only** — seluruh data menggunakan dummy data dan state lokal (React Context).

## Teknologi

- React.js + Vite + JavaScript
- Tailwind CSS (v4)
- React Router
- Lucide React (ikon)
- SweetAlert2 (notifikasi & konfirmasi)
- Browser Geolocation API (koordinat TKP)
- MediaRecorder API (Voice Note)
- WhatsApp Click to Chat (`wa.me`)

## Alur Pengguna

1. **Home** — tombol Panic Button utama.
2. **Informasi Awal** (`/lapor-awal`) — wajib lengkap sebelum Panic Button dapat digunakan:
   - Identitas pelapor: **Pegawai BASARNAS** (dropdown 5 nama) atau **Potensi SAR** (pilih kecamatan → cari/pilih nama).
   - Klasifikasi kejadian: Penerbangan, Pelayaran, Kondisi Membahayakan Manusia, Penanganan Khusus, dan Bencana Alam (**Kebakaran / Non-Kebakaran**).
   - Jumlah korban.
   - Koordinat TKP otomatis via GPS perangkat.
3. **Panic Button** (`/panic`) — Voice Note (rekam/putar/hapus + durasi), detail kronologi kejadian, hasil perhitungan jarak Haversine ke kantor instansi, ringkasan laporan, dan Submit.
4. **Submit** — konfirmasi SweetAlert2 → penyimpanan laporan pada simulasi frontend → tautan WhatsApp disiapkan:
   - **Non-Kebakaran** → 1 tautan (BASARNAS).
   - **Kebakaran** → 2 tautan (BASARNAS + Manggala Agni), dibuka terpisah.
   - Pengguna tetap menekan tombol kirim secara manual di WhatsApp.

Perhitungan jarak (km, metode Haversine):
- Non-Kebakaran → Kantor BASARNAS.
- Kebakaran → Kantor BASARNAS + Kantor Manggala Agni.

## Konfigurasi Nomor WhatsApp

Edit `src/config/whatsapp.js` (format internasional tanpa `+` dan tanpa spasi). Nomor **tidak** dituliskan di komponen halaman.

## Koordinat & Data Dummy

- Koordinat kantor: `src/config/officeLocation.js`
- Nama pegawai: `src/data/employees.js`
- Daftar kecamatan: `src/data/districts.js`
- Potensi SAR per kecamatan: `src/data/potentialSar.js`

## Menjalankan

```bash
npm install
npm run dev      # pengembangan (localhost only)
npm run build    # build produksi
```

Catatan: perekaman suara dan akses GPS memerlukan **HTTPS atau localhost** serta izin lokasi/mikrofon dari browser pengguna.

## Integrasi Backend (tahap berikutnya)

Struktur sudah modular: ganti `saveReportLocally()` di `src/context/ReportProvider.jsx` dengan API call, dan sambungkan berkas Voice Note (Blob) ke endpoint upload. Komponen halaman tidak perlu dibangun ulang.
