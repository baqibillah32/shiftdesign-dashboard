'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

// ── Types ──────────────────────────────────────────────────
interface Transaksi {
  id: string; tanggal: string; bulan: string; klien: string
  produk: string; tarif: number; fee: number; tipe: string
  channel: string; asal: string; total: number
}
interface Lead {
  id: string; tanggal: string; bulan: string; nama: string
  domisili: string; channel: string; kebutuhan: string; status: string
}
interface Pengeluaran {
  id: string; tanggal: string; bulan: string
  kategori: string; deskripsi: string; jumlah: number
}
interface DashboardData {
  kpi: {
    totalOmset: number; totalExp: number; laba: number
    totalTrx: number; totalLeads: number; dealLeads: number
    repeatTrx: number; aov: number; crRate: number
    repeatRate: number; margin: number; totalKlien: number
  }
  transaksi: Transaksi[]
  leads: Lead[]
  pengeluaran: Pengeluaran[]
  summary: Array<{
    bulan: string; totalLeads: number; totalDeal: number; cr: number
    omset: number; pengeluaran: number; laba: number; aov: number
  }>
  channelLeads: Record<string, number>
  channelRev: Record<string, number>
  topKlien: Array<{ name: string; rev: number }>
  topProduk: Array<{ name: string; count: number }>
}

// ── Constants ──────────────────────────────────────────────
const COLORS = ['#7C6FF7','#5B8FF9','#6EDBA0','#FFB347','#FF8C8C','#B5B1FB','#74C0FC','#F0A0D0']
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

// ── Helpers ────────────────────────────────────────────────
const fmt = (n: number) => {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}Jt`
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}K`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}
const pct = (n: number) => `${Math.round(n * 100)}%`
const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// ── Sub-components ─────────────────────────────────────────
function KpiCard({ label, value, sub, badge, badgeType = 'purple' }: {
  label: string; value: string; sub: string; badge?: string; badgeType?: 'green'|'red'|'purple'
}) {
  const badgeColors = {
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  }
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1, marginBottom: 8, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
            background: badgeType === 'green' ? '#dcfce7' : badgeType === 'red' ? '#fee2e2' : '#eef0ff',
            color: badgeType === 'green' ? '#16a34a' : badgeType === 'red' ? '#dc2626' : '#7c6ff7',
          }}>{badge}</span>
        )}
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</span>
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, paddingLeft: 10, borderLeft: '3px solid var(--purple)' }}>{title}</div>
      {children}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {typeof p.value === 'number' && p.value > 10000 ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── Modal Input ────────────────────────────────────────────
function InputModal({ onClose, onSave }: { onClose: () => void; onSave: (type: string, data: any) => void }) {
  const [tab, setTab] = useState<'trx'|'lead'|'exp'>('trx')
  const today = new Date().toISOString().split('T')[0]

  // Transaksi state
  const [tTgl, setTTgl] = useState(today)
  const [tKlien, setTKlien] = useState('')
  const [tProduk, setTProduk] = useState('')
  const [tTarif, setTTarif] = useState('')
  const [tChannel, setTChannel] = useState('Upwork Baqi')
  const [tTipe, setTTipe] = useState('First Order')
  const [tAsal, setTAsal] = useState('Klien Luar')

  // Lead state
  const [lTgl, setLTgl] = useState(today)
  const [lNama, setLNama] = useState('')
  const [lDom, setLDom] = useState('')
  const [lCh, setLCh] = useState('Upwork Baqi')
  const [lKeb, setLKeb] = useState('')
  const [lStatus, setLStatus] = useState('New')

  // Expense state
  const [eTgl, setETgl] = useState(today)
  const [eJml, setEJml] = useState('')
  const [eKat, setEKat] = useState('Langganan Software')
  const [eDesc, setEDesc] = useState('')

  const handleSave = () => {
    if (tab === 'trx') {
      if (!tKlien || !tProduk || !tTarif) return alert('Lengkapi semua field!')
      const bulan = BULAN[new Date(tTgl).getMonth()]
      const tarif = parseFloat(tTarif)
      const fee = tChannel.includes('Upwork') ? tarif * 0.1 : 0
      onSave('trx', { tanggal: tTgl, bulan, klien: tKlien, produk: tProduk, tarif, fee, tipe: tTipe, channel: tChannel, asal: tAsal, total: tarif - fee })
    } else if (tab === 'lead') {
      if (!lNama) return alert('Nama lead wajib diisi!')
      const bulan = BULAN[new Date(lTgl).getMonth()]
      onSave('lead', { tanggal: lTgl, bulan, nama: lNama, domisili: lDom, channel: lCh, kebutuhan: lKeb, status: lStatus })
    } else {
      if (!eJml) return alert('Jumlah wajib diisi!')
      const bulan = BULAN[new Date(eTgl).getMonth()]
      onSave('exp', { tanggal: eTgl, bulan, kategori: eKat, deskripsi: eDesc, jumlah: parseFloat(eJml) })
    }
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1.5px solid var(--border)', borderRadius: 9,
    padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)',
    outline: 'none', background: '#fff',
  }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 5, display: 'block' }

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Tambah Data Baru</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 20 }}>Data langsung terupdate di dashboard</div>

        {/* Form tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 9, padding: 3, marginBottom: 20 }}>
          {(['trx','lead','exp'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, background: tab === t ? '#fff' : 'transparent', border: 'none',
              borderRadius: 7, padding: '7px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              color: tab === t ? 'var(--purple)' : 'var(--muted)', fontFamily: 'inherit',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
            }}>
              {t === 'trx' ? 'Transaksi' : t === 'lead' ? 'Lead' : 'Pengeluaran'}
            </button>
          ))}
        </div>

        {/* Transaksi form */}
        {tab === 'trx' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>Tanggal</label><input type="date" style={inputStyle} value={tTgl} onChange={e => setTTgl(e.target.value)} /></div>
              <div><label style={labelStyle}>Nama Klien</label><input style={inputStyle} placeholder="Nama klien" value={tKlien} onChange={e => setTKlien(e.target.value)} /></div>
            </div>
            <div><label style={labelStyle}>Produk / Layanan</label><input style={inputStyle} placeholder="Logo design, Branding, dll" value={tProduk} onChange={e => setTProduk(e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>Tarif (IDR)</label><input type="number" style={inputStyle} placeholder="1580000" value={tTarif} onChange={e => setTTarif(e.target.value)} /></div>
              <div><label style={labelStyle}>Channel</label>
                <select style={inputStyle} value={tChannel} onChange={e => setTChannel(e.target.value)}>
                  {['Upwork Baqi','Upwork Hani','WhatsApp','Adobe Stock','Langsung'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>Tipe</label>
                <select style={inputStyle} value={tTipe} onChange={e => setTTipe(e.target.value)}>
                  <option>First Order</option><option>Repeat Order</option>
                </select>
              </div>
              <div><label style={labelStyle}>Asal Klien</label>
                <select style={inputStyle} value={tAsal} onChange={e => setTAsal(e.target.value)}>
                  <option>Klien Luar</option><option>Klien Lokal</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Lead form */}
        {tab === 'lead' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>Tanggal Masuk</label><input type="date" style={inputStyle} value={lTgl} onChange={e => setLTgl(e.target.value)} /></div>
              <div><label style={labelStyle}>Nama Lead</label><input style={inputStyle} placeholder="Nama lengkap" value={lNama} onChange={e => setLNama(e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>Domisili / Negara</label><input style={inputStyle} placeholder="United States" value={lDom} onChange={e => setLDom(e.target.value)} /></div>
              <div><label style={labelStyle}>Channel</label>
                <select style={inputStyle} value={lCh} onChange={e => setLCh(e.target.value)}>
                  {['Upwork Baqi','Upwork Hani','WhatsApp','Instagram','Referral'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div><label style={labelStyle}>Kebutuhan / Layanan</label><input style={inputStyle} placeholder="Logo design, Branding, dll" value={lKeb} onChange={e => setLKeb(e.target.value)} /></div>
            <div><label style={labelStyle}>Status</label>
              <select style={inputStyle} value={lStatus} onChange={e => setLStatus(e.target.value)}>
                {['New','Proposal','Negotiation','Deal','Lost'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Expense form */}
        {tab === 'exp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>Tanggal</label><input type="date" style={inputStyle} value={eTgl} onChange={e => setETgl(e.target.value)} /></div>
              <div><label style={labelStyle}>Jumlah (IDR)</label><input type="number" style={inputStyle} placeholder="500000" value={eJml} onChange={e => setEJml(e.target.value)} /></div>
            </div>
            <div><label style={labelStyle}>Kategori</label>
              <select style={inputStyle} value={eKat} onChange={e => setEKat(e.target.value)}>
                {['Langganan Software','Tenaga Kerja','Perlengkapan Kantor','Marketing & Client','Pendidikan & Pelatihan','Lain-lain / Pribadi'].map(k => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Deskripsi</label><input style={inputStyle} placeholder="Langganan Figma, Gaji freelancer, dll" value={eDesc} onChange={e => setEDesc(e.target.value)} /></div>
          </div>
        )}

        <button onClick={handleSave} style={{ width: '100%', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 20 }}>
          Simpan Data
        </button>
        <button onClick={onClose} style={{ width: '100%', background: 'var(--bg)', color: 'var(--muted)', border: 'none', borderRadius: 10, padding: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}>
          Batal
        </button>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeNav, setActiveNav] = useState('analytics')
  const [activeInner, setActiveInner] = useState('overview')
  const [showModal, setShowModal] = useState(false)
  const [target, setTarget] = useState({ bulan: 'November', amount: 40_000_000 })

  // Filters
  const [fBulan, setFBulan] = useState('')
  const [fChannel, setFChannel] = useState('')
  const [fTipe, setFTipe] = useState('')
  const [fKlien, setFKlien] = useState('')

  // Local additions (sebelum sync ke Sheets)
  const [localTrx, setLocalTrx] = useState<Transaksi[]>([])
  const [localLeads, setLocalLeads] = useState<Lead[]>([])
  const [localExp, setLocalExp] = useState<Pengeluaran[]>([])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/sheets')
      if (!res.ok) throw new Error('Gagal fetch data')
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = (type: string, newData: any) => {
    if (type === 'trx') setLocalTrx(prev => [...prev, { id: `NEW-${Date.now()}`, ...newData }])
    if (type === 'lead') setLocalLeads(prev => [...prev, { id: `NEW-${Date.now()}`, ...newData }])
    if (type === 'exp') setLocalExp(prev => [...prev, { id: `NEW-${Date.now()}`, ...newData }])
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>Memuat data dari Google Sheets...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <p style={{ fontWeight: 700 }}>Gagal memuat data</p>
      <p style={{ color: 'var(--muted)', fontSize: 12, maxWidth: 400, textAlign: 'center' }}>{error}</p>
      <button onClick={fetchData} style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>
        Coba Lagi
      </button>
    </div>
  )

  if (!data) return null

  // Merge data Sheets + local additions
  const allTrx = [...data.transaksi, ...localTrx]
  const allLeads = [...data.leads, ...localLeads]
  const allExp = [...data.pengeluaran, ...localExp]

  // Apply filters
  const trx = allTrx.filter(t =>
    (!fBulan || t.bulan === fBulan) &&
    (!fChannel || t.channel === fChannel) &&
    (!fTipe || t.tipe === fTipe) &&
    (!fKlien || t.klien === fKlien)
  )
  const lds = allLeads.filter(l =>
    (!fBulan || l.bulan === fBulan) &&
    (!fChannel || l.channel === fChannel)
  )
  const exp = allExp.filter(e => !fBulan || e.bulan === fBulan)

  // Computed KPIs from filtered data
  const totalOmset = trx.reduce((a, t) => a + t.tarif, 0)
  const totalExp   = exp.reduce((a, e) => a + e.jumlah, 0)
  const laba       = totalOmset - totalExp
  const aov        = trx.length ? totalOmset / trx.length : 0
  const repeatRate = trx.length ? trx.filter(t => t.tipe === 'Repeat Order').length / trx.length : 0
  const crRate     = lds.length ? lds.filter(l => l.status === 'Deal').length / lds.length : 0
  const klienUniq  = [...new Set(trx.map(t => t.klien))].length
  const margin     = totalOmset ? laba / totalOmset : 0

  // Monthly chart data
  const monthlyData = BULAN.map(b => ({
    bulan: b.slice(0, 3),
    omset: trx.filter(t => t.bulan === b).reduce((a, t) => a + t.tarif, 0),
    pengeluaran: exp.filter(e => e.bulan === b).reduce((a, e) => a + e.jumlah, 0),
    leads: lds.filter(l => l.bulan === b).length,
    deal: trx.filter(t => t.bulan === b).length,
  }))

  // Channel leads pie
  const chLeads = Object.entries(
    lds.reduce((acc, l) => ({ ...acc, [l.channel]: (acc[l.channel] || 0) + 1 }), {} as Record<string, number>)
  ).map(([name, value], i) => ({ name, value, color: COLORS[i] }))

  // Top klien
  const klienMap = trx.reduce((acc, t) => ({ ...acc, [t.klien]: (acc[t.klien] || 0) + t.tarif }), {} as Record<string, number>)
  const topKlien = Object.entries(klienMap).sort((a, b) => b[1] - a[1]).slice(0, 6)

  // Target progress
  const targetOmset = trx.filter(t => t.bulan === target.bulan).reduce((a, t) => a + t.tarif, 0)
  const targetPct   = Math.min(Math.round(targetOmset / target.amount * 100), 100)
  const targetOk    = targetPct >= 100

  // All unique klien for filter
  const allKlienNames = [...new Set(allTrx.map(t => t.klien))].sort()

  const navStyle = (id: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', borderRadius: 9,
    fontSize: 12, fontWeight: activeNav === id ? 600 : 500, cursor: 'pointer',
    background: activeNav === id ? 'var(--purple-lt)' : 'transparent',
    color: activeNav === id ? 'var(--purple)' : 'var(--muted)',
  })

  const tabBtnStyle = (id: string): React.CSSProperties => ({
    background: activeInner === id ? '#fff' : 'transparent', border: 'none', borderRadius: 8,
    padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    color: activeInner === id ? 'var(--purple)' : 'var(--muted)', fontFamily: 'inherit',
    boxShadow: activeInner === id ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', minHeight: '100vh' }}>

      {/* ── Sidebar ── */}
      <div style={{ background: '#fff', borderRight: '1px solid var(--border)', padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '2px 8px 16px' }}>
          <div style={{ width: 30, height: 30, background: 'var(--purple)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>S</div>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Shiftdesign</span>
        </div>
        {[
          { id: 'analytics', label: 'Analytics' },
          { id: 'transaksi', label: 'Transaksi' },
          { id: 'leads', label: 'Leads' },
          { id: 'klien', label: 'Klien' },
          { id: 'pengeluaran', label: 'Pengeluaran' },
        ].map(nav => (
          <div key={nav.id} style={navStyle(nav.id)} onClick={() => setActiveNav(nav.id)}>
            {nav.label}
          </div>
        ))}

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 11px', marginBottom: 6 }}>Set Target</div>
          <div style={{ padding: '0 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <select value={target.bulan} onChange={e => setTarget(p => ({ ...p, bulan: e.target.value }))}
              style={{ border: '1px solid var(--border)', borderRadius: 7, padding: '5px 8px', fontSize: 11, fontFamily: 'inherit', color: 'var(--text)', background: '#fff' }}>
              {BULAN.map(b => <option key={b}>{b}</option>)}
            </select>
            <input type="number" placeholder="Target IDR" value={target.amount}
              onChange={e => setTarget(p => ({ ...p, amount: parseInt(e.target.value) || 0 }))}
              style={{ border: '1px solid var(--border)', borderRadius: 7, padding: '5px 8px', fontSize: 11, fontFamily: 'inherit', color: 'var(--text)', background: '#fff', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ background: 'var(--bg)', padding: 20, overflow: 'auto' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{activeNav.charAt(0).toUpperCase() + activeNav.slice(1)}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Shiftdesign Studio · Data 2025</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchData} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--muted)' }}>
              ↺ Refresh
            </button>
            <button onClick={() => setShowModal(true)} style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Tambah Data
            </button>
          </div>
        </div>

        {/* Target notif */}
        <div style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1.5px solid ${targetOk ? '#86efac' : '#fcd34d'}`, background: targetOk ? '#dcfce7' : '#fef3c7' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: targetOk ? '#15803d' : '#92400e' }}>
              {targetOk ? `🎉 Target ${target.bulan} tercapai!` : `Target omset ${target.bulan} belum tercapai`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              {fmt(targetOmset)} dari {fmt(target.amount)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: targetOk ? '#15803d' : '#92400e' }}>{targetPct}%</span>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>dari target</div>
            </div>
            <div style={{ width: 100, background: 'rgba(0,0,0,.1)', borderRadius: 99, height: 7 }}>
              <div style={{ width: `${targetPct}%`, height: '100%', borderRadius: 99, background: targetOk ? '#22c55e' : '#f59e0b', transition: 'width .5s ease' }} />
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Filter:</span>
          {[
            { label: 'Bulan', val: fBulan, set: setFBulan, opts: BULAN },
            { label: 'Channel', val: fChannel, set: setFChannel, opts: ['Upwork Baqi','Upwork Hani','WhatsApp','Adobe Stock'] },
            { label: 'Tipe', val: fTipe, set: setFTipe, opts: ['First Order','Repeat Order'] },
            { label: 'Klien', val: fKlien, set: setFKlien, opts: allKlienNames },
          ].map(f => (
            <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)}
              style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 11, color: 'var(--text)', fontFamily: 'inherit', cursor: 'pointer' }}>
              <option value="">Semua {f.label}</option>
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
          {(fBulan || fChannel || fTipe || fKlien) && (
            <button onClick={() => { setFBulan(''); setFChannel(''); setFTipe(''); setFKlien('') }}
              style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 600, cursor: 'pointer', padding: '5px 8px', borderRadius: 6, border: 'none', background: 'var(--purple-lt)', fontFamily: 'inherit' }}>
              ✕ Reset Filter
            </button>
          )}
          {localTrx.length + localLeads.length + localExp.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--purple)', background: 'var(--purple-lt)', padding: '3px 9px', borderRadius: 6, fontWeight: 600 }}>
              +{localTrx.length + localLeads.length + localExp.length} data baru (belum sync)
            </span>
          )}
        </div>

        {/* ── ANALYTICS ── */}
        {activeNav === 'analytics' && (
          <>
            <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 10, padding: 3, marginBottom: 16, width: 'fit-content', border: '1px solid var(--border)' }}>
              {['overview','revenue','leads'].map(t => (
                <button key={t} style={tabBtnStyle(t)} onClick={() => setActiveInner(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
              {activeInner === 'overview' && <>
                <KpiCard label="Total Omset" value={fmt(totalOmset)} sub="dari transaksi tercatat" badge={`↑ ${Math.round(margin * 100)}% margin`} badgeType="green" />
                <KpiCard label="Laba Bersih" value={fmt(laba)} sub={`Pengeluaran ${fmt(totalExp)}`} badge="Sehat" badgeType="green" />
                <KpiCard label="Avg Order Value" value={fmt(aov)} sub={`Repeat Rate ${Math.round(repeatRate * 100)}%`} badge="Per transaksi" />
              </>}
              {activeInner === 'revenue' && <>
                <KpiCard label="Total Omset" value={fmt(totalOmset)} sub="revenue bruto" badge={`↑ ${Math.round(margin*100)}%`} badgeType="green" />
                <KpiCard label="Pengeluaran" value={fmt(totalExp)} sub="biaya operasional" badge="Total" badgeType="red" />
                <KpiCard label="Laba Bersih" value={fmt(laba)} sub={`Margin ${Math.round(margin*100)}%`} badge="Net profit" badgeType="green" />
              </>}
              {activeInner === 'leads' && <>
                <KpiCard label="Total Leads" value={`${lds.length}`} sub="semua leads masuk" badge={`CR ${Math.round(crRate*100)}%`} badgeType="green" />
                <KpiCard label="Total Deal" value={`${lds.filter(l => l.status === 'Deal').length}`} sub="leads jadi klien" badge="Deal" badgeType="green" />
                <KpiCard label="Conversion Rate" value={`${Math.round(crRate * 100)}%`} sub="deal / total leads" badge="Avg 2025" />
              </>}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, marginBottom: 14 }}>
              <SectionCard title={activeInner === 'leads' ? 'Leads & Deal per Bulan' : 'Omset vs Pengeluaran'}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="bulan" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => v > 1000 ? `${(v/1e6).toFixed(0)}Jt` : `${v}`} tick={{ fill: 'var(--muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    {activeInner === 'leads' ? <>
                      <Bar dataKey="leads" name="Leads" fill="#E8EAF6" radius={[4,4,0,0]} />
                      <Bar dataKey="deal" name="Deal" fill="var(--purple)" radius={[4,4,0,0]} />
                    </> : <>
                      <Bar dataKey="omset" name="Omset" fill="var(--purple)" radius={[4,4,0,0]} />
                      <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#F0A0A0" radius={[4,4,0,0]} />
                    </>}
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard title="Sumber Leads">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={chLeads} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" paddingAngle={3}>
                      {chLeads.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} leads`]} contentStyle={{ border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                    <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ fontSize: 10, color: 'var(--muted)' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>

            {/* Bottom row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12 }}>
              <SectionCard title="Top Klien by Revenue">
                {topKlien.map(([name, rev], i) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < topKlien.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {initials(name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                      <div style={{ background: 'var(--border)', borderRadius: 3, height: 4, marginTop: 4 }}>
                        <div style={{ width: `${Math.round(rev / (topKlien[0][1] || 1) * 100)}%`, height: '100%', borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS[i % COLORS.length], whiteSpace: 'nowrap' }}>{fmt(rev)}</div>
                  </div>
                ))}
              </SectionCard>
              <SectionCard title="Layanan Terlaris">
                {(fBulan || fChannel || fTipe ? Object.entries(trx.reduce((a, t) => ({ ...a, [t.produk]: (a[t.produk] || 0) + 1 }), {} as Record<string, number>)).sort((a,b) => b[1]-a[1]).slice(0,6) : data.topProduk.map(p => [p.name, p.count] as [string, number])).map(([name, count], i) => (
                  <div key={name as string} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{name as string}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: COLORS[i % COLORS.length] }}>{count as number}x</span>
                    </div>
                    <div style={{ background: 'var(--border)', borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${Math.round((count as number) / ((data.topProduk[0]?.count || 1)) * 100)}%`, height: '100%', borderRadius: 4, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </SectionCard>
            </div>
          </>
        )}

        {/* ── TRANSAKSI TABLE ── */}
        {activeNav === 'transaksi' && (
          <SectionCard title={`Semua Transaksi (${trx.length})`}>
            {trx.slice().reverse().map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < trx.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {initials(t.klien)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{t.klien}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{t.produk} · {t.channel} · {t.bulan} {t.tanggal}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(t.tarif)}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: t.tipe === 'Repeat Order' ? '#dcfce7' : '#eef0ff', color: t.tipe === 'Repeat Order' ? '#16a34a' : '#7c6ff7' }}>
                    {t.tipe === 'Repeat Order' ? 'Repeat' : 'New'}
                  </span>
                </div>
              </div>
            ))}
          </SectionCard>
        )}

        {/* ── LEADS TABLE ── */}
        {activeNav === 'leads' && (
          <SectionCard title={`Database Leads (${lds.length})`}>
            {lds.slice().reverse().map((l, i) => {
              const sc: Record<string, React.CSSProperties> = {
                New: { background: '#eef0ff', color: '#7c6ff7' },
                Proposal: { background: '#fef3c7', color: '#92400e' },
                Deal: { background: '#dcfce7', color: '#16a34a' },
                Lost: { background: '#fee2e2', color: '#dc2626' },
                Negotiation: { background: '#fef3c7', color: '#92400e' },
              }
              return (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < lds.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {initials(l.nama)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{l.nama}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{l.domisili} · {l.channel} · {l.bulan}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, ...(sc[l.status] || sc['New']) }}>{l.status}</span>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{l.kebutuhan.slice(0, 20)}</div>
                  </div>
                </div>
              )
            })}
          </SectionCard>
        )}

        {/* ── KLIEN ── */}
        {activeNav === 'klien' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
              <KpiCard label="Total Klien" value={`${klienUniq}`} sub="klien unik" badge="Aktif" badgeType="green" />
              <KpiCard label="Repeat Rate" value={pct(repeatRate)} sub="klien balik lagi" badge="Bagus!" badgeType="green" />
              <KpiCard label="Avg Order Value" value={fmt(aov)} sub="per transaksi" />
            </div>
            <SectionCard title="Ranking Klien by Revenue">
              {topKlien.map(([name, rev], i) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < topKlien.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, width: 20, textAlign: 'right' }}>{i + 1}</span>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                    {initials(name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                    <div style={{ background: 'var(--border)', borderRadius: 3, height: 5, marginTop: 5 }}>
                      <div style={{ width: `${Math.round(rev / (topKlien[0][1] || 1) * 100)}%`, height: '100%', borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: COLORS[i % COLORS.length] }}>{fmt(rev)}</div>
                </div>
              ))}
            </SectionCard>
          </>
        )}

        {/* ── PENGELUARAN ── */}
        {activeNav === 'pengeluaran' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
              <KpiCard label="Total Pengeluaran" value={fmt(totalExp)} sub="semua kategori" badge="↑ total" badgeType="red" />
              <KpiCard label="Terbesar" value={exp.length ? fmt(Math.max(...exp.map(e => e.jumlah))) : 'Rp 0'} sub="satu transaksi" />
              <KpiCard label="Jumlah Item" value={`${exp.length}`} sub="baris pengeluaran" />
            </div>
            <SectionCard title={`Pengeluaran (${exp.length} item · Total: ${fmt(totalExp)})`}>
              {exp.slice().reverse().map((e, i) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < exp.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>💸</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{e.deskripsi || e.kategori}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{e.kategori} · {e.bulan}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{fmt(e.jumlah)}</div>
                </div>
              ))}
            </SectionCard>
          </>
        )}

      </div>

      {/* Modal */}
      {showModal && <InputModal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  )
}
