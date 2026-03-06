-- Migration 041: Remove duplicate constraints, indexes, and policies
-- that were left behind when migrations added newer equivalents.
--
-- These duplicates were discovered via pg_dump review and are purely
-- redundant — they cause no functional issues but add noise.

-- 1. sync_cursors: drop the original unique constraint (base schema name).
--    The migration-001 version (uq_sync_cursors_user_device) is kept.
ALTER TABLE public.sync_cursors
  DROP CONSTRAINT IF EXISTS sync_cursors_user_id_device_id_key;

-- 2. subscriptions: drop the original SELECT policy (base schema name).
--    The migration-033 version (subscriptions_select_own) is kept.
DROP POLICY IF EXISTS "Own subscription" ON public.subscriptions;

-- 3. promo_codes: drop the redundant unique index added by migrations.
--    The original unique constraint (promo_codes_code_key) already enforces
--    uniqueness on the code column.
DROP INDEX IF EXISTS public.idx_promo_codes_code;
