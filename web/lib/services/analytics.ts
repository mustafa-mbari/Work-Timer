import { getUserAnalytics as getUserAnalyticsRpc } from '@/lib/repositories/analytics'

/**
 * Fetch all user analytics data via a single RPC call.
 * Replaces 150+ lines of client-side JS aggregation.
 */
export async function getUserAnalytics(userId: string, dateFrom?: string, dateTo?: string) {
  return getUserAnalyticsRpc(userId, dateFrom, dateTo)
}
