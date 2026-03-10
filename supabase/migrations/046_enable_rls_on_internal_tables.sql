-- Enable RLS on internal/service-role-only tables.
-- No policies are needed: SECURITY DEFINER functions and the service role
-- client bypass RLS automatically. Enabling RLS with zero policies denies
-- all direct PostgREST client access, which is the correct security posture.
--
-- stripe_events    — accessed only by the Stripe webhook handler (service role)
-- promo_redemptions — accessed only by redeem_promo() SECURITY DEFINER RPC
-- whitelisted_domains — accessed only by handle_new_user_subscription() trigger
--                       (SECURITY DEFINER) + get_domain_stats() RPC + admin service role

ALTER TABLE public.stripe_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelisted_domains ENABLE ROW LEVEL SECURITY;
