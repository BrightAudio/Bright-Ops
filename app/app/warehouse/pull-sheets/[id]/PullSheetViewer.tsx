'use client'

import { useState } from 'react'
import PullSheet from '@/components/PullSheet'
import type { PullSheetDetail } from '@/lib/hooks/usePullSheets'

interface PullSheetViewerProps {
  detail: PullSheetDetail
}

export default function PullSheetViewer({ detail }: PullSheetViewerProps) {
  const [viewing, setViewing] = useState(false)

  const { sheet, items } = detail

  if (!sheet) {
    return <div className="text-white">Pull sheet not found</div>
  }

  // Transform your database data to match PullSheet component format
  const pullSheetData = {
    title: `${sheet.name} — ${sheet.jobs?.code || 'Job'}`,
    meta: {
      venue: '—', // Add venue field to jobs table if needed
      pullDate: sheet.scheduled_out_at 
        ? new Date(sheet.scheduled_out_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—',
      preparedBy: '—', // Add from your user data if available
      generatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    groups: [
      {
        id: 'equipment',
        name: 'EQUIPMENT',
        items: items.map((item, idx) => ({
          id: item.id,
          pickOrder: item.sort_index || idx + 1,
          case: '—', // Add case field to pull_sheet_items if needed
          model: item.item_name,
          sku: (item.products as any)?.sku || (item.inventory_items as any)?.barcode || '—',
          qty: item.qty_requested || 0,
          accessories: [], // Add accessories field if needed
          serials: [], // Add serials tracking if needed
          barcode: (item.inventory_items as any)?.barcode || '—',
          notes: item.notes || '',
        })),
      },
    ],
  }

  if (viewing) {
    return (
      <div className="relative">
        <div className="mb-4">
          <button
            onClick={() => setViewing(false)}
            className="px-4 py-2 bg-zinc-800 text-white rounded hover:bg-zinc-700"
          >
            ← Back to Edit Mode
          </button>
        </div>
        <PullSheet
          data={pullSheetData}
          initialMode="consolidated"
          onExportPDF={(html) => {
            // Open the PDF endpoint in a new window
            window.open(`/api/pullsheet?pullSheetId=${sheet.id}`, '_blank')
          }}
        />
      </div>
    )
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setViewing(true)}
        className="px-4 py-2 bg-amber-500 text-black rounded hover:bg-amber-400 font-semibold"
      >
        📋 View Pull Sheet (Scanning Mode)
      </button>
    </div>
  )
}
