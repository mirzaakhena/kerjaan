// The viewer started with --lan: reachable from other devices on the same
// network (a phone on the same Wi-Fi), at the addresses it prints, with a
// warning. Without --lan it stays on loopback: see server.test.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { networkAddresses, lanLines } from '../lan.mjs';
import { statusName } from '../web/umum.js';
import { ticket, makeBoard, tempRoot, listenEvents, runCli } from './bantu.mjs';
import { openBrowser, chromePath } from './peramban.mjs';

const ID = { a: '260101000001', b: '260101000002', c: '260101000003' };
const WARNING = /anyone on the same network can read every board shown here/;

// ---------- which addresses are printed (pure) ----------

const v4 = (address, internal = false) => ({ address, family: 'IPv4', internal });
const v6 = (address, internal = false) => ({ address, family: 'IPv6', internal });

test('network addresses: every reachable IPv4 address with its interface, and nothing else', () => {
  const interfaces = {
    lo0: [v4('127.0.0.1', true), v6('::1', true)],
    en0: [v6('fe80::1'), v4('192.168.1.20')],
    en1: [v4('169.254.10.3')],
    utun3: [v4('10.8.0.2')],
    bridge0: undefined,
  };
  assert.deepEqual(networkAddresses(interfaces), [
    { name: 'en0', address: '192.168.1.20' },
    { name: 'utun3', address: '10.8.0.2' },
  ]);
  for (const [kind, list] of [['loopback', [v4('127.0.0.1', true)]], ['IPv6 only', [v6('fe80::1'), v6('2001:db8::1')]], ['link-local', [v4('169.254.1.1')]], ['no list', undefined]]) {
    assert.deepEqual(networkAddresses({ x: list }), [], kind);
  }
});

test('printed lines: one full address per network address, then the warning; none says so', () => {
  const at = (host) => `http://${host}:4321/alpha/`;
  const two = lanLines(at, { en0: [v4('192.168.1.20')], utun3: [v4('10.8.0.2')] });
  assert.equal(two.length, 3);
  assert.match(two[0], /\(en0\): http:\/\/192\.168\.1\.20:4321\/alpha\/$/);
  assert.match(two[1], /\(utun3\): http:\/\/10\.8\.0\.2:4321\/alpha\/$/);
  assert.match(two[2], WARNING);
  const none = lanLines(at, { lo0: [v4('127.0.0.1', true)] });
  assert.equal(none.length, 2);
  assert.match(none[0], /no network address/);
  assert.ok(!none[0].includes('http://'), 'no address offered when there is none');
  assert.match(none[1], WARNING);
});

// ---------- the running server ----------

function board() {
  const root = tempRoot();
  makeBoard(root, 'alpha', {
    [`todo/${ID.a} Satu.md`]: ticket({ type: 'bug', priority: 'high', labels: 'viewer', body: '## Background\nx\n\n## Done when\n- [x] a\n- [ ] b\n\n## Notes\n(none yet)' }),
    [`todo/${ID.b} A rather long title that a phone has to wrap over more than one line.md`]: ticket({ related: ID.a }),
    [`done/${ID.c} Tiga.md`]: ticket(),
    'order.md': `Order\n\n- ${ID.b} Two\n- ${ID.a} One\n`,
  });
  makeBoard(root, 'beta');
  return root;
}

// Starts the viewer as the owner would and waits for everything it prints.
async function start(args) {
  const cli = runCli(args);
  for (let i = 0; i < 100 && !/proyek:/.test(cli.out()); i++) await new Promise((r) => setTimeout(r, 100));
  const local = cli.out().match(/kerjaan viewer: (http:\/\/127\.0\.0\.1:(\d+)\/\S*)/);
  assert.ok(local, cli.out() + cli.err());
  return { cli, local: local[1], port: local[2] };
}

const here = networkAddresses();

for (const [order, args] of [
  ['--lan first', (root) => ['--lan', '--scan', root, '--project', 'alpha', '--port', '0']],
  ['--lan last, after --port', (root) => ['--scan', root, '--project', 'alpha', '--port', '0', '--lan']],
]) {
  test(`--lan (${order}): prints this machine's address, every network address and the warning; each network address serves the kanban, a ticket and live changes`, async () => {
    const root = board();
    const { cli, local, port } = await start(args(root));
    try {
      const out = cli.out();
      assert.match(out, WARNING);
      assert.equal((await fetch(`${local}`)).status, 200, 'this machine still opens it at 127.0.0.1');
      if (!here.length) assert.match(out, /no network address/);
      const boardDir = path.join(root, 'alpha', '.kerjaan');
      for (const { name, address } of here) {
        const base = `http://${address}:${port}`;
        assert.ok(out.includes(`(${name}): ${base}/alpha/`), `${address} printed with the project's path:\n${out}`);
        assert.match(await (await fetch(`${base}/alpha/`)).text(), /aset\/proyek\.js/);
        const papan = await (await fetch(`${base}/alpha/api/papan`)).json();
        assert.deepEqual(papan.tickets.map((t) => t.id).sort(), [ID.a, ID.b, ID.c]);
        const [a] = await (await fetch(`${base}/alpha/api/tiket/${ID.a}`)).json();
        assert.match(a.body, /- \[ \] b/);
        assert.equal((await fetch(`${base}/alpha/api/tiket/${ID.a}`, { method: 'POST' })).status, 405, 'still read-only');

        const waiting = listenEvents(`${base}/alpha/events`, (t) => t.includes('event: change'));
        await new Promise((r) => setTimeout(r, 300));
        const from = fs.readdirSync(path.join(boardDir, 'todo')).find((f) => f.startsWith(ID.a)) ? 'todo' : 'done';
        const to = from === 'todo' ? 'done' : 'todo';
        fs.renameSync(path.join(boardDir, from, `${ID.a} Satu.md`), path.join(boardDir, to, `${ID.a} Satu.md`));
        const got = await waiting;
        assert.ok(got.ok, `${address}: no live change arrived; got ${JSON.stringify(got.text)}`);
      }
    } finally {
      cli.child.kill();
    }
  });
}

// ---------- a phone on the same Wi-Fi ----------

// Wider than the screen: the page could be pushed sideways.
const sideways = () => document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth;

const skip = !chromePath() ? 'Chrome is not installed' : !here.length ? 'this machine has no network address' : false;

for (const [name, w, h] of [['phone 360×740', 360, 740], ['phone 390×844', 390, 844]]) {
  test(`${name}, at the network address: front page, kanban, ticket drawer and order.md fit the screen, and the page follows the board`, { skip }, async () => {
    const root = board();
    const { cli, port } = await start(['--scan', root, '--port', '0', '--lan']);
    const base = `http://${here[0].address}:${port}`;
    const page = await openBrowser();
    try {
      await page.size(w, h);

      await page.goto(`${base}/`);
      await page.until(`() => document.querySelectorAll('.project').length === 2`);
      assert.equal(await page.eval(sideways), false, 'front page');

      await page.goto(`${base}/alpha/`);
      await page.until(`() => document.querySelectorAll('.col.picked .card').length === 2 && document.getElementById('live').classList.contains('on')`);
      const kanban = await page.eval(`() => ({
        sideways: (${sideways})(),
        picker: getComputedStyle(document.getElementById('status-pick')).display !== 'none',
        cardsInside: [...document.querySelectorAll('.col.picked .card')].every((c) => c.getBoundingClientRect().right <= innerWidth + 0.5),
      })`);
      assert.deepEqual(kanban, { sideways: false, picker: true, cardsInside: true }, 'kanban');

      await page.eval(`() => document.querySelector('.card[data-id="${ID.a}"]').click()`);
      await page.until(`() => !document.getElementById('drawer').hidden && document.querySelector('#drawer-head .top .mono')?.textContent === '${ID.a}'`);
      const drawer = await page.eval(`() => ({ sideways: (${sideways})(), inside: document.getElementById('drawer').getBoundingClientRect().right <= innerWidth + 0.5 })`);
      assert.deepEqual(drawer, { sideways: false, inside: true }, 'ticket drawer');

      const boardDir = path.join(root, 'alpha', '.kerjaan');
      fs.renameSync(path.join(boardDir, 'todo', `${ID.a} Satu.md`), path.join(boardDir, 'done', `${ID.a} Satu.md`));
      await page.until(`() => document.querySelector('#drawer-head .status-pill')?.textContent === '${statusName('done')}' && document.querySelectorAll('.col.picked .card').length === 1`);

      await page.goto(`${base}/alpha/urutan`);
      await page.until(`() => document.querySelector('#drawer-body')?.textContent.includes('${ID.b}')`);
      assert.equal(await page.eval(sideways), false, 'order.md');
    } finally {
      await page?.close();
      cli.child.kill();
    }
  });
}

// ---------- written down ----------

test('README and the skill\'s viewer section say how to open the board from a phone', () => {
  const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8').replace(/\s+/g, ' ');
  const readme = read('README.md');
  const viewer = readme.slice(readme.indexOf('## The viewer'), readme.indexOf('## ', readme.indexOf('## The viewer') + 3));
  assert.match(viewer, /server\.mjs --scan \S+ (--port \d+ )?--lan/, 'README gives the command');
  assert.match(viewer, /phone/);
  assert.match(viewer, /anyone on the same network can read/, 'README warns');
  const skill = read('skills/kerjaan/SKILL.md');
  assert.match(skill.slice(skill.indexOf('**The viewer.**')), /^.{0,600}phone on the same Wi-Fi, add `--lan`/, 'the skill\'s viewer section names --lan');
});
