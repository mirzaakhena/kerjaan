// Filtering and ordering the kanban's cards. Pure, so the tests run it in Node.

export const FILTER_KEYS = ['q', 'type', 'priority', 'label'];

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel'];

// Which kanban columns are hidden, as remembered by this browser. Nothing
// remembered yet, or something unreadable, means the default: cancel hidden,
// since abandoned work rarely bears on what happens next.
export const DEFAULT_HIDDEN = ['cancel'];
export function readHidden(stored) {
  try {
    const list = JSON.parse(stored);
    if (Array.isArray(list)) return new Set(list.filter((s) => STATUSES.includes(s)));
  } catch {
    // fall through to the default
  }
  return new Set(DEFAULT_HIDDEN);
}

export function readFilter(search) {
  const p = new URLSearchParams(search);
  return Object.fromEntries(FILTER_KEYS.map((k) => [k, p.get(k) || '']));
}

export function writeFilter(filter) {
  const p = new URLSearchParams();
  for (const k of FILTER_KEYS) if (filter[k]) p.set(k, filter[k]);
  const s = p.toString();
  return s ? `?${s}` : '';
}

// Every word typed must appear in the title or the ID, in any order.
export function matches(ticket, filter) {
  if (filter.type && ticket.type !== filter.type) return false;
  if (filter.priority && ticket.priority !== filter.priority) return false;
  if (filter.label && !ticket.labels.includes(filter.label)) return false;
  if (filter.q) {
    const hay = `${ticket.id} ${ticket.title}`.toLowerCase();
    if (!filter.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
  }
  return true;
}

const PRIORITY = { high: 0, medium: 1, low: 2 };
const byPriority = (a, b) => (PRIORITY[a.priority] ?? 3) - (PRIORITY[b.priority] ?? 3);
const recentFirst = (a, b) => (b.updated || '').localeCompare(a.updated || '') || b.id.localeCompare(a.id);

// todo follows order.md: ranked tickets first, in its order, then the rest by
// priority. Every other column shows the most recently touched first.
export function columnOrder(tickets, status, order = []) {
  const rank = new Map(order.map((id, i) => [id, i]));
  const list = [...tickets];
  if (status === 'todo') {
    return list.sort((a, b) => {
      const ra = rank.get(a.id);
      const rb = rank.get(b.id);
      if (ra !== undefined || rb !== undefined) return (ra ?? Infinity) - (rb ?? Infinity);
      return byPriority(a, b) || a.id.localeCompare(b.id);
    });
  }
  return list.sort(recentFirst);
}

// The choices each filter offers, with how many tickets carry each.
export function choices(tickets) {
  const tally = (pick) => {
    const m = new Map();
    for (const t of tickets) for (const v of pick(t)) if (v) m.set(v, (m.get(v) || 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  return {
    type: tally((t) => [t.type]),
    priority: tally((t) => [t.priority]).sort((a, b) => (PRIORITY[a[0]] ?? 3) - (PRIORITY[b[0]] ?? 3)),
    label: tally((t) => t.labels),
  };
}
