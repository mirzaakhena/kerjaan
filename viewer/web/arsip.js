// Which projects this browser has archived, and the home page split into the
// active and archived tabs. Pure, so the tests run it in Node.

export const TABS = ['aktif', 'arsip'];

// Nothing remembered yet, or something unreadable, means nothing archived.
export function readArchived(stored) {
  try {
    const list = JSON.parse(stored);
    if (Array.isArray(list)) return new Set(list.filter((n) => typeof n === 'string'));
  } catch {
    // fall through to the default
  }
  return new Set();
}

// Where this browser keeps them. Storage can be missing or refuse (a private
// window); nothing is archived then.
export const ARCHIVED_KEY = 'kerjaan.proyek-arsip';
export function loadArchived() {
  try {
    return readArchived(localStorage.getItem(ARCHIVED_KEY));
  } catch {
    return readArchived(null);
  }
}

export function splitProjects(projects, archived) {
  return {
    aktif: projects.filter((p) => !archived.has(p.name)),
    arsip: projects.filter((p) => archived.has(p.name)),
  };
}

// The tab lives in the address (#arsip), so a reload or a shared link keeps it.
export const readTab = (hash) => (hash === '#arsip' ? 'arsip' : 'aktif');
