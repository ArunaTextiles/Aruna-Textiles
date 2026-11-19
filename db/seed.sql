-- Aruna Textile — seed catalogue.
-- Run AFTER schema.sql, and AFTER you've uploaded images to the Supabase storage
-- bucket `aruna-images` (server/scripts/upload-images.mjs). The image paths below
-- are Supabase public storage URLs — replace the bucket/project parts with your own,
-- or just point them at your CDN.
-- Re-runnable (upserts by slug).

insert into public.products (id, slug, status, data) values
  ('p-coral-tufted', 'coral-tufted', 'published', '{
    "name": "Coral Tufted", "technique": "Handtufted", "price": 18500,
    "image": "/aruna-images/hq/coral-1000.webp", "gallery": ["/aruna-images/hq/coral-2000.webp", "/aruna-images/hq/coral-pile-1000.webp"],
    "stock": 12, "blurb": "Sun-warm coral, hand-tufted in wool.", "featured": true
  }'::jsonb),
  ('p-floral-teal', 'floral-teal', 'published', '{
    "name": "Floral Teal", "technique": "Handtufted", "price": 24000,
    "image": "/aruna-images/hq/floral-teal-1000.webp", "gallery": ["/aruna-images/hq/floral-teal-2000.webp"],
    "stock": 8, "blurb": "Deep teal botanical, layered pile.", "featured": true
  }'::jsonb),
  ('p-grey-border', 'grey-border-flatweave', 'published', '{
    "name": "Grey Border Flatweave", "technique": "Pitloom", "price": 15750,
    "image": "/aruna-images/hq/grey-border-1000.webp", "gallery": ["/aruna-images/hq/grey-border-2000.webp"],
    "stock": 15, "blurb": "Crisp grey flatweave with a braided ivory border."
  }'::jsonb),
  ('p-jacquard-ivory', 'jacquard-ivory', 'published', '{
    "name": "Ivory Jacquard", "technique": "Jacquard", "price": 32000,
    "image": "/aruna-images/hq/jacquard-1000.webp", "gallery": ["/aruna-images/hq/jacquard-2000.webp", "/aruna-images/hq/jacquard-close-1000.webp"],
    "stock": 6, "blurb": "Ivory jacquard with hand-tied tassels.", "featured": true
  }'::jsonb),
  ('p-charcoal-broadloom', 'charcoal-broadloom', 'published', '{
    "name": "Charcoal Broadloom", "technique": "Broadloom", "price": 13500,
    "image": "/aruna-images/hq/charcoal-weave-1000.webp", "gallery": ["/aruna-images/hq/charcoal-weave-2000.webp"],
    "stock": 20, "blurb": "Striated charcoal weave, low profile."
  }'::jsonb),
  ('p-leaf-olive', 'leaf-olive', 'published', '{
    "name": "Leaf Olive", "technique": "Handtufted", "price": 21000,
    "image": "/aruna-images/hq/leaf-olive-1000.webp", "gallery": ["/aruna-images/hq/leaf-olive-2000.webp"],
    "stock": 9, "blurb": "Olive leaf motif on a warm field."
  }'::jsonb),
  ('p-braided-jute', 'braided-jute', 'published', '{
    "name": "Braided Jute", "technique": "Braided", "price": 11900,
    "image": "/aruna-images/hq/jute-braid-1000.webp", "gallery": ["/aruna-images/hq/jute-weave-1000.webp"],
    "stock": 25, "blurb": "Ropey jute braid, coastal calm."
  }'::jsonb),
  ('p-flatweave-rust', 'flatweave-rust', 'published', '{
    "name": "Rust Flatweave", "technique": "Pitloom", "price": 14200,
    "image": "/aruna-images/hq/flatweave-rust-1000.webp", "gallery": ["/aruna-images/hq/flatweave-rust-2000.webp"],
    "stock": 14, "blurb": "Earthy rust pitloom, hand-knotted ends."
  }'::jsonb)
on conflict (id) do update set
  data = excluded.data,
  status = excluded.status,
  updated_at = now();
