# RoiEt English Movie Club

Base site for Brian Leigh’s English-language movie meetups at Robinson Roi Et / Major Cineplex.

## Features (v1)

- Email + password auth with email confirmation, plus Google OAuth (demo Google login when OAuth secrets are unset)
- Upcoming movies (admin-managed): trailer, synopsis, genre, times, length, rating, reviews summary
- Logged-in RSVP: might go / will probably go / booked tickets + adult & child counts, with aggregates
- Per-movie discussion forum
- Opt-in email notifications for new movies (preference saved; send path stubs until `RESEND_API_KEY` is set)
- Outing photo gallery
- Admin: editable site text, movies, gallery, site/movie skins
- Default “RoiEt Night Out” skin + example “Amber Noir” skin

## Cinema schedule note

Major Cineplex scraping was **skipped** for v1. Listings are entered in Admin. Revisit scraping only if a reliable, low-maintenance approach appears.

## Local development

```bash
npm install
env -u DATABASE_URL npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Without `DATABASE_URL`, the app uses in-memory PGlite and seeds sample movies/gallery on first query (no user accounts).

### First admin

No passwords are shipped in source. Become admin by registering or using Google with an email that matches `ADMIN_EMAIL` (default `bjleigh@gmail.com`), then confirming email for password signups. When Resend is unset locally, the register API returns a `verifyUrl` you can open to confirm.

## How admin is assigned

1. Any new account whose email matches `ADMIN_EMAIL` (case-insensitive) is marked `is_admin`.
2. Bind `ADMIN_EMAIL` as a secret if you want a different admin address than the default.
3. Password accounts must confirm email before they can sign in; Google accounts are treated as verified.

## Secrets (Firebase / hosting)

| Name | Purpose |
| --- | --- |
| `SESSION_SECRET` | JWT cookie signing (**required in production**) |
| `DATABASE_URL` | Postgres connection (required for durable production data) |
| `ADMIN_EMAIL` | Email treated as admin on signup |
| `GOOGLE_CLIENT_ID` | Google OAuth (optional until Google login is enabled) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `RESEND_API_KEY` | Optional — verification + new-movie email sends |
| `EMAIL_FROM` | Optional — From address for Resend |
| `APP_ORIGIN` | Canonical origin — set to `https://movieclub101.com` in production (`apphosting.yaml`) |
| `DATABASE_URL_UNPOOLED` | Optional — non-pooled URL for migrations (Neon-style) |

Google OAuth redirect URI: `https://movieclub101.com/api/auth/google/callback`  
(Also add the temporary `*.hosted.app` callback while DNS is pending.)

## Firebase App Hosting (production)

SSR + API routes → **App Hosting** (not static export). Firebase project **`movieclub101`**, custom domain **`movieclub101.com`**.

Repo files: `.firebaserc`, `firebase.json` (backend id `movieclub`), `apphosting.yaml`.

Full DNS / console / secrets handoff: Project store `docs/firebase-hosting.md`.

```bash
npx firebase-tools@latest login --no-localhost
npx firebase-tools@latest use movieclub101
npx firebase-tools@latest apphosting:secrets:set SESSION_SECRET
npx firebase-tools@latest apphosting:secrets:set DATABASE_URL
npx firebase-tools@latest apphosting:secrets:set ADMIN_EMAIL
# then optional Google / Resend secrets…
npx firebase-tools@latest deploy --only apphosting
```

After the first rollout: App Hosting → **movieclub** → Domains → add `movieclub101.com` and paste the **exact** A / TXT / ACME CNAME rows Firebase shows (do not invent IPs).

Cursor publish-app remains OK for previews; Firebase is production for the custom domain.

## Scripts

- `npm run dev` — local Next.js
- `npm run build` — production build + migrate when `DATABASE_URL` is set
- `npm start` — run production server
- `npm run migrate` — apply SQL migrations only

## Stack

Next.js (App Router), Postgres via `pg` / PGlite fallback, cookie sessions (`jose`), Tailwind CSS, Firebase App Hosting for production.
