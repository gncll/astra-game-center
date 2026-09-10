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
  return ['wardenfall','sunset','sidewalk','pine','mario'].includes(value);
}
export function playableGame(value) { return value === 'wardenfall'; }
export function libraryRows(rows) {
  return { favorites: rows.filter(row => row.favorite).map(row => row.game_id), recent: Object.fromEntries(rows.filter(row => row.last_launched_at).map(row => [row.game_id, row.last_launched_at])) };
}
