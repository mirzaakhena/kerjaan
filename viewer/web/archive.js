// Which projects this browser has archived, and the home page split into the
// active and archived tabs. Pure, so the tests run it in Node.

export const TABS = ['active', 'archived'];

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
export const ARCHIVED_KEY = 'kerjaan.archived-projects';
export function loadArchived() {
  try {
    return readArchived(localStorage.getItem(ARCHIVED_KEY));
  } catch {
    return readArchived(null);
  }
}

export function splitProjects(projects, archived) {
  return {
    active: projects.filter((p) => !archived.has(p.name)),
    archived: projects.filter((p) => archived.has(p.name)),
  };
}

// The tab lives in the address (#archived), so a reload or a shared link keeps it.
export const readTab = (hash) => (hash === '#archived' ? 'archived' : 'active');
