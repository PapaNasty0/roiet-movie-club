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
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `ADMIN_EMAIL` | Email treated as admin on signup |
| `RESEND_API_KEY` | Optional — verification + new-movie email sends |
| `EMAIL_FROM` | Optional — From address for Resend |
| `APP_ORIGIN` | Optional — canonical origin for OAuth / verify links |
| `DATABASE_URL` | Postgres connection (Firebase / host) |

Google OAuth redirect URI: `https://<your-app-host>/api/auth/google/callback`

## Scripts

- `npm run dev` — local Next.js
- `npm run build` — production build + migrate when `DATABASE_URL` is set
- `npm start` — run production server

## Stack

Next.js (App Router), Postgres via `pg` / PGlite fallback, cookie sessions (`jose`), Tailwind CSS.

Production hosting target: Firebase project `movieclub101` (custom domain `movieclub101.com`).
