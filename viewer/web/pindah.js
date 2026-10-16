// The project switcher in the board page's top bar: which projects it lists,
// the key each one gets, and which key presses it answers. Pure, so the tests
// run it in Node.

// 1 to 9, then a to z: 35 projects get a key; any beyond that are listed
// without one.
export const KEYS = [...'123456789abcdefghijklmnopqrstuvwxyz'];

// The active (not archived) projects, by name, each with its key and whether
// it is the one open now.
export function switchList(projects, archived, current) {
  return projects
    .filter((p) => !archived.has(p.name))
    .map((p) => p.name)
    .sort((a, b) => a.localeCompare(b))
    .map((name, i) => ({ name, key: KEYS[i] || null, current: name === current }));
}

// Where a key goes when someone types into it, so a key press there is text.
function typingInto(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = (el.type || 'text').toLowerCase();
  return !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file', 'image'].includes(type);
}

// The project a key press switches to, or null. A press with Cmd, Ctrl, Alt
// or Shift is the browser's or the system's (Cmd+1 picks a tab), and a press
// while typing into a field is text.
export function keyTarget(e, list) {
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.isComposing || e.repeat) return null;
  if (typingInto(e.target)) return null;
  const hit = list.find((p) => p.key && p.key === e.key);
  return hit && !hit.current ? hit.name : null;
}
