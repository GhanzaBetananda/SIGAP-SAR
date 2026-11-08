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
//      Di dalam tiap tab, baris dikelompokkan per KATEGORI PELAPOR:
//        pegawai_basarnas (petugas SAR) → potensi_sar → kampung_rescue.
//   2. "siap" — status kesiapan pegawai SAR (lokasi "Saya Siap")
// Tab + header dibuat OTOMATIS saat dipakai, ditab saja yang perlu.
//
// Lampiran (foto TKP & voice note) berupa dataURL tidak disimpan
// ke sel Sheet (limit 50 ribu karakter) — backend menebusnya menjadi
// berkas di Google Drive dan menyimpan tautannya di sel.
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
var SHEET_LEGACY = "laporan"; // tab lama (satu tab semua laporan) — dibaca saja
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

// Urut kelompok pelapor di dalam tab (petugas SAR paling atas)
var CATEGORY_ORDER = {
  pegawai_basarnas: 0, // petugas SAR
  potensi_sar: 1,
  kampung_rescue: 2,
};

// Urutan kolom tab laporan (dipakai di SEMUA tab laporan-*)
var LAPORAN_COLUMNS = [
  "ticketId",
  "status",
  "submittedAt",
  "reporterUsername",
  "reporterCategory",
  "employeeName",
  "district",
  "potentialSarName",
  "kampungRescueDesa",
  "kampungRescueName",
  "classification",
  "victimCount",
  "latitude",
  "longitude",
  "locationAccuracy",
  "tkpDistrict",
  "detail",
  "voiceNoteUrl",
  "photoUrl",
  "distances",
  "responses",
  "waOpened",
];
// Kolom berisi JSON (disimpan sebagai teks di sel)
var LAPORAN_JSON_FIELDS = { distances: true, responses: true, waOpened: true };

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
  var colIndex = indexOf_(sheetHeaders_(sheet, []), column);
  if (colIndex === -1) return -1;
  var values = sheet.getRange(2, colIndex, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
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
// Laporan — tab per kejadian, dikelompokkan per pelapor
// ------------------------------------------------------------

/** Nama semua tab laporan yang mungkin (termasuk tab lama untuk baca). */
function reportTabNames_() {
  var names = [];
  for (var key in CLASSIFICATION_TABS) names.push(CLASSIFICATION_TABS[key]);
  names.push(TAB_FALLBACK);
  names.push(SHEET_LEGACY);
  return names;
}

/** Nama tab untuk satu klasifikasi; nilai tak dikenal → tab fallback. */
function tabForClassification_(classification) {
  return CLASSIFICATION_TABS[String(classification || "")] || TAB_FALLBACK;
}

function rowToLaporan_(row, headers) {
  var lap = {};
  for (var c = 0; c < headers.length; c++) {
    var value = row[c];
    var key = String(headers[c]);
    if (LAPORAN_JSON_FIELDS[key]) {
      try {
        value = value ? JSON.parse(value) : null;
      } catch (e) {
        /* sel bukan JSON valid — kirim apa adanya */
      }
    } else if (key === "latitude" || key === "longitude" || key === "locationAccuracy" || key === "victimCount") {
      value = value === "" || value === null ? null : Number(value);
    }
    lap[key] = value;
  }
  return lap;
}

function laporanToRow_(lap, headers) {
  return headers.map(function (header) {
    var value = lap[header];
    if (LAPORAN_JSON_FIELDS[header]) {
      return value == null ? "" : JSON.stringify(value === "" ? [] : value);
    }
    if (value === undefined || value === null) return "";
    return value;
  });
}

/** Semua laporan dari seluruh tab laporan-*. */
function getLaporan_() {
  var items = [];
  var names = reportTabNames_();
  for (var i = 0; i < names.length; i++) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(names[i]);
    if (!sheet || sheet.getLastRow() < 2) continue;
    var headers = sheetHeaders_(sheet, LAPORAN_COLUMNS);
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
    for (var r = 0; r < rows.length; r++) {
      items.push(rowToLaporan_(rows[r], headers));
    }
  }
  return { items: items };
}

/** Cari baris laporan berdasarkan ticketId di semua tab laporan. */
function findLaporanRow_(ticketId) {
  var names = reportTabNames_();
  for (var i = 0; i < names.length; i++) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(names[i]);
    if (!sheet || sheet.getLastRow() < 2) continue;
    var rowIndex = findRowByValue_(sheet, "ticketId", ticketId);
    if (rowIndex !== -1) return { sheet: sheet, rowIndex: rowIndex };
  }
  return null;
}

/**
 * Upsert laporan:
 *   - dipindahkan ke tab sesuai klasifikasi kejadiannya
 *   - dikelompokkan per kategori pelapor (regroupTab_)
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
    // Tetap di tab yang benar — tulis ulang barisnya
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

  var sheet = ensureSheet_(targetName, LAPORAN_COLUMNS);
  var headers2 = sheetHeaders_(sheet, LAPORAN_COLUMNS);
  sheet.appendRow(laporanToRow_(tokenless, headers2));
  regroupTab_(sheet); // kelompokkan per kategori pelapor
  return { ticketId: lap.ticketId, tab: targetName, rowIndex: null };
}

/**
 * Susun ulang baris tab laporan: kelompokkan per kategori pelapor
 * (pegawai_basarnas → potensi_sar → kampung_rescue), di dalam
 * kelompok waktu laporan terbaru lebih dulu.
 * Tulis ulang hanya bila urutan benar-benar berubah (hemat kuota).
 */
function regroupTab_(sheet) {
  var headers = sheetHeaders_(sheet, LAPORAN_COLUMNS);
  var index = headerIndex_(headers);
  var catCol = index["reporterCategory"] || 5;
  var timeCol = index["submittedAt"] || 3;
  var last = sheet.getLastRow();
  if (last < 2) return;

  var rows = sheet.getRange(2, 1, last - 1, headers.length).getValues();
  var order = function (value) {
    return CATEGORY_ORDER[String(value || "")] != null
      ? CATEGORY_ORDER[String(value || "")]
      : 9;
  };
  var sorted = rows.slice().sort(function (a, b) {
    var ca = order(a[catCol - 1]);
    var cb = order(b[catCol - 1]);
    if (ca !== cb) return ca - cb;
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

/** Perbarui kolom laporan tertentu (status, responses, waOpened, ...). */
function updateLaporan_(ticketId, patch) {
  var found = findLaporanRow_(ticketId || "");
  if (!found) throw new Error("Laporan tidak ditemukan: " + ticketId);

  var headers = sheetHeaders_(found.sheet, LAPORAN_COLUMNS);
  var index = headerIndex_(headers);
  var updated = {};
  Object.keys(patch).forEach(function (key) {
    if (index[key]) {
      var value = patch[key];
      if (LAPORAN_JSON_FIELDS[key]) {
        value = value == null ? "" : JSON.stringify(value === "" ? [] : value);
      }
      found.sheet.getRange(found.rowIndex, index[key]).setValue(value);
      updated[key] = patch[key];
    }
  });
  return {
    ticketId: ticketId,
    tab: found.sheet.getName(),
    updated: Object.keys(updated),
  };
}

// ------------------------------------------------------------
// Kesiapan petugas
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
