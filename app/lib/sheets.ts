import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: SCOPES,
  })
}

export async function getSheetData(range: string) {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range,
  })
  return res.data.values || []
}

// ── Parse transaksi dari sheet ────────────────────────────
export async function getTransaksi() {
  const rows = await getSheetData('Transaksi!A4:O500')
  return rows
    .filter(r => r[0] && r[0] !== 'ID' && r[0] !== 'Auto' && r[1])
    .map(r => ({
      id:       r[0] || '',
      tanggal:  r[1] || '',
      bulan:    r[2] || '',
      tahun:    r[3] || '',
      klien:    r[4] || '',
      jenis:    r[5] || '',
      produk:   r[6] || '',
      tarif:    parseFloat(String(r[7]).replace(/[^0-9.]/g, '')) || 0,
      fee:      parseFloat(String(r[8]).replace(/[^0-9.]/g, '')) || 0,
      kategori: r[9] || '',
      tipe:     r[10] || '',
      channel:  r[11] || '',
      asal:     r[12] || '',
      total:    parseFloat(String(r[13]).replace(/[^0-9.]/g, '')) || 0,
      catatan:  r[14] || '',
    }))
}

// ── Parse leads dari sheet ────────────────────────────────
export async function getLeads() {
  const rows = await getSheetData('Leads!A4:N600')
  return rows
    .filter(r => r[0] && r[0] !== 'ID' && r[0] !== 'Auto' && r[4])
    .map(r => ({
      id:       r[0] || '',
      tanggal:  r[1] || '',
      bulan:    r[2] || '',
      tahun:    r[3] || '',
      nama:     r[4] || '',
      kontak:   r[5] || '',
      domisili: r[6] || '',
      channel:  r[7] || '',
      kebutuhan:r[8] || '',
      estimasi: parseFloat(String(r[9]).replace(/[^0-9.]/g, '')) || 0,
      status:   r[10] || 'New',
      followUp: r[11] || '',
      dealDate: r[12] || '',
      catatan:  r[13] || '',
    }))
}

// ── Parse pengeluaran dari sheet ──────────────────────────
export async function getPengeluaran() {
  const rows = await getSheetData('Pengeluaran!A4:J300')
  return rows
    .filter(r => r[0] && r[0] !== 'ID' && r[0] !== 'Auto' && r[1])
    .map(r => ({
      id:        r[0] || '',
      tanggal:   r[1] || '',
      bulan:     r[2] || '',
      tahun:     r[3] || '',
      kategori:  r[4] || '',
      subkat:    r[5] || '',
      deskripsi: r[6] || '',
      jumlah:    parseFloat(String(r[7]).replace(/[^0-9.]/g, '')) || 0,
      dibayar:   r[8] || '',
      catatan:   r[9] || '',
    }))
}

// ── Parse summary bulanan ─────────────────────────────────
export async function getSummary() {
  const rows = await getSheetData('Summary Bulanan!A4:O17')
  return rows
    .filter(r => r[0] && r[0] !== 'Bulan' && r[0] !== 'TOTAL / RATA-RATA')
    .map(r => ({
      bulan:       r[0] || '',
      totalLeads:  parseInt(r[1]) || 0,
      totalDeal:   parseInt(r[2]) || 0,
      cr:          parseFloat(r[3]) || 0,
      totalTrx:    parseInt(r[4]) || 0,
      firstOrder:  parseInt(r[5]) || 0,
      repeatOrder: parseInt(r[6]) || 0,
      rcr:         parseFloat(r[7]) || 0,
      omset:       parseFloat(String(r[8]).replace(/[^0-9.]/g, '')) || 0,
      pengeluaran: parseFloat(String(r[9]).replace(/[^0-9.]/g, '')) || 0,
      laba:        parseFloat(String(r[10]).replace(/[^0-9.]/g, '')) || 0,
      margin:      parseFloat(r[11]) || 0,
      aov:         parseFloat(String(r[12]).replace(/[^0-9.]/g, '')) || 0,
      klienLokal:  parseInt(r[13]) || 0,
      klienLuar:   parseInt(r[14]) || 0,
    }))
}
