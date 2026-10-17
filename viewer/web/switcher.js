// The project buttons in the board page's top bar: which projects they show,
// in what order, and which one is open now. Pure, so the tests run it in Node.

// The active (not archived) projects, by name, each marked whether it is the
// one open now.
export function switchList(projects, archived, current) {
  return projects
    .filter((p) => !archived.has(p.name))
    .map((p) => p.name)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, current: name === current }));
}
