import { NextResponse } from 'next/server'
import { getTransaksi, getLeads, getPengeluaran, getSummary } from '@/app/lib/sheets'

// Cache data selama 5 menit supaya tidak terlalu sering hit Sheets API
export const revalidate = 300

export async function GET() {
  try {
    const [transaksi, leads, pengeluaran, summary] = await Promise.all([
      getTransaksi(),
      getLeads(),
      getPengeluaran(),
      getSummary(),
    ])

    // Hitung KPI dari data mentah
    const totalOmset = transaksi.reduce((a, t) => a + t.tarif, 0)
    const totalExp   = pengeluaran.reduce((a, e) => a + e.jumlah, 0)
    const laba       = totalOmset - totalExp
    const totalTrx   = transaksi.length
    const totalLeads = leads.length
    const dealLeads  = leads.filter(l => l.status === 'Deal').length
    const repeatTrx  = transaksi.filter(t => t.tipe === 'Repeat Order').length
    const aov        = totalTrx > 0 ? totalOmset / totalTrx : 0
    const crRate     = totalLeads > 0 ? dealLeads / totalLeads : 0
    const repeatRate = totalTrx > 0 ? repeatTrx / totalTrx : 0
    const margin     = totalOmset > 0 ? laba / totalOmset : 0
    const totalKlien = [...new Set(transaksi.map(t => t.klien))].length

    // Channel breakdown
    const channelLeads: Record<string, number> = {}
    leads.forEach(l => { channelLeads[l.channel] = (channelLeads[l.channel] || 0) + 1 })

    const channelRev: Record<string, number> = {}
    transaksi.forEach(t => { channelRev[t.channel] = (channelRev[t.channel] || 0) + t.tarif })

    // Top klien
    const klienMap: Record<string, number> = {}
    transaksi.forEach(t => { klienMap[t.klien] = (klienMap[t.klien] || 0) + t.tarif })
    const topKlien = Object.entries(klienMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, rev]) => ({ name, rev }))

    // Top produk
    const produkMap: Record<string, number> = {}
    transaksi.forEach(t => { produkMap[t.produk] = (produkMap[t.produk] || 0) + 1 })
    const topProduk = Object.entries(produkMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }))

    return NextResponse.json({
      kpi: {
        totalOmset, totalExp, laba, totalTrx, totalLeads,
        dealLeads, repeatTrx, aov, crRate, repeatRate, margin, totalKlien,
      },
      transaksi,
      leads,
      pengeluaran,
      summary,
      channelLeads,
      channelRev,
      topKlien,
      topProduk,
    })
  } catch (err) {
    console.error('Sheets API error:', err)
    return NextResponse.json(
      { error: 'Gagal mengambil data dari Google Sheets', detail: String(err) },
      { status: 500 }
    )
  }
}
