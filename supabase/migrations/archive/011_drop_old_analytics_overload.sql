-- ============================================================
-- Migration 011: Drop the old single-parameter overload of
-- get_user_analytics so Postgres can unambiguously resolve
-- calls to the new version (with optional date params).
--
-- Background: Migration 010 used CREATE OR REPLACE with a
-- different signature (added p_date_from / p_date_to), which
-- created a second overload instead of replacing the original.
-- Calling the RPC without the optional params now raises:
--   "Could not choose the best candidate function between:
--    public.get_user_analytics(p_user_id => uuid),
--    public.get_user_analytics(p_user_id => uuid, ...)"
-- ============================================================

DROP FUNCTION IF EXISTS public.get_user_analytics(uuid);
