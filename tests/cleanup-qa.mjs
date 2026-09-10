import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
const path = process.env.ASTRA_QA_BROWSER_FILE;
assert.ok(path && process.env.ASTRA_QA_ADMIN_KEY, 'Provide the private browser handoff file and QA admin credential.');
const { userIds } = JSON.parse(await readFile(path, 'utf8'));
assert.ok(Array.isArray(userIds) && userIds.length <= 2);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.ASTRA_QA_ADMIN_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
for (const id of userIds) {
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error?.code === 'user_not_found') continue;
  assert.ok(!error, 'Could not verify QA account');
  assert.equal(data.user.app_metadata.astra_qa, true);
  assert.match(data.user.email, /^astra-qa-[a-f0-9-]+@example\.com$/);
  const removed = await admin.auth.admin.deleteUser(id);
  assert.ok(!removed.error, 'Could not remove QA account');
}
await unlink(path);
console.log('Temporary QA accounts, their library records and one-use browser link removed.');
