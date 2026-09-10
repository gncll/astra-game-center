# Astra Game Center web

This repository is the web edition of the user's local Astra Game Center. Preserve the existing English charcoal/lavender interface and five game logos. Only Wardenfall is playable in the initial release; the other cards must honestly say Coming soon. The desktop editions remain separate.

- Next.js on Vercel; Supabase Auth and per-user library rows. Never replace real authentication with a demo user or bypass in application code.
- Protect game entry pages AND every shipped game file, including static images/audio/scripts. Verify sessions server-side; never trust an unvalidated cookie or client user ID.
- Apply row-level security to user-specific database tables. Service-role/admin credentials must never enter the client or repository. `.env.example` contains placeholders only.
- All interface text is English. Internal production notes may be Turkish. No fake prices, ratings, playtime or multiplayer claims.
- Game progress is stored per account in this browser in the initial release, not synced to the cloud. Do not imply favorites and play history are full game saves.
- Wardenfall mechanics and local production originals remain unchanged. Use a runtime allowlist and retain source credits. Test silently; use the documented silent game URL for UI tests.
- Run typecheck, app security tests, and Wardenfall regressions. Validate production build and real browser appearance. Keep provider-backed tests distinct from fixtures; never claim a real email login was tested without a configured Supabase project.
- The GitHub repository is public as created by the user. Never upload local game saves, desktop paths, API keys, raw generation logs, Blender sources, or unrelated game binaries.
