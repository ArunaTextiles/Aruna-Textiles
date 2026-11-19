// Local seed catalogue used when the API is not reachable (offline / no backend yet).
// In production these rows come from Supabase Postgres via /api/products.
import type { Product, Technique } from '../lib/types'

export const TECHNIQUES: Technique[] = ['Handtufted', 'Pitloom', 'Braided', 'Broadloom', 'Jacquard']

export const seedProducts: Product[] = [
  { id: 'p1', slug: 'coral-tufted', name: 'Coral Tufted', technique: 'Handtufted', price: 18500, image: '/images/hq/coral-1000.webp', gallery: ['/images/hq/coral-2000.webp', '/images/hq/coral-pile-1000.webp'], stock: 12, blurb: 'Sun-warm coral, hand-tufted in wool.', published: true, featured: true },
  { id: 'p2', slug: 'floral-teal', name: 'Floral Teal', technique: 'Handtufted', price: 24000, image: '/images/hq/floral-teal-1000.webp', gallery: ['/images/hq/floral-teal-2000.webp'], stock: 8, blurb: 'Deep teal botanical, layered pile.', published: true, featured: true },
  { id: 'p3', slug: 'grey-border-flatweave', name: 'Grey Border Flatweave', technique: 'Pitloom', price: 15750, image: '/images/hq/grey-border-1000.webp', gallery: ['/images/hq/grey-border-2000.webp'], stock: 15, blurb: 'Crisp grey flatweave with braided ivory border.', published: true },
  { id: 'p4', slug: 'jacquard-ivory', name: 'Ivory Jacquard', technique: 'Jacquard', price: 32000, image: '/images/hq/jacquard-1000.webp', gallery: ['/images/hq/jacquard-2000.webp', '/images/hq/jacquard-close-1000.webp'], stock: 6, blurb: 'Ivory jacquard with hand-tied tassels.', published: true, featured: true },
  { id: 'p5', slug: 'charcoal-broadloom', name: 'Charcoal Broadloom', technique: 'Broadloom', price: 13500, image: '/images/hq/charcoal-weave-1000.webp', gallery: ['/images/hq/charcoal-weave-2000.webp'], stock: 20, blurb: 'Striated charcoal weave, low profile.', published: true },
  { id: 'p6', slug: 'leaf-olive', name: 'Leaf Olive', technique: 'Handtufted', price: 21000, image: '/images/hq/leaf-olive-1000.webp', gallery: ['/images/hq/leaf-olive-2000.webp'], stock: 9, blurb: 'Olive leaf motif on a warm field.', published: true },
  { id: 'p7', slug: 'braided-jute', name: 'Braided Jute', technique: 'Braided', price: 11900, image: '/images/hq/jute-braid-1000.webp', gallery: ['/images/hq/jute-weave-1000.webp'], stock: 25, blurb: 'Ropey jute braid, coastal calm.', published: true },
  { id: 'p8', slug: 'flatweave-rust', name: 'Rust Flatweave', technique: 'Pitloom', price: 14200, image: '/images/hq/flatweave-rust-1000.webp', gallery: ['/images/hq/flatweave-rust-2000.webp'], stock: 14, blurb: 'Earthy rust pitloom, hand-knotted ends.', published: true },
]

export const seedGallery = [
  '/images/hq/coral-fold-1000.webp',
  '/images/hq/leaf-olive-1000.webp',
  '/images/hq/sunburst-1000.webp',
  '/images/hq/jacquard-1000.webp',
  '/images/hq/floral-teal-1000.webp',
  '/images/hq/jute-weave-1000.webp',
  '/images/hq/warping-1000.webp',
  '/images/hq/samples-1000.webp',
  '/images/hq/coral-1000.webp',
  '/images/hq/flatweave-rust-1000.webp',
  '/images/hq/braided-1000.webp',
  '/images/hq/runner-1000.webp',
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
