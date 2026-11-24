-- ============================================================
-- Aruna Textile — coupon / discount migration
-- Safe to run on the LIVE database: every statement is idempotent
-- (add column if not exists + create or replace function).
--
-- What it does:
--   1. Adds `discount` (int) + `coupon` (text) columns to public.orders.
--   2. Replaces public.create_order so it accepts an optional
--      discount + coupon and computes total = subtotal + shipping - discount.
--
-- Run this in the Supabase SQL Editor, then redeploy the API so the
-- server-side createCheckout (which now sends discount/coupon) matches.
-- ============================================================

-- ── 1. new columns ──
alter table public.orders add column if not exists discount integer not null default 0;
alter table public.orders add column if not exists coupon text;

-- ── 2. discount-aware create_order ──
create or replace function public.create_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  it jsonb;
  prod public.products;
  qty int;
  lines jsonb := '[]'::jsonb;
  sub int := 0;
  ship int;
  disc int;
  total int;
  no text;
  oid uuid;
begin
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 or jsonb_array_length(p->'items') > 50 then
    raise exception 'Your bag is empty.';
  end if;
  if coalesce(trim(p#>>'{customer,name}'), '') = ''
     or coalesce(trim(p#>>'{customer,email}'), '') !~ '^\S+@\S+\.\S+$'
     or length(regexp_replace(coalesce(p#>>'{customer,phone}', ''), '\D', '', 'g')) < 10
     or coalesce(trim(p#>>'{address,pin}'), '') !~ '^\d{6}$'
  then
    raise exception 'Please complete your details and address (6-digit PIN).';
  end if;

  ship := coalesce((p->>'shipping')::int, 0);

  for it in select * from jsonb_array_elements(p->'items') loop
    qty := greatest(1, least(50, coalesce((it->>'qty')::int, 1)));
    select * into prod from public.products where slug = it->>'slug' and status = 'published' for update;
    if not found then
      raise exception 'An item in your bag is no longer available. Please remove it and try again.';
    end if;
    update public.products
       set data = jsonb_set(data, '{stock}', to_jsonb(greatest(0, coalesce((data->>'stock')::int, 0) - qty))),
           updated_at = now()
      where id = prod.id;
    lines := lines || jsonb_build_object(
      'slug', prod.slug, 'name', prod.data->>'name', 'technique', prod.data->>'technique',
      'size', it->>'size', 'qty', qty, 'price', (prod.data->>'price')::int, 'image', prod.data->>'image');
    sub := sub + qty * (prod.data->>'price')::int;
  end loop;

  no := 'ARN-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
  disc := greatest(0, coalesce((p->>'discount')::int, 0));
  -- never discount below the shipping already charged; keep total at least the shipping
  total := greatest(sub + ship - disc, ship);

  insert into public.orders (order_no, status, customer, address, items, subtotal, shipping, discount, coupon, total, payment_method, note)
  values (
    no,
    case when p->>'payment' = 'cod' then 'placed' else 'awaiting_payment' end,
    jsonb_build_object('name', trim(p#>>'{customer,name}'), 'email', trim(p#>>'{customer,email}'), 'phone', trim(p#>>'{customer,phone}')),
    jsonb_build_object('line1', p#>>'{address,line1}', 'line2', p#>>'{address,line2}', 'city', p#>>'{address,city}', 'state', p#>>'{address,state}', 'pin', p#>>'{address,pin}'),
    lines, sub, ship, disc, p->>'coupon', total,
    case when p->>'payment' = 'cod' then 'cod' else 'online' end,
    left(p->>'note', 1000)
  ) returning id into oid;

  insert into public.order_events (order_id, status, note)
  values (oid, case when p->>'payment' = 'cod' then 'placed' else 'awaiting_payment' end,
          case when p->>'payment' = 'cod' then 'Cash on Delivery order placed' else 'Order placed — awaiting online payment' end);

  return jsonb_build_object('id', oid, 'order_no', no, 'total', total, 'subtotal', sub, 'discount', disc, 'coupon', p->>'coupon');
end
$$;

-- ── 3. let owners read the new columns too (no-op if the read policy already grants *) ──
-- The existing "owners read own orders" select policy already covers new columns,
-- so no policy change is required. (Included here as a note only.)
