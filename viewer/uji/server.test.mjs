import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ticket, makeBoard, tempRoot, startViewer, listenEvents } from './bantu.mjs';
import { mapData } from '../../skills/kerjaan/scripts/board.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ID = { a: '260101000001', b: '260101000002', c: '260101000003', d: '260101000004', rusak: '260101000005' };

function setup() {
  const root = tempRoot();
  makeBoard(root, 'alpha', {
    [`todo/${ID.a} Satu.md`]: ticket({ type: 'bug', priority: 'high', labels: 'mitra' }),
    [`todo/${ID.b} Dua.md`]: ticket({ related: ID.a }),
    [`done/${ID.c} Tiga.md`]: ticket({ body: '## Done when\n- [x] a\n- [ ] b\n\n## Notes\nLihat [[260101000001]].' }),
    [`backlog/${ID.rusak} Tanpa frontmatter.md`]: 'cuma teks\n',
    [`cancel/${ID.d} Empat.md`]: ticket(),
    [`cancel/${ID.d} Empat salinan.md`]: ticket(),
    'order.md': `Urutan\n\n- ${ID.b} Dua\n- ${ID.a} Satu\n`,
  });
  makeBoard(root, 'beta');
  fs.mkdirSync(path.join(root, 'bukan-proyek'));
  fs.writeFileSync(path.join(root, 'rahasia.txt'), 'RAHASIA-AKAR');
  fs.writeFileSync(path.join(root, 'alpha', 'kode.txt'), 'RAHASIA-KODE');
  return root;
}

test('halaman depan: hanya folder ber-.kerjaan, dengan jumlah per status', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const list = await (await v.get('/api/proyek')).json();
    assert.deepEqual(list.map((p) => p.name), ['alpha', 'beta']);
    assert.deepEqual(list[0].counts, { backlog: 1, todo: 2, in_progress: 0, review: 0, done: 1, cancel: 2 });
    assert.equal((await v.get('/')).status, 200);
  } finally { await v.close(); }
});

test('proyek baru muncul tanpa server dinyalakan ulang', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    assert.ok(!(await (await v.get('/api/proyek')).json()).some((p) => p.name === 'gamma'));
    makeBoard(root, 'gamma');
    const list = await (await v.get('/api/proyek')).json();
    assert.ok(list.some((p) => p.name === 'gamma'));
    assert.equal((await v.get('/gamma/')).status, 200);
  } finally { await v.close(); }
});

test('kanban: kartu sama persis dengan isi folder, termasuk berkas rusak', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const papan = await (await v.get('/alpha/api/papan')).json();
    const board = path.join(root, 'alpha', '.kerjaan');
    const onDisk = papan.statuses.flatMap((s) => fs.readdirSync(path.join(board, s)).filter((f) => f.endsWith('.md')).map((f) => `${s}/${f}`)).sort();
    assert.deepEqual(papan.tickets.map((t) => `${t.status}/${t.file}`).sort(), onDisk);
    const a = papan.tickets.find((t) => t.id === ID.a);
    assert.deepEqual([a.type, a.priority, a.labels, a.title], ['bug', 'high', ['mitra'], 'Satu']);
    assert.equal(papan.tickets.find((t) => t.id === ID.rusak).broken, true);
    assert.deepEqual(papan.order, [ID.b, ID.a]);
    assert.equal(papan.hasOrder, true);
    assert.ok(papan.tickets.every((t) => !('body' in t)), 'isi tiket tidak dikirim bersama kanban');
  } finally { await v.close(); }
});

test('isi tiket: satu per permintaan; ID ganda mengembalikan kedua berkas', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const [c] = await (await v.get(`/alpha/api/tiket/${ID.c}`)).json();
    assert.match(c.body, /- \[ \] b/);
    assert.deepEqual(c.checks, [1, 2]);
    assert.equal((await (await v.get(`/alpha/api/tiket/${ID.d}`)).json()).length, 2);
    assert.equal((await v.get('/alpha/api/tiket/999999999999')).status, 404);
  } finally { await v.close(); }
});

test('alamat halaman proyek dan tiket', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const r = await v.get('/alpha');
    assert.equal(r.status, 301);
    assert.equal(r.headers.get('location'), '/alpha/');
    assert.match(await (await v.get('/alpha/')).text(), /aset\/proyek\.js/);
    assert.match(await (await v.get(`/alpha/tiket/${ID.a}`)).text(), /aset\/proyek\.js/);
    assert.equal((await v.get('/alpha/map')).headers.get('location'), '/alpha/map/');
  } finally { await v.close(); }
});

test('order.md: halamannya sendiri, isinya apa adanya, 404 bila tidak ada', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    assert.match(await (await v.get('/alpha/urutan')).text(), /aset\/proyek\.js/);
    const { text } = await (await v.get('/alpha/api/urutan')).json();
    assert.equal(text, fs.readFileSync(path.join(root, 'alpha', '.kerjaan', 'order.md'), 'utf8'));
    assert.equal((await v.get('/beta/api/urutan')).status, 404);
  } finally { await v.close(); }
});

test('proyek yang tidak ada: halaman 404 dengan tautan ke depan, nama di-escape', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    for (const p of ['/tidak-ada/', '/bukan-proyek/', '/%3Cb%3Ex/']) {
      const r = await v.get(p);
      const html = await r.text();
      assert.equal(r.status, 404, p);
      assert.match(html, /href="\/"/);
      assert.ok(!html.includes('<b>x'), html);
    }
  } finally { await v.close(); }
});

test('alamat buatan tidak bisa membaca berkas di luar .kerjaan proyeknya', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const crafted = [
      '/..%2Frahasia.txt', '/%2E%2E/rahasia.txt', '/alpha/..%2Fkode.txt', '/alpha/..%2F..%2Frahasia.txt',
      '/alpha/kode.txt', '/alpha/.kerjaan/todo/', `/alpha/api/tiket/..%2F..%2Fkode.txt`,
      '/aset/..%2Fapp.mjs', '/aset/%2E%2E%2Fapp.mjs', '/aset/../app.mjs', '/aset/', '/../rahasia.txt',
      '/alpha/map/..%2F..%2Frahasia.txt', '/%2e%2e%2f%2e%2e%2frahasia.txt', '/alpha/api/tiket/%00',
    ];
    for (const p of crafted) {
      const r = await v.raw(p);
      assert.ok(r.status === 404 || r.status === 301, `${p} → ${r.status}`);
      assert.ok(!/RAHASIA|createViewer/.test(r.body), `${p} membocorkan isi berkas`);
    }
  } finally { await v.close(); }
});

test('hanya membaca: selain GET ditolak dan papan tidak berubah', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const before = fs.readdirSync(path.join(root, 'alpha', '.kerjaan', 'todo'));
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      assert.equal((await v.get(`/alpha/api/tiket/${ID.a}`, { method })).status, 405);
    }
    assert.deepEqual(fs.readdirSync(path.join(root, 'alpha', '.kerjaan', 'todo')), before);
  } finally { await v.close(); }
});

test('perubahan di papan dikabarkan ke halaman yang terbuka', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const board = path.join(root, 'alpha', '.kerjaan');
    const waiting = listenEvents(`${v.base}/alpha/events`, (t) => t.includes('event: change'));
    await new Promise((r) => setTimeout(r, 300));
    fs.renameSync(path.join(board, 'todo', `${ID.a} Satu.md`), path.join(board, 'done', `${ID.a} Satu.md`));
    const got = await waiting;
    assert.ok(got.ok, `tidak ada kabar perubahan; diterima: ${JSON.stringify(got.text)}`);
    const papan = await (await v.get('/alpha/api/papan')).json();
    assert.equal(papan.tickets.find((t) => t.id === ID.a).status, 'done');
  } finally { await v.close(); }
});

test('perubahan di proyek lain tidak dikabarkan', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const waiting = listenEvents(`${v.base}/alpha/events`, (t) => t.includes('event: change'), 1500);
    await new Promise((r) => setTimeout(r, 300));
    fs.writeFileSync(path.join(root, 'beta', '.kerjaan', 'todo', '260101000009 Lain.md'), ticket());
    assert.equal((await waiting).ok, false);
  } finally { await v.close(); }
});

test('tab Peta: map.html yang sama, data berbentuk sama dengan peta sendiri', async () => {
  const root = setup();
  const v = await startViewer(root);
  try {
    const html = await (await v.get('/alpha/map/')).text();
    const original = fs.readFileSync(path.join(here, '..', '..', 'skills', 'kerjaan', 'scripts', 'map.html'), 'utf8');
    assert.equal(html, original);
    const data = await (await v.get('/alpha/map/data')).json();
    const expected = mapData(path.join(root, 'alpha', '.kerjaan'));
    delete data.readAt;
    delete expected.readAt;
    assert.deepEqual(data, expected);
    assert.ok(!data.tickets.some((t) => t.id === ID.rusak), 'peta tetap melewatkan berkas tanpa frontmatter');
  } finally { await v.close(); }
});

function runCli(args) {
  const child = spawn(process.execPath, [path.join(here, '..', 'server.mjs'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  child.stdout.on('data', (c) => (out += c));
  child.stderr.on('data', (c) => (err += c));
  const exited = new Promise((r) => child.on('exit', (code) => r(code)));
  return { child, exited, out: () => out, err: () => err };
}

test('perintah: menyala, mencetak alamat 127.0.0.1, dan menolak tanpa --scan', async () => {
  const root = setup();
  const cli = runCli(['--scan', root, '--port', '0']);
  try {
    for (let i = 0; i < 50 && !cli.out().includes('kerjaan viewer:'); i++) await new Promise((r) => setTimeout(r, 100));
    const address = cli.out().match(/kerjaan viewer: (http:\/\/127\.0\.0\.1:\d+\/)/)?.[1];
    assert.ok(address, cli.out() + cli.err());
    assert.match(cli.out(), /2 proyek: alpha, beta/);
    const list = await (await fetch(`${address}api/proyek`)).json();
    assert.equal(list.length, 2);

    // Not reachable from another device: the port is closed on every
    // non-loopback address this machine has.
    const port = new URL(address).port;
    const lan = Object.values(os.networkInterfaces()).flat().filter((i) => i && !i.internal && i.family === 'IPv4');
    for (const i of lan) {
      await assert.rejects(fetch(`http://${i.address}:${port}/api/proyek`), `${i.address} menjawab`);
    }
  } finally {
    cli.child.kill();
  }
  const bare = runCli([]);
  assert.equal(await bare.exited, 1);
  assert.match(bare.err(), /--scan/);
});
