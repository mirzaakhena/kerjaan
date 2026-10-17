// A ticket's "Done when" list drawn as a row of small pills, one per item in
// the order written: filled for a ticked item, outlined for an open one, and
// a thin dash for one struck through because it was voided or moved, so it
// does not read as work left behind. Used on the cards and in the drawer.
//
// `items` is the `doneWhen` list from board.mjs: [{ done, struck }, ...].

// What the row says in words, for the tooltip and for screen readers.
// Struck items are not counted as part of the work.
export function pillSummary(items) {
  const struck = items.filter((i) => i.struck).length;
  const open = items.filter((i) => !i.struck);
  const done = open.filter((i) => i.done).length;
  if (!open.length) return `${struck} ${struck === 1 ? 'item' : 'items'} struck out`;
  return `${done} of ${open.length} done${struck ? `, ${struck} struck out` : ''}`;
}

// The row as HTML, or '' for a ticket without a Done when list. The row is one
// image to assistive technology, named by its summary; the pills inside are
// decoration.
export function pills(items, { className = '' } = {}) {
  if (!items || !items.length) return '';
  const say = pillSummary(items);
  const each = items
    .map((i) => `<span class="pill${i.struck ? ' struck' : i.done ? ' done' : ''}"></span>`)
    .join('');
  return `<span class="pills${className ? ` ${className}` : ''}" role="img" aria-label="${say}" title="${say}">${each}</span>`;
}
