// Local seed catalogue used when the API is not reachable (offline / no backend yet).
// In production these rows come from Supabase Postgres via /api/products.
import type { Product, Technique, Category } from '../lib/types'

export const TECHNIQUES: Technique[] = ['Handtufted', 'Pitloom', 'Braided', 'Broadloom', 'Jacquard']
export const CATEGORIES: { name: Category; count: number; tile: string }[] = [
  { name: 'Rugs', count: 24, tile: 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/charcoal-weave-1000.webp' },
  { name: 'Carpets', count: 12, tile: 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/flatweave-rust-1000.webp' },
  { name: 'Cushion Covers', count: 18, tile: 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/braided-1000.webp' },
  { name: 'Throws', count: 10, tile: 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/leaf-olive-1000.webp' },
]
export const ALL_SIZES = ['2 × 3 ft', '3 × 5 ft', '5 × 7 ft', '6 × 9 ft']

const C = {
  beige: { name: 'Beige', hex: '#D9C7A7' },
  rust: { name: 'Rust', hex: '#B4562F' },
  taupe: { name: 'Taupe', hex: '#9C8B76' },
  charcoal: { name: 'Charcoal', hex: '#3A342D' },
  ivory: { name: 'Ivory', hex: '#F1EAD9' },
  olive: { name: 'Olive', hex: '#6B6B3B' },
}

export const seedProducts: Product[] = [
  {
    id: 'p1', slug: 'handcrafted-abstract-rug', name: 'Handcrafted Abstract Rug', technique: 'Handtufted', category: 'Rugs',
    price: 4999, image: 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/charcoal-weave-1000.webp',
    collection: 'Signature Collection',
    gallery: ['https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/coral-fold-1000.webp', 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/leaf-olive-1000.webp'],
    sizes: [{ label: '2 × 3 ft' }, { label: '3 × 5 ft', price: 4999 }, { label: '5 × 7 ft', price: 7499 }, { label: '6 × 9 ft', price: 11499 }],
    colours: [C.beige, C.rust, C.charcoal],
    stock: 30, blurb: 'Contemporary abstract design that brings warmth to your space.',
    description: 'A contemporary abstract hand-tufted rug with organic textured patterns, bringing warmth, depth and character to your space. Each rug is created with skill, patience and attention to detail.',
    published: true, featured: true, rating: 4.8, reviewCount: 36, tags: ['New Arrival'],
  },
  {
    id: 'p2', slug: 'abstract-textured-rug', name: 'Abstract Textured Rug', technique: 'Handtufted', category: 'Rugs',
    price: 4999, image: 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/leaf-olive-1000.webp',
    collection: 'Signature Collection',
    gallery: ['https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/charcoal-weave-2000.webp'],
    sizes: ALL_SIZES.map((label) => ({ label })), colours: [C.beige, C.ivory],
    stock: 22, blurb: 'Soft, layered pile with a modern abstract motif.',
    description: 'A contemporary abstract hand-tufted rug with organic textured patterns, bringing warmth, depth and character to your space.',
    published: true, featured: true, rating: 4.6, reviewCount: 21, tags: ['New Arrival'],
  },
  {
    id: 'p3', slug: 'heritage-weave-carpet', name: 'Heritage Weave Carpet', technique: 'Pitloom', category: 'Carpets',
    price: 12999, image: 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/flatweave-rust-1000.webp',
    gallery: ['https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/flatweave-rust-2000.webp'],
    sizes: ALL_SIZES.map((label) => ({ label })), colours: [C.rust, C.charcoal, C.olive],
    stock: 9, blurb: 'Classic collection — rich heritage patterns, hand-woven.',
    collection: 'Classic Collection',
    description: 'A classic heritage pitloom carpet with traditional motifs, hand-woven for depth and character.',
    published: true, rating: 4.9, reviewCount: 44, tags: ['Best Seller'],
  },
  {
    id: 'p4', slug: 'rust-woven-cushion', name: 'Rust Woven Cushion', technique: 'Handtufted', category: 'Cushion Covers',
    price: 1499, image: 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/braided-1000.webp',
    gallery: ['https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/braided-cord-1000.webp'],
    sizes: [{ label: 'Standard' }], colours: [C.rust, C.taupe],
    stock: 40, blurb: 'Home essentials — cosy rust cushion, woven by hand.',
    collection: 'Home Essentials',
    description: 'A cosy hand-tufted cushion in warm rust, an easy way to add texture and depth to any room.',
    published: true, rating: 4.7, reviewCount: 58, tags: ['Best Seller'],
  },
  {
    id: 'p5', slug: 'charcoal-broadloom', name: 'Charcoal Broadloom', technique: 'Broadloom', category: 'Rugs',
    price: 13500, image: 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/charcoal-weave-1000.webp',
    gallery: ['https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/charcoal-weave-2000.webp'],
    sizes: ALL_SIZES.map((label) => ({ label })), colours: [C.charcoal, C.ivory],
    stock: 20, blurb: 'Striated charcoal weave, low profile.',
    collection: 'Signature Collection',
    description: 'A low-profile charcoal broadloom with striated weave, ideal for modern, minimalist interiors.',
    published: true, rating: 4.5, reviewCount: 17,
  },
  {
    id: 'p6', slug: 'leaf-olive', name: 'Leaf Olive Throw', technique: 'Handtufted', category: 'Throws',
    price: 2100, image: 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/leaf-olive-1000.webp',
    gallery: ['https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/leaf-olive-2000.webp'],
    sizes: [{ label: 'One size' }], colours: [C.olive, C.beige],
    stock: 34, blurb: 'Olive leaf motif on a warm field, hand-tufted throw.',
    collection: 'Signature Collection',
    description: 'A warm hand-tufted throw with an olive leaf motif — a cosy accent for sofas and beds.',
    published: true, rating: 4.6, reviewCount: 12,
  },
  {
    id: 'p7', slug: 'braided-jute', name: 'Braided Jute Runner', technique: 'Braided', category: 'Rugs',
    price: 11900, image: 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/jute-braid-1000.webp',
    gallery: ['https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/jute-weave-1000.webp'],
    sizes: [{ label: '2 × 6 ft' }, { label: '2 × 8 ft' }], colours: [C.ivory, C.taupe],
    stock: 25, blurb: 'Ropey jute braid, coastal calm.',
    collection: 'Home Essentials',
    description: 'A hand-braided jute runner with a ropey texture — coastal calm for hallways and entryways.',
    published: true, rating: 4.4, reviewCount: 9,
  },
  {
    id: 'p8', slug: 'flatweave-rust', name: 'Rust Flatweave', technique: 'Pitloom', category: 'Carpets',
    price: 14200, image: 'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/flatweave-rust-1000.webp',
    gallery: ['https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/flatweave-rust-2000.webp'],
    sizes: ALL_SIZES.map((label) => ({ label })), colours: [C.rust, C.olive],
    stock: 14, blurb: 'Earthy rust pitloom, hand-knotted ends.',
    collection: 'Classic Collection',
    description: 'An earthy rust pitloom carpet with hand-knotted ends — rich colour and character.',
    published: true, rating: 4.5, reviewCount: 15,
  },
]

export const seedGallery = [
  'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/coral-fold-1000.webp',
  'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/leaf-olive-1000.webp',
  'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/sunburst-1000.webp',
  'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/jacquard-1000.webp',
  'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/floral-teal-1000.webp',
  'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/jute-weave-1000.webp',
  'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/warping-1000.webp',
  'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/samples-1000.webp',
  'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/coral-1000.webp',
  'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/flatweave-rust-1000.webp',
  'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/braided-1000.webp',
  'https://bdkvobfwmcdfngwzsjqm.supabase.co/storage/v1/object/public/aruna-images/images/hq/runner-1000.webp',
]

export const workshopReels = [
  { src: '/video/reel-tufting.mp4', label: 'Hand-Tufting' },
  { src: '/video/reel-outline.mp4', label: 'Tracing the Outline' },
  { src: '/video/reel-weaving.mp4', label: 'Weaving' },
  { src: '/video/reel-stitching.mp4', label: 'Cord Stitching' },
  { src: '/video/reel-threading.mp4', label: 'Threading the Stitcher' },
  { src: '/video/reel-shaping.mp4', label: 'Shaping by Hand' },
  { src: '/video/reel-finishing.mp4', label: 'Surface Finishing' },
  { src: '/video/reel-singeing.mp4', label: 'Sweep & Finish' },
]
