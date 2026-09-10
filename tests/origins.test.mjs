import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSiteOrigin, resolveAllowedOrigins } from '../lib/origins.mjs';
import { validMutation } from '../lib/security.mjs';

const production = {
  VERCEL_ENV: 'production',
  VERCEL_URL: 'astra-game-center-build123-team.vercel.app',
  VERCEL_PROJECT_PRODUCTION_URL: 'astra-game-center.vercel.app',
};

test('production aliases can submit sign-in and are the canonical callback origin', () => {
  const stable = 'https://astra-game-center.vercel.app';
  assert.equal(resolveSiteOrigin(production), stable);
  const headers = new Headers({ Origin: stable, 'Content-Type': 'application/json', 'X-Astra-Request': '1' });
  assert.equal(validMutation(headers, resolveAllowedOrigins(production)), true);
  headers.set('Origin', 'https://unrelated-project.vercel.app');
  assert.equal(validMutation(headers, resolveAllowedOrigins(production)), false);
});

test('preview deployments keep their own origin even when Vercel exposes the production URL', () => {
  const preview = { ...production, VERCEL_ENV: 'preview' };
  assert.equal(resolveSiteOrigin(preview), 'https://' + preview.VERCEL_URL);
  assert.equal(resolveAllowedOrigins(preview).includes('https://' + preview.VERCEL_PROJECT_PRODUCTION_URL), false);
});

test('explicit custom domains take precedence and local development keeps its origin', () => {
  const custom = { ...production, SITE_URL: 'https://games.example.com/' };
  assert.equal(resolveSiteOrigin(custom), 'https://games.example.com');
  assert.equal(resolveSiteOrigin({ SITE_URL: 'http://127.0.0.1:4194' }), 'http://127.0.0.1:4194');
  assert.equal(resolveSiteOrigin({}), 'http://127.0.0.1:4194');
  assert.throws(() => resolveSiteOrigin({ SITE_URL: 'http://games.example.com' }));
});
