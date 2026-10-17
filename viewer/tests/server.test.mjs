import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ticket, makeBoard, tempRoot, startViewer, listenEvents, runCli } from './helpers.mjs';

const ID = { a: '260101000001', b: '260101000002', c: '260101000003', d: '260101000004', broken: '260101000005' };

function setup() {
  const root = tempRoot();
  makeBoard(root, 'alpha', {
    [`todo/${ID.a} One.md`]: ticket({ type: 'bug', priority: 'high', labels: 'partner' }),
    [`todo/${ID.b} Two.md`]: ticket({ related: ID.a }),
    [`done/${ID.c} Three.md`]: ticket({ body: '## Done when\n- [x] a\n- [ ] b\n\n## Notes\nSee [[260101000001]].' }),
    [`backlog/${ID.broken} No frontmatter.md`]: 'just text\n',
    [`cancel/${ID.d} Four.md`]: ticket(),
    [`cancel/${ID.d} Four copy.md`]: ticket(),
    'order.md': `Order\n\n- ${ID.b} Two\n- ${ID.a} One\n`,
  });
  makeBoard(root, 'beta');
  fs.mkdirSync(path.join(root, 'not-a-project'));
  fs.writeFileSync(path.join(root, 'secret.txt'), 'SECRET-ROOT');
  fs.writeFileSync(path.join(root, 'alpha', 'code.txt'), 'SECRET-CODE');
  return root;
}

test('front page: only folders with .kerjaan, with their counts per status', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const list = await (await v.get('/api/projects')).json();
    assert.deepEqual(list.map((p) => p.name), ['alpha', 'beta']);
    assert.deepEqual(list[0].counts, { backlog: 1, todo: 2, in_progress: 0, review: 0, done: 1, cancel: 2 });
    assert.equal((await v.get('/')).status, 200);
  } finally { await v.close(); }
});

test('a new project shows up without restarting the server', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    assert.ok(!(await (await v.get('/api/projects')).json()).some((p) => p.name === 'gamma'));
    makeBoard(root, 'gamma');
    const list = await (await v.get('/api/projects')).json();
    assert.ok(list.some((p) => p.name === 'gamma'));
    assert.equal((await v.get('/gamma/')).status, 200);
  } finally { await v.close(); }
});

test('kanban: the cards match the folders exactly, broken files included', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const data = await (await v.get('/alpha/api/board')).json();
    const board = path.join(root, 'alpha', '.kerjaan');
    const onDisk = data.statuses.flatMap((s) => fs.readdirSync(path.join(board, s)).filter((f) => f.endsWith('.md')).map((f) => `${s}/${f}`)).sort();
    assert.deepEqual(data.tickets.map((t) => `${t.status}/${t.file}`).sort(), onDisk);
    const a = data.tickets.find((t) => t.id === ID.a);
    assert.deepEqual([a.type, a.priority, a.labels, a.title], ['bug', 'high', ['partner'], 'One']);
    assert.equal(data.tickets.find((t) => t.id === ID.broken).broken, true);
    assert.deepEqual(data.order, [ID.b, ID.a]);
    assert.equal(data.hasOrder, true);
    assert.ok(data.tickets.every((t) => !('body' in t)), 'the tickets\' text is not sent with the kanban');
    assert.deepEqual(data.tickets.find((t) => t.id === ID.c).doneWhen, [{ done: true, struck: false }, { done: false, struck: false }], 'a card gets the state of each Done when item, in order');
    assert.deepEqual(a.doneWhen, [], 'a ticket without Done when has no items');
  } finally { await v.close(); }
});

test('ticket text: one per request; a duplicate ID returns both files', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const [c] = await (await v.get(`/alpha/api/ticket/${ID.c}`)).json();
    assert.match(c.body, /- \[ \] b/);
    assert.deepEqual(c.checks, [1, 2]);
    assert.equal((await (await v.get(`/alpha/api/ticket/${ID.d}`)).json()).length, 2);
    assert.equal((await v.get('/alpha/api/ticket/999999999999')).status, 404);
  } finally { await v.close(); }
});

test('project and ticket page addresses; the old Indonesian addresses open nothing', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const r = await v.get('/alpha');
    assert.equal(r.status, 301);
    assert.equal(r.headers.get('location'), '/alpha/');
    assert.match(await (await v.get('/alpha/')).text(), /assets\/project\.js/);
    const pills = await v.get('/assets/pills.js');
    assert.equal(pills.status, 200, 'the pill drawer is served for the project page');
    assert.match(await pills.text(), /export function pills/);
    assert.match(await (await v.get(`/alpha/ticket/${ID.a}`)).text(), /assets\/project\.js/);
    assert.equal((await v.get('/alpha/map/')).status, 404);
    // Renamed without a redirect: each old address is a plain 404 now.
    const old = [
      '/api/proyek', '/aset/gaya.css', '/aset/proyek.js', '/aset/pil.js', '/aset/style.css',
      `/alpha/tiket/${ID.a}`, '/alpha/urutan', '/alpha/api/papan', '/alpha/api/urutan',
      `/alpha/api/tiket/${ID.a}`, `/alpha/api/agen/${ID.a}`,
    ];
    for (const p of old) {
      const res = await v.get(p);
      assert.equal(res.status, 404, p);
      assert.equal(res.headers.get('location'), null, `${p} redirects`);
    }
  } finally { await v.close(); }
});

test('order.md: its own page, its text as written, 404 when there is none', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    assert.match(await (await v.get('/alpha/order')).text(), /assets\/project\.js/);
    const { text } = await (await v.get('/alpha/api/order')).json();
    assert.equal(text, fs.readFileSync(path.join(root, 'alpha', '.kerjaan', 'order.md'), 'utf8'));
    assert.equal((await v.get('/beta/api/order')).status, 404);
  } finally { await v.close(); }
});

test('a project that does not exist: a 404 page linking to the front page, the name escaped', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    for (const p of ['/no-such-project/', '/not-a-project/', '/%3Cb%3Ex/']) {
      const r = await v.get(p);
      const html = await r.text();
      assert.equal(r.status, 404, p);
      assert.match(html, /href="\/"/);
      assert.ok(!html.includes('<b>x'), html);
    }
  } finally { await v.close(); }
});

test('a crafted address cannot read a file outside its project\'s .kerjaan', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const crafted = [
      '/..%2Fsecret.txt', '/%2E%2E/secret.txt', '/alpha/..%2Fcode.txt', '/alpha/..%2F..%2Fsecret.txt',
      '/alpha/code.txt', '/alpha/.kerjaan/todo/', `/alpha/api/ticket/..%2F..%2Fcode.txt`,
      '/assets/..%2Fapp.mjs', '/assets/%2E%2E%2Fapp.mjs', '/assets/../app.mjs', '/assets/', '/../secret.txt',
      '/alpha/map/..%2F..%2Fsecret.txt', '/%2e%2e%2f%2e%2e%2fsecret.txt', '/alpha/api/ticket/%00',
    ];
    for (const p of crafted) {
      const r = await v.raw(p);
      assert.ok(r.status === 404 || r.status === 301, `${p} → ${r.status}`);
      assert.ok(!/SECRET|createViewer/.test(r.body), `${p} leaks a file's contents`);
    }
  } finally { await v.close(); }
});

test('read-only: anything but GET is refused and the board is unchanged', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const before = fs.readdirSync(path.join(root, 'alpha', '.kerjaan', 'todo'));
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      assert.equal((await v.get(`/alpha/api/ticket/${ID.a}`, { method })).status, 405);
    }
    assert.deepEqual(fs.readdirSync(path.join(root, 'alpha', '.kerjaan', 'todo')), before);
  } finally { await v.close(); }
});

test('a change on the board reaches the open page', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const board = path.join(root, 'alpha', '.kerjaan');
    const waiting = listenEvents(`${v.base}/alpha/events`, (t) => t.includes('event: change'));
    await new Promise((r) => setTimeout(r, 300));
    fs.renameSync(path.join(board, 'todo', `${ID.a} One.md`), path.join(board, 'done', `${ID.a} One.md`));
    const got = await waiting;
    assert.ok(got.ok, `no change arrived; received: ${JSON.stringify(got.text)}`);
    const data = await (await v.get('/alpha/api/board')).json();
    assert.equal(data.tickets.find((t) => t.id === ID.a).status, 'done');
  } finally { await v.close(); }
});

test('a change in another project is not reported', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const waiting = listenEvents(`${v.base}/alpha/events`, (t) => t.includes('event: change'), 1500);
    await new Promise((r) => setTimeout(r, 300));
    fs.writeFileSync(path.join(root, 'beta', '.kerjaan', 'todo', '260101000009 Other.md'), ticket());
    assert.equal((await waiting).ok, false);
  } finally { await v.close(); }
});

test('command: starts, prints its 127.0.0.1 address, and refuses to start without --scan', async () => {
  const root = setup();
  const cli = runCli(['--scan', root, '--port', '0']);
  try {
    // The address and the scan arrive as two lines, possibly in two chunks.
    for (let i = 0; i < 50 && !/kerjaan viewer:[^]*projects?:/.test(cli.out()); i++) await new Promise((r) => setTimeout(r, 100));
    const address = cli.out().match(/kerjaan viewer: (http:\/\/127\.0\.0\.1:\d+\/)/)?.[1];
    assert.ok(address, cli.out() + cli.err());
    assert.match(cli.out(), /2 projects: alpha, beta/);
    const list = await (await fetch(`${address}api/projects`)).json();
    assert.equal(list.length, 2);

    // Not reachable from another device: the port is closed on every
    // non-loopback address this machine has.
    const port = new URL(address).port;
    const lan = Object.values(os.networkInterfaces()).flat().filter((i) => i && !i.internal && i.family === 'IPv4');
    for (const i of lan) {
      await assert.rejects(fetch(`http://${i.address}:${port}/api/projects`), `${i.address} answered`);
    }
  } finally {
    cli.child.kill();
  }
  const bare = runCli([]);
  assert.equal(await bare.exited, 1);
  assert.match(bare.err(), /--scan/);
});
