// ============================================================
// SAT SET — BACKEND (GOOGLE APPS SCRIPT + GOOGLE SHEET)
// Database = Spreadsheet dengan tab:
//   1. "laporan-<kejadian>" — SATU TAB PER KLASIFIKASI KEJADIAN:
//        laporan-penerbangan, laporan-pelayaran,
//        laporan-kondisi_membahayakan_manusia,
//        laporan-penanganan_khusus,
//        laporan-bencana_alam_kebakaran,
//        laporan-bencana_alam_non_kebakaran,
//        laporan-lainnya (klasifikasi tidak dikenal)
//      Nama-nama kolom memakai BAHASA INDONESIA (lihat LAPORAN_COLUMNS).
//      PELAPOR tidak dibuatkan tab sendiri — kategorinya tersimpan di
//      kolom "kategoriPelapor". Untuk pelapor Kampung Rescue, desanya
//      ikut menempel pada kategori, sehingga ada 2 kategori tambahan:
//        pegawai_basarnas            (petugas SAR)
//        potensi_sar
//        kampung_rescue - kampung_mandar
//        kampung_rescue - songgon
//      Nama orangnya tersimpan sekadar di kolom "nama" (gabungan dari
//      nama pegawai / potensi SAR / perwakilan kampung rescue).
//      Di dalam tiap tab, baris urut waktu terbaru dulu.
//   2. "siap" — status kesiapan pegawai SAR (kolom tetap bahasa
//      Inggris karena datanya dikonsumsi langsung oleh frontend).
//
// KOLOM TAB LAPORAN (baris 1):
//   nomorTiket, status, waktuKirim, kategoriPelapor, nama, wilayah,
//   kejadian, jumlahKorban, latitude, longitude, detail,
//   tautanVoiceNote, tautanFoto, jarak, tanggapan
//
// Penyederhanaan yang diterapkan (permintaan):
//   - "nama"           = gabungan employeeName / potentialSarName /
//                        kampungRescueName, dipilih sesuai kategori
//   - "kategoriPelapor"= kampungRescueDesa dimasukkan ke sini
//   - "jarak"          = km langsung, mis. "BASARNAS: 0.19 km | Manggala Agni: -"
//   - tidak disimpan: reporterUsername, locationAccuracy, waOpened,
//     tkpDistrict, kampungRescueDesa (melebur ke kategori)
//
// PROTOKOL API (semua via POST JSON):
//   { "action": "ping" }
//   { "action": "getLaporan" }
//   { "action": "createLaporan", "laporan": {...} }
//   { "action": "updateLaporan", "ticketId", "patch": {...} }
//   { "action": "getSiap" }
//   { "action": "setSiap", item: {...}, remove?: true }
// ============================================================

var SHEET_SIAP = "siap";
var TAB_PREFIX = "laporan-";
var TAB_FALLBACK = "laporan-lainnya";

// Peta klasifikasi kejadian → nama tab
var CLASSIFICATION_TABS = {
  penerbangan: "laporan-penerbangan",
  pelayaran: "laporan-pelayaran",
  kondisi_membahayakan_manusia: "laporan-kondisi_membahayakan_manusia",
  penanganan_khusus: "laporan-penanganan_khusus",
  bencana_alam_kebakaran: "laporan-bencana_alam_kebakaran",
  bencana_alam_non_kebakaran: "laporan-bencana_alam_non_kebakaran",
};

// Urutan kolom tab laporan — BAHASA INDONESIA
var LAPORAN_COLUMNS = [
  "nomorTiket",
  "status",
  "waktuKirim",
  "kategoriPelapor",
  "nama",
  "wilayah",      // region pelapor potensi SAR (kecamatan)
  "kejadian",
  "jumlahKorban",
  "latitude",
  "longitude",
  "detail",
  "tautanVoiceNote",
  "tautanFoto",
  "jarak",        // teks: "BASARNAS: 0.19 km | Manggala Agni: -"
  "tanggapan",    // JSON dari {basarnas: {...}, manggala_agni: {...}}
];

// Kolom yang boleh diubah lewat aksi updateLaporan:
// kunci request (bahasa frontend) → kolom sheet (bahasa Indonesia)
var PATCH_COLUMNS = {
  status: "status",
  responses: "tanggapan",
};

// Kedaluwarsa status siap (2 jam) — konsisten dengan sisi UI
var READY_TTL_MS = 2 * 60 * 60 * 1000;

// ------------------------------------------------------------
// Router
// ------------------------------------------------------------

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents || "{}");
  } catch (err) {
    body = {};
  }
  var action = body.action || "";

  try {
    switch (action) {
      case "ping":
        return ok_({ message: "pong", time: new Date().toISOString() });
      case "getLaporan":
        return ok_(getLaporan_());
      case "createLaporan":
        return ok_(upsertLaporan_(body.laporan || {}));
      case "updateLaporan":
        return ok_(updateLaporan_(body.ticketId, body.patch || {}));
      case "getSiap":
        return ok_(getSiap_());
      case "setSiap":
        return ok_(
          body.remove
            ? removeSiap_(String(body.item && body.item.username || ""))
            : putSiap_(body.item || {})
        );
      default:
        return err_("Aksi tidak dikenal: " + action);
    }
  } catch (err) {
    return err_(String((err && err.message) || err));
  }
}

/** Pesan keterangan — memudahkan tes di browser (jendela incognito). */
function doGet() {
  return ContentService.createTextOutput(
    "SAT SET API berjalan. Gunakan POST JSON {action, ...}."
  );
}

/** Uji cepat dari editor Apps Script (tanpa lewat URL). */
function testPing() {
  Logger.log("ping -> " + JSON.stringify(doPost({
    postData: { contents: JSON.stringify({ action: "ping" }) },
  })));
  Logger.log("getLaporan -> " + JSON.stringify(doPost({
    postData: { contents: JSON.stringify({ action: "getLaporan" }) },
  })));
}

// Helpere respons -------------------------------------------------------

function ok_(data) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, data: data })
  ).setMimeType(ContentService.MimeType.JSON);
}

function err_(message) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: false, message: message })
  ).setMimeType(ContentService.MimeType.JSON);
}

// Helpere Sheet ---------------------------------------------------------

/** Ambil sheet berdasar nama; buat + isi header bila belum ada. */
function ensureSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Baris header sheet (fallback ke daftar default bila belum berformat). */
function sheetHeaders_(sheet, defaults) {
  var values = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]
    .filter(function (h) { return h; });
  return values.length ? values : defaults;
}

/** Peta {header -> index kolom (1-based)}. */
function headerIndex_(headers) {
  var map = {};
  headers.forEach(function (h, i) { map[String(h)] = i + 1; });
  return map;
}

function findRowByValue_(sheet, column, value) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var colIndex = indexOf_(headers, column);
  if (colIndex === -1) return -1;
  if (sheet.getLastRow() < 2) return -1;
  // indexOf_ 0-based → API Sheets 1-based: +1 agar kolom mulai sah
  var values = sheet.getRange(2, colIndex + 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(value)) return i + 2; // nomor baris
  }
  return -1;
}

function indexOf_(list, value) {
  for (var i = 0; i < list.length; i++) {
    if (String(list[i]) === String(value)) return i;
  }
  return -1;
}

// ------------------------------------------------------------
// Laporan — tab per kejadian
// ------------------------------------------------------------

/**
 * Semua tab laporan yang valid: nama diawali "laporan-" dan header
 * baris 1-nya "nomorTiket" (format Indonesia). Tab berheading lama
 * (bahasa Inggris) dilewati dengan aman — tak dibaca, tak ditulis.
 */
function reportSheets_() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var result = [];
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    if (sheet.getLastRow() < 1) continue;
    var name = String(sheet.getName());
    if (name.indexOf(TAB_PREFIX) !== 0) continue;
    if (String(sheet.getRange(1, 1).getValue()) !== "nomorTiket") continue;
    result.push(sheet);
  }
  return result;
}

/** Nama tab untuk satu klasifikasi; nilai tak dikenal → tab fallback. */
function tabForClassification_(classification) {
  return CLASSIFICATION_TABS[String(classification || "")] || TAB_FALLBACK;
}

/** Sheet laporan siap tulis; header Indonesia dipastikan ada. */
function ensureLaporanSheet_(name) {
  var sheet = sheetExists_(name)
    ? SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name)
    : null;
  if (sheet && String(sheet.getRange(1, 1).getValue()) !== "nomorTiket") {
    // bila tab hanya berisi header lama (tanpa data), ganti heading-nya;
    // bila berisi data, minta dihapus manual agar tidak menimpa data
    var hasData = sheet.getLastRow() > 1;
    if (!hasData) {
      sheet.getRange(1, 1, 1, LAPORAN_COLUMNS.length).setValues([LAPORAN_COLUMNS]);
      sheet.setFrozenRows(1);
      return sheet;
    }
    throw new Error(
      "Tab '" + name + "' masih berheading lama (bahasa Inggris) dan berisi data. " +
      "Hapus tab tersebut lalu kirim ulang laporan agar dibuat ulang dengan heading Indonesia."
    );
  }
  if (!sheet) {
    sheet = ensureSheet_(name, LAPORAN_COLUMNS);
  }
  return sheet;
}

function sheetExists_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name) != null;
}

// --- Konversi isi → baris (Indonesia) dan sebaliknya -----------------

/** Kategori pelapor; desa Kampung Rescue ikut menempel di sini. */
function labelKategori_(lap) {
  var dasar = String(lap.reporterCategory || "");
  if (dasar === "kampung_rescue" && lap.kampungRescueDesa) {
    // "Desa Kampung Mandar" / "Desa Songgon"
    //   → "kampung_rescue - kampung_mandar" / "kampung_rescue - songgon"
    var desa = String(lap.kampungRescueDesa).replace(/^desa\s+/i, "").trim();
    var slug = desa.toLowerCase().replace(/\s+/g, "_");
    return dasar + " - " + slug;
  }
  return dasar;
}

/** Baca kembali label kategori → {reporterCategory, kampungRescueDesa}. */
function parseKategori_(value) {
  var teks = String(value || "");
  if (teks.indexOf("kampung_rescue") === 0 && teks.indexOf(" - ") !== -1) {
    var slug = teks.slice(teks.indexOf(" - ") + 3)
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); })
      .trim();
    // "Kampung Mandar" / "Songgon" → sesuai nilai asli dropdown form
    return { reporterCategory: "kampung_rescue", kampungRescueDesa: "Desa " + slug };
  }
  return { reporterCategory: teks, kampungRescueDesa: "" };
}

/** Nama pelapor umum: gabungan dari 3 kolom pelapor frontend. */
function namaPelapor_(lap) {
  return String(
    lap.employeeName || lap.potentialSarName || lap.kampungRescueName || ""
  );
}

/** Angka km → "0.19 km"; tak valid → "-". */
function toKm_(angka) {
  var n = Number(angka);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(2) + " km";
}

/** Objek jarak {basarnas, manggalaAgni} → teks km langsung. */
function formatJarak_(distances) {
  if (!distances) return "";
  var isi = distances || {};
  var b = Number.isFinite(Number(isi.basarnas)) ? toKm_(isi.basarnas) : "-";
  var m = Number.isFinite(Number(isi.manggalaAgni)) ? toKm_(isi.manggalaAgni) : "-";
  return "BASARNAS: " + b + " | Manggala Agni: " + m;
}

/** Teks km langsung → kembali objek jarak {basarnas, manggalaAgni}. */
function parseJarak_(teks) {
  var hasil = { basarnas: null, manggalaAgni: null };
  var ambil = function (tanda) {
    var ketemu = new RegExp(tanda + "\\s*:\\s*(-?\\d+(?:\\.\\d+)?)\\s*km\\b", "i")
      .exec(String(teks || ""));
    return ketemu ? Number(ketemu[1]) : null;
  };
  hasil.basarnas = ambil("BASARNAS");
  hasil.manggalaAgni = ambil("Manggala\\s+Agni");
  return hasil;
}

/** Laporan dari frontend (kunci EN) → baris kolom Indonesia. */
function laporanToRow_(lap, headers) {
  var isi = {
    nomorTiket: lap.ticketId == null ? "" : lap.ticketId,
    status: lap.status || "baru",
    waktuKirim: lap.submittedAt == null ? "" : lap.submittedAt,
    kategoriPelapor: labelKategori_(lap),
    nama: namaPelapor_(lap),
    wilayah: lap.district == null ? "" : lap.district,
    kejadian: lap.classification == null ? "" : lap.classification,
    jumlahKorban: lap.victimCount == null ? "" : lap.victimCount,
    latitude: lap.latitude == null ? "" : lap.latitude,
    longitude: lap.longitude == null ? "" : lap.longitude,
    detail: lap.detail == null ? "" : lap.detail,
    tautanVoiceNote: lap.voiceNoteUrl == null ? "" : lap.voiceNoteUrl,
    tautanFoto: lap.photoUrl == null ? "" : lap.photoUrl,
    jarak: formatJarak_(lap.distances),
    tanggapan: lap.responses == null ? "" : JSON.stringify(lap.responses),
  };
  return headers.map(function (header) {
    var value = isi[String(header)];
    return value === undefined || value === null ? "" : value;
  });
}

/** Baris kolom Indonesia → objek laporan (kunci EN, sesuai frontend). */
function rowToLaporan_(row, headers) {
  var sel = {};
  for (var c = 0; c < headers.length; c++) {
    sel[String(headers[c])] = row[c];
  }

  var kategori = parseKategori_(sel["kategoriPelapor"]);
  var nama = String(sel["nama"] || "");

  var lap = {
    ticketId: sel["nomorTiket"] == null ? "" : sel["nomorTiket"],
    status: sel["status"] || "baru",
    submittedAt: sel["waktuKirim"] || null,
    reporterCategory: kategori.reporterCategory,
    classification: sel["kejadian"] || "",
    detail: sel["detail"] == null ? "" : sel["detail"],
    voiceNoteUrl: sel["tautanVoiceNote"] == null ? "" : sel["tautanVoiceNote"],
    photoUrl: sel["tautanFoto"] == null ? "" : sel["tautanFoto"],
  };

  // Peta kembali nama SESUAI kategori agar UI menampilkannya benar
  if (kategori.kampungRescueDesa) {
    lap.kampungRescueDesa = kategori.kampungRescueDesa;
    lap.kampungRescueName = nama;
  } else if (lap.reporterCategory === "potensi_sar") {
    lap.potentialSarName = nama;
    lap.district = sel["wilayah"] == null ? "" : sel["wilayah"];
  } else {
    lap.employeeName = nama;
  }

  lap.victimCount = sel["jumlahKorban"] === "" || sel["jumlahKorban"] == null
    ? null
    : Number(sel["jumlahKorban"]);
  lap.latitude = sel["latitude"] === "" || sel["latitude"] == null
    ? null
    : Number(sel["latitude"]);
  lap.longitude = sel["longitude"] === "" || sel["longitude"] == null
    ? null
    : Number(sel["longitude"]);
  lap.distances = parseJarak_(sel["jarak"]);
  try {
    lap.responses = sel["tanggapan"] ? JSON.parse(sel["tanggapan"]) : {};
  } catch (e) {
    lap.responses = {};
  }
  return lap;
}

// --- Baca / tulis -------------------------------------------------------

/** Semua laporan dari seluruh tab laporan-*. */
function getLaporan_() {
  var items = [];
  var sheets = reportSheets_();
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var headers = sheet
      .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
      .getValues()[0];
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
    for (var r = 0; r < rows.length; r++) {
      items.push(rowToLaporan_(rows[r], headers));
    }
  }
  return { items: items };
}

/** Cari baris laporan berdasarkan nomorTiket di semua tab laporan. */
function findLaporanRow_(ticketId) {
  var sheets = reportSheets_();
  for (var i = 0; i < sheets.length; i++) {
    var rowIndex = findRowByValue_(sheets[i], "nomorTiket", ticketId);
    if (rowIndex !== -1) return { sheet: sheets[i], rowIndex: rowIndex };
  }
  return null;
}

/**
 * Upsert laporan: masuk ke tab kejadiannya, klasifikasi berubah →
 * dipindah; tab baru otomatis dibuat dengan heading Indonesia.
 */
function upsertLaporan_(lap) {
  // Lampiran dataURL ditebus ke Google Drive agar sel tidak bengkak
  if (lap.photoUrl && String(lap.photoUrl).indexOf("data:") === 0) {
    lap.photoUrl = saveAttachment_(
      lap.photoUrl,
      "foto-" + (lap.ticketId || "laporan") + ".jpg"
    );
  }
  if (lap.voiceNoteUrl && String(lap.voiceNoteUrl).indexOf("data:") === 0) {
    lap.voiceNoteUrl = saveAttachment_(
      lap.voiceNoteUrl,
      "voice-" + (lap.ticketId || "laporan") + ".webm"
    );
  }

  var targetName = tabForClassification_(lap.classification);
  var existing = findLaporanRow_(lap.ticketId || "");

  if (existing && existing.sheet.getName() === targetName) {
    var headers = sheetHeaders_(existing.sheet, LAPORAN_COLUMNS);
    existing.sheet
      .getRange(existing.rowIndex, 1, 1, headers.length)
      .setValues([laporanToRow_(lap, headers)]);
    return { ticketId: lap.ticketId, tab: targetName, rowIndex: existing.rowIndex };
  }
  if (existing) {
    // Klasifikasi berubah — pindahkan baris ke tab yang sesuai
    existing.sheet.deleteRow(existing.rowIndex);
  }

  var sheet = ensureLaporanSheet_(targetName);
  var headersBaru = sheetHeaders_(sheet, LAPORAN_COLUMNS);
  sheet.appendRow(laporanToRow_(lap, headersBaru));
  regroupTab_(sheet); // urutkan terbaru dulu
  return { ticketId: lap.ticketId, tab: targetName, rowIndex: null };
}

/**
 * Susun ulang baris tab laporan: urut waktu laporan terbaru dulu.
 * Tulis ulang hanya bila urutan benar-benar berubah (hemat kuota).
 */
function regroupTab_(sheet) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var idx = headerIndex_(headers);
  var timeCol = idx["waktuKirim"];
  if (!timeCol) return;
  var last = sheet.getLastRow();
  if (last < 2) return;

  var rows = sheet.getRange(2, 1, last - 1, headers.length).getValues();
  var sorted = rows.slice().sort(function (a, b) {
    var ta = String(a[timeCol - 1] || "");
    var tb = String(b[timeCol - 1] || "");
    return ta < tb ? 1 : ta > tb ? -1 : 0; // terbaru dulu
  });

  var changed = false;
  for (var i = 0; i < rows.length && !changed; i++) {
    for (var c = 0; c < headers.length; c++) {
      if (String(rows[i][c]) !== String(sorted[i][c])) { changed = true; break; }
    }
  }
  if (changed) {
    sheet.getRange(2, 1, sorted.length, headers.length).setValues(sorted);
  }
}

/** Perbarui sebagian kolom laporan (hanya kolom di PATCH_COLUMNS). */
function updateLaporan_(ticketId, patch) {
  var found = findLaporanRow_(ticketId || "");
  if (!found) throw new Error("Laporan tidak ditemukan: " + ticketId);

  var headers = sheetHeaders_(found.sheet, LAPORAN_COLUMNS);
  var idx = headerIndex_(headers);
  var updated = [];
  Object.keys(patch).forEach(function (key) {
    var column = PATCH_COLUMNS[key];
    if (column && idx[column]) {
      var value = patch[key];
      if (key === "responses") {
        value = value == null ? "" : JSON.stringify(value === "" ? {} : value);
      }
      found.sheet.getRange(found.rowIndex, idx[column]).setValue(value);
      updated.push(key);
    }
  });
  return {
    ticketId: ticketId,
    tab: found.sheet.getName(),
    updated: updated,
  };
}

// ------------------------------------------------------------
// Kesiapan petugas (tab "siap")
// ------------------------------------------------------------

var SIAP_COLUMNS = ["username", "name", "latitude", "longitude", "checkedInAt"];

function siapSheet_() {
  return ensureSheet_(SHEET_SIAP, SIAP_COLUMNS);
}

function getSiap_() {
  var sheet = siapSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return { items: [] };
  var values = sheet
    .getRange(2, 1, last - 1, SIAP_COLUMNS.length)
    .getValues();
  var items = values
    .map(function (row) {
      return {
        username: String(row[0] || ""),
        name: String(row[1] || ""),
        latitude: row[2] === "" ? null : Number(row[2]),
        longitude: row[3] === "" ? null : Number(row[3]),
        checkedInAt: row[4] ? new Date(row[4]).toISOString() : null,
      };
    })
    .filter(function (item) { return item.username; });
  return { items: items };
}

/** Upsert status siap per username. */
function putSiap_(item) {
  var sheet = siapSheet_();
  var rowIndex = findRowByValue_(sheet, "username", String(item.username || ""));
  var row = [
    String(item.username || ""),
    String(item.name || ""),
    item.latitude,
    item.longitude,
    (item.checkedInAt ? new Date(item.checkedInAt) : new Date()).toISOString(),
  ];
  if (rowIndex === -1) {
    sheet.appendRow(row);
  } else {
    sheet.getRange(rowIndex, 1, 1, SIAP_COLUMNS.length).setValues([row]);
  }
  return { username: item.username, remove: false };
}

/** Hapus baris kesiapan (petugas menekan "tidak siap"). */
function removeSiap_(username) {
  var sheet = siapSheet_();
  var rowIndex = findRowByValue_(sheet, "username", String(username || ""));
  if (rowIndex > 1) sheet.deleteRow(rowIndex);
  return { username: username, remove: true };
}

// ------------------------------------------------------------
// Lampiran (foto / voice note) -> Google Drive
// ------------------------------------------------------------

/** Folder lampiran (dibuat sekali; ID disimpan di properti skrip). */
function attachmentFolder_() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty("SIGAPSAR_FOLDER_ID");
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      /* folder hilang -> buat baru */
    }
  }
  var folder = DriveApp.getRootFolder().createFolder("SAT SET — Lampiran");
  props.setProperty("SIGAPSAR_FOLDER_ID", folder.getId());
  return folder;
}

/**
 * Konversi dataURL (base64) menjadi berkas Drive, kembalikan tautan.
 * Bukan dataURL -> dikembalikan apa adanya (mis. sudah link Drive).
 */
function saveAttachment_(dataUrl, filename) {
  var match = /^data:([^;]+);base64,(.*)$/i.exec(String(dataUrl));
  if (!match) return dataUrl;
  var blob = Utilities.newBlob(
    Utilities.base64Decode(match[2]),
    match[1],
    filename
  );
  return attachmentFolder_().createFile(blob).getUrl();
}
