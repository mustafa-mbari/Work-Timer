-- Fix remaining "Function Search Path Mutable" warnings on legacy overloads.
-- Both functions have a 3-argument overload from earlier migrations that
-- still exists in the live DB alongside the current 4-argument version.
-- Migration 047 fixed the 4-arg versions; this fixes the 3-arg versions.

-- get_earnings_report without p_group_by (pre-024_earnings_to_tags)
ALTER FUNCTION public.get_earnings_report(uuid, text, text) SET search_path = 'public';

-- get_user_analytics without p_timezone (pre-040_consolidated_schema)
ALTER FUNCTION public.get_user_analytics(uuid, text, text) SET search_path = 'public';
