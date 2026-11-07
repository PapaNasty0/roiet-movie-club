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

**Production without Resend:** password signups for everyone else stay unverified (no email is sent, and `verifyUrl` is not returned). The `ADMIN_EMAIL` account may sign in with the password it just registered — that one-time path marks the admin verified and closes as soon as `RESEND_API_KEY` is set. Google demo login is disabled in production.

## How admin is assigned

1. Any new account whose email matches `ADMIN_EMAIL` (case-insensitive) is marked `is_admin`.
2. Bind `ADMIN_EMAIL` as a secret if you want a different admin address than the default.
3. Password accounts must confirm email before they can sign in; Google accounts are treated as verified.
4. If Resend is unset, only `ADMIN_EMAIL` can finish setup by signing in with the registered password (see above).

## Secrets (Firebase / hosting)

| Name | Purpose | Status for live App Hosting |
| --- | --- | --- |
| `SESSION_SECRET` | JWT cookie signing (**required**) | Set |
| `DATABASE_URL` | Postgres connection (**required**) | Set (Neon solitary-fog) |
| `DATABASE_URL_UNPOOLED` | Non-pooled URL for migrations | Set |
| `ADMIN_EMAIL` | Email treated as admin on signup | Set (`bjleigh@gmail.com`) |
| `RESEND_API_KEY` | Verification + new-movie email sends | **Brian must create** (Resend dashboard → API key) |
| `EMAIL_FROM` | From address for Resend | Optional; defaults to Resend onboarding sender |
| `GOOGLE_CLIENT_ID` | Google OAuth client id | **Brian must create** (Google Cloud OAuth client) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | **Brian must create** |
| `APP_ORIGIN` | Canonical origin in `apphosting.yaml` | `https://movieclub101.com` (use hosted.app URL until custom-domain SSL is Connected if auth redirects break) |

Do **not** invent values for Resend/Google — create them in the provider consoles, then:

```bash
npx firebase-tools@latest apphosting:secrets:set RESEND_API_KEY --project movieclub101-da5f1
npx firebase-tools@latest apphosting:secrets:set GOOGLE_CLIENT_ID --project movieclub101-da5f1
npx firebase-tools@latest apphosting:secrets:set GOOGLE_CLIENT_SECRET --project movieclub101-da5f1
# optional:
npx firebase-tools@latest apphosting:secrets:set EMAIL_FROM --project movieclub101-da5f1
```

Wire the new names into `apphosting.yaml` `env:` (secret refs) and redeploy.

Google OAuth redirect URIs (authorized in Google Cloud Console):

- `https://movieclub101.com/api/auth/google/callback`
- `https://movieclub--movieclub101-da5f1.asia-east1.hosted.app/api/auth/google/callback` (while custom-domain SSL is pending)

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
