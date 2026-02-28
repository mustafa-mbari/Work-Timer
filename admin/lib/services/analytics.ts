import {
  getPlatformStats as getPlatformStatsRpc,
  getActiveUsers,
  getUserGrowth,
  getTopUsers,
  getEntryTypeBreakdown,
  getPremiumBreakdown,
  getPromoStats,
  getDomainStats,
  getAllAuthUsers,
} from '@/lib/repositories/admin'

export async function getAdminStats() {
  const [
    platformStats,
    dau,
    wau,
    mau,
    userGrowth,
    topUsers,
    entryTypeBreakdown,
    premiumBreakdown,
    promoStats,
    domainStats,
    authUsers,
  ] = await Promise.all([
    getPlatformStatsRpc(),
    getActiveUsers('1 day'),
    getActiveUsers('7 days'),
    getActiveUsers('30 days'),
    getUserGrowth(8),
    getTopUsers(5),
    getEntryTypeBreakdown(),
    getPremiumBreakdown(),
    getPromoStats(),
    getDomainStats(),
    getAllAuthUsers(),
  ])

  const userCount = authUsers.length
  const newUsersThisWeek = authUsers.filter(u => {
    const created = new Date(u.created_at)
    return created >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }).length

  return {
    userCount,
    newUsersThisWeek,
    dau,
    wau,
    mau,
    totalEntries: platformStats.total_entries,
    totalHours: platformStats.total_hours,
    entryCount30d: platformStats.entry_count_30d,
    projectCount: platformStats.project_count,
    avgSessionMs: platformStats.avg_session_ms,
    userGrowth: userGrowth.map(w => ({
      week: new Date(w.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: w.signup_count,
    })),
    topUsers: topUsers.map(u => ({
      email: u.email,
      hours: Number(u.total_hours),
    })),
    entryByType: {
      manual: entryTypeBreakdown.find(e => e.entry_type === 'manual')?.entry_count ?? 0,
      stopwatch: entryTypeBreakdown.find(e => e.entry_type === 'stopwatch')?.entry_count ?? 0,
      pomodoro: entryTypeBreakdown.find(e => e.entry_type === 'pomodoro')?.entry_count ?? 0,
    },
    premiumCount: premiumBreakdown.total_premium,
    premiumByType: {
      monthly: premiumBreakdown.by_plan?.['premium_monthly'] ?? 0,
      yearly: premiumBreakdown.by_plan?.['premium_yearly'] ?? 0,
      lifetime: premiumBreakdown.by_plan?.['premium_lifetime'] ?? 0,
    },
    premiumBySource: {
      stripe: premiumBreakdown.by_source?.['stripe'] ?? 0,
      domain: premiumBreakdown.by_source?.['domain'] ?? 0,
      promo: premiumBreakdown.by_source?.['promo'] ?? 0,
      manual: premiumBreakdown.by_source?.['admin_manual'] ?? 0,
    },
    activePromos: promoStats.active_promos,
    totalPromoUses: promoStats.total_uses,
    activeDomains: domainStats.active_domains,
  }
}
