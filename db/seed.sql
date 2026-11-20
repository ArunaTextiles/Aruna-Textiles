-- Aruna Textile — seed catalogue (pure SQL, no psql meta-commands).
-- Run AFTER schema.sql AND after uploading images to the `aruna-images` bucket
-- (the upload script puts them at <bucket>/images/hq/…).
-- Re-runnable (upserts by id).

with vars(prefix) as (
  values ('https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/')
)
insert into public.products (id, slug, status, data)
select * from (
  select 'p-coral-tufted','coral-tufted','published',
    jsonb_build_object('name','Coral Tufted','technique','Handtufted','price',18500,
      'image', prefix||'coral-1000.webp',
      'gallery', to_jsonb(ARRAY[ prefix||'coral-2000.webp', prefix||'coral-pile-1000.webp' ]),
      'stock',12,'blurb','Sun-warm coral, hand-tufted in wool.','featured',true)::jsonb
  from vars
  union all
  select 'p-floral-teal','floral-teal','published',
    jsonb_build_object('name','Floral Teal','technique','Handtufted','price',24000,
      'image', prefix||'floral-teal-1000.webp',
      'gallery', to_jsonb(ARRAY[ prefix||'floral-teal-2000.webp' ]),
      'stock',8,'blurb','Deep teal botanical, layered pile.','featured',true)::jsonb
  from vars
  union all
  select 'p-grey-border','grey-border-flatweave','published',
    jsonb_build_object('name','Grey Border Flatweave','technique','Pitloom','price',15750,
      'image', prefix||'grey-border-1000.webp',
      'gallery', to_jsonb(ARRAY[ prefix||'grey-border-2000.webp' ]),
      'stock',15,'blurb','Crisp grey flatweave with a braided ivory border.')::jsonb
  from vars
  union all
  select 'p-jacquard-ivory','jacquard-ivory','published',
    jsonb_build_object('name','Ivory Jacquard','technique','Jacquard','price',32000,
      'image', prefix||'jacquard-1000.webp',
      'gallery', to_jsonb(ARRAY[ prefix||'jacquard-2000.webp', prefix||'jacquard-close-1000.webp' ]),
      'stock',6,'blurb','Ivory jacquard with hand-tied tassels.','featured',true)::jsonb
  from vars
  union all
  select 'p-charcoal-broadloom','charcoal-broadloom','published',
    jsonb_build_object('name','Charcoal Broadloom','technique','Broadloom','price',13500,
      'image', prefix||'charcoal-weave-1000.webp',
      'gallery', to_jsonb(ARRAY[ prefix||'charcoal-weave-2000.webp' ]),
      'stock',20,'blurb','Striated charcoal weave, low profile.')::jsonb
  from vars
  union all
  select 'p-leaf-olive','leaf-olive','published',
    jsonb_build_object('name','Leaf Olive','technique','Handtufted','price',21000,
      'image', prefix||'leaf-olive-1000.webp',
      'gallery', to_jsonb(ARRAY[ prefix||'leaf-olive-2000.webp' ]),
      'stock',9,'blurb','Olive leaf motif on a warm field.')::jsonb
  from vars
  union all
  select 'p-braided-jute','braided-jute','published',
    jsonb_build_object('name','Braided Jute','technique','Braided','price',11900,
      'image', prefix||'jute-braid-1000.webp',
      'gallery', to_jsonb(ARRAY[ prefix||'jute-weave-1000.webp' ]),
      'stock',25,'blurb','Ropey jute braid, coastal calm.')::jsonb
  from vars
  union all
  select 'p-flatweave-rust','flatweave-rust','published',
    jsonb_build_object('name','Rust Flatweave','technique','Pitloom','price',14200,
      'image', prefix||'flatweave-rust-1000.webp',
      'gallery', to_jsonb(ARRAY[ prefix||'flatweave-rust-2000.webp' ]),
      'stock',14,'blurb','Earthy rust pitloom, hand-knotted ends.')::jsonb
  from vars
) p
on conflict (id) do update set
  data = excluded.data,
  status = excluded.status,
  updated_at = now();
