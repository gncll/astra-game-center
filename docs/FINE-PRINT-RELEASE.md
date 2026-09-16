# The Fine Print web release — 16 September 2026

The owner requested adding the existing 3D court simulation to the live Game Center and confirmed setting the OpenAI and ElevenLabs API keys in Vercel. The owner ran `202609160001_fine_print.sql` and reported “Success. No rows returned.” This confirmation is not an independent database inspection.

The release adapts the canonical game's `web/` modules. It preserves the original local Python/Codex edition. Only allowlisted assets are packaged with `scripts/package-fine-print.py --source <game-directory>`; the public manifest records their hashes. The new square icon was generated with Codex Image Generation specifically for this release. The desktop discussion, private cases, local credentials, source caches and Blender sources are excluded.

## Runtime

Authenticated Next.js routes call OpenAI Responses with background processing, structured schemas and mandatory live `web_search` for research. Hearing responses use the reviewed record without a new search tool. Retrieved source URLs and independent quotation matches are distinguished from legal correctness. Source retrieval uses public-IP validation, pinned DNS answers, redirect checks and size/time limits. Five different ElevenLabs voices narrate generated lines. Imported case records use subtitles until researched again.

Server-only `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` are required; optional `FINE_PRINT_MODEL` defaults to `gpt-6-astra`. No desktop ChatGPT credential or command execution is used in the web service. OpenAI API and ElevenLabs usage have separate provider billing. Provider documentation: [web search](https://developers.openai.com/api/docs/guides/tools-web-search), [background responses](https://developers.openai.com/api/docs/guides/background).

The tab keeps account-specific session state and encrypted, authenticated tokens. Tokens are bound to the verified Supabase user and expire after two hours without renewal. Closing the tab loses its stored record; export first. OpenAI `background:true, store:false` allows temporary polling retention (roughly ten minutes under the documented policy). The app cancels jobs exceeding nine minutes. No private case text is stored in the database. Provider retention policies remain separate from browser storage.

SQL usage counters reserve capacity atomically before paid calls: per account per UTC day, 3 research requests, 12 hearing responses and 12,000 narration characters; per case 6,000 narration characters; global daily limits 30 research, 120 responses and 120,000 narration characters. These are usage limits, not a dollar billing guarantee. Failed/uncertain requests keep their reservation; no automatic paid retry. Existing narration is cached in the tab. Game catalog changes preserve previous allowed IDs and records.

Web uploads support PDF, DOCX, TXT, MD and JSON, at most 3 MB each (base64 must fit Vercel's request limit), eight documents, 100 PDF pages, 100,000 extracted characters per document and 150,000 combined. Scans need OCR elsewhere. Saved record compatibility remains `fine-print-case-record-v1` with fresh source verification explicitly absent on import.

## Validation

Production build and TypeScript passed. Eighteen new mocked provider/security tests passed; they cover sealed state, account isolation, limits, citation integrity, conditional/null money, required web search, durable quota ordering, background polling across instances, cancellation, import and speech restrictions. These fixtures do not establish real OpenAI or ElevenLabs account access. Original S02 gameplay/provider validation is historical and is not a new web API test.

Release-time CI and public deployment results are recorded separately below. Broader jurisdiction accuracy and real-device mobile performance remain unverified. A legal source quotation match does not certify an AI legal conclusion.

Pre-release checks: 57 application tests passed, plus Wardenfall engine (21 checks) and audio regressions (3 checks). The packaged UI was exercised in the real browser with a separately hosted, local-only mocked provider: intake, rendered 3D court, selected evidence, free response, early closing, null-money verdict, reload and export panel. The fixture server is not shipped. The owner explicitly requested publishing immediately and completing remaining live provider checks afterward.
