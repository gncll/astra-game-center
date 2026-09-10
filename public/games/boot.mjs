import { watchLoading } from './loading.mjs';
const loading = watchLoading();
try {
  const response = await fetch('/api/session', { cache: 'no-store' });
  if (!response.ok) location.replace('/login');
  else {
    const data = await response.json();
    if (!/^[a-f0-9-]{36}$/i.test(data.user?.id || '')) throw new Error('Invalid account');
    globalThis.AstraGameUserId = data.user.id;
    globalThis.AstraSilentTest = new URLSearchParams(location.search).get('silent') === '1';
    const script = document.querySelector('script[data-game-entry]');
    const entry = new URL(script.dataset.gameEntry, location.href);
    if (entry.origin !== location.origin || !entry.pathname.startsWith('/games/')) throw new Error('Invalid game entry');
    loading.update('Loading the world, models and textures…');
    await import(entry.href);
  }
} catch (error) {
  console.error('Game loading failed', error);
  loading.fail();
}
