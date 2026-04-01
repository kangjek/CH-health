// ============================================================
// CHIN HSIN HEALTHY — Google Apps Script Backend
// ============================================================
// CARA SETUP:
// 1. Buka Google Spreadsheet baru
// 2. Buat dua sheet: "Obat" dan "Ruangan"
// 3. Sheet "Obat" header baris 1: Nama Obat | Stok | Satuan | Kategori
// 4. Sheet "Ruangan" header baris 1: No | Nama Ruangan | Status | Pengguna | Catatan
// 5. Salin file ini ke Apps Script (script.google.com)
// 6. Ganti SPREADSHEET_ID di bawah dengan ID spreadsheet Anda
// 7. Deploy sebagai Web App (Execute as: Me, Access: Anyone)
// ============================================================

const SPREADSHEET_ID = '15jvHBcNyy115XmL66IsV5uLDQ7L52ggbvHotA4MSDcM';
const SHEET_OBAT     = 'Obat';
const SHEET_RUANGAN  = 'Ruangan';

// ── Serve HTML ──────────────────────────────────────────────
function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('Chin Hsin Healthy — Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Router POST ─────────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    let result;
    switch (payload.action) {
      case 'getAll':       result = getAllData();              break;
      case 'updateObat':   result = updateObat(payload.data); break;
      case 'updateRuangan':result = updateRuangan(payload.data); break;
      case 'addObat':      result = addObat(payload.data);    break;
      case 'addRuangan':   result = addRuangan(payload.data); break;
      case 'deleteObat':   result = deleteRow(SHEET_OBAT,    payload.data.rowIndex); break;
      case 'deleteRuangan':result = deleteRow(SHEET_RUANGAN, payload.data.rowIndex); break;
      case 'deleteAll':    result = deleteAll(payload.data.tipe); break;
      default: result = { success: false, message: 'Action tidak dikenal' };
    }
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Helper ───────────────────────────────────────────────────
function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

// ── Get All Data ─────────────────────────────────────────────
function getAllData() {
  const ssObat     = getSheet(SHEET_OBAT);
  const ssRuangan  = getSheet(SHEET_RUANGAN);

  const rawObat    = ssObat.getDataRange().getValues();
  const rawRuangan = ssRuangan.getDataRange().getValues();

  // Skip header row (row 0)
  const obat = rawObat.slice(1).map((r, i) => ({
    rowIndex : i + 2,               // 1-based sheet row
    nama     : r[0] || '',
    stok     : r[1] !== '' ? Number(r[1]) : 0,
    satuan   : r[2] || 'pcs',
    kategori : r[3] || 'Umum'
  }));

  const ruangan = rawRuangan.slice(1).map((r, i) => ({
    rowIndex : i + 2,
    no       : r[0] || (i + 1),
    nama     : r[1] || '',
    status   : r[2] || 'Kosong',   // "Terisi" | "Kosong" | "Maintenance"
    pengguna : r[3] || '-',
    catatan  : r[4] || ''
  }));

  return { success: true, obat, ruangan, updatedAt: new Date().toISOString() };
}

// ── Update Stok Obat ─────────────────────────────────────────
function updateObat(data) {
  // data: { rowIndex, stok }
  const sheet = getSheet(SHEET_OBAT);
  sheet.getRange(data.rowIndex, 2).setValue(Number(data.stok));
  return { success: true, message: 'Stok diperbarui' };
}

// ── Tambah Obat Baru ─────────────────────────────────────────
function addObat(data) {
  // data: { nama, stok, satuan, kategori }
  const sheet = getSheet(SHEET_OBAT);
  sheet.appendRow([data.nama, Number(data.stok), data.satuan || 'pcs', data.kategori || 'Umum']);
  return { success: true, message: 'Obat ditambahkan' };
}

// ── Update Ruangan ───────────────────────────────────────────
function updateRuangan(data) {
  // data: { rowIndex, status, pengguna, catatan }
  const sheet = getSheet(SHEET_RUANGAN);
  sheet.getRange(data.rowIndex, 3).setValue(data.status   || 'Kosong');
  sheet.getRange(data.rowIndex, 4).setValue(data.pengguna || '-');
  sheet.getRange(data.rowIndex, 5).setValue(data.catatan  || '');
  return { success: true, message: 'Ruangan diperbarui' };
}

// ── Tambah Ruangan Baru ──────────────────────────────────────
function addRuangan(data) {
  const sheet  = getSheet(SHEET_RUANGAN);
  const lastNo = sheet.getLastRow() - 1; // exclude header
  sheet.appendRow([data.no || (lastNo + 1), data.nama, data.status || 'Kosong', data.pengguna || '-', data.catatan || '']);
  return { success: true, message: 'Ruangan ditambahkan' };
}

// ── Hapus Satu Baris ─────────────────────────────────────────
function deleteRow(sheetName, rowIndex) {
  getSheet(sheetName).deleteRow(rowIndex);
  return { success: true, message: 'Data dihapus' };
}

// ── Hapus Semua Data (pertahankan header) ────────────────────
function deleteAll(tipe) {
  const sheetName = tipe === 'obat' ? SHEET_OBAT : SHEET_RUANGAN;
  const sheet     = getSheet(sheetName);
  const lastRow   = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  return { success: true, message: 'Semua data dihapus' };
}
