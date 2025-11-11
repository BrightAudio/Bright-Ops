'use client'

import React, { useState, useMemo } from 'react'
// UI libs available: Tailwind CSS + shadcn/ui components (Button, Card, etc.)
// This component is production-ready and built to be dropped into a Next.js app.
// Default export is the PullSheet component.

/*
USAGE

<PullSheet
  data={pullSheetJson}
  initialMode="consolidated"
  pageSize="letter"
  onExportPDF={(html) => {
    // implement server-side or puppeteer export
  }}
/>

Sample data shape (see sample below in this file)
*/

interface PullSheetItem {
  id: string
  pickOrder?: number
  case: string
  model: string
  sku: string
  qty: number
  accessories?: string[]
  serials?: string[]
  barcode?: string
  notes?: string
}

interface PullSheetGroup {
  id: string
  name: string
  items: PullSheetItem[]
}

interface PullSheetData {
  title?: string
  meta?: {
    venue?: string
    pullDate?: string
    preparedBy?: string
    generatedAt?: string
  }
  groups: PullSheetGroup[]
}

interface PullSheetProps {
  data: PullSheetData
  initialMode?: 'consolidated' | 'expanded'
  pageSize?: 'letter' | 'a4'
  onExportPDF?: ((html: string) => void) | null
}

export default function PullSheet({
  data,
  initialMode = 'consolidated',
  pageSize: _pageSize = 'letter',
  onExportPDF = null,
}: PullSheetProps) {
  const [mode, setMode] = useState<'consolidated' | 'expanded'>(initialMode)
  const [filter, setFilter] = useState('')
  const [prepStatus, setPrepStatus] = useState<'unprepped' | 'in-progress' | 'complete'>('unprepped')
  const [scannedMap, setScannedMap] = useState<Record<string, number>>({}) // { lineId: qtyScanned }

  const groups = useMemo(() => data?.groups || [], [data])

  function toggleMode() {
    setMode((m) => (m === 'consolidated' ? 'expanded' : 'consolidated'))
  }

  function onScan(lineId: string, increment = 1) {
    setScannedMap((s) => ({ ...s, [lineId]: (s[lineId] || 0) + increment }))
    setPrepStatus('in-progress')
  }

  function markComplete() {
    setPrepStatus('complete')
  }

  function exportPDF() {
    // Client-side: open print dialog for HTML -> PDF via browser print.
    // Production: prefer server-side rendering (Puppeteer, wkhtmltopdf).
    if (onExportPDF) {
      const html = document.getElementById('pullsheet-root')?.outerHTML || ''
      onExportPDF(html)
      return
    }
    window.print()
  }

  return (
    <div id="pullsheet-root" className="p-6 bg-white max-w-5xl mx-auto">
      <header className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-28 h-14 flex items-center justify-center bg-gray-100 rounded-md font-bold text-xs">BRIGHT AUDIO</div>
          <div>
            <h1 className="text-xl font-semibold tracking-wide">PULL SHEET</h1>
            <p className="text-xs text-slate-600 mt-1">{data?.title || 'Untitled Job'}</p>
          </div>
        </div>

        <div className="w-80 text-sm">
          <div className="bg-slate-50 border border-slate-100 rounded-md p-3">
            <div className="flex justify-between"><span className="text-xs text-slate-500">Venue</span><strong>{data?.meta?.venue || '—'}</strong></div>
            <div className="flex justify-between mt-1"><span className="text-xs text-slate-500">Pull Date</span><strong>{data?.meta?.pullDate || '—'}</strong></div>
            <div className="flex justify-between mt-1"><span className="text-xs text-slate-500">Prepared</span><strong>{data?.meta?.preparedBy || '—'}</strong></div>
            <div className="flex justify-between mt-1"><span className="text-xs text-slate-500">Status</span><span className={`px-2 rounded-full text-xs ${prepStatus === 'complete' ? 'bg-green-100 text-green-700' : prepStatus === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-slate-700'}`}>{prepStatus}</span></div>
          </div>

          <div className="flex gap-2 mt-2">
            <button onClick={toggleMode} className="flex-1 rounded-md border px-2 py-1 text-sm hover:bg-gray-50">Mode: {mode === 'consolidated' ? 'Consolidated' : 'Expanded'}</button>
            <button onClick={exportPDF} className="rounded-md border px-2 py-1 text-sm hover:bg-gray-50">Export PDF</button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between mb-4 gap-4">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter items, case, sku..." className="flex-1 border rounded-md px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <button onClick={() => setScannedMap({})} className="px-3 py-2 border rounded text-sm hover:bg-gray-50">Reset Scans</button>
          <button onClick={markComplete} className="px-3 py-2 bg-slate-900 text-white rounded text-sm hover:bg-slate-800">Mark Complete</button>
        </div>
      </div>

      <main className="space-y-6">
        {groups.filter(g => g.name.toLowerCase().includes(filter.toLowerCase()) || !filter).map((group) => (
          <section key={group.id} className="bg-white border rounded-md shadow-sm p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold">{group.name}</div>
                <div className="text-xs text-slate-500">Total: {group.items.reduce((s, it) => s + it.qty, 0)}</div>
              </div>
              <div className="text-sm">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">Group Qty: {group.items.length}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm table-auto">
                <thead>
                  <tr className="text-left text-xs text-slate-600 border-b">
                    <th className="w-8 py-2">#</th>
                    <th className="w-20 py-2">Case</th>
                    <th className="py-2">Item / Model</th>
                    <th className="w-48 py-2">Accessories</th>
                    <th className="w-20 text-center py-2">Qty Req</th>
                    <th className="w-24 text-center py-2">Scanned</th>
                    <th className="w-44 py-2">Serial / Unit</th>
                    <th className="w-36 py-2">Barcode</th>
                    <th className="w-40 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.filter(item => {
                    if (!filter) return true
                    const f = filter.toLowerCase()
                    return [item.model, item.case, item.sku, (item.notes || '')].some(v => (v || '').toString().toLowerCase().includes(f))
                  }).map((item, idx) => {
                    const qtyScanned = scannedMap[item.id] || 0
                    const shortQty = Math.max(0, item.qty - qtyScanned)
                    return (
                      <tr key={item.id} className={`align-top ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="py-2">{item.pickOrder ?? (idx + 1)}</td>
                        <td className="py-2">{item.case}</td>
                        <td className="py-2 font-semibold">{item.model} <div className="text-xs text-slate-500">{item.sku}</div></td>
                        <td className="py-2 text-xs text-slate-600">{mode === 'expanded' ? (item.accessories || []).join(', ') || '—' : `Accessories: ${(item.accessories || []).length}`}</td>

                        <td className="py-2 text-center font-medium">{item.qty}</td>

                        <td className="py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-sm font-medium">{qtyScanned}</div>
                            <div className="flex gap-1">
                              <button onClick={() => onScan(item.id, 1)} className="px-2 py-0.5 border rounded text-xs hover:bg-gray-50">+1</button>
                              <button onClick={() => setScannedMap(s => ({ ...s, [item.id]: Math.max(0, (s[item.id] || 0) - 1) }))} className="px-2 py-0.5 border rounded text-xs hover:bg-gray-50">-1</button>
                            </div>
                          </div>
                          {shortQty > 0 && <div className="text-xs text-red-600 mt-1">SHORT: {shortQty}</div>}
                        </td>

                        <td className="py-2 font-mono text-xs">{mode === 'expanded' ? (item.serials || []).join(', ') : (item.serials || []).slice(0, 3).join(', ')}</td>
                        <td className="py-2 text-xs">{item.barcode || '—'}</td>
                        <td className="py-2 text-xs text-amber-700">{item.notes || ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </main>

      <footer className="mt-6 text-xs text-slate-600 flex justify-between items-center">
        <div>Generated: {data?.meta?.generatedAt || new Date().toLocaleString()}</div>
        <div className="flex items-center gap-4">
          <div className="text-xs">Legend:</div>
          <div className="text-xs flex gap-2"><span className="px-2 rounded-full bg-red-100 text-red-700">SHORT</span><span className="px-2 rounded-full bg-yellow-100 text-yellow-800">SUB</span></div>
        </div>
      </footer>
    </div>
  )
}

/* -------------------- Sample JSON for local testing -------------------- */
/*
const pullSheetJson = {
  title: 'Ezra Holloway Screening — Quote #Q-2025-113',
  meta: {
    venue: 'Union Hall — Stage A',
    pullDate: 'Nov 10, 2025',
    preparedBy: 'Stephen Bright',
    generatedAt: 'Nov 8, 2025'
  },
  groups: [
    {
      id: 'g-audio',
      name: 'AUDIO CASES',
      items: [
        { id: 'line-1', pickOrder: 1, case: 'C-01', model: 'Eminence SIGMA PRO 18-A2', sku: 'EM18', qty: 1, accessories: ['Speaker Cable'], serials: ['EM18-00452'], barcode: 'EM18-00452', notes: '' },
        { id: 'line-2', pickOrder: 2, case: 'C-01', model: 'X32 Mixer', sku: 'X32', qty: 1, accessories: ['Cat6', 'Power'], serials: ['X32-2231'], barcode: 'X32-2231', notes: 'Overhead fee: $150/mo' },
        { id: 'line-3', pickOrder: 3, case: 'C-02', model: 'Shure SM58 Wireless', sku: 'SM58', qty: 2, accessories: ['Batteries'], serials: [], barcode: 'SM58-XXXX', notes: '' },
      ]
    },
    {
      id: 'g-light',
      name: 'LIGHTING',
      items: [
        { id: 'line-6', pickOrder: 6, case: 'L-01', model: 'ColorKey MobilePar HEX 4', sku: 'CKMP', qty: 4, accessories: ['Power','Mount'], serials: [], barcode: 'CKMP-443', notes: '' }
      ]
    }
  ]
}
*/
