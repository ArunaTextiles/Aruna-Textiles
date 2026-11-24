// Local smoke test for the catch-all Vercel function — run from repo root:
//   node scripts/smoke-api.mjs
// Loads server/.env into process.env, then invokes api/[...route].js with Web Requests.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const env = Object.fromEntries(
  readFileSync(path.join(root, 'server/.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
Object.assign(process.env, env)

const { default: fn } = await import('../api/[...route].js')

for (const u of ['/api/health', '/api/products', '/api/store/config', '/api/products/coral-tufted']) {
  const res = await fn(new Request(`http://localhost${u}`))
  const text = await res.text()
  console.log(`${u} -> ${res.status} (${text.length} chars) ${text.slice(0, 200).replace(/\n/g, ' ')}`)
}
