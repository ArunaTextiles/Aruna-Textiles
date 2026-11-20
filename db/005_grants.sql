-- Aruna Textile — privilege grants (run in Supabase SQL Editor AFTER schema.sql).
--
-- Symptom this fixes: the API (service_role key) gets 403 "permission denied for
-- table products" and the storefront stalls on "Loading the collection…".
--
-- Written to be CONDITIONAL: it grants on each table/function only if it already
-- exists, so it will NOT fail on a project where some tables weren't created.
-- Safe to re-run.

grant usage on schema public to anon, authenticated, service_role;

do $$
declare
  t text;
begin
  foreach t in array array[
    'products','posts','settings',
    'orders','order_events','refunds','payment_events','custom_orders','admins'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute 'grant select on table public.' || t || ' to anon, authenticated, service_role';
      execute 'grant select, insert, update, delete on table public.' || t || ' to service_role';
    end if;
  end loop;
end
$$;

-- server functions (create_order, mark_order_paid, expire_unpaid_orders, …)
do $$
begin
  grant execute on all functions in schema public to anon, authenticated, service_role;
end
$$;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

do $$
begin
  grant usage on all sequences in schema public to service_role;
end
$$;
