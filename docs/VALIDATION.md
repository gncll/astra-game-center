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
- The operator deployed to `https://astra-game-center.vercel.app`. The original release rejected sign-in at its stable production alias; see the correction below. Full inbox sign-in and authenticated game delivery on Vercel remain separate deployment checks.
- Real token verification and sessions were tested, but inbox delivery was not. The default Supabase sender is not a public production email service; configure SMTP and test an actual email in the intended browser flow.
- Wardenfall progress is per-account browser storage. Cloud saves and migration of desktop saves are not implemented.
- The initial release shipped only Wardenfall; the expanded release below adds three games, leaving Mario for later.
- This web packaging pass does not establish new gameplay, audio-quality or sustained-FPS claims.

## Production alias correction

The operator reported “Please start this action from Game Center.” at the deployed login page. A POST with an intentionally invalid email and the real site's Origin reproduced 403, without sending any email. The original fallback used `VERCEL_URL`, which names the unique build deployment; it did not recognize the stable project address.

The fallback now uses `VERCEL_PROJECT_PRODUCTION_URL` in production, while previews keep their own deployment origin. An explicit `SITE_URL` still takes priority. Three regression cases cover production alias acceptance and foreign origin rejection, preview isolation, and explicit/custom/local origin handling. Production build, all thirteen app checks and the existing gameplay/audio regressions passed locally.

## Four-game release and logo loading

The user confirmed the production email flow works, then requested the remaining locally made games, leaving Mario for last, and a game-logo loading screen. Added the current Sidewalk Session, Sunset Block S04 and Pine Hollow campfire/fishing demo using a repeatable runtime-only packager. The original desktop projects were not modified. The packager follows JavaScript imports with an AST and external GLB resource paths; this caught Kenney’s separate `Textures/colormap.png` dependency. No unexpected files remain outside the allowlist.

Each launch first shows the correct game logo while recording the launch, then keeps a full-screen matching logo over the actual game until its models, textures and scene are ready. Errors expose a reload button; the loader does not use a fake percentage or a fixed expiry timer. Wardenfall uses its real artwork completion, Sidewalk its park initialization, Sunset its scene initializer and Pine its nine-model loading updates. Every game offers a return link. Browser checks were silent.

Validation for this release:
- Production build and TypeScript passed. Sixteen app tests passed, including anonymous access to every new game entry, GLB models, texture, vendor module, audio and shared loading files; import/GLB dependency completeness; and loading readiness/retry lifecycle. Existing 21 Wardenfall gameplay and 3 audio checks passed.
- The unchanged Sidewalk source’s eleven physics/session regressions passed, including prompt acceleration, braking, ollie, ramp, grind exit and scoring.
- Six real-Supabase test groups passed with two temporary QA accounts and no emails. All four game launch routes returned the correct entries, favorites survived launches, all four recent timestamps persisted, and cross-account RLS remained enforced. No new SQL migration was needed: the launch route uses the existing table grants and updates only the current user’s launch timestamp.
- Local browser at 1280×720: all three new scenes rendered after the appropriate logo launch screen. Sunset’s walk-to-car route reached the car, Enter switched to driving, and Block tour traveled 25 m at the displayed 22 km/h. Sidewalk entered free skate with the real park, HUD and unlimited timer. Pine’s route reached the firewood tree and the chop action ran. Screenshots are local verification artifacts, not source assets.
- This is a packaging and loading release. No new sustained-FPS, mobile controls, cloud-save or full gameplay-completion claims are made. Heavy 3D scenes retain the current source models, so their first downloads can take longer on slower connections.

## Vercel release verification

The application release `9024130` and model-transfer QA follow-up `f2773fc` both passed GitHub Actions and reached successful Vercel production deployments. Against `https://astra-game-center.vercel.app`, all six Supabase integration groups passed: four valid game launch routes, independent favorites/history, RLS isolation, complete authenticated model downloads verified by SHA-256 against the packaged files, and loss of direct asset access after sign-out. No email was sent by QA; the user separately confirmed their own email login works.

A live browser showed the four playable cards and Mario Coming soon. Sunset’s logo loading overlay stayed visible during the actual download and closed to the rendered city with its character, residents and controls. First downloads remain connection-dependent because this release preserves the existing detailed models. Test credentials, one-use sign-in links and screenshots remain outside the public repository.

## Pine Hollow log pickup correction — 11 September 2026

The user reported missing tree collection and cooking. The packaged source manifest matched the current original project. Authenticated SHA-256 checks of the live game's entry, survival rules, layout and camp scene also matched the deployed files; an old-version mismatch was not found.

After the tree fell, collection incorrectly measured distance from the trunk instead of the visible pile of logs. A collision-free point reached through the actual movement function was 1.2 m from the logs but 1.9 m from the trunk, so collection was unavailable. The original game and this release copy now use the log position for pickup, retain four hits/completed fall/one-time collection, and give the correct approach hint once the tree has fallen. Only Pine's changed runtime file and source manifest were transferred.

Validation: production build and TypeScript passed; 19 app tests (three new Pine cases), 21 Wardenfall gameplay and three audio regressions passed. The original Pine project passed 16 S01/S02 tests. New regressions exercise reachable pickup outside the old trunk radius, interaction gates and the complete timed wood/fire/fish/cook/eat chain.

Before publishing this correction, a real silent browser session on production completed four axe hits, collecting three logs, lighting the fire, casting and reacting to the visible bite prompt, catching one raw fish, returning to the fire and completing the five-second cooking action. The rendered result showed `MISSION COMPLETE · 4 / 4`, `Dinner is ready`, zero raw fish and one cooked fish. The user's exact failing interaction was not observed and no independent cooking failure was reproduced. The corrected pickup position is covered by the movement-based regression; the browser run described here used the preceding deployment. Local screenshot and accessibility evidence remain ignored under `artifacts/pine-recheck/`. QA used a disposable real provider account and sent no email.
