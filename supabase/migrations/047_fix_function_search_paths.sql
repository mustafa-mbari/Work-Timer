-- Fix "Function Search Path Mutable" security warnings.
-- SECURITY DEFINER functions without a pinned search_path are vulnerable to
-- search-path injection attacks. Setting search_path = 'public' restricts the
-- function's schema resolution to the public schema only.
--
-- ALTER FUNCTION is used to avoid duplicating the full function body.
-- These are all SECURITY DEFINER functions — the existing body is unchanged.

-- Admin / platform stats
ALTER FUNCTION public.get_admin_overview()                                                       SET search_path = 'public';
ALTER FUNCTION public.get_platform_stats()                                                       SET search_path = 'public';
ALTER FUNCTION public.get_active_users(interval)                                                 SET search_path = 'public';
ALTER FUNCTION public.get_user_growth(integer)                                                   SET search_path = 'public';
ALTER FUNCTION public.get_top_users(integer)                                                     SET search_path = 'public';
ALTER FUNCTION public.get_entry_type_breakdown()                                                 SET search_path = 'public';
ALTER FUNCTION public.get_premium_breakdown()                                                    SET search_path = 'public';
ALTER FUNCTION public.get_promo_stats()                                                          SET search_path = 'public';
ALTER FUNCTION public.get_domain_stats()                                                         SET search_path = 'public';
ALTER FUNCTION public.get_daily_email_counts(integer)                                            SET search_path = 'public';
ALTER FUNCTION public.get_email_count_by_type()                                                  SET search_path = 'public';

-- Groups
ALTER FUNCTION public.admin_get_groups()                                                         SET search_path = 'public';
ALTER FUNCTION public.admin_update_group(text, integer)                                          SET search_path = 'public';
ALTER FUNCTION public.get_group_analytics(text, uuid, text, text)                               SET search_path = 'public';
ALTER FUNCTION public.get_group_member_entries(text, uuid, uuid, text, text)                    SET search_path = 'public';
ALTER FUNCTION public.get_group_members_summary(text, uuid)                                     SET search_path = 'public';

-- User data
ALTER FUNCTION public.get_user_analytics(uuid, text, text, text)                                SET search_path = 'public';
ALTER FUNCTION public.get_user_own_stats(uuid)                                                   SET search_path = 'public';
ALTER FUNCTION public.has_changes_since(uuid, timestamp with time zone)                         SET search_path = 'public';
ALTER FUNCTION public.get_today_total_duration(uuid, text)                                      SET search_path = 'public';
ALTER FUNCTION public.get_dashboard_bootstrap_data(uuid, text, text)                            SET search_path = 'public';

-- Earnings & exports
ALTER FUNCTION public.get_earnings_report(uuid, text, text, text)                               SET search_path = 'public';
ALTER FUNCTION public.get_user_export_role(uuid)                                                 SET search_path = 'public';
ALTER FUNCTION public.track_export_usage(uuid, text, text)                                      SET search_path = 'public';
ALTER FUNCTION public.get_user_export_quota(uuid, text)                                         SET search_path = 'public';

-- API quotas
ALTER FUNCTION public.check_api_quota(uuid, text, text)                                         SET search_path = 'public';
ALTER FUNCTION public.get_user_api_quotas(uuid, text)                                           SET search_path = 'public';
ALTER FUNCTION public.get_all_api_quota_limits()                                                 SET search_path = 'public';
ALTER FUNCTION public.upsert_api_quota_limit(text, text, integer)                               SET search_path = 'public';

-- Promo codes
ALTER FUNCTION public.redeem_promo(text, uuid)                                                   SET search_path = 'public';

-- Auth / user lifecycle triggers
ALTER FUNCTION public.handle_new_user()                                                          SET search_path = 'public';
ALTER FUNCTION public.handle_new_user_subscription()                                             SET search_path = 'public';
ALTER FUNCTION public.set_updated_at()                                                           SET search_path = 'public';

-- Legacy helpers (in live DB from earlier migrations)
ALTER FUNCTION public.is_premium(uuid)                                                           SET search_path = 'public';
ALTER FUNCTION public.check_domain_whitelist(text)                                               SET search_path = 'public';
