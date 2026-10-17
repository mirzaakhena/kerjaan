// Shared by the viewer's pages.

export const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel'];
export const statusName = (s) => s.replace('_', ' ');
export const statusColor = (s) => `var(--${s})`;

export async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${url}`), { status: res.status });
  return res.json();
}

// The dot in the top bar: green while the page is receiving live changes.
export function liveIndicator(el, source) {
  const on = () => { el.classList.add('on'); el.textContent = 'live'; el.title = 'The page follows the tickets as they change'; };
  const off = () => { el.classList.remove('on'); el.textContent = 'disconnected'; el.title = 'Not connected to the server; reconnecting…'; };
  source.addEventListener('open', on);
  source.addEventListener('error', off);
}
