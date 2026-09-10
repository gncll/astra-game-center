# Web adaptation validation — 10 September 2026

## Passed locally

- Next.js 16.3.4 production build and TypeScript checks.
- Ten app tests: anonymous page redirects; direct game scripts, large images and audio denied; forged cookies denied; cross-site mutation denied; fixed callback destinations; public brand art; input and game allowlists; independent favorite/history conversion.
- Twenty-one deterministic Wardenfall gameplay checks, including completed three-region campaigns and legendary tower upgrades; three audio regression checks. No game balance or engine changes.
- Six provider-backed groups against the configured Supabase project using two temporary accounts: verified real sessions and HttpOnly cookies; single-use token replay rejection; persistent favorites/history and unavailable-game rejection; cross-account RLS read/update/insert/delete isolation and anonymous rejection; authenticated large static asset delivery; sign-out revoking application and asset access. The test sent zero emails.
- Browser checks use a real Supabase-issued one-use link, rather than a fake session or an application bypass. Login and the preserved dashboard rendered at 1280×720, and the Favorites view displayed only the saved Wardenfall card. The launch route loaded the authenticated Wardenfall game; purchasing a Ranger Lodge reduced gold by 80 and starting wave 1 produced combat and earned gold. This was run with silent mode enabled.

The Supabase migration was applied successfully. The operator confirmed adding the local Site URL and callback allowlist. A repeated manual SQL run can report an existing policy; the migration is intended to run once.

## Scope and remaining deployment checks

- Tests ran on macOS with Node.js 26.7.0. CI uses Node.js 24.
- Vercel has not been deployed from this checkout yet. Re-check protected static delivery on the actual deployment and configure its canonical origin and callback.
- Real token verification and sessions were tested, but inbox delivery was not. The default Supabase sender is not a public production email service; configure SMTP and test an actual email in the intended browser flow.
- Wardenfall progress is per-account browser storage. Cloud saves and migration of desktop saves are not implemented.
- Only Wardenfall's runtime is shipped. The other four cards are Coming soon.
- This web packaging pass does not establish new gameplay, audio-quality or sustained-FPS claims.
