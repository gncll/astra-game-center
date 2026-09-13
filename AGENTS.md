# Astra Game Center web

This repository is the web edition of the user's local Astra Game Center. Preserve the existing English charcoal/lavender interface and the remaining game logos. Wardenfall, Sunset Block, Sidewalk Session and Pine Hollow are playable. The user requested removing Mario on 13 September 2026; its card and cover are removed. Keep the original desktop source separate. Each available game has its own logo loading screen with readiness and retry handling. The desktop editions remain separate.

- Next.js on Vercel; Supabase Auth and per-user library rows. Never replace real authentication with a demo user or bypass in application code.
- Protect game entry pages AND every shipped game file, including static images/audio/scripts. Verify sessions server-side; never trust an unvalidated cookie or client user ID.
- Apply row-level security to user-specific database tables. Service-role/admin credentials must never enter the client or repository. `.env.example` contains placeholders only.
- All interface text is English. Internal production notes may be Turkish. No fake prices, ratings, playtime or multiplayer claims.
- Game progress is stored per account in this browser in the initial release, not synced to the cloud. Do not imply favorites and play history are full game saves.
- Wardenfall mechanics and local production originals remain unchanged. Use a runtime allowlist and retain source credits. Test silently; use the documented silent game URL for UI tests.
- Run typecheck, app security tests, and Wardenfall regressions. Validate production build and real browser appearance. Keep provider-backed tests distinct from fixtures; never claim a real email login was tested without a configured Supabase project.
- The GitHub repository is public as created by the user. Never upload local game saves, desktop paths, API keys, raw generation logs, Blender sources, or unrelated game binaries.

## Development in other conversations and release handoff

The user develops individual games in separate Codex conversations, then asks this Game Center conversation to publish the finished changes. Gameplay source projects are sibling folders of this repository: `../Tower defense` (Wardenfall), `../Super Mario`, `../Sidewalk Session`, `../Sunset Block`, and `../Pine Hollow`. Pine's current entry is `demo.html`. This repository's `public/games` directories are adapted release copies, not the primary gameplay workspaces.

Read the selected game's `AGENTS.md` and `docs/WEB-HANDOFF.md` before updating a release. Compare source changes with the runtime manifests. Transfer only the requested game; `scripts/package-games.py` currently packages all three 3D games, so do not run it blindly over unrelated work. Keep server authentication, account-specific storage, the logo loader and actual readiness callbacks, silent test mode and return links. Prefer fixing shared gameplay issues in the source project, then porting them with the web adaptations intact. Wardenfall uses its separate source manifest and classic-script account loader. Mario is retired from the web catalog; do not re-add it without a request.

A local game-development request does not by itself authorize a new production release. Follow an explicit request to publish/update; do not ask again if the current session already authorizes that release. Complete the affected gameplay loop, relevant regressions and production access checks, push to GitHub, and verify Vercel. Preserve concurrent edits from other conversations and keep private workspace paths, keys and production logs out of this public repository.


## Sunset S06 — 13 September 2026

Sunset now ships the six-block harbor, traffic, opening-bridge driving/jumps and airport. Use `scripts/package-sunset.py` for Sunset-only transfers from its approved source manifest, preserving all other game copies. `docs/sunset-release-manifest.json` records the 60 packaged files and hashes. The owner explicitly authorized GitHub/Vercel publication and elected to test signed-in production gameplay personally. See `docs/VALIDATION.md` for the exact checks and remaining visual/model-license limits.
