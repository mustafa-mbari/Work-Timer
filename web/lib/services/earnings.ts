import { getEarningsReport as getEarningsReportRepo, type EarningsReport } from '@/lib/repositories/earnings'

export type { EarningsReport }

export async function getEarningsReport(
  userId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<EarningsReport> {
  return getEarningsReportRepo(userId, dateFrom, dateTo)
}

export function formatEarningsCsv(data: EarningsReport): string {
  const rows: string[] = []
  rows.push('Project,Hours,Rate,Total,Currency')
  for (const p of data.projects) {
    const name = p.name.includes(',') ? `"${p.name}"` : p.name
    rows.push(`${name},${p.hours},${p.rate},${p.total},${data.currency}`)
  }
  rows.push('')
  rows.push(`Grand Total,${data.total_hours},,${data.grand_total},${data.currency}`)
  return rows.join('\n')
}
