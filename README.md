# RoiEt English Movie Club

Base site for Brian Leigh’s English-language movie meetups at Robinson Roi Et / Major Cineplex.

## Features (v1)

- Email + password auth and Google OAuth (demo Google login when OAuth secrets are unset)
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

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Without `DATABASE_URL`, the app uses in-memory PGlite and seeds sample data on first query.

### Seeded accounts

| Email | Password | Role |
| --- | --- | --- |
| `bjleigh@gmail.com` (or `ADMIN_EMAIL`) | `movieclub-admin` | Admin |
| `member@example.com` | `welcome123` | Member |

Change the admin password after first login in production.

## How admin is assigned

1. Seed creates an admin user for `ADMIN_EMAIL` (default `bjleigh@gmail.com`) with password `movieclub-admin`.
2. Any new account whose email matches `ADMIN_EMAIL` (case-insensitive) is marked `is_admin`.
3. Bind `ADMIN_EMAIL` as an app secret if you want a different admin address than the default.

## Secrets to bind (publish-app)

| Name | Purpose |
| --- | --- |
| `SESSION_SECRET` | JWT cookie signing (required in production) |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `ADMIN_EMAIL` | Email treated as admin on signup/seed |
| `RESEND_API_KEY` | Optional — enables new-movie email sends |
| `EMAIL_FROM` | Optional — From address for Resend |
| `APP_ORIGIN` | Optional — canonical origin for OAuth redirects |

`DATABASE_URL` / `DATABASE_URL_UNPOOLED` come from Neon (`neon env pull` / App Hosting secrets).

Google OAuth redirect URI: `https://<your-app-host>/api/auth/google/callback`

## Scripts

- `npm run dev` — local Next.js
- `npm run build` — production build + migrate when `DATABASE_URL` is set
- `npm start` — run production server

## Stack

Next.js (App Router), Neon Lakebase Postgres via `pg` (PGlite fallback without `DATABASE_URL`), Neon Auth (optional alongside email/Google), Neon Object Storage for gallery uploads, cookie sessions (`jose`), Tailwind CSS.

## Neon

Linked project uses `neon.ts` + `neon deploy`. Local secrets live in `.env.local` (gitignored). Useful commands:

```bash
npx neon env pull
npm run prove:neon
```
