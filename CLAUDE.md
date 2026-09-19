# MyWeddingDay

A wedding/pre-wedding/band-booking marketplace: Angular frontend + Express/PostgreSQL backend.

## Stack & Structure

```
MyWeddingDay/
├── backend/                  # Express API (Node.js)
│   ├── src/
│   │   ├── server.js         # entrypoint — express app, CORS, routes, listen
│   │   ├── config/database.js# pg Pool + auto-creates tables on boot (local dev convenience)
│   │   ├── config/google.js  # lazy Google OAuth2Client + circuit breaker around verifyIdToken
│   │   ├── config/redis.js   # lazy ioredis client — cache-aside, rate-limit store, JWT revocation
│   │   ├── config/logger.js  # pino structured logger (pretty-printed in dev)
│   │   ├── config/sentry.js  # lazy Sentry.init, no-op unless SENTRY_DSN is set
│   │   ├── config/metrics.js # prom-client counters/histograms + Express middleware
│   │   ├── middleware/auth.js# JWT auth (authenticate, requireOwner, requireBand) + revocation check
│   │   ├── middleware/upload.js # multer config for photo uploads (disk storage)
│   │   ├── middleware/rateLimit.js # Redis-backed express-rate-limit (falls back to in-memory)
│   │   ├── utils/circuitBreaker.js # opossum wrapper used by config/stripe.js callers + google.js
│   │   └── routes/
│   │       ├── auth.js       # POST /register, /login, /google, /logout
│   │       ├── venues.js     # CRUD for venues + meal plans (cached GETs)
│   │       ├── bands.js      # CRUD for band profiles (cached GETs)
│   │       ├── reviews.js    # ratings/comments on venues + bands (cached GET list)
│   │       ├── uploads.js    # POST /api/uploads — photo upload, returns a URL
│   │       ├── payments.js   # POST /api/payments/checkout — Stripe Checkout session
│   │       └── webhooks.js   # POST /api/webhooks/stripe — completes the payment
│   ├── migrations/            # node-pg-migrate files — see "Schema migrations" below
│   ├── scripts/migrate.js     # wraps node-pg-migrate, builds DATABASE_URL from DB_* env vars
│   ├── .env                  # DB creds, JWT secret, PORT (already present)
│   └── create-database.sql   # one-time `CREATE DATABASE` note for Postgres
├── web/                        # Angular 19 app
│   ├── src/environments/       # environment.ts (dev) / environment.prod.ts (prod apiUrl)
│   └── src/app/               # pages: home, login, register, dashboard,
│                               # weddings, prewedding, venue-detail, bands,
│                               # band-detail, about, help
├── docs/                       # er-diagram.md, system-design.pdf, etc.
├── docker-compose.yml          # Redis only — see "Caching & Redis" below
├── start-backend.bat          # cd backend && npm run dev
└── start-web.bat              # cd web && ng serve
```

Backend runs on **http://localhost:3000**, web dev server on **http://localhost:4200**.
CORS on the backend is locked to `http://localhost:4200`, and the Angular services call
`http://localhost:3000/api/...` directly (no proxy config) — keep these ports as-is unless
you update both `backend/src/server.js` (CORS origin) and the `apiUrl` in
`web/src/app/core/services/*.service.ts`.

## Prerequisites

- **Node.js** (v22 installed on this machine) + npm
- **Angular CLI** (`ng`) — installed globally or via `npx ng`
- **PostgreSQL** reachable at `localhost:5432` (see `backend/.env`). Postgres 16 is already
  installed and running as a Windows service (`postgresql-x64-16`) on this machine — no new
  install needed.

  ⚠️ **`backend/.env`'s `DB_PASSWORD` is a placeholder** (`CHANGE_ME_to_your_local_postgres_password`).
  Fill in the real password you set for the local `postgres` superuser when Postgres was
  installed — the backend will fail every DB call until this is a real password. You'll also
  need the `myweddingday` database to exist once:
  ```
  "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres myweddingday
  ```
  (or `CREATE DATABASE myweddingday;` from psql / pgAdmin). Tables are auto-created by the
  backend on first successful boot after that — no migrations to run manually for local dev
  (see "Schema migrations" under "System design additions" for the production-grade path).
- **Redis** (optional) — `docker compose up -d` from the project root (Docker Desktop must be
  running). Only needed for caching/rate-limiting/JWT revocation; the app runs fine without it,
  see "Caching & Redis" under "System design additions".

## Why Postgres (not the original MSSQL)

The app originally used SQL Server via the `mssql` npm package. Switched to PostgreSQL because:
- Managed Postgres hosting (Neon, Supabase, Railway) is meaningfully cheaper than managed SQL
  Server (Azure SQL) at hobby/low-traffic scale, and has genuinely usable free tiers.
- This machine already runs Postgres 16 locally — dev now matches whatever you host on.
- No stored procedures or SQL-Server-specific features were in use, so the queries translate
  to plain parameterized Postgres queries with no loss of functionality (`OUTPUT INSERTED.*` →
  `RETURNING *`, `IDENTITY` → `SERIAL`, T-SQL `CHECK`/`FOREIGN KEY` syntax is ANSI-compatible).
- This switch happened before any real data existed in either DB, so it was effectively free —
  don't repeat a DB migration like this once the app has live users/listings without a proper
  migration plan.

**Hosting decision (2026-09-19): everything on Railway**, one project, two services — chosen
over the earlier Vercel/Netlify-for-frontend split to keep a single platform to manage. Express
API + Postgres + Redis addons on one service; the Angular build served as static files by
`serve` (Vercel's static-file-server package, unrelated to Vercel hosting itself) on a second
service. See "Railway deployment" below for the actual setup. (Alternative still worth knowing:
Supabase for the DB if you ever want to drop the custom JWT auth/file upload in favor of its
built-in auth + storage — not necessary now.)

## First-time setup

```
cd backend && npm install
cd web     && npm install
```

## Running the app

**Option A — double-click the batch files** from the project root:
- `start-backend.bat` → `cd backend && npm run dev` (nodemon, auto-restarts on change)
- `start-web.bat` → `cd web && ng serve`

**Option B — manually, two terminals:**
```
# terminal 1
cd backend
npm run dev          # or: npm start (no auto-reload)

# terminal 2
cd web
ng serve              # or: npm start
```

Then open **http://localhost:4200**. Health check: **http://localhost:3000/api/health**.

## Backend environment (`backend/.env`)

| Var | Purpose | Current value |
|---|---|---|
| `PORT` | API port | 3000 |
| `JWT_SECRET` | token signing secret | placeholder — change for prod |
| `FRONTEND_URL` | CORS origin + Stripe checkout redirect URLs | `http://localhost:4200` — set to your real deployed frontend domain in production |
| `DB_HOST` / `DB_PORT` | Postgres host/port | localhost / 5432 |
| `DB_NAME` | database name | myweddingday |
| `DB_USER` / `DB_PASSWORD` | Postgres login | postgres / **placeholder, fill in real password** |
| `DB_SSL` | require TLS to DB | false locally; set `true` on most managed hosts |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe Checkout + webhook signature verification | empty placeholders — required for the "Feature listing" paid boost to work |
| `STRIPE_PRICE_ID` | optional specific Stripe Price object for the feature-listing fee | empty — falls back to an inline `price_data` amount if unset |
| `GOOGLE_CLIENT_ID` | Google Sign-In OAuth client ID | empty placeholder — see the Auth paragraph below |
| `UPLOAD_DIR` | where uploaded photos are saved | unset locally (defaults to `backend/uploads/`); set to a Railway Volume's mount path in production |
| `REDIS_URL` | caching / rate limiting / JWT revocation | `redis://localhost:6379` — `docker compose up -d` starts one; unset entirely and the app still works, just without those (see "Caching & Redis") |
| `SENTRY_DSN` | error tracking | empty — no-op until set, no external calls made |
| `LOG_LEVEL` | pino log verbosity | `info` |

## API surface (backend)

- `POST /api/auth/register` `{ email, password, full_name, role }` → `{ token, user }`
- `POST /api/auth/login` `{ email, password }` → `{ token, user }`
- `POST /api/auth/google` `{ credential, role? }` → `{ token, user }` — `credential` is the ID
  token from Google Identity Services on the frontend; `role` (`owner`/`band`) only matters for
  a brand-new account, ignored otherwise. Verified server-side with `google-auth-library` against
  `GOOGLE_CLIENT_ID`. Returns 503 if `GOOGLE_CLIENT_ID` isn't set yet.
- `POST /api/auth/logout` → blacklists the current token's `jti` in Redis until it naturally
  expires (auth required). No-op success if Redis isn't configured.
- Every route below is also reachable under `/api/v1/...` (see "API versioning").
- `GET  /api/venues?type=&search=&city=` → list (public)
- `GET  /api/venues/:id` → detail + meal plans (public)
- `POST /api/venues` → create (auth + `role: owner` required)
- `PUT  /api/venues/:id` → update own venue (owner only)
- `DELETE /api/venues/:id` → soft-delete own venue (owner only)
- `POST /api/venues/:id/meal-plans` → add meal plan to own venue (owner only)
- `GET  /api/venues/owner/my` → the logged-in owner's own venues
- `GET  /api/bands?search=&city=&genre=` → list (public)
- `GET  /api/bands/:id` → band profile detail (public)
- `POST /api/bands` → create (auth + `role: band` required, one profile per account — 409 if one already exists)
- `PUT  /api/bands/:id` → update own band profile (band role only)
- `DELETE /api/bands/:id` → soft-delete own band profile (band role only)
- `GET  /api/bands/owner/my` → the logged-in band's own profile (`null` if none yet)
- `GET  /api/reviews?venue_id=&band_id=` → `{ reviews, count, average }` for one listing (public)
- `GET  /api/reviews/mine?venue_id=&band_id=` → the logged-in user's own review for that listing, or `null` (auth required)
- `POST /api/reviews` `{ venue_id | band_id, rating, comment }` → creates the user's review, or
  updates it if they already left one (auth required, any role). 403 if you own the listing.
- `DELETE /api/reviews/:id` → delete your own review (auth required)
- `POST /api/uploads` `multipart/form-data, field "photo"` → `{ url }` (auth required, any role) —
  saves the file to disk and returns an absolute URL; the frontend then saves that URL into the
  venue/band's `image_url` field via the existing endpoints above. 5MB limit, JPEG/PNG/WEBP/GIF only.
- `POST /api/payments/checkout` `{ venue_id | band_id }` → `{ checkout_url }` (auth required,
  must own the listing) — starts a Stripe Checkout session for the flat one-time "feature this
  listing" fee. Redirect the browser to `checkout_url`.
- `POST /api/webhooks/stripe` — Stripe calls this, not the frontend. Verifies the signature and
  marks the listing `plan='featured'` on `checkout.session.completed`.
- `GET  /api/health` → `{ status: 'ok' }` (unversioned — infra, not product API)
- `GET  /metrics` → Prometheus scrape endpoint (unversioned, not under `/api`). Unauthenticated
  locally; restrict this to your monitoring network before deploying anywhere public.

Auth: JWT in `Authorization: Bearer <token>` header, 7-day expiry, roles are
`owner` | `visitor` | `band`. Users can authenticate with email+password, Google Sign-In, or
both — `Users.password_hash` is nullable for Google-only accounts, and `Users.google_id` links
an account once Google Sign-In has been used (whether that's a brand-new account or linking to
an existing password account with the same email). See `backend/src/config/google.js` and
`backend/src/routes/auth.js`'s `/google` route. Set `GOOGLE_CLIENT_ID` in `backend/.env` (from
a Web application OAuth client at console.cloud.google.com, with `http://localhost:4200` as an
Authorized JavaScript origin) and the same value in `web/src/app/core/services/auth.service.ts`'s
`GOOGLE_CLIENT_ID` constant — it's not a secret, no client secret is needed for this flow.

## Bands feature (added 2026-07-08)

Bands sign up the same way venue owners do — register with account type "Band" (role `band`),
then manage a single band profile (name, genre, city, price per event, phone, website, photo,
description) from `/dashboard`, which renders a band-specific view instead of the venues view
when `auth.currentUser.role === 'band'`. Visitors browse bands publicly at `/bands` (list,
searchable) and `/band/:id` (detail) — same UI patterns as Weddings/Venues, reusing the global
`venues-grid`/`venue-card`/`venue-detail` CSS classes in `styles.scss` rather than new ones.
Frontend: `core/services/band.service.ts`, `pages/bands/*`, `pages/band-detail/*`.

## Unified listing form (added 2026-07-08)

`/dashboard` has a single "Add/Edit Listing" modal (`dashboard.component.ts` — `listingForm`,
`openCreateForm`/`openEditVenueForm`/`openEditBandForm`/`submitListing`) that covers all three
listing types instead of two separately-coded modals:
- A `listing_type` control (`wedding` | `prewedding` | `band`) drives which fields show. Owner
  accounts get a Wedding Hall / Bachelor(ette) toggle; band accounts get the band fields only
  (the account's `role` still determines *which* types are even reachable — an `owner` account
  can't submit `listing_type: 'band'` and vice versa, enforced by `requireOwner`/`requireBand`
  on the backend).
- On submit, the form branches to `venueService` or `bandService` based on `listing_type` —
  **Venues and Bands are still two separate Postgres tables** (per the "keep separate tables"
  decision below); only the frontend form is unified, not the data model.
- If a future listing type is added, extend `listingForm`'s fields + the type toggle + the
  submit branch, following this same pattern rather than adding a third separate modal.

## Reviews (added 2026-09-17)

Any logged-in user (any role — `owner`, `band`, or `visitor`) can leave a rating (1-5) + comment
on a venue or band, but **cannot create a listing themselves without going through the
owner/band paywall** — commenting/rating and publishing a listing are separate permissions, not
a stepping stone from one to the other.
- One review per user per listing — submitting again edits the existing row instead of creating
  a duplicate (`backend/src/routes/reviews.js`, `POST /api/reviews` upserts). A listing's own
  owner can't review it (403).
- Reviews show immediately, no moderation queue — different from the anonymous/moderated
  `is_approved` version originally sketched in `docs/er-diagram.html`; that version is
  superseded now that reviews are tied to real accounts instead of free-text name/email.
- Frontend: `core/services/review.service.ts` + the reusable
  `shared/components/reviews-section` component, dropped into both `venue-detail` and
  `band-detail` pages via `[venueId]`/`[bandId]` inputs. Logged-out visitors see a "log in to
  review" prompt instead of the form.

## Photo upload (added 2026-09-17)

Owners and bands can upload a photo from the dashboard's listing form instead of only pasting
an `image_url`. The upload button still populates the same `image_url` text field underneath —
it's not a new column, just a nicer way to fill in the existing one — so pasting a URL directly
still works too.
- Backend: `backend/src/middleware/upload.js` configures `multer` (disk storage, 5MB limit,
  JPEG/PNG/WEBP/GIF only), `POST /api/uploads` (`backend/src/routes/uploads.js`) saves the file
  and returns an absolute URL built from the request's own host — works locally and once deployed
  without any hardcoded domain. Files are served back out via `express.static` mounted at `/uploads`
  in `server.js`.
- Frontend: `core/services/upload.service.ts` posts a `FormData` with a `photo` field; the
  dashboard's listing form (`dashboard.component.ts` — `onPhotoSelected`) wires a file `<input>`
  to it and patches `listingForm`'s `image_url` control with the returned URL on success, with a
  live thumbnail preview.
- **Railway note:** Railway's filesystem is ephemeral — anything written to disk is wiped on
  every redeploy/restart unless a **Volume** is attached to the backend service. Attach one,
  mount it at a path of your choice (e.g. `/data/uploads`), and set that same path as
  `UPLOAD_DIR` in the service's environment variables so uploaded photos persist. Locally,
  `UPLOAD_DIR` is unset and defaults to `backend/uploads/` (gitignored).
- No cloud storage account (S3, R2, etc.) needed for this — deliberately kept to local disk +
  a Railway Volume to avoid a new third-party dependency for a hobby-scale app. If storage needs
  outgrow a single Volume (e.g. multi-region, CDN-backed delivery), that's the point to revisit
  and swap in an object-storage bucket instead.

## Two user types (product model)

- **Visitors** (no signup/signin at all) — the "easy life" path. They land on `/deals`, filter
  by Wedding Hall / Bachelor(ette) / Band, and browse. Nothing on their path requires an account.
- **Vendors** (`owner` or `band` role, must sign up/sign in) — create a listing from `/dashboard`
  via the unified listing form, and — once the pay-to-publish flow below is built — pay via
  Stripe before that listing appears to visitors at all.

## Combined "Deals" page (added 2026-07-08)

`/deals` (`pages/deals/*`) is the single browse destination for visitors — it calls both
`venueService.getVenues()` and `bandService.getBands()`, tags each result with a `kind`
(`wedding`/`prewedding`/`band`), merges and sorts them (featured first, then newest), and
renders one grid. Three toggleable filter chips (Wedding Hall / Bachelor(ette) / Band, all
active by default) narrow the `kind`. Supports a `?type=` query param so other pages can deep
link into a pre-filtered view — the home page hero buttons and feature tiles do this.

Header nav shows **Deals** alongside the original **Weddings / Prewedding / Bands** links (all
four, `Deals` first) — Deals is the fast combined-browse option, the other three remain for
anyone who wants to go straight to one category.

The root route `'/'` uses `guestLandingGuard` (`core/guards/guest-landing.guard.ts`): a
non-authenticated visitor hitting `/` (whether that's `localhost:4200` locally or the real
domain once hosted) is redirected straight to `/deals` instead of seeing the `HomeComponent`
marketing page. Logged-in users (any role) still see Home at `/` as before — the guard only
intercepts guests. `HomeComponent` itself is unchanged and still reachable once logged in, or
directly at `/` for a logged-in session.

## Monetization — "Feature listing" paid boost (added 2026-09-17)

**Not full pay-to-publish yet** — per the user's decision, listings still publish immediately
and free (`is_active` defaults `true`, unchanged). What's implemented instead is the *post-publish
upsell* mentioned below: from `/dashboard`, an owner/band can pay a flat one-time fee ($9.99) to
mark their own listing `plan='featured'`, which is what already makes it sort first on
`/deals`/`/weddings`/`/bands` (`ORDER BY featured_until DESC NULLS LAST`) and show the ★ Featured
badge. No free tier vs. no free tier enforcement is a decision still fully open — see below.
- `POST /api/payments/checkout` (`backend/src/routes/payments.js`) — auth required, validates
  the caller owns the listing and it isn't already featured, writes a `Payments` row
  (`status='pending'`), creates a Stripe Checkout Session (uses `STRIPE_PRICE_ID` if set, else an
  inline `price_data` fallback so no Stripe Dashboard product setup is required to test), returns
  `{ checkout_url }` for the frontend to redirect to.
- `POST /api/webhooks/stripe` (`backend/src/routes/webhooks.js`) — mounted in `server.js` with
  `express.raw()` **before** the global `express.json()` (signature verification needs the exact
  raw body). On `checkout.session.completed`, flips the `Payments` row to `completed` and sets
  the venue/band's `plan='featured'` + `featured_until` ~100 years out (flat fee → "featured
  forever", not a real expiry — matches the pricing model decision below).
- `Payments` table now exists for real (`user_id`, exclusive `venue_id`/`band_id` FK like
  `Reviews`, `stripe_session_id`, `stripe_payment_intent_id`, `amount`, `currency`, `status`,
  `completed_at`) — this was previously just a proposal in `er-diagram.html`.
- Frontend: `core/services/payment.service.ts` + a "★ Feature (paid)" button on each dashboard
  listing card (hidden once already featured), which redirects to the returned Stripe Checkout
  URL. `dashboard.component.ts` reads `?payment=success`/`?payment=cancelled` on return and shows
  a message, then strips the query param.
- **Pricing/duration model decided:** flat one-time fee, no expiry (not the alternative
  time-limited "deal" model) — see `FEATURE_LISTING_PRICE_CENTS` in `payments.js` to change the price.
- **Still open, not yet decided:** whether to eventually enforce true "no free tier" (new listings
  insert `is_active=false` until paid) — deferred again at the user's request when this was built.
  If that gets picked up later, the webhook handler is the natural place to also flip `is_active`.

**AgentaOS was evaluated and explicitly rejected for this** — the user initially wanted both
Stripe and AgentaOS (as a local monetization option), but `@agentaos/pay` turned out to be a
stablecoin/crypto payment SDK (not card/subscription billing as its own docs page implied), and
the user chose to skip it once that was clear. Don't re-introduce it without asking again first.

Deliberately **not** using stored procedures for any of this — billing logic has to call Stripe
from application code regardless (webhooks, checkout sessions), so keeping it in the same JS
route handlers (rather than split between SQL procedures and JS) keeps it in one testable,
one-language place. See "Conventions" below.

## System design additions (added 2026-09-18)

Added for depth/interview-talking-points on top of the CRUD app above — every item here is a
deliberate choice with a documented tradeoff, not just "add the popular thing." Full writeup
with diagrams in `docs/system-design.pdf` (generated from `docs/system-design.html`) — this
section is the quick-reference version.

### Caching & Redis

- `docker compose up -d` (project root) starts a local Redis — see `docker-compose.yml`.
  Everything below is **optional infrastructure**: unset `REDIS_URL` (or let Redis be
  unreachable) and the app keeps working, just without these optimizations. See
  `backend/src/config/redis.js` — every helper (`cacheGet`/`cacheSet`/`cacheInvalidate`)
  swallows its own errors and returns a neutral value instead of throwing.
- **Cache-aside** on the public GET endpoints most likely to be hit repeatedly:
  `GET /api/venues`, `/api/venues/:id`, `/api/bands`, `/api/bands/:id`, `/api/reviews`. 30s TTL,
  explicit invalidation on every write to the same resource (see each route's `cacheInvalidate`
  calls) — TTL is a safety net for any invalidation path we missed, not the primary consistency
  mechanism. Responses carry an `X-Cache: HIT`/`MISS` header so this is directly observable.
  `cacheInvalidate` does a Redis `SCAN`+`DEL` by prefix — fine at this scale, but a busier system
  would prefer short TTLs + versioned key prefixes over pattern scanning (mentioned inline in
  the code as the next step if this needed to scale further).
- **Rate limiting** (`backend/src/middleware/rateLimit.js`) — `express-rate-limit` with a
  `rate-limit-redis` store so the limit is shared across multiple backend instances, not counted
  per-instance. Falls back to the library's in-memory store if Redis isn't configured. Applied to
  `/api/auth/register`, `/login`, `/google` (20 requests / 15 min) and `/api/reviews` POST,
  `/api/payments/checkout` (20 requests / min).
- **JWT revocation** — `POST /api/auth/logout` blacklists the token's `jti` claim in Redis
  (`revoked:jwt:<jti>`, TTL = the token's remaining lifetime); `authenticate` middleware checks
  the blacklist on every request. This exists because JWTs are otherwise stateless and
  *unrevokable by design* — without this, a logged-out or stolen token stays valid for its full
  7-day life. `web/src/app/core/services/auth.service.ts`'s `logout()` calls it (best-effort —
  logout still succeeds client-side even if this call fails).
- **Cache fails open, the rate limiter fails closed** if Redis goes down mid-flight while
  `REDIS_URL` is still set — a deliberate, discussed asymmetry: a stale/missing cache entry is
  harmless (just hits Postgres), but silently disabling rate limiting when its backing store
  disappears would defeat the entire point of having it. Good interview talking point on its own.
- `express.static` for `/uploads` sets `Cache-Control: public, max-age=1y, immutable` — safe
  because uploaded filenames are random UUIDs that never get reused for different content.

### Reliability

- **Idempotency key** on `POST /api/payments/checkout` — passed through to Stripe's own
  `idempotencyKey` option, scoped to the specific pending `Payments` row. A retried request
  (double-click, network blip and resend) returns the original Checkout Session instead of
  creating a duplicate one.
- **Circuit breaker** (`backend/src/utils/circuitBreaker.js`, built on `opossum`) wraps calls to
  both third-party dependencies: Stripe's `checkout.sessions.create` (`payments.js`) and Google's
  `verifyIdToken` (`config/google.js`). Once a dependency is failing repeatedly, the breaker opens
  and fails fast (503) instead of letting requests pile up waiting on a timeout. Google's breaker
  uses opossum's `errorFilter` to only count genuine network failures toward the threshold —
  otherwise a wave of ordinary invalid/expired Google tokens (an expected, frequent, benign case)
  would trip the breaker and lock out Google Sign-In for everyone, which would be backwards.
- **Schema migrations** — `backend/migrations/` + `node-pg-migrate` (`npm run migrate:up`/`:down`/
  `:create`), with migration files mirroring this project's actual schema history (init →
  Google auth columns → Reviews → Payments), each with a working `down`. **Local dev is
  unaffected** — `database.js`'s `CREATE TABLE IF NOT EXISTS` on boot still exists and still
  auto-creates everything, so `npm run dev` needs no extra step. The migrations are the
  production-grade path: point `DATABASE_URL`-equivalent env vars at a fresh database (e.g. a new
  Railway Postgres) and run `npm run migrate:up` instead of ever booting the app against it first.

### Observability

- **Structured logging** — `pino` (`config/logger.js`) replaces every `console.log`/
  `console.error` in the backend; JSON in production, pretty-printed in dev. `pino-http` logs
  every request/response automatically in `server.js`.
- **Error tracking** — `@sentry/node` (`config/sentry.js`), no-op unless `SENTRY_DSN` is set
  (same inert-until-configured pattern as Stripe/Google). `initSentry()` runs before Express is
  even created so it can auto-instrument from the start; `Sentry.setupExpressErrorHandler(app)`
  is registered after all routes.
- **Metrics** — `prom-client` (`config/metrics.js`): default Node process metrics (CPU, memory,
  event loop lag) plus custom `http_request_duration_seconds` (histogram), `http_requests_total`,
  `cache_hits_total`/`cache_misses_total` (derived from each response's `X-Cache` header),
  labeled by route *pattern* (`/api/venues/:id`, not the literal URL) to keep cardinality bounded.
  Exposed at `GET /metrics`. Not wired to an actual Prometheus/Grafana instance in this repo (that
  would need its own always-running infra) — the code produces real, correctly-formatted metrics;
  pointing a Prometheus scrape config at `/metrics` and building Grafana dashboards on top is the
  natural next step, described as such rather than half-built here.

### API versioning

Every route is mounted at both its original path and `/api/v1/...` (`server.js`'s
`mountVersioned` helper — same router instance, two mount points, so this added zero risk to
existing behavior). `/api/health` and `/metrics` are deliberately *not* versioned — they're
infra/ops endpoints, not product API surface. A future breaking change would get its own `/api/v2`
router mounted alongside `v1`, rather than changing `v1`'s behavior out from under whatever's
still calling it.

### Architecture talking points (not code changes — discuss, don't build)

- **Horizontal scaling**: the backend is already stateless (JWT auth, no server-side sessions),
  so running multiple instances behind a load balancer needs no code changes — Redis (cache,
  rate limits, revocation) is the one piece of shared state, which is exactly why it's a separate
  service instead of in-process memory.
- **CAP theorem / consistency tradeoffs**: introducing Redis as a cache is an explicit
  availability-over-consistency choice (a cached response can be up to `LIST_CACHE_TTL` seconds
  stale) traded for read throughput; Postgres itself remains the single source of truth and is
  strongly consistent. If a read replica were added for further read scaling, that would be the
  same tradeoff one level down (replication lag vs. read capacity).
- **Fail open vs. fail closed**: see the caching vs. rate-limiting asymmetry above — a real,
  general design decision every dependency-with-a-fallback needs to make explicitly, not by
  accident.

## Railway deployment readiness (added 2026-09-18)

A pass specifically aimed at "will this actually work once deployed," done by exercising the
running app (curl) and reading the code, not just guessing. Found and fixed real bugs, not
theoretical ones — each item below was confirmed broken before the fix and confirmed working
after.

- **Frontend API URL was hardcoded to `http://localhost:3000`** in all 6 services (`auth`,
  `venue`, `band`, `review`, `upload`, `payment`). Fixed with proper Angular environments:
  `web/src/environments/environment.ts` (dev, `localhost:3000`) and `environment.prod.ts`
  (prod), swapped automatically on `ng build` via `angular.json`'s `fileReplacements` — verified
  by grepping the actual built output of both configurations. **You must edit
  `environment.prod.ts`'s `apiUrl` to your real Railway backend URL once it's deployed** — it
  currently points at a placeholder (`YOUR-BACKEND-SERVICE.up.railway.app`) that will fail with
  CORS/DNS errors until you do.
- **Backend hardcoded `http://localhost:4200`** in two places (CORS origin, Stripe checkout
  success/cancel URLs). Both now read `FRONTEND_URL` from `.env` (defaults to `localhost:4200`
  for local dev). **Set `FRONTEND_URL` to your real deployed frontend domain** in Railway's env
  vars once you know it.
- **`app.set('trust proxy', 1)` was missing.** Confirmed this would have caused two real bugs
  behind Railway's reverse proxy: rate limiting keying off the proxy's IP instead of each real
  client's (one shared bucket for every user), and `req.protocol` always reporting `http` even
  over real HTTPS (breaking the absolute URLs `uploads.js` builds for photos). Fixed in
  `server.js`. `1` (not `true`) — trusts exactly one hop, matching Railway's setup.
- **No server-side input validation** — confirmed live: `POST /api/auth/register` accepted
  `"not-an-email"` and a 1-character password before this fix, because only the Angular form
  validators were checking (trivially bypassed by calling the API directly). Added `validator`
  (`isEmail`) + a password length check to `/register` in `auth.js`. Also normalized email
  casing (`trim().toLowerCase()`) consistently across register/login/Google sign-in while in
  there — a real, separate bug where `Test@x.com` and `test@x.com` would've been treated as two
  different accounts.
- **No security headers, no compression** — confirmed via response headers (`X-Powered-By:
  Express` leaking the stack, no CSP, no gzip). Added `helmet()` and `compression()` to
  `server.js`.
- **No graceful shutdown** — Railway sends `SIGTERM` on every redeploy/restart; without handling
  it, in-flight requests and DB/Redis connections get cut off abruptly instead of finishing
  cleanly. `server.js` now calls `server.close()`, then `pool.end()` and `redis.quit()`, with a
  10s hard-exit timeout as a backstop.
- Added an `engines.node` field to `backend/package.json` (`>=22.0.0`) so Railway's build
  matches the Node version this was actually built and tested against.

## Railway deployment (both services, added 2026-09-19)

Repo is on GitHub at `vasilijek3012/myweddingdayapp` (public), `main` branch. One Railway
project, two services, both built from this same repo via Nixpacks (no Dockerfile needed):

**Backend service** — Settings → Source → Root Directory: `backend`. Env vars:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}   # reference to the Postgres addon in the same project
REDIS_URL=${{Redis.REDIS_URL}}            # reference to the Redis addon in the same project
JWT_SECRET=<a real random secret — see below, never the .env placeholder>
NODE_ENV=production
LOG_LEVEL=info
UPLOAD_DIR=/data/uploads                  # matches the Volume mount path below
FRONTEND_URL=<the frontend service's Railway domain, once it exists>
```
Plus `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_PRICE_ID` and `GOOGLE_CLIENT_ID` if
using those flows (both stay inert/return 503 if unset — see their sections above), and
`SENTRY_DSN` if you want error tracking live. Also needs a **Volume** mounted at `/data/uploads`
(Settings → Volumes) so uploaded photos survive redeploys — see "Photo upload" above.
Generate a real `JWT_SECRET` with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
— never reuse the placeholder from `backend/.env`.

**Frontend service** — second service, same repo, Root Directory: `web`. No special env vars
needed; Nixpacks auto-detects `npm run build` then `npm start`. `web/package.json`'s `start`
script is `serve -s dist/web/browser` (the `serve` package — Vercel's static-file-server
library, unrelated to Vercel hosting; `-s` rewrites unmatched routes to `index.html` so Angular
Router's client-side routes like `/dashboard` don't 404 on a hard refresh). `serve` reads
`PORT` from the environment automatically — Railway sets it, nothing to configure. Verified
locally end-to-end (root route, a client-side route, and a static asset all return 200) before
this was written.

**After both are deployed:**
1. Generate a public domain for each service (Settings → Networking → Generate Domain).
2. Set the backend's `FRONTEND_URL` to the frontend's real domain (fixes CORS).
3. Update `web/src/environments/environment.prod.ts`'s `apiUrl` to the backend's real domain +
   `/api`, then push — Railway auto-redeploys the frontend on every push to `main`.
4. Optionally run `npm run migrate:up` (from `backend/scripts/migrate.js`, needs `DATABASE_URL`
   in the shell — Railway's CLI (`railway run npm run migrate:up`) is the easiest way to get
   that without hand-copying it) against the fresh Postgres instead of relying on
   `initializeDatabase()`'s auto-create-on-boot. Not required — auto-create works fine too.

## Known quirks in this repo

- No CI config exists yet — everything above is run manually. `docker-compose.yml` only runs
  Redis; Postgres/backend/web are still all manual per "Running the app" above.

## Conventions for future changes

- Backend: plain Express + raw parameterized `pg` queries (`$1, $2...` placeholders,
  `RETURNING *` on inserts/updates) — no ORM, **no stored procedures**. Follow the existing
  pattern in `routes/venues.js` / `routes/bands.js`. This is a deliberate choice, not an
  oversight: the app's queries are simple CRUD with no need for procedural logic, and upcoming
  monetization work (Stripe checkout/webhooks) has to live in JS anyway — splitting logic
  between SQL procedures and route handlers would just make it harder to test and reason about.
- Frontend: Angular 19, NgModules (not standalone components), feature pages under
  `src/app/pages/*`, shared services under `src/app/core/services/*`.
