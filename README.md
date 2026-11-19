# Aruna Textile — Full-Stack Production Build

Conversion of the static `index.html` site into a production web application.

```
aruna-fullstack/
├── coming-soon/  Single self-contained "Coming Soon" page (deploy now)
├── client/   React 18 + TypeScript + Vite storefront
│   ├── src/pages/        Home, Shop, Product, Checkout, Account, Admin, Contact
│   ├── src/components/   Nav, Hero, CartDrawer, CustomizeModal, Lightbox, …
│   ├── src/context/      Cart (localStorage) + Auth (Supabase email-OTP)
│   ├── src/lib/          api client, razorpay loader, supabase client
│   └── public/           images/ + video/ (source media, 37 MB)
├── server/   Node + Express API (the backend)
│   ├── src/              app, config, db (Supabase REST), checkout, orders,
│   │                     razorpay, email (Brevo)
│   └── scripts/          upload-images.mjs (pushes media to Supabase storage)
└── db/       Supabase Postgres (the database)
    ├── schema.sql        tables + RLS + server functions
    └── seed.sql          starting catalogue
```

## Stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React + TypeScript + Vite, react-router, Supabase JS |
| Backend   | Node.js + Express |
| Database  | Supabase Postgres (via Supabase REST, service-role key) |
| Auth      | Supabase Auth (email OTP for customers, admin list for staff) |
| Payments  | Razorpay (orders, verify, webhook, refunds) |
| Email     | Brevo transactional API |
| Images    | Supabase Storage (bucket `aruna-images`) |
| Shipping  | Flat fee now — **Shiprocket stubbed** (`pushToShiprocket`) until you confirm |

## 0. Coming Soon page (deploy while the app is still in development)

`coming-soon/` is a single self-contained page that carries the exact Aruna
ivory/white design (tokens + fonts pulled from `index.html`). No build step,
no dependencies.

- **Local:** just open `coming-soon/index.html`, or `python -m http.server` in that folder.
- **Netlify / Vercel / GitHub Pages:** drag the `coming-soon` folder (or publish it
  as the site root) — it's plain static HTML/CSS/JS, nothing to configure.
- **Waitlist:** submissions are stored in `localStorage`. To actually capture
  them, set `NOTIFY_ENDPOINT` at the top of the `<script>` block (e.g. a Formspree
  or Supabase table-insert URL). Until the app ships you can point your domain
  at this page, then switch it to the built `client/` + `server/` app.

## 1. Set up Supabase (database + images + auth)

1. Create a project at https://supabase.com.
2. **SQL Editor → New query**: run `db/schema.sql` top to bottom.
3. **Storage → New bucket**: create `aruna-images` (public).
   Then from `server/`: `npm install`, set your env (below), and `npm run db:upload-images`.
4. **Auth → Providers → Email**: keep "Confirm email" off so first-time OTP users
   sign in without confirmation. Add your own Supabase Auth user, then insert it
   into `public.admins` (SQL Editor):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@yourdomain.com';
   ```
5. Copy the **anon key** (Settings → API) for the client and the
   **service_role key** for the server.
6. Run `db/seed.sql`, then fix the image paths in the rows to your storage URL
   (or set `SUPABASE_IMAGE_BUCKET` and have the server rewrite the `/aruna-images/…`
   paths to the CDN).

## 2. Backend — two ways to run it (your choice)

The API logic lives once, in `server/src/*.js` (db, checkout, razorpay, email,
orders). It's exposed two ways so you can start on either and switch later:

### A. Serverless on Vercel (recommended — zero extra hosting)
Everything ships in **one Vercel project**: the static storefront (`client/dist`)
+ the API (`api/*.js` functions) + the daily cron.

```
api/          ← Vercel Functions (Web API) wrapping the shared server/src modules
vercel.json   ← build the client, serve client/dist, SPA rewrites, /api cache headers,
                cron 30 3 * * * → /api/cron/daily
package.json  ← root: the build tooling + `npm run build` (what Vercel runs)
```

1. Push this folder to GitHub, import the repo on Vercel (Framework: Other)
2. Add the **Environment Variables** (same list as below): `SUPABASE_URL`,
   `SUPABASE_SECRET_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
   `RAZORPAY_WEBHOOK_SECRET`, `BREVO_API_KEY`, `MAIL_FROM_EMAIL`,
   `MAIL_FROM_NAME`, `ADMIN_NOTIFY_EMAIL`, `CRON_SECRET` (any random string),
   and the **build-time** vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_RAZORPAY_KEY_ID` (leave `VITE_API_URL` empty — API is same-origin)
3. Deploy. The Razorpay webhook URL is then `https://<your-domain>/api/webhooks/razorpay`.
   Vercel Cron runs `/api/cron/daily` (guarded by `CRON_SECRET`) daily.

Verified locally: every function in `api/` passes a Web-Request smoke test, and
`npm run build` (root) produces `client/dist` exactly as `vercel.json` expects.

### B. Persistent Node/Express on Render/Railway (your "safe side")
```bash
cd server
cp .env.example .env      # fill in Supabase, Razorpay, Brevo keys
npm install
npm run dev               # → http://localhost:4000  (health at /health)
```
Then set `VITE_API_URL=https://your-api-host` in the client and deploy the client
static build to Vercel/Netlify.

**Both paths share the same modules and the same database — switching is just
repointing the deploy; no code change.**

## 3. Client (frontend)

```bash
cd client
cp .env.example .env.local
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_RAZORPAY_KEY_ID
npm install
npm run dev               # → http://localhost:5173  (proxies /api → :4000)
```

## 4. Shiprocket (later, when you confirm)

The integration point is already in place:
- `server/src/checkout.js` → `pushToShiprocket(orderId)` (returns `{skipped:true}` now)
- `server/src/config.js` → add `shiprocket: { email, password, pickupPincode, … }`
- Add `SHIPOCKET_*` env vars, implement `createShipment`/`assignAwb`/webhook the same
  way the reference `shiprocket.js` does, and flip `pushToShiprocket` to the real call.

## API surface

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/products` | published catalogue (?technique=&q=) |
| GET | `/api/products/:slug` | single product |
| POST | `/api/checkout` | create order (+ Razorpay order for online) |
| POST | `/api/checkout/verify` | confirm payment (checkout callback) |
| POST | `/api/checkout/retry` | reopen an unpaid order's payment (signed in) |
| POST | `/api/shipping/rates` | live shipping quote for the cart + PIN |
| POST | `/api/custom-order` | save a "Design & Customize" request |
| POST | `/api/webhooks/razorpay` | Razorpay events (signature-checked) |
| GET | `/api/admin/orders` · `custom-orders` | admin lists (admin JWT) |
| POST | `/api/admin/order` | status / refund / info |
| POST | `/api/admin/products` | upsert a product |
| GET | `/api/auth/verify` | check a customer JWT |

All money and stock is computed on the server (`db` prices, `create_order` function);
the browser only sends slugs + quantities.
