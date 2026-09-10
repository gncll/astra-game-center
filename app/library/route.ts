import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { currentAccount } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!await currentAccount()) return Response.redirect(new URL('/login', request.url));
  const html = await readFile(path.join(process.cwd(), 'templates/library.html'), 'utf8');
  return new Response(html, { headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  } });
}
