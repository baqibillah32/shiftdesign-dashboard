# Shiftdesign Dashboard — Deploy Guide

Dashboard bisnis Shiftdesign Studio: Next.js 14 + Google Sheets API + Vercel.

---

## LANGKAH 1 — Setup Google Sheets API

### 1a. Buat Service Account di Google Cloud

1. Buka https://console.cloud.google.com
2. Buat project baru → nama: "Shiftdesign Dashboard"
3. Masuk ke **APIs & Services → Library**
4. Cari & enable **Google Sheets API**
5. Masuk ke **APIs & Services → Credentials**
6. Klik **+ Create Credentials → Service Account**
7. Isi nama: `shiftdesign-dashboard`
8. Klik **Create and Continue → Done**
9. Klik service account yang baru dibuat
10. Tab **Keys → Add Key → Create new key → JSON**
11. Download file JSON-nya — simpan, jangan share!

### 1b. Share Google Sheets ke Service Account

1. Buka file JSON tadi → copy nilai `client_email`
   (bentuknya: `shiftdesign-dashboard@project.iam.gserviceaccount.com`)
2. Buka Google Sheets Shiftdesign kamu
3. Klik **Share** → paste email tadi → pilih **Viewer** → Send

### 1c. Ambil Spreadsheet ID

URL Sheets kamu:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_INI/edit
```
Copy bagian `SPREADSHEET_ID_INI`.

---

## LANGKAH 2 — Setup Project Lokal

```bash
# 1. Install dependencies
npm install

# 2. Buat file .env.local
cp .env.example .env.local

# 3. Isi .env.local dengan:
GOOGLE_SHEETS_ID=spreadsheet_id_kamu
GOOGLE_SERVICE_ACCOUNT_EMAIL=email_dari_json
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# Catatan: Private key ada di file JSON dengan key "private_key"
# Paste as-is dengan tanda kutip ganda

# 4. Test lokal
npm run dev
# Buka http://localhost:3000
```

---

## LANGKAH 3 — Deploy ke Vercel (GRATIS)

```bash
# 1. Push ke GitHub
git init
git add .
git commit -m "Initial Shiftdesign Dashboard"
git remote add origin https://github.com/username/shiftdesign-dashboard.git
git push -u origin main

# 2. Buka https://vercel.com → Login → New Project
# 3. Import repo GitHub kamu
# 4. Di bagian Environment Variables, tambahkan:
#    - GOOGLE_SHEETS_ID
#    - GOOGLE_SERVICE_ACCOUNT_EMAIL
#    - GOOGLE_PRIVATE_KEY
# 5. Klik Deploy!
```

Selesai! Kamu dapat URL seperti: `https://shiftdesign-dashboard.vercel.app`
Bisa diakses dari HP, laptop, PC — dimana saja.

---

## CARA KERJA

```
Google Sheets (sumber data)
        ↓
Google Sheets API (baca otomatis)
        ↓
Next.js API Route /api/sheets (server-side)
        ↓
Dashboard React (tampil di browser)
```

- Data di-cache 5 menit (tidak spam ke Sheets API)
- Klik **Refresh** di dashboard untuk update manual
- Data baru yang diinput langsung tampil (local state)
- Setelah input data di dashboard → tetap perlu input ke Sheets untuk permanen

---

## STRUKTUR FILE

```
shiftdesign-dashboard/
├── app/
│   ├── api/sheets/route.ts   ← Fetch data dari Google Sheets
│   ├── components/
│   │   └── Dashboard.tsx     ← Komponen dashboard utama
│   ├── lib/
│   │   └── sheets.ts         ← Helper Google Sheets API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── .env.example              ← Template environment variables
├── .gitignore
├── next.config.js
├── package.json
└── README.md
```

---

## TROUBLESHOOTING

**Error: "PERMISSION_DENIED"**
→ Sheets belum di-share ke service account email. Ulangi Langkah 1b.

**Error: "GOOGLE_SHEETS_ID not set"**
→ File .env.local belum dibuat atau variabel belum diisi.

**Data tidak muncul / kosong**
→ Nama sheet di Sheets harus persis sama: `📥 Transaksi`, `🎯 Leads`, `📤 Pengeluaran`, `📊 Summary Bulanan`

**Private key error**
→ Pastikan `\n` tidak jadi newline asli di .env.local. Paste dalam satu baris dengan `\n` literal.
