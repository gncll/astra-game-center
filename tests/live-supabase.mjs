// Opt-in provider test. Needs a running app and a QA-only server admin credential.
// Creates two clearly marked accounts, sends no emails, and deletes them afterwards.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const origin = process.env.SITE_URL || 'http://127.0.0.1:4194';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const adminKey = process.env.ASTRA_QA_ADMIN_KEY;
assert.ok(url && key && adminKey, 'Provide Supabase URL, public key and a QA admin credential outside the repository.');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, adminKey, options);
const created = [];
let passed = 0;
const pass = message => { passed++; console.log('PASS ' + message); };
const ok = (result, label) => { assert.ok(!result.error, label + ': ' + (result.error?.code || 'provider error')); return result.data; };

async function link(email) {
  return ok(await admin.auth.admin.generateLink({ type: 'magiclink', email }), 'Generate one-use sign-in').properties.hashed_token;
}
async function fixture() {
  const email = 'astra-qa-' + randomUUID() + '@example.com';
  const { user } = ok(await admin.auth.admin.createUser({ email, email_confirm: true, app_metadata: { astra_qa: true } }), 'Create temporary QA account');
  created.push(user.id);
  const hash = await link(email);
  const jar = new Map();
  async function request(path, body) {
    const headers = { Cookie: [...jar].map(([name, value]) => name + '=' + value).join('; ') };
    if (body !== undefined) Object.assign(headers, { Origin: origin, 'Content-Type': 'application/json', 'X-Astra-Request': '1' });
    const result = await fetch(origin + path, { redirect: 'manual', headers, method: body === undefined ? 'GET' : 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    for (const cookie of result.headers.getSetCookie()) {
      const pair = cookie.split(';')[0], equals = pair.indexOf('=');
      if (/max-age=0(?:;|$)/i.test(cookie)) jar.delete(pair.slice(0, equals));
      else jar.set(pair.slice(0, equals), pair.slice(equals + 1));
    }
    return result;
  }
  const callback = await request('/auth/callback?type=email&token_hash=' + encodeURIComponent(hash));
  assert.equal(new URL(callback.headers.get('location')).pathname, '/library');
  assert.ok(callback.headers.getSetCookie().some(cookie => /HttpOnly/i.test(cookie) && /SameSite=lax/i.test(cookie)));
  const identity = await request('/api/session');
  assert.equal(identity.status, 200);
  assert.equal((await identity.json()).user.id, user.id);
  const client = createClient(url, key, options);
  ok(await client.auth.verifyOtp({ token_hash: await link(email), type: 'email' }), 'Create authenticated RLS test client');
  return { email, user, request, client, hash };
}

try {
  const a = await fixture(), b = await fixture();
  pass('Two real Supabase sessions, verified identities and HttpOnly cookies');
  const replay = await fetch(origin + '/auth/callback?type=email&token_hash=' + a.hash, { redirect: 'manual' });
  assert.equal(new URL(replay.headers.get('location')).pathname, '/login');
  pass('Consumed email token cannot be replayed');

  assert.equal((await a.request('/api/favorite/wardenfall', { favorite: true })).status, 200);
  assert.equal((await a.request('/api/play/wardenfall', {})).status, 200);
  const library = await (await a.request('/api/library')).json();
  assert.deepEqual(library.favorites, ['wardenfall']);
  assert.ok(library.recent.wardenfall);
  assert.equal(library.games.filter(game => game.available).length, 1);
  assert.equal((await a.request('/api/play/mario', {})).status, 404);
  const otherLibrary = await (await b.request('/api/library')).json();
  assert.deepEqual(otherLibrary.favorites, []);
  assert.deepEqual(otherLibrary.recent, {});
  pass('Favorites and play history persist independently; unavailable games stay blocked');

  const hidden = ok(await b.client.from('game_library').select('*').eq('user_id', a.user.id), 'Read another account');
  assert.deepEqual(hidden, []);
  const changed = ok(await b.client.from('game_library').update({ favorite: false }).eq('user_id', a.user.id).select(), 'Update another account');
  assert.deepEqual(changed, []);
  const insert = await b.client.from('game_library').insert({ user_id: a.user.id, game_id: 'mario', favorite: true });
  assert.equal(insert.error?.code, '42501');
  const removed = ok(await b.client.from('game_library').delete().eq('user_id', a.user.id).select(), 'Delete another account');
  assert.deepEqual(removed, []);
  const anonymous = createClient(url, key, options);
  assert.ok((await anonymous.from('game_library').select('*')).error);
  assert.ok((await anonymous.rpc('record_game_launch', { p_game_id: 'wardenfall' })).error);
  pass('Real RLS blocks cross-account reads, updates, inserts, deletes and anonymous RPC');

  const image = await a.request('/games/wardenfall/assets/towers-v2.png');
  assert.equal(image.status, 200);
  assert.ok((await image.arrayBuffer()).byteLength > 4_500_000);
  assert.equal((await a.request('/games/wardenfall/index.html')).status, 200);
  assert.equal((await a.request('/library')).status, 200);
  pass('Authenticated dashboard and complete large game asset are served');

  assert.equal((await a.request('/auth/signout', {})).status, 200);
  assert.equal((await a.request('/api/session')).status, 401);
  assert.equal((await a.request('/games/wardenfall/game.js')).status, 401);
  pass('Sign-out removes app access and direct game file access');

  // Optional handoff to a real browser. The file contains a short-lived, one-use link.
  // Call the cleanup script after browser validation; never commit this file.
  if (process.env.ASTRA_QA_BROWSER_FILE) {
    await writeFile(process.env.ASTRA_QA_BROWSER_FILE, JSON.stringify({
      userIds: created,
      url: origin + '/auth/callback?type=email&token_hash=' + encodeURIComponent(await link(a.email)),
    }), { mode: 0o600 });
    created.length = 0;
  }
  console.log(JSON.stringify({ passed, provider: 'Supabase', sentEmails: 0 }));
} finally {
  for (const id of created) ok(await admin.auth.admin.deleteUser(id), 'Remove temporary QA account');
  if (created.length) console.log('Temporary accounts and cascading library records removed.');
}
