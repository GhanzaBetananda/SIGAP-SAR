# PANDUAN — Menghubungkan Aplikasi ke Google Sheet (Apps Script)

Database yang dipakai: **satu Google Spreadsheet** dengan dua tab yang dibuat **otomatis** oleh skrip:

| Tab | Isi | Kolom (baris 1, dibuat otomatis) |
| --- | --- | --- |
| `laporan` | 1 baris = 1 laporan | ticketId, status, submittedAt, identitas pelapor, klasifikasi, koordinat, detail, photoUrl, voiceNoteUrl, distances, responses, waOpened |
| `siap` | status "Saya Siap" pegawai SAR | username, name, latitude, longitude, checkedInAt |

Status siap pada tab `siap` kedaluwarsa 2 jam (konsisten dengan UI).

---

## Langkah 1 — Buat Spreadsheet

1. Buka https://sheets.google.com → **Buat Spreadsheet baru** (kosong).
2. Beri nama, misal `SAT SET — Database`.

> Kamu **tidak perlu** membuat tab/kolom sendiri — `Code.gs` membuatkan tab `laporan` & `siap` beserta header-nya otomatis pada panggilan pertama.

## Langkah 2 — Pasang Kode Apps Script

1. Di spreadsheet itu: menu **Extensions → Apps Script**.
2. Hapus seluruh isi `Code.gs`, tempel seluruh isi file [`Code.gs`](./Code.gs) dari repo ini.
3. Klik ikon **💾 Simpan**.

## Langkah 3 — Uji Cepat (opsional, disarankan)

1. Di editor Apps Script pilih fungsi **`testPing`** → **Run**.
2. Izinkan akses bila muncul peringatan (klik *Advanced → Go to project (unsafe)* → **Allow** — ini hak akses milikmu sendiri).
3. Cek log: harus muncul `pong` dan laporan kosong. Tab `laporan` & `siap` akan terlihat di spreadsheet saat itu juga.

## Langkah 4 — Deploy Web App

1. Klik **Deploy → New deployment** (kanan atas).
2. Kolom *Select type* → **Web app**.
3. Isi:
   - **Description**: `SAT SET backend v1`
   - **Execute as**: `Me (email kamu)` ← penting, agar skrip punya hak menulis sheet & Drive
   - **Who has access**: `Anyone` ← penting, agar frontend bisa memanggil
4. Klik **Deploy** → salin **Web app URL** (bentuknya
   `https://script.google.com/macros/s/AKfycb.../exec`).

## Langkah 5 — Sambungkan ke Frontend

1. Buka file `src/config/backend.js` di repo frontend.
2. Tempel URL tadi:

```js
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

3. Build/deploy ulang frontend (`npm run build`, atau push bila pakai Vercel).

## Langkah 6 — Verifikasi

1. Buka aplikasi pelapor → login → kirim 1 laporan percobaan.
2. Buka spreadsheet → tab `laporan` berisi laporan tadi; foto/voice note muncul sebagai **link Google Drive** di tab `SAT SET — Lampiran`.
3. Buka panel admin di domain admin → tombol **Segarkan** → laporan muncul.
4. Login akun pegawai (`BAS001`) → tab **Siaga** → "Saya Siap Membantu" → tab `siap` terisi.
5. Admin membuka laporan → daftar "Petugas Terdekat yang SIAP" berisi pegawai tadi.

## Pembaruan Backend di Kemudian Hari

- Setiap kali men-edit `Code.gs`: **Deploy → Manage deployments → ✏ (edit) → Version: New version → Deploy**.
  URL-nya **tetap sama**; frontend tidak perlu diubah.

## Cara Kerja & Batasan

- **Sumber data**: bila `APPS_SCRIPT_URL` terisi, seluruh pembaca laporan/status siap mengambil dari server dan menycerminkannya ke localStorage; bila kosong/gagal, aplikasi penuh memakai localStorage (mode simulasi) sehingga demo tetap jalan offline.
- **Kuota**: kuota gratis Apps Script (±90 menit eksekusi/hari) lebih dari cukup untuk demo/ujian; polling UI interval 15 detik.
- **Foto & voice note** disimpan sebagai berkas **Google Drive** (folder `SAT SET — Lampiran`) karena sel Sheet berbatas 50.000 karakter.
- **Lampiran berpindah domain**: dataURL milik pelapor ditebus backend jadi link Drive — link akan mengarah ke perangkat Anda sendiri, pastikan link dapat diakses (bisa *share* folder ke instansi/akses siapa-siapa dengan tautan sesuai kebutuhan).
