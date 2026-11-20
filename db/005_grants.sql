-- Aruna Textile — privilege grants (run in Supabase SQL Editor AFTER schema.sql).
--
-- Symptom this fixes: the API (service_role key) gets 403 "permission denied for
-- table products" and the storefront stalls on "Loading the collection…".
-- Some Supabase projects don't auto-grant table privileges to anon/service_role,
-- so the tables exist but the API can't touch them.
--
-- Safe to re-run.

grant usage on schema public to anon, authenticated, service_role;

-- public reads (catalogue + settings)
grant select on public.products, public.posts, public.settings to anon, authenticated, service_role;

-- the API (service_role) writes/reads the rest
grant select, insert, update, delete on
  public.orders, public.order_events, public.refunds,
  public.payment_events, public.custom_orders
to service_role;

grant select, insert, update, delete on public.products, public.posts, public.settings to service_role;
grant select, insert on public.admins to service_role;

-- server functions (create_order, mark_order_paid, expire_unpaid_orders, …)
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

grant usage on all sequences in schema public to service_role;
