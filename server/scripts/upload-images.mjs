// Uploads the storefront's media (client/public/images, client/public/video) to a
// Supabase storage bucket so the live site serves images from the CDN instead of
// bundling them. Run from the server/ directory:
//
//   npm run db:upload-images
//
// Env (from server/.env): SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_IMAGE_BUCKET.
// Creates the bucket if missing (public) and uploads every file, preserving sub-paths.
import 'dotenv/config'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_PUBLIC = path.resolve(here, '../../client/public')
const BUCKET = process.env.SUPABASE_IMAGE_BUCKET || 'aruna-images'
const URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in server/.env first.')
  process.exit(1)
}

const auth = () => ({
  apikey: KEY,
  ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}),
})

// 1. ensure the bucket exists (public read so /images paths work without signing)
const b = await fetch(`${URL}/storage/v1/bucket`, {
  method: 'POST',
  headers: auth(),
  body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
})
if (!b.ok && b.status !== 400) console.error('bucket create:', b.status, await b.text())

// 2. walk client/public and upload every file
async function* walk(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    const rel = path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) yield* walk(full, rel)
    else yield [full, rel]
  }
}

let n = 0
for await (const [full, rel] of walk(CLIENT_PUBLIC)) {
  const buf = await readFile(full)
  const res = await fetch(`${URL}/storage/v1/object/${BUCKET}/${rel}`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/octet-stream' },
    body: buf,
  })
  if (!res.ok) console.error(`FAIL ${rel} → ${res.status}`)
  else n++
}
console.log(`\nUploaded ${n} files to "${BUCKET}".`)
console.log(`Public URL base: ${URL}/storage/v1/object/public/${BUCKET}`)
