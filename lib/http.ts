import { allowedOrigins } from './config';
import { validMutation } from './security.mjs';
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export async function mutationBody(request: Request) {
  if (!validMutation(request.headers, allowedOrigins())) throw new Error('origin');
  if (Number(request.headers.get('content-length') || 0) > 4096) throw new Error('body');
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4096) { await reader.cancel(); throw new Error('body'); }
    chunks.push(value);
  }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error('body');
  return body;
}
export function mutationError(error: unknown) {
  return json({ error: error instanceof Error && error.message === 'origin' ? 'Please start this action from Game Center.' : 'Please check your request and try again.' }, error instanceof Error && error.message === 'origin' ? 403 : 400);
}
