// Renders a ticket body to HTML. Small on purpose: it covers what tickets
// actually contain — headings, nested and task lists, fenced code, tables,
// quotes, strikethrough, links — and nothing else.
//
// Pure: no DOM, so the tests run it in Node. Every piece of text is escaped
// before markup is added, so a ticket can never inject HTML into the page.
//
//   render(markdown, { ticket(id) → { title, status } | null, href(id) → url })
//
// Ticket IDs become links: `[[id]]` always (marked missing when the board has
// no such ticket), and a bare 12-digit number only when the board has it.

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const SAFE_URL = /^(https?:|mailto:)/i;

function inline(text, opts) {
  // Code spans first, held out of every later rule.
  const held = [];
  const hold = (html) => `\u0000${held.push(html) - 1}\u0000`;
  let s = text.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) => hold(`<code>${esc(code.trim() === '' ? code : code.replace(/^ (.*) $/, '$1'))}</code>`));

  s = esc(s);

  // [[id]] — an explicit ticket reference.
  s = s.replace(/\[\[(\d{12})\]\]/g, (_, id) => hold(ticketLink(id, opts, true)));
  // [text](url)
  s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    const raw = url.replace(/&amp;/g, '&');
    return SAFE_URL.test(raw) ? hold(`<a href="${esc(raw)}" target="_blank" rel="noopener">${label}</a>`) : m;
  });
  // bare URLs
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, url) => pre + hold(`<a href="${url}" target="_blank" rel="noopener">${url}</a>`));
  // bare ticket IDs the board knows
  s = s.replace(/(^|[^\d\w])(\d{12})(?![\d\w])/g, (_, pre, id) => pre + hold(ticketLink(id, opts, false)));

  s = s
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+?)__/g, '<strong>$1</strong>')
    .replace(/~~([^~\n]+?)~~/g, '<del>$1</del>')
    .replace(/(^|[^*\w])\*([^*\n]+?)\*(?![*\w])/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_([^_\n]+?)_(?![_\w])/g, '$1<em>$2</em>');

  // Held pieces can nest (a link label holding code), so restore until stable.
  for (let i = 0; i < 3 && s.includes('\u0000'); i++) s = s.replace(/\u0000(\d+)\u0000/g, (_, n) => held[n]);
  return s;
}

function ticketLink(id, opts, explicit) {
  const t = opts.ticket?.(id);
  if (!t) return explicit ? `<span class="missing" title="Tidak ada tiket dengan ID ini di papan">[[${id}]]</span>` : id;
  const title = esc(t.title);
  return `<a class="tiket" data-id="${id}" href="${esc(opts.href ? opts.href(id) : '#' + id)}" title="${title} (${esc(t.status)})">${id}${explicit ? `<span class="t">${title}</span>` : ''}</a>`;
}

const ITEM = /^( *)([-*+]|\d+[.)])\s+(.*)$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

export function render(md, opts = {}) {
  const lines = String(md).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  const out = [];
  let i = 0;

  const isBlockStart = (l) =>
    /^ {0,3}#{1,6}\s/.test(l) || FENCE.test(l) || ITEM.test(l) || /^ {0,3}>/.test(l) || /^ {0,3}([-*_])( *\1){2,} *$/.test(l) || /^\s*\|.*\|\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }

    // fenced code
    const f = line.match(FENCE);
    if (f) {
      const fence = f[1];
      const body = [];
      i++;
      const closes = (l) => {
        const c = l.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
        return c && c[1][0] === fence[0] && c[1].length >= fence.length;
      };
      while (i < lines.length && !closes(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }

    // heading
    const h = line.match(/^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2], opts)}</h${h[1].length}>`); i++; continue; }

    // rule
    if (/^ {0,3}([-*_])( *\1){2,} *$/.test(line)) { out.push('<hr>'); i++; continue; }

    // quote
    if (/^ {0,3}>/.test(line)) {
      const body = [];
      while (i < lines.length && /^ {0,3}>/.test(lines[i])) { body.push(lines[i].replace(/^ {0,3}> ?/, '')); i++; }
      out.push(`<blockquote>${render(body.join('\n'), opts)}</blockquote>`);
      continue;
    }

    // table: a header row followed by a |---| row
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const cells = (l) => l.trim().slice(1, -1).split('|').map((c) => inline(c.trim(), opts));
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
      out.push(`<table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }

    // list
    if (ITEM.test(line)) {
      const [html, next] = list(lines, i, opts);
      out.push(html);
      i = next;
      continue;
    }

    // paragraph
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && (para.length === 0 || !isBlockStart(lines[i]))) { para.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(para.join('\n'), opts).replace(/\n/g, ' ')}</p>`);
  }
  return out.join('\n');
}

// A list runs until a line that is neither an item nor indented under one.
// Items nest by indentation; a line indented past an item's marker continues
// that item.
function list(lines, start, opts) {
  const items = [];
  let i = start;
  const baseIndent = lines[start].match(ITEM)[1].length;
  while (i < lines.length) {
    const m = lines[i].match(ITEM);
    if (!m || m[1].length !== baseIndent) break;
    const ordered = /\d/.test(m[2]);
    const contentIndent = m[1].length + m[2].length + 1;
    const own = [m[3]];
    const sub = [];
    i++;
    let blank = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (/^\s*$/.test(l)) { blank++; i++; continue; }
      const indent = l.match(/^ */)[0].length;
      if (indent <= baseIndent) break;
      if (sub.length === 0 && blank === 0 && !ITEM.test(l)) { own.push(l.trim()); i++; continue; }
      for (; blank > 0; blank--) sub.push('');
      sub.push(l.slice(Math.min(indent, contentIndent)));
      i++;
    }
    items.push({ ordered, own: own.join('\n'), sub: sub.join('\n') });
    if (blank > 0 && !(i < lines.length && lines[i].match(ITEM)?.[1].length === baseIndent)) break;
  }
  const ordered = items[0]?.ordered;
  const lis = items.map(({ own, sub }) => {
    const task = own.match(/^\[([ xX])\]\s*([\s\S]*)$/);
    const subHtml = sub.trim() ? render(sub, opts) : '';
    const text = inline(task ? task[2] : own, opts).replace(/\n/g, ' ');
    if (task) {
      const done = task[1] !== ' ';
      return `<li class="task${done ? ' done' : ''}"><span class="box" aria-label="${done ? 'tercentang' : 'belum'}">${done ? '✓' : ''}</span><div>${text}${subHtml}</div></li>`;
    }
    return `<li>${text}${subHtml}</li>`;
  });
  return [`<${ordered ? 'ol' : 'ul'}>${lis.join('')}</${ordered ? 'ol' : 'ul'}>`, i];
}
