import settings from '../data/settings.json';

export function notTooRecent() {
  if (process.argv.includes('--force')) return true;

  const now = Date.now();
  const last_updated = Date.parse(settings.last_updated);

  return now - (12 * 60 * 60 * 1000) > last_updated;
}