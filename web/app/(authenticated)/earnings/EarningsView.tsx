'use client'

import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { EarningsReport } from '@/lib/services/earnings'
import EarningsExportDialog from './EarningsExportDialog'

interface Props {
  data: EarningsReport
  groupBy?: 'tag' | 'project'
  dateRange?: { from?: string; to?: string }
}

export default function EarningsView({ data, groupBy = 'tag', dateRange }: Props) {
  const [exporting, setExporting] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)

  const currencySymbol = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5', CAD: 'C$', AUD: 'A$', CHF: 'CHF', INR: '\u20B9', BRL: 'R$', SEK: 'kr' }[data.currency] ?? data.currency

  const label = groupBy === 'tag' ? 'Tag' : 'Project'

  function handleExportCsv() {
    setExporting(true)
    try {
      const rows: string[] = []
      rows.push(`${label},Hours,Rate,Total,Currency`)
      for (const p of data.items) {
        const name = p.name.includes(',') ? `"${p.name}"` : p.name
        rows.push(`${name},${p.hours},${p.rate},${p.total},${data.currency}`)
      }
      rows.push('')
      rows.push(`Grand Total,${data.total_hours},,${data.grand_total},${data.currency}`)

      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `earnings-report-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Earnings by {label}</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting || data.items.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPdfOpen(true)}
            disabled={data.items.length === 0}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.items.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">
            No earnings data. Set an hourly rate in Settings &gt; Earnings and log some time.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{label}</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="font-medium text-stone-900 dark:text-stone-100">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-stone-600 dark:text-stone-400">{p.hours.toFixed(1)}</TableCell>
                  <TableCell className="text-right text-stone-600 dark:text-stone-400">{currencySymbol}{p.rate.toFixed(2)}/hr</TableCell>
                  <TableCell className="text-right font-semibold text-stone-900 dark:text-stone-100">{currencySymbol}{p.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
              {/* Grand total row */}
              <TableRow className="border-t-2 border-stone-300 dark:border-stone-600">
                <TableCell className="font-bold text-stone-900 dark:text-stone-100">Grand Total</TableCell>
                <TableCell className="text-right font-bold text-stone-900 dark:text-stone-100">{data.total_hours.toFixed(1)}</TableCell>
                <TableCell />
                <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                  {currencySymbol}{data.grand_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>

      <EarningsExportDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        data={data}
        groupBy={groupBy}
        dateRange={dateRange}
      />
    </Card>
  )
}
