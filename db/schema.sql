-- ============================================================
-- Aruna Textile — full-stack schema (Supabase Postgres)
-- Run in Supabase: Dashboard > SQL Editor > New query > paste all > Run.
-- Safe to re-run (IF NOT EXISTS / OR REPLACE).
--
-- The Express API uses the service-role key, so RLS is off for
-- server writes. Browser reads use the anon key with the policies
-- below (published products only).
-- ============================================================

-- ─────────── admins ───────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select using (user_id = auth.uid());

-- ─────────── products ───────────
-- Full editable record lives in data (jsonb); indexed columns drive visibility.
create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists products_status_idx on public.products (status);

alter table public.products enable row level security;
drop policy if exists "public reads published products" on public.products;
create policy "public reads published products" on public.products for select using (status = 'published' or public.is_admin());
drop policy if exists "admins write products" on public.products;
create policy "admins write products" on public.products for all using (public.is_admin()) with check (public.is_admin());

-- ─────────── settings (maintenance mode etc.) ───────────
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
drop policy if exists "public reads settings" on public.settings;
create policy "public reads settings" on public.settings for select using (true);

-- ─────────── orders ───────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned')),
  customer jsonb not null,      -- { name, email, phone }
  address jsonb not null,       -- { line1, line2, city, state, pin }
  items jsonb not null,         -- [{ slug, name, technique, size, qty, price, image }]
  subtotal integer not null,
  shipping integer not null default 0,
  total integer not null,
  payment_method text,          -- 'online' | 'cod'
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'partially_refunded', 'refunded', 'failed', 'cod')),
  razorpay_order_id text,
  razorpay_payment_id text,
  payment_attempts integer not null default 0,
  last_payment_error text,
  user_id uuid references auth.users (id) on delete set null,
  courier text,
  tracking_no text,
  awb text,
  tracking_url text,
  note text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_rz_idx on public.orders (razorpay_order_id);

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

alter table public.orders enable row level security;
alter table public.order_events enable row level security;
drop policy if exists "admins manage orders" on public.orders;
create policy "admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "owners read own orders" on public.orders;
create policy "owners read own orders" on public.orders for select using (user_id = auth.uid());
drop policy if exists "admins manage order events" on public.order_events;
create policy "admins manage order events" on public.order_events for all using (public.is_admin()) with check (public.is_admin());

-- ─────────── refunds ───────────
create table if not exists public.refunds (
  id text primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  razorpay_refund_id text,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  reason text,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.refunds enable row level security;
drop policy if exists "admins manage refunds" on public.refunds;
create policy "admins manage refunds" on public.refunds for all using (public.is_admin()) with check (public.is_admin());

alter table public.orders add column if not exists refunded_amount integer not null default 0;

-- ─────────── payment events (webhook de-dupe + audit) ───────────
create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  event_id text not null unique,
  order_id uuid,
  type text,
  payment_id text,
  amount_paise bigint,
  payload jsonb,
  created_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;

-- ─────────── custom rug requests ───────────
create table if not exists public.custom_orders (
  id uuid primary key default gen_random_uuid(),
  technique text, shape text, width text, length text, unit text,
  quantity text, material text, project text, colours text, idea text,
  name text not null, email text not null, phone text, country text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.custom_orders enable row level security;
drop policy if exists "public creates custom orders" on public.custom_orders;
create policy "public creates custom orders" on public.custom_orders for insert with check (true);
drop policy if exists "admins manage custom orders" on public.custom_orders;
create policy "admins manage custom orders" on public.custom_orders for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
--  SERVER FUNCTIONS (called by the Express API with the service key)
-- ============================================================

-- Create the order atomically: prices + stock from the products table, never the browser.
create or replace function public.create_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  it jsonb;
  prod public.products;
  qty int;
  lines jsonb := '[]'::jsonb;
  sub int := 0;
  ship int;
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

  insert into public.orders (order_no, status, customer, address, items, subtotal, shipping, total, payment_method, note)
  values (
    no,
    case when p->>'payment' = 'cod' then 'placed' else 'awaiting_payment' end,
    jsonb_build_object('name', trim(p#>>'{customer,name}'), 'email', trim(p#>>'{customer,email}'), 'phone', trim(p#>>'{customer,phone}')),
    jsonb_build_object('line1', p#>>'{address,line1}', 'line2', p#>>'{address,line2}', 'city', p#>>'{address,city}', 'state', p#>>'{address,state}', 'pin', p#>>'{address,pin}'),
    lines, sub, ship, sub + ship,
    case when p->>'payment' = 'cod' then 'cod' else 'online' end,
    left(p->>'note', 1000)
  ) returning id into oid;

  insert into public.order_events (order_id, status, note)
  values (oid, case when p->>'payment' = 'cod' then 'placed' else 'awaiting_payment' end,
          case when p->>'payment' = 'cod' then 'Cash on Delivery order placed' else 'Order placed — awaiting online payment' end);

  return jsonb_build_object('id', oid, 'order_no', no, 'total', sub + ship, 'subtotal', sub);
end
$$;

-- Mark an online order paid (idempotent; returns whether it was already paid / late).
create or replace function public.mark_order_paid(p_razorpay_order text, p_payment_id text, p_amount_paise bigint default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  late boolean;
begin
  select * into o from public.orders where razorpay_order_id = p_razorpay_order for update;
  if not found then raise exception 'Order not found for that payment.'; end if;

  late := o.status = 'cancelled' or o.status = 'delivered';
  if o.payment_status = 'paid' then
    return jsonb_build_object('already', true, 'late', late, 'order_no', o.order_no, 'id', o.id);
  end if;

  update public.orders
     set payment_status = 'paid', razorpay_payment_id = p_payment_id,
         status = case when o.status = 'awaiting_payment' then 'placed' else o.status end,
         updated_at = now()
    where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, o.status, 'Payment captured via Razorpay (' || p_payment_id || ')');
  return jsonb_build_object('already', false, 'late', late, 'order_no', o.order_no, 'id', o.id);
end
$$;

-- Expire unpaid online orders and release their held stock.
create or replace function public.expire_unpaid_orders(p_minutes int)
returns text
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  it jsonb;
begin
  for o in select * from public.orders
           where status = 'awaiting_payment'
             and created_at < now() - make_interval(mins => p_minutes)
           for update loop
    update public.orders set status = 'cancelled', updated_at = now() where id = o.id;
    insert into public.order_events (order_id, status, note) values (o.id, 'cancelled', 'Auto-cancelled: payment window expired');
    for it in select * from jsonb_array_elements(o.items) loop
      update public.products
         set data = jsonb_set(data, '{stock}', to_jsonb(coalesce((data->>'stock')::int, 0) + (it->>'qty')::int)),
             updated_at = now()
       where slug = it->>'slug';
    end loop;
  end loop;
  return 'ok';
end
$$;

-- Record a failed payment attempt.
create or replace function public.record_payment_failure(p_razorpay_order text, p_payment_id text, p_error text)
returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where razorpay_order_id = p_razorpay_order for update;
  if found and o.payment_status = 'pending' then
    update public.orders
       set payment_attempts = payment_attempts + 1, last_payment_error = p_error,
           payment_status = case when o.payment_attempts = 0 then 'failed' else o.payment_status end,
           updated_at = now()
      where id = o.id;
  end if;
end
$$;

-- Admin-driven status change (service key). Restores stock on cancel.
create or replace function public.server_set_order_status(p_order uuid, p_status text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  it jsonb;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found.'; end if;

  if p_status = 'cancelled' and o.status not in ('cancelled', 'returned') then
    for it in select * from jsonb_array_elements(o.items) loop
      update public.products
         set data = jsonb_set(data, '{stock}', to_jsonb(coalesce((data->>'stock')::int, 0) + (it->>'qty')::int)),
             updated_at = now()
       where slug = it->>'slug';
    end loop;
  end if;

  update public.orders set status = p_status, updated_at = now() where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, p_status, coalesce(p_note, 'Status changed by admin'));
  return jsonb_build_object('from', o.status, 'to', p_status, 'id', o.id);
end
$$;

-- Link an order to the signed-in customer ("My orders").
create or replace function public.attach_order_user(p_order uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set user_id = p_user where id = p_order;
end
$$;

-- Roll up refund records into the order's refunded_amount / payment_status.
create or replace function public.apply_refund_status(p_order uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  processed int;
  pending int;
  o public.orders;
begin
  select coalesce(sum(amount), 0) into processed from public.refunds where order_id = p_order and status = 'processed';
  select coalesce(sum(amount), 0) into pending from public.refunds where order_id = p_order and status = 'pending';
  select * into o from public.orders where id = p_order;
  if found then
    update public.orders
       set refunded_amount = processed,
           payment_status = case
             when processed + pending >= o.total then 'refunded'
             when processed > 0 then 'partially_refunded'::text
             else o.payment_status
           end,
       updated_at = now()
      where id = p_order;
  end if;
end
$$;

-- Public order tracking (anon key): order number + phone, no PII beyond first name.
create or replace function public.track_order(p_order_no text, p_phone text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'order_no', o.order_no, 'status', o.status, 'created_at', o.created_at, 'total', o.total,
    'payment_status', o.payment_status, 'courier', o.courier, 'awb', o.awb, 'tracking_url', o.tracking_url,
    'name', split_part(o.customer->>'name', ' ', 1),
    'items', (select jsonb_agg(jsonb_build_object('name', i->>'name', 'qty', i->'qty', 'image', i->>'image')) from jsonb_array_elements(o.items) i)
  )
  from public.orders o
  where o.order_no = p_order_no
    and regexp_replace(o.customer->>'phone', '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
  limit 1
$$;
