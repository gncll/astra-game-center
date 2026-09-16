export function isProtectedPath(path) {
  return ['/library', '/api', '/play', '/games'].some(prefix => path === prefix || path.startsWith(prefix + '/'));
}
export function isAssetPath(path) {
  return path.startsWith('/games/') && !path.endsWith('.html') && !path.endsWith('/');
}
export function validMutation(headers, origins) {
  return origins.includes(headers.get('origin')) && headers.get('x-astra-request') === '1' && headers.get('content-type')?.split(';')[0].trim() === 'application/json';
}
export function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function validGameId(value) {
  return ['wardenfall','sunset','sidewalk','pine','fine-print'].includes(value);
}
const entries = Object.freeze({ 'fine-print': '/games/fine-print/index.html', wardenfall: '/games/wardenfall/index.html', sidewalk: '/games/sidewalk/index.html', sunset: '/games/sunset/index.html', pine: '/games/pine/demo.html' });
export function gameEntry(value) { return Object.hasOwn(entries, value) ? entries[value] : null; }
export function playableGame(value) { return gameEntry(value) !== null; }
export function libraryRows(rows) {
  rows = rows.filter(row => validGameId(row.game_id));
  return { favorites: rows.filter(row => row.favorite).map(row => row.game_id), recent: Object.fromEntries(rows.filter(row => row.last_launched_at).map(row => [row.game_id, row.last_launched_at])) };
}
