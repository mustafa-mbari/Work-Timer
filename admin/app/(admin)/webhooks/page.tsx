'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, CheckCircle2, XCircle, ShieldAlert, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

interface WebhookStats {
  total_24h: number
  success_24h: number
  error_24h: number
  signature_failures_24h: number
  total_7d: number
  success_rate_7d: number
}

interface WebhookLog {
  id: number
  event_id: string
  event_type: string
  status: string
  error_message: string | null
  user_id: string | null
  duration_ms: number | null
  created_at: string
}

const STATUS_FILTERS = ['all', 'success', 'error', 'signature_failed'] as const

export default function WebhooksPage() {
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const pageSize = 25

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks?view=overview')
      if (res.ok) setStats(await res.json())
    } catch (err) {
      console.error('Failed to fetch webhook stats:', err)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ view: 'logs', page: String(page), pageSize: String(pageSize) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/webhooks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setTotal(data.total)
      }
    } catch (err) {
      console.error('Failed to fetch webhook logs:', err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Webhooks</h1>
        <button
          onClick={() => { fetchStats(); fetchLogs() }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 border border-stone-200 dark:border-[var(--dark-border)] rounded-lg transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Activity} label="Total (24h)" value={stats.total_24h} />
          <StatCard icon={CheckCircle2} label="Success (24h)" value={stats.success_24h} color="emerald" />
          <StatCard icon={XCircle} label="Errors (24h)" value={stats.error_24h} color={stats.error_24h > 0 ? 'rose' : undefined} />
          <StatCard icon={ShieldAlert} label="Sig. Failures (24h)" value={stats.signature_failures_24h} color={stats.signature_failures_24h > 0 ? 'rose' : undefined} />
        </div>
      )}

      {stats && (
        <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-stone-500 dark:text-stone-400">7-day totals:</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">{stats.total_7d} events</span>
            <span className={`font-medium ${stats.success_rate_7d >= 99 ? 'text-emerald-600 dark:text-emerald-400' : stats.success_rate_7d >= 95 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {stats.success_rate_7d}% success rate
            </span>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-4">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              statusFilter === s
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'border-stone-200 dark:border-[var(--dark-border)] text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            {s === 'all' ? 'All' : s === 'signature_failed' ? 'Sig. Failed' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-sm text-stone-400 dark:text-stone-500">{total} total</span>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-[var(--dark-elevated)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Time</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Event Type</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 dark:text-stone-400">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-[var(--dark-border)]">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400">No webhook logs found</td></tr>
              ) : logs.map(log => (
                <tr
                  key={log.id}
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="cursor-pointer hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
                >
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-300 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-700 dark:text-stone-200">{log.event_type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-4 py-3 text-stone-500 dark:text-stone-400">
                    {log.duration_ms != null ? `${log.duration_ms}ms` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-400 dark:text-stone-500 truncate max-w-[120px]">
                    {log.user_id ? log.user_id.slice(0, 8) + '...' : '—'}
                  </td>
                </tr>
              ))}
              {/* Expanded error detail */}
              {logs.filter(l => l.id === expandedId && l.error_message).map(log => (
                <tr key={`${log.id}-detail`} className="bg-rose-50/50 dark:bg-rose-900/10">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="text-xs font-mono text-rose-700 dark:text-rose-300 break-all">
                      <span className="font-medium">Error:</span> {log.error_message}
                    </div>
                    <div className="text-xs font-mono text-stone-400 mt-1">
                      Event ID: {log.event_id}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-stone-500 dark:text-stone-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-[var(--dark-border)] text-stone-500 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-[var(--dark-border)] text-stone-500 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: number; color?: string }) {
  const colorClasses = color === 'emerald'
    ? 'text-emerald-600 dark:text-emerald-400'
    : color === 'rose'
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-stone-900 dark:text-stone-100'

  return (
    <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
        <span className="text-sm text-stone-500 dark:text-stone-400">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${colorClasses}`}>{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = status === 'success'
    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
    : status === 'error'
      ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles}`}>
      {status === 'signature_failed' ? 'Sig. Failed' : status}
    </span>
  )
}
