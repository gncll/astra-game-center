# Astra Game Center

An English game library with the original charcoal and lavender interface, five game covers, Supabase email sign-in, favorites and recent launches. **Wardenfall is playable in this first web release.** Sunset Block, Super Mario, Sidewalk Session and Pine Hollow are catalog entries marked Coming soon.

Games run in the player's browser. The original Mac desktop applications are separate from this repository.

## Run locally

Use Node.js 24 LTS, then:

```sh
npm ci
cp .env.example .env.local
# Fill in the project URL and publishable/anon key in .env.local.
npm run dev
```

Open `http://127.0.0.1:4194`. The app deliberately requires a real Supabase session; it has no demo-login bypass.

## Supabase setup

1. Apply `supabase/migrations/202609100001_game_library.sql` **once** in the SQL Editor of a new project. The Astra project already has this migration. Re-running its policy creation produces an already-exists error.
2. Enable email sign-in. Set Site URL to the app's origin and add the exact `ORIGIN/auth/callback` under Authentication → URL Configuration → Redirect URLs. For local development, the origin is `http://127.0.0.1:4194`.
3. Configure an email sender for public access. Supabase's default sender is intended for testing with project-team addresses; use custom SMTP before inviting other players. See [Supabase email delivery](https://supabase.com/docs/guides/auth/auth-smtp).

The default email confirmation URL is supported through PKCE: request and open the link in the same browser. For links that should also work in another browser, the callback additionally supports Supabase's token-hash flow. In both Magic Link and Confirm Signup email templates, a sign-in link can use:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email">Open Astra Game Center</a>
```

The app always supplies the allowlisted callback as `emailRedirectTo` and sends successful sign-ins to `/library`. It does not accept an arbitrary `next` destination. See [Supabase passwordless authentication](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## Deploy on Vercel

Import this GitHub repository. Use **Next.js**, the repository root, `npm run build`, and the default output directory. Use Node.js 24.x. Add these environment variables before the first build:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key, or legacy anon key |
| `SITE_URL` | The final HTTPS origin, without `/auth/callback` |

If the domain is not assigned yet, omit `SITE_URL` for the first build; the app uses Vercel's assigned deployment URL. Once the stable domain is known, set `SITE_URL` to that origin and redeploy. Update Supabase Site URL and add the exact HTTPS callback to its Redirect URLs. The local callback may stay in the list.

**No service-role, secret API key or GitHub token is needed by the app.** Keep environment values in Vercel or an ignored local file. For a preview deployment, use its own origin and exact allowed callback if you want to test sign-in there.

After deployment, verify a fresh email sign-in, a favorite across reloads, Play, and sign-out. Also check a direct `/games/wardenfall/game.js` request while signed out: it must return 401. This repository has been tested locally; Vercel delivery is a separate deployment check.

## Data and access

- `/library`, `/play`, `/api` and **all** `/games` files are guarded by the server proxy. Scripts, images and audio are covered too. Game files stay static so large assets do not pass through a function response body.
- Supabase verifies sessions. The `game_library` table has per-user row-level security; its functions run with the caller's permissions.
- Favorites and recent launch dates sync through Supabase.
- Wardenfall campaign progress and audio preferences are stored separately for each account **in that browser**. They are not cloud saves; progress from the desktop edition is not migrated.

## Checks

```sh
npm run build
npm run check
```

GitHub Actions runs the production build, TypeScript, access-control tests and Wardenfall gameplay/audio regressions. No email is sent by these tests. An opt-in provider test is available in `tests/live-supabase.mjs`; run it only against a project you administer, with a running app and a temporary `ASTRA_QA_ADMIN_KEY` environment variable outside the repository. It creates two marked QA accounts, tests real authentication and RLS, and deletes those accounts afterwards. Never supply the QA admin key to the Next.js process or Vercel.

For silent manual game checks, sign in and visit `/play/wardenfall?silent=1`.

See [validation](docs/VALIDATION.md), [asset credits](CREDITS.md) and the [runtime source manifest](docs/wardenfall-source-manifest.json).
