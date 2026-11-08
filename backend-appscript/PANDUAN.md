# PANDUAN — Menghubungkan Aplikasi ke Google Sheet (Apps Script)

Database yang dipakai: **satu Google Spreadsheet** dengan tab-tab yang dibuat **otomatis** oleh skrip:

| Tab | Isi |
| --- | --- |
| `laporan-penerbangan` | laporan klasifikasi Penerbangan |
| `laporan-pelayaran` | laporan klasifikasi Pelayaran |
| `laporan-kondisi_membahayakan_manusia` | laporan Kondisi Membahayakan Manusia |
| `laporan-penanganan_khusus` | laporan Penanganan Khusus |
| `laporan-bencana_alam_kebakaran` | laporan Bencana Alam — Kebakaran |
| `laporan-bencana_alam_non_kebakaran` | laporan Bencana Alam — Non-Kebakaran |
| `laporan-lainnya` | laporan dengan klasifikasi tidak dikenal |
| `siap` | status "Saya Siap" pegawai SAR (username, name, lat, lng, waktu) |

Tab laporan dibuat **otomatis** saat laporan pertama untuk kejadian itu masuk.
**Pelapor tidak dibuatkan tab sendiri** — kategorinya cukup tersimpan di kolom:

- `reporterCategory` → `pegawai_basarnas` (petugas SAR), `potensi_sar`, atau
  `kampung_rescue`
- `reporterUsername` / `employeeName` / `potentialSarName` / `kampungRescueName`
  → nama orangnya

Di dalam setiap tab, baris urut **laporan terbaru dulu**.

Kolom lengkap ada di baris 1 tiap tab laporan: ticketId, status, submittedAt,
identitas pelapor, kategori pelapor, klasifikasi, koordinat, detail, photoUrl,
voiceNoteUrl, distances, responses, waOpened.

Status siap pada tab `siap` kedaluwarsa 2 jam (konsisten dengan UI).

> ⓘ Web app ini **tanpa autentikasi** (sesuai keputusan desain): *Who has
> access* = Anyone membuat siapa pun yang tahu URL bisa memanggil API.
> Untuk demo/ujian ini diterima; jika suatu hari dibuka ke publik, angkat lagi
> seumbuhan token bersama di `doPost`.

## Langkah 1 — Buat Spreadsheet

1. Buka https://sheets.google.com → **Buat Spreadsheet baru** (kosong).
2. Beri nama, misal `SAT SET — Database`.

> Kamu **tidak perlu** membuat tab/kolom sendiri — `Code.gs` membuatkan tab
> per kejadian & tab `siap` beserta header-nya otomatis.

## Langkah 2 — Pasang Kode Apps Script

1. Di spreadsheet itu: menu **Extensions → Apps Script**.
2. Hapus seluruh isi `Code.gs`, tempel seluruh isi file [`Code.gs`](./Code.gs) dari repo ini.
3. Klik ikon **💾 Simpan**.

## Langkah 3 — Uji Cepat (opsional, disarankan)

1. Di editor Apps Script pilih fungsi **`testPing`** → **Run**.
2. Izinkan akses bila muncul peringatan (klik *Advanced → Go to project (unsafe)* → **Allow** — ini hak akses milikmu sendiri).
3. Cek log: harus muncul `pong` dan laporan kosong.

## Langkah 4 — Deploy Web App

1. Klik **Deploy → New deployment** (kanan atas).
2. Kolom *Select type* → **Web app**.
3. Isi:
   - **Description**: `SAT SET backend v3`
   - **Execute as**: `Me (email kamu)` ← penting, agar skrip punya hak menulis sheet & Drive
   - **Who has access**: `Anyone` ← **wajib**, bukan "Anyone with a Google account"; default dropdown adalah "Only myself" — kalau tidak diganti, request akan ditolak 401
4. Klik **Deploy** → salin **Web app URL** (bentuknya
   `https://script.google.com/macros/s/AKfycb.../exec`).

> Uji mandiri: buka URL `/exec` di jendela **incognito**. Jika muncul teks
> "SAT SET API berjalan..." berarti akses sudah benar; jika muncul halaman
> login, artinya *Who has access* masih terkunci.

## Langkah 5 — Sambungkan ke Frontend

1. Buka file `src/config/backend.js` di repo frontend.
2. Tempel URL tadi:

```js
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

3. Build/deploy ulang frontend (`npm run build`, atau push bila pakai Vercel).

## Langkah 6 — Verifikasi

1. Buka aplikasi pelapor → login → kirim 1 laporan percobaan; dialog sukses
   menandai **✅ terkirim ke server**.
2. Buka spreadsheet → laporan masuk ke tab **sesuai klasifikasi kejadiannya**
   (mis. kebakaran → `laporan-bencana_alam_kebakaran`), dengan pelapor
   tercatat di kolom kategori pelapornya; foto/voice note berupa
   **link Google Drive**; berkas fisiknya di folder Drive `SAT SET — Lampiran`.
3. Buka panel admin → tombol **Segarkan** → laporan muncul.
4. Login akun pegawai (`BAS001`) → tab **Siaga** → "Saya Siap Membantu" → tab `siap` terisi.
5. Admin membuka laporan → daftar "Petugas Terdekat yang SIAP" berisi pegawai tadi.

## Pembaruan Backend di Kemudian Hari

- Setiap kali men-edit `Code.gs`: **Deploy → Manage deployments → ✏ (edit) → Version: New version → Deploy**.
  URL-nya **tetap sama**; frontend tidak perlu diubah.
  (Kalau membuat deployment baru, URL berubah — perbarui `APPS_SCRIPT_URL`.)

## Cara Kerja & Batasan

- **Sumber data**: bila `APPS_SCRIPT_URL` terisi, seluruh pembaca laporan/status siap mengambil dari server dan mencerminkannya ke localStorage; bila kosong/gagal, aplikasi memakai localStorage (mode simulasi) sehingga demo tetap jalan offline.
- **Akses terbuka (tanpa token)**: siapa pun yang memiliki URL web app dapat membaca/menulis laporan — diterima untuk demo/ujian; sebelum dipakai produksi, tambahkan kembali pengecekan token di `doPost`.
- **Kuota**: kuota gratis Apps Script (±90 menit eksekusi/hari) lebih dari cukup untuk demo/ujian; polling UI interval 15 detik.
- **Foto & voice note** disimpan sebagai berkas **Google Drive** (folder `SAT SET — Lampiran`) karena sel Sheet berbatas 50.000 karakter.
- **Lampiran berpindah domain**: dataURL milik pelapor ditebus backend jadi link Drive — pastikan link dapat diakses (*share* folder sesuai kebutuhan).
- **Tab lama `laporan`** (jika masih ada dari setup sebelumnya) tetap **dibaca** oleh `getLaporan_` agar tidak ada data terlewat, tapi laporan baru tidak lagi ditulis ke sana.
