# RoiEt English Movie Club

Base site for Brian Leigh’s English-language movie meetups at Robinson Roi Et / Major Cineplex.

## Features (v1)

- Email + password auth (email confirmation when Resend is configured; `ADMIN_EMAIL` password bootstrap only while Resend is unset), plus Google OAuth when secrets are set
- Account settings: profile photo (nav + forum), change display name (forum + RSVP lists); link Google and/or add a password on the same email (one account per person)
- Upcoming movies (admin-managed): trailer, synopsis, genre, times, length, rating, reviews summary
- Logged-in RSVP: might go / will probably go / booked tickets + adult & child counts, with aggregates
- Per-movie discussion forum
- Opt-in email notifications for new movies (preference saved; send path stubs until `RESEND_API_KEY` is set)
- Outing photo gallery
- Admin: inline pencil edits for site text (teacherbrian-style), plus movies, gallery, site/movie skins
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

No passwords are shipped in source. Become admin by registering or using Google with an email that matches `ADMIN_EMAIL` (default `bjleigh@gmail.com`). When `RESEND_API_KEY` is unset, only `ADMIN_EMAIL` can finish setup by signing in with the registered password (marks verified). Everyone else needs Resend confirmation or Google. When Resend is configured, all new password signups must confirm email before signing in.

## How admin is assigned

1. Any new account whose email matches `ADMIN_EMAIL` (case-insensitive) is marked `is_admin`.
2. Bind `ADMIN_EMAIL` as a secret if you want a different admin address than the default.
3. With Resend configured, password accounts must confirm email before they can sign in. Without Resend, only `ADMIN_EMAIL` gets the password bootstrap. Google accounts are always treated as verified.

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
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_ENDPOINT_URL_S3` / `AWS_REGION` | Optional — Neon Object Storage for gallery + avatar uploads (falls back to small data URLs if unset) |

Google OAuth authorized redirect URIs (both required):

- `https://movieclub--movieclub101-da5f1.asia-east1.hosted.app/api/auth/google/callback`
- `https://movieclub101.com/api/auth/google/callback`

Plain-English setup: project store `docs/google-signin-setup.md` and `docs/email-confirmation-setup.md`.

## Firebase App Hosting (production)

SSR + API routes → **App Hosting** (not static export). Firebase project **`movieclub101-da5f1`** (console display name **movieclub101**), custom domain **`movieclub101.com`**.

Repo files: `.firebaserc`, `firebase.json` (backend id `movieclub`), `apphosting.yaml`.

**Requires Blaze:** https://console.firebase.google.com/project/movieclub101-da5f1/usage/details

Full DNS / console / secrets handoff: Project store `docs/firebase-hosting.md`.

```bash
npx firebase-tools@latest login --no-localhost
npx firebase-tools@latest use movieclub101-da5f1
npx firebase-tools@latest apphosting:secrets:set SESSION_SECRET
npx firebase-tools@latest apphosting:secrets:set DATABASE_URL
npx firebase-tools@latest apphosting:secrets:set ADMIN_EMAIL
# then optional Google / Resend secrets…
npx firebase-tools@latest deploy --only apphosting
```

After the first rollout: App Hosting → **movieclub** → Domains → add `movieclub101.com` and paste the **exact** A / TXT / ACME CNAME rows Firebase shows (do not invent IPs).

Cursor publish-app remains OK for previews; Firebase is production for the custom domain.

## Scripts

- `npm run prove:neon` — smoke-check Neon Postgres / Auth / Object Storage

- `npm run dev` — local Next.js
- `npm run build` — production build + migrate when `DATABASE_URL` is set
- `npm start` — run production server
- `npm run migrate` — apply SQL migrations only

## Stack

Next.js (App Router), Postgres via `pg` / PGlite fallback, cookie sessions (`jose`), Tailwind CSS, Firebase App Hosting for production.
