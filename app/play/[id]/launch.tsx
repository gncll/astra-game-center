'use client';
import { useEffect, useState } from 'react';
import { gameEntry } from '@/lib/security.mjs';
export default function Launch({ id, name }: { id: string; name: string }) {
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function open() {
      try {
        const response = await fetch('/api/play/' + encodeURIComponent(id), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Astra-Request': '1' }, body: '{}' });
        if (response.status === 401) { location.replace('/login'); return; }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not open your game.');
        if (data.url !== gameEntry(id)) throw new Error('Could not verify the game address.');
        if (active) { const silent = new URLSearchParams(location.search).get('silent') === '1'; location.replace(data.url + (silent ? '?silent=1' : '')); }
      } catch (error) { if (active) setError(error instanceof Error ? error.message : 'Please try again.'); }
    }
    open(); return () => { active = false; };
  }, [id, attempt]);
  return error ? <div><p className="launch-error" role="alert">{error}</p><button className="primary-button" onClick={() => { setError(''); setAttempt(attempt + 1); }}>Try again</button></div> : <p role="status"><span className="spinner" /> Getting {name} ready…</p>;
}
