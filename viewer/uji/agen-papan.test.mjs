// The board showing what agents do on its tickets, from made-up Claude Code
// logs in a temporary folder: through the server, then in a real browser.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ticket, makeBoard, tempRoot, startViewer, listenEvents, agentLog, appendLog, line, encodeProject } from './bantu.mjs';
import { openBrowser, chromePath } from './peramban.mjs';

const MIN = 60 * 1000;
const ID = {
  kerja: '260101000001', tinjau: '260101000002', diam: '260101000003', hilang: '260101000004',
  henti: '260101000005', selesai: '260101000006', lolos: '260101000007', kosong: '260101000008',
  todo: '260101000009', done: '260101000010',
};

// Words that only ever appear inside what a step carried: none may reach the page.
const SECRET = /RAHASIA/;

function setup() {
  const root = tempRoot();
  const body = '## Background\nx\n\n## Done when\n- [x] a\n- [ ] b\n\n## Notes\n(none yet)';
  const board = makeBoard(root, 'alpha', {
    [`in_progress/${ID.kerja} Dikerjakan.md`]: ticket({ body }),
    [`review/${ID.tinjau} Ditinjau.md`]: ticket({ body }),
    [`in_progress/${ID.diam} Diam.md`]: ticket({ body }),
    [`in_progress/${ID.hilang} Hilang.md`]: ticket({ body }),
    [`in_progress/${ID.henti} Dihentikan.md`]: ticket({ body }),
    [`in_progress/${ID.selesai} Selesai tapi masih in progress.md`]: ticket({ body }),
    [`review/${ID.lolos} Worker selesai menunggu reviewer.md`]: ticket({ body }),
    [`in_progress/${ID.kosong} Tanpa agen.md`]: ticket({ body }),
    [`todo/${ID.todo} Di todo.md`]: ticket({ body }),
    [`done/${ID.done} Di done.md`]: ticket({ body }),
  });
  const project = path.dirname(board);
  const claude = path.join(root, 'claude');
  const now = Date.now();
  const secrets = (at) => [
    line.think(at, 'RAHASIA-PIKIR'),
    line.say(at, 'RAHASIA-TEKS'),
    line.step(at, 'Grep', { pattern: 'RAHASIA-POLA' }),
    line.result(at, 'RAHASIA-HASIL'),
  ];
  const steps = (n, from, gap) => Array.from({ length: n }, (_, i) => line.step(from + i * gap, i % 3 ? 'Bash' : 'Read', i % 3 ? { description: `Langkah ${i}`, command: 'echo RAHASIA-PERINTAH' } : { file_path: path.join(project, `berkas-${i}.md`) }));
  const logs = {
    kerja: agentLog(claude, project, { id: 'kerja', description: `Kerjakan tiket ${ID.kerja}`, lines: [line.prompt(now - 34 * MIN, 'RAHASIA-PROMPT'), ...secrets(now - 30 * MIN), ...steps(19, now - 20 * MIN, 60000), line.step(now - 5000, 'Bash', { description: 'Update README API sections', command: 'RAHASIA-PERINTAH' })] }),
    tinjau: agentLog(claude, project, { id: 'tinjau', agentType: 'kerjaan:kerjaan-reviewer', description: `Tinjau tiket ${ID.tinjau}`, lines: [line.prompt(now - 3 * MIN, 'x'), line.step(now - 8000, 'Read', { file_path: path.join(project, 'viewer', 'app.mjs') })] }),
    diam: agentLog(claude, project, { id: 'diam', description: `Kerjakan tiket ${ID.diam}`, lines: [line.prompt(now - 10 * MIN, 'x'), line.step(now - 6 * MIN, 'Bash', { description: 'Jalankan uji' })] }),
    hilang: agentLog(claude, project, { id: 'hilang', description: `Kerjakan tiket ${ID.hilang}`, lines: [line.prompt(now - 90 * MIN, 'x'), line.step(now - 45 * MIN, 'Bash', { description: 'Langkah terakhir' })] }),
    henti: agentLog(claude, project, { id: 'henti', description: `Kerjakan tiket ${ID.henti}`, lines: [line.prompt(now - 9 * MIN, 'x'), line.step(now - 8 * MIN, 'Bash', { description: 'Baca tiket' }), line.result(now - 8 * MIN, 'x'), line.interrupt(now - 8 * MIN)] }),
    selesai: agentLog(claude, project, { id: 'selesai', description: `Kerjakan tiket ${ID.selesai}`, lines: [line.prompt(now - 9 * MIN, 'x'), line.step(now - 4 * MIN, 'SubagentHandback', { message: 'RAHASIA-LAPORAN' }), line.result(now - 4 * MIN, 'ok')] }),
    lolos: agentLog(claude, project, { id: 'lolos', description: `Kerjakan tiket ${ID.lolos}`, lines: [line.prompt(now - 9 * MIN, 'x'), line.step(now - 4 * MIN, 'SubagentHandback', {}), line.result(now - 4 * MIN, 'ok')] }),
    todo: agentLog(claude, project, { id: 'todo', description: `Kerjakan tiket ${ID.todo}`, lines: [line.prompt(now - 9 * MIN, 'x'), line.step(now - 4000, 'Bash', { description: 'x' })] }),
    done: agentLog(claude, project, { id: 'done', agentType: 'kerjaan:kerjaan-reviewer', description: `Tinjau tiket ${ID.done}`, lines: [line.prompt(now - 9 * MIN, 'x'), line.step(now - 4000, 'Bash', { description: 'x' })] }),
  };
  return { root, project, claude, board, logs, now };
}

const byId = (papan) => Object.fromEntries(papan.tickets.map((t) => [t.id, t]));

// ---------- through the server ----------

test('kanban: tiket in progress dan review membawa agennya; todo, done, dan tiket tanpa catatan tidak', async () => {
  const s = setup();
  const v = await startViewer(s.root, { claudeDir: s.claude });
  try {
    const t = byId(await (await v.get('/alpha/api/papan')).json());
    assert.deepEqual([t[ID.kerja].agent.kind, t[ID.kerja].agent.step.label, t[ID.kerja].agent.ended], ['worker', 'Update README API sections', null]);
    assert.deepEqual([t[ID.tinjau].agent.kind, t[ID.tinjau].agent.step.label], ['reviewer', 'viewer/app.mjs']);
    assert.equal(t[ID.henti].agent.ended, 'dihentikan');
    assert.equal(t[ID.selesai].agent.ended, 'selesai');
    for (const id of [ID.kosong, ID.todo, ID.done]) assert.ok(!('agent' in t[id]), `${id} tanpa agen`);
    assert.ok(Object.values(t).every((x) => !x.agent || !('steps' in x.agent)), 'kartu tidak membawa daftar langkah');
  } finally { await v.close(); }
});

test('isi tiket dan api/agen: 15 langkah terakhir, terlama dulu, dengan jamnya', async () => {
  const s = setup();
  const v = await startViewer(s.root, { claudeDir: s.claude });
  try {
    const [t] = await (await v.get(`/alpha/api/tiket/${ID.kerja}`)).json();
    assert.equal(t.agent.steps.length, 15);
    assert.equal(t.agent.steps.at(-1).label, 'Update README API sections');
    assert.ok(t.agent.steps.every((x, i, all) => typeof x.at === 'number' && (i === 0 || all[i - 1].at <= x.at)));
    assert.equal(t.agent.startedAt, s.now - 34 * MIN);
    const { agent } = await (await v.get(`/alpha/api/agen/${ID.kerja}`)).json();
    assert.deepEqual(agent, t.agent);
    for (const id of [ID.kosong, ID.todo, ID.done, '999999999999']) {
      assert.deepEqual(await (await v.get(`/alpha/api/agen/${id}`)).json(), { agent: null }, id);
    }
    const [todo] = await (await v.get(`/alpha/api/tiket/${ID.todo}`)).json();
    assert.ok(!('agent' in todo));
  } finally { await v.close(); }
});

test('isi perintah, hasil, pikiran, dan teks agen tidak pernah keluar dari server', async () => {
  const s = setup();
  const v = await startViewer(s.root, { claudeDir: s.claude });
  try {
    const seen = [await (await v.get('/alpha/api/papan')).text()];
    for (const id of Object.values(ID)) {
      seen.push(await (await v.get(`/alpha/api/tiket/${id}`)).text(), await (await v.get(`/alpha/api/agen/${id}`)).text());
    }
    const waiting = listenEvents(`${v.base}/alpha/events`, (x) => x.includes('event: agen'), 5000);
    await new Promise((r) => setTimeout(r, 300));
    appendLog(s.logs.kerja, ...[line.think(Date.now(), 'RAHASIA-PIKIR-2'), line.step(Date.now(), 'Bash', { description: 'Langkah lain', command: 'RAHASIA-PERINTAH-2' }), line.result(Date.now(), 'RAHASIA-HASIL-2')]);
    const got = await waiting;
    assert.ok(got.ok, 'kabar agen datang');
    seen.push(got.text);
    for (const text of seen) assert.ok(!SECRET.test(text), text.match(/.{0,80}RAHASIA.{0,40}/)?.[0]);
    assert.ok(seen.join('').includes('Langkah lain'), 'keterangan langkah tetap sampai');
  } finally { await v.close(); }
});

test('agen melangkah: halaman yang terbuka dikabari dalam beberapa detik, walau .kerjaan tidak berubah', async () => {
  const s = setup();
  const v = await startViewer(s.root, { claudeDir: s.claude });
  try {
    for (const [log, id, label] of [[s.logs.kerja, ID.kerja, 'Tulis uji baru'], [s.logs.tinjau, ID.tinjau, 'Periksa bukti']]) {
      const waiting = listenEvents(`${v.base}/alpha/events`, (x) => x.includes(label), 6000);
      await new Promise((r) => setTimeout(r, 300));
      const t0 = Date.now();
      appendLog(log, line.step(Date.now(), 'Bash', { description: label }));
      const got = await waiting;
      assert.ok(got.ok, `tidak ada kabar untuk ${id}: ${got.text.slice(-300)}`);
      assert.ok(Date.now() - t0 < 5000);
      const data = JSON.parse(got.text.split('event: agen\ndata: ').at(-1).split('\n')[0]);
      assert.equal(data[id].step.label, label);
      assert.ok(!got.text.includes('event: change'), 'papan sendiri tidak berubah');
    }
  } finally { await v.close(); }
});

test('catatan Claude Code tidak ada, tak terbaca, atau berformat lain: papan sama seperti tanpa fitur ini', async () => {
  const s = setup();
  const plain = await startViewer(s.root);
  let want;
  const strip = (p) => ({ ...p, readAt: 0 });
  try { want = strip(await (await plain.get('/alpha/api/papan')).json()); } finally { await plain.close(); }
  assert.ok(want.tickets.every((t) => !('agent' in t)));

  const broken = [
    ['folder tidak ada', path.join(s.root, 'tidak-ada')],
    ['projects berupa berkas', (() => { const d = path.join(s.root, 'c1'); fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'projects'), 'x'); return d; })()],
    ['format lain', (() => {
      const d = path.join(s.root, 'c2');
      const sub = path.join(d, 'projects', encodeProject(s.project), 'sesi', 'subagents');
      fs.mkdirSync(sub, { recursive: true });
      fs.writeFileSync(path.join(sub, 'agent-x.meta.json'), JSON.stringify({ type: 'baru', task: `Kerjakan tiket ${ID.kerja}` }));
      fs.writeFileSync(path.join(sub, 'agent-x.jsonl'), '{"event":"step","t":1}\nbukan json\n');
      fs.writeFileSync(path.join(sub, 'agent-y.meta.json'), JSON.stringify({ description: `Kerjakan tiket ${ID.tinjau}` }));
      fs.writeFileSync(path.join(sub, 'agent-y.jsonl'), '{"kind":"assistant","at":"2026"}\n');
      return d;
    })()],
  ];
  if (process.getuid?.() !== 0) {
    const d = path.join(s.root, 'c3');
    fs.cpSync(s.claude, d, { recursive: true });
    fs.chmodSync(path.join(d, 'projects'), 0o000);
    broken.push(['tak terbaca', d]);
  }
  try {
    for (const [name, dir] of broken) {
      const v = await startViewer(s.root, { claudeDir: dir });
      try {
        const r = await v.get('/alpha/api/papan');
        assert.equal(r.status, 200, name);
        assert.deepEqual(strip(await r.json()), want, name);
        const [t] = await (await v.get(`/alpha/api/tiket/${ID.kerja}`)).json();
        assert.ok(!('agent' in t), name);
        assert.deepEqual(await (await v.get(`/alpha/api/agen/${ID.kerja}`)).json(), { agent: null }, name);
      } finally { await v.close(); }
    }
  } finally {
    if (broken.at(-1)[0] === 'tak terbaca') fs.chmodSync(path.join(broken.at(-1)[1], 'projects'), 0o755);
  }
});

// ---------- in a real browser ----------

const browserTest = (name, fn) => test(name, { skip: chromePath() ? false : 'Chrome tidak terpasang' }, async () => {
  const s = setup();
  const v = await startViewer(s.root, { claudeDir: s.claude });
  const page = await openBrowser();
  try { await fn(s, v, page); } finally { await page?.close(); await v.close(); }
});

// What a card's agent line says and how it looks.
const cardAgent = (id) => {
  const card = document.querySelector(`.card[data-id="${id}"]`);
  const a = card?.querySelector('.agen');
  if (!a) return card ? { none: true, text: card.textContent } : null;
  const css = (el, p) => el && getComputedStyle(el)[p];
  return {
    tone: [...a.classList].filter((c) => c !== 'agen')[0],
    kind: a.querySelector('.jenis')?.textContent,
    word: a.querySelector('.keadaan')?.textContent || '',
    step: a.querySelector('.langkah')?.textContent,
    ago: a.querySelector('.lalu')?.textContent,
    dot: css(a.querySelector('.titik'), 'backgroundColor'),
    bg: css(a, 'backgroundColor'),
    border: css(card, 'borderTopColor'),
    agoSeen: (() => { const r = a.querySelector('.lalu').getBoundingClientRect(); const c = card.getBoundingClientRect(); return r.width > 0 && r.right <= c.right + 0.5; })(),
    belowTitle: a.getBoundingClientRect().top >= card.querySelector('.title').getBoundingClientRect().bottom - 0.5,
  };
};

browserTest('kartu: jenis agen, langkah terakhir, dan berapa lama yang lalu, di bawah judul', async (s, v, page) => {
  await page.size(1280, 800);
  // Whether the line is there the moment the card is drawn, before any timer.
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `new MutationObserver((_, o) => { const c = document.querySelector('.card[data-id="${ID.kerja}"]'); if (c) { window.__pertama = !!c.querySelector('.agen'); o.disconnect(); } }).observe(document, { childList: true, subtree: true });` });
  await page.goto(`${v.base}/alpha/`);
  await page.until(`() => window.__pertama !== undefined`);
  assert.equal(await page.eval('() => window.__pertama'), true, 'baris agen ada sejak kartu digambar');
  await page.until(`() => !!document.querySelector('.card[data-id="${ID.kerja}"] .agen')`);
  const kerja = await page.eval(cardAgent, ID.kerja);
  assert.deepEqual([kerja.tone, kerja.kind, kerja.word, kerja.step], ['jalan', 'worker', '', 'Update README API sections']);
  assert.match(kerja.ago, /^\d+ dtk lalu$/);
  assert.equal(kerja.belowTitle, true);
  assert.equal(kerja.agoSeen, true);
  const tinjau = await page.eval(cardAgent, ID.tinjau);
  assert.deepEqual([tinjau.tone, tinjau.kind, tinjau.step], ['jalan', 'reviewer', 'viewer/app.mjs']);
  for (const id of [ID.kosong, ID.todo, ID.done]) {
    const c = await page.eval(cardAgent, id);
    assert.equal(c.none, true, `${id} tanpa baris agen`);
    assert.ok(!/galat|error|tidak bisa/i.test(c.text), c.text);
  }
});

browserTest('kartu: berganti sendiri saat agen melangkah, dan "x lalu" terus berjalan, tanpa memuat ulang', async (s, v, page) => {
  await page.size(1280, 800);
  await page.goto(`${v.base}/alpha/`);
  await page.until(`() => !!document.querySelector('.card[data-id="${ID.kerja}"] .agen')`);
  await page.eval(`() => { window.__tetap = 1; document.querySelector('.card[data-id="${ID.kerja}"]').focus(); }`);
  for (const [log, id, label] of [[s.logs.kerja, ID.kerja, 'Langkah sesudahnya'], [s.logs.tinjau, ID.tinjau, 'Bandingkan dengan Done when']]) {
    const t0 = Date.now();
    appendLog(log, line.step(Date.now(), 'Bash', { description: label }));
    await page.until(`() => document.querySelector('.card[data-id="${id}"] .agen .langkah')?.textContent === ${JSON.stringify(label)}`, 6000);
    assert.ok(Date.now() - t0 < 6000, `${id}: ${Date.now() - t0} ms`);
  }
  assert.equal(await page.eval('() => window.__tetap'), 1, 'halaman tidak dimuat ulang');
  assert.equal(await page.eval(`() => document.activeElement?.dataset.id`), ID.kerja, 'fokus kartu tidak hilang');
  const before = (await page.eval(cardAgent, ID.kerja)).ago;
  await page.until(`() => document.querySelector('.card[data-id="${ID.kerja}"] .agen .lalu').textContent !== ${JSON.stringify(before)}`, 4000);
});

browserTest('penanda: tiap keadaan agen tampil berbeda; yang berhenti di in progress paling mencolok', async (s, v, page) => {
  await page.size(1280, 800);
  await page.goto(`${v.base}/alpha/`);
  await page.until(`() => document.querySelectorAll('.card .agen').length === 7`);
  const got = {};
  for (const [k, id] of Object.entries(ID)) got[k] = await page.eval(cardAgent, id);
  const want = { kerja: ['jalan', ''], tinjau: ['jalan', ''], diam: ['diam', 'diam'], hilang: ['berhenti', 'tidak ada kabar'], henti: ['berhenti', 'dihentikan'], selesai: ['berhenti', 'berhenti'], lolos: ['selesai', 'selesai'] };
  for (const [k, [tone, word]] of Object.entries(want)) assert.deepEqual([got[k].tone, got[k].word], [tone, word], k);
  // Each tone's dot in its own colour from the stylesheet: green, yellow, red.
  const color = (v) => { const el = document.createElement('i'); el.style.color = `var(${v})`; document.body.append(el); const c = getComputedStyle(el).color; el.remove(); return c; };
  const want2 = await page.eval(`() => (${color})('--agen-jalan') + '|' + (${color})('--agen-diam') + '|' + (${color})('--agen-berhenti')`);
  const [green, yellow, red] = want2.split('|');
  assert.equal(new Set([green, yellow, red]).size, 3);
  for (const k of ['kerja', 'tinjau']) assert.equal(got[k].dot, green, `${k}: hijau`);
  assert.equal(got.diam.dot, yellow, 'diam: kuning');
  for (const k of ['hilang', 'henti', 'selesai']) assert.equal(got[k].dot, red, `${k}: merah`);
  assert.ok(![green, yellow, red].includes(got.lolos.dot), 'selesai di review: tanpa warna keadaan');
  for (const k of ['hilang', 'henti', 'selesai']) {
    assert.notEqual(got[k].bg, 'rgba(0, 0, 0, 0)', `${k}: baris berlatar`);
    assert.equal(got[k].border, got[k].dot, `${k}: tepi kartu ikut merah`);
  }
  for (const k of ['kerja', 'diam', 'lolos']) {
    assert.equal(got[k].bg, 'rgba(0, 0, 0, 0)', `${k}: tanpa latar`);
    assert.notEqual(got[k].border, got.henti.dot, `${k}: tepi kartu biasa`);
  }
});

// The open drawer, measured.
const drawerAgent = () => {
  const d = document.getElementById('drawer');
  const head = document.getElementById('drawer-head');
  const body = document.getElementById('drawer-body');
  const line = head.querySelector('.agen');
  const det = body.querySelector('details.agen-langkah');
  const r = line?.getBoundingClientRect();
  return {
    drawer: d.clientHeight, head: head.offsetHeight,
    line: line ? { kind: line.querySelector('.jenis').textContent, step: line.querySelector('.langkah').textContent, ago: line.querySelector('.lalu').textContent, seen: r.width > 0 && r.right <= d.getBoundingClientRect().right } : null,
    details: det ? { open: det.open, summary: det.querySelector('summary').textContent, first: body.firstElementChild?.matches('.agen-blok'),
      rows: [...det.querySelectorAll('li')].map((li) => ({ time: li.querySelector('time')?.textContent, tool: li.querySelector('.alat')?.textContent, label: li.querySelector('.ket')?.textContent, shown: li.checkVisibility({ contentVisibilityAuto: true }) && li.getBoundingClientRect().height > 0 })) } : null,
    wide: [d, head, body].some((el) => el.scrollWidth > el.clientWidth) || document.documentElement.scrollWidth > innerWidth,
    overflowing: [...d.querySelectorAll('*')].filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && !el.matches('.langkah, .alat')).map((el) => el.className || el.tagName),
  };
};

const openTicket = async (v, page, id) => {
  await page.goto(`${v.base}/alpha/tiket/${id}`);
  await page.until(`() => document.querySelector('#drawer-head .top .mono')?.textContent === '${id}' && !!document.querySelector('#drawer-body .facts')`);
};

for (const [name, w, h] of [['jendela 1280×800', 1280, 800], ['ponsel 390×844', 390, 844]]) {
  browserTest(`laci di ${name}: baris agen di bagian diam, 15 langkah dengan jam dan lama berjalan, buka-tutup`, async (s, v, page) => {
    await page.size(w, h);
    await openTicket(v, page, ID.kerja);
    const m = await page.eval(drawerAgent);
    assert.deepEqual([m.line.kind, m.line.step, m.line.seen], ['worker', 'Update README API sections', true]);
    assert.match(m.line.ago, /dtk lalu$/);
    assert.ok(m.head <= m.drawer / 5, `bagian diam ${m.head} px > ${m.drawer / 5}`);
    assert.equal(m.details.first, true, 'daftar langkah di awal bagian bergulir');
    assert.equal(m.details.open, false, 'mula-mula tertutup');
    assert.match(m.details.summary, /15 langkah terakhir worker/);
    assert.match(m.details.summary, /berjalan 34 mnt/);
    assert.equal(m.details.rows.length, 15);
    assert.ok(m.details.rows.every((r) => !r.shown), 'tertutup: langkah tidak tampil');
    assert.deepEqual(m.wide, false);
    assert.deepEqual(m.overflowing, []);

    await page.eval(`() => document.querySelector('details.agen-langkah summary').click()`);
    const opened = await page.eval(drawerAgent);
    assert.equal(opened.details.open, true);
    assert.ok(opened.details.rows.every((r) => r.shown && /^\d\d:\d\d:\d\d$/.test(r.time) && r.tool && r.label), JSON.stringify(opened.details.rows[0]));
    assert.equal(opened.details.rows[0].label, 'Update README API sections', 'terbaru di atas');
    assert.equal(opened.details.rows.find((r) => r.tool === 'Read').label.endsWith('.md'), true, 'nama berkas yang dibaca');
    assert.deepEqual(opened.wide, false);
    assert.deepEqual(opened.overflowing, []);
    const top = await page.eval(drawerAgent);
    assert.ok(top.head <= top.drawer / 5);

    // A new step shows up in the head and in the open list, which stays open.
    appendLog(s.logs.kerja, line.step(Date.now(), 'Edit', { file_path: path.join(s.project, 'viewer', 'baru.js'), old_string: 'RAHASIA' }));
    await page.until(`() => document.querySelector('#drawer-head .agen .langkah')?.textContent === 'viewer/baru.js' && document.querySelector('details.agen-langkah li .ket')?.textContent === 'viewer/baru.js'`, 6000);
    assert.equal((await page.eval(drawerAgent)).details.open, true, 'tetap terbuka setelah diperbarui');
    assert.ok(!(await page.eval('() => document.body.innerHTML')).includes('RAHASIA'));

    await page.eval(`() => document.querySelector('details.agen-langkah summary').click()`);
    assert.equal((await page.eval(drawerAgent)).details.open, false, 'bisa ditutup lagi');
    await page.eval(`() => document.querySelector('#drawer-head [data-close]').click()`);
    await page.until(`() => document.getElementById('drawer').hidden && location.pathname === '/alpha/'`);
  });
}

browserTest('laci: reviewer di review; tiket tanpa agen dan tiket di todo tanpa baris agen dan tanpa pesan galat', async (s, v, page) => {
  await page.size(1280, 800);
  await openTicket(v, page, ID.tinjau);
  const t = await page.eval(drawerAgent);
  assert.deepEqual([t.line.kind, t.line.step], ['reviewer', 'viewer/app.mjs']);
  for (const id of [ID.kosong, ID.todo]) {
    await openTicket(v, page, id);
    const m = await page.eval(drawerAgent);
    assert.equal(m.line, null, id);
    assert.equal(m.details, null, id);
    assert.equal(await page.eval(`() => document.querySelectorAll('#drawer .notice').length`), 0, `${id}: tanpa pemberitahuan`);
  }
});

browserTest('catatan rusak: papan tampil seperti tanpa fitur ini, tanpa pesan galat', async (s, v, page) => {
  await v.close();
  const sub = path.join(s.root, 'rusak', 'projects', encodeProject(s.project), 'sesi', 'subagents');
  fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(sub, 'agent-x.meta.json'), '{rusak');
  fs.writeFileSync(path.join(sub, 'agent-x.jsonl'), 'bukan json\n');
  const v2 = await startViewer(s.root, { claudeDir: path.join(s.root, 'rusak') });
  try {
    await page.size(1280, 800);
    await page.goto(`${v2.base}/alpha/`);
    await page.until(`() => document.querySelectorAll('.card').length === 10`);
    assert.equal(await page.eval(`() => document.querySelectorAll('.card .agen').length`), 0);
    assert.ok(!/galat|error|tidak bisa dibaca/i.test(await page.eval('() => document.body.textContent')));
    await openTicket(v2, page, ID.kerja);
    assert.equal((await page.eval(drawerAgent)).line, null);
  } finally { await v2.close(); }
});
