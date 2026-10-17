import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { longLivedPatterns, globToRegExp, unmergedBranches } from '../gabung.mjs';
import { ticket, makeBoard, tempRoot, startViewer, listenEvents } from './bantu.mjs';
import { openBrowser, chromePath } from './peramban.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const UPDATE = path.join(here, '..', '..', 'skills', 'kerjaan', 'scripts', 'update-ticket.sh');

// ---------- pure ----------

test('long_lived_branches dibaca seperti update-ticket.sh membacanya', () => {
  assert.deepEqual(longLivedPatterns('---\nlong_lived_branches: []\n---'), []);
  assert.deepEqual(longLivedPatterns('---\nlong_lived_branches: [develop, "release/*", \'hotfix-?\']\n---'), ['develop', 'release/*', 'hotfix-?']);
  assert.deepEqual(longLivedPatterns('---\nlanguage: x\n---'), []);
  assert.deepEqual(longLivedPatterns(''), []);
});

test('pola cabang jangka panjang: glob seperti `case` di shell', () => {
  const m = (glob, name) => globToRegExp(glob).test(name);
  assert.ok(m('develop', 'develop'));
  assert.ok(!m('develop', 'develop-2'));
  assert.ok(m('release/*', 'release/261011073102'));
  assert.ok(m('*', 'a/b/c'), '* juga melewati /, seperti case');
  assert.ok(m('hotfix-?', 'hotfix-1'));
  assert.ok(!m('hotfix-?', 'hotfix-12'));
  assert.ok(m('v[0-9]', 'v3'));
  assert.ok(!m('v[!0-9]', 'v3'));
  assert.ok(m('a.b', 'a.b'));
  assert.ok(!m('a.b', 'axb'), 'titik bukan sembarang huruf');
  assert.ok(m('x+(y)', 'x+(y)'));
});

// ---------- a real repository ----------

const ID = {
  lepas: '261001000001', // done, branch with work outside main
  gabung: '261001000002', // done, branch already merged
  jangka: '261001000003', // done, branch listed as long-lived
  dua: '261001000004', // done, two branches
  ditahan: '261001000005', // done, merge held for the owner
  todo: '261001000006', // todo, its branch unmerged: not a done ticket
  bersih: '261001000007', // done, no branch at all
  mulai: '261001000008', // todo, used to ask the start gate
};

const ENV = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { env: ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// A branch off main with one commit of code on it.
function branchWithWork(dir, name) {
  git(dir, 'branch', name, 'main');
  git(dir, 'checkout', '-q', name);
  const file = `${name.replace(/\W/g, '_')}.txt`;
  fs.writeFileSync(path.join(dir, file), name);
  git(dir, 'add', '--', file);
  git(dir, 'commit', '-q', '-m', `work ${name}`);
  git(dir, 'checkout', '-q', 'main');
}

const held = '## Done when\n- [x] a\n\n## Notes\n- 2026-10-16 10:00:00: merge held for the owner — uncommitted changes in the main tree\n';

function repoProject(root, name = 'repo', { longLived = '[release/*]' } = {}) {
  const board = makeBoard(root, name, {
    [`done/${ID.lepas} Lepas.md`]: ticket(),
    [`done/${ID.gabung} Sudah gabung.md`]: ticket(),
    [`done/${ID.jangka} Jangka panjang.md`]: ticket(),
    [`done/${ID.dua} Dua cabang.md`]: ticket(),
    [`done/${ID.ditahan} Ditahan.md`]: ticket({ body: held }),
    [`todo/${ID.todo} Masih todo.md`]: ticket(),
    [`done/${ID.bersih} Tanpa cabang.md`]: ticket(),
    [`todo/${ID.mulai} Mulai.md`]: ticket(),
    'settings.md': `---\nlanguage: Bahasa Indonesia\nlong_lived_branches: ${longLived}\n---\n`,
  });
  const dir = path.dirname(board);
  fs.writeFileSync(path.join(dir, 'kode.txt'), 'awal');
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'awal');
  branchWithWork(dir, `tiket-${ID.lepas}`);
  branchWithWork(dir, `tiket-${ID.gabung}`);
  git(dir, 'merge', '-q', '--no-ff', '-m', 'gabung', `tiket-${ID.gabung}`);
  branchWithWork(dir, `release/${ID.jangka}`);
  branchWithWork(dir, `tiket-${ID.dua}`);
  branchWithWork(dir, `coba/${ID.dua}-lain`);
  branchWithWork(dir, `tiket-${ID.ditahan}`);
  branchWithWork(dir, `tiket-${ID.todo}`);
  return dir;
}

const marks = (papan) => Object.fromEntries(papan.tickets.filter((t) => t.unmerged).map((t) => [t.id, t.unmerged]));
const readPapan = async (v, name = 'repo') => (await v.get(`/${name}/api/papan`)).json();

test('tiket done yang cabangnya punya kerja di luar main ditandai beserta nama cabangnya', async () => {
  const root = tempRoot();
  repoProject(root);
  const v = await startViewer(root);
  try {
    assert.deepEqual(marks(await readPapan(v)), {
      [ID.lepas]: [`tiket-${ID.lepas}`],
      [ID.dua]: [`coba/${ID.dua}-lain`, `tiket-${ID.dua}`],
      // held for the owner: still not on main, so still marked
      [ID.ditahan]: [`tiket-${ID.ditahan}`],
    });
  } finally { await v.close(); }
});

test('tanda per kasus: sudah digabung, jangka panjang, bukan done, tanpa cabang — tidak ditandai', async () => {
  const root = tempRoot();
  repoProject(root);
  const v = await startViewer(root);
  try {
    const papan = await readPapan(v);
    const byId = Object.fromEntries(papan.tickets.map((t) => [t.id, t]));
    for (const id of [ID.gabung, ID.jangka, ID.todo, ID.bersih, ID.mulai]) {
      assert.equal(byId[id].unmerged, undefined, id);
    }
  } finally { await v.close(); }
});

test('cabang jangka panjang: tanpa pengaturan itu, cabang yang sama ditandai', async () => {
  const root = tempRoot();
  repoProject(root, 'repo', { longLived: '[]' });
  const v = await startViewer(root);
  try {
    assert.deepEqual(marks(await readPapan(v))[ID.jangka], [`release/${ID.jangka}`]);
  } finally { await v.close(); }
});

test('papan dan gerbang mulai update-ticket.sh sepakat cabang mana yang belum digabung', async () => {
  const root = tempRoot();
  const dir = repoProject(root);
  const unmerged = await unmergedBranches(dir);
  const fromViewer = [...new Set([...unmerged.values()].flat())]
    .filter((b) => !b.includes(ID.todo) && !b.includes(ID.ditahan)).sort();
  const r = spawnSync('bash', [UPDATE, ID.mulai, '--status', 'in_progress'], { cwd: dir, env: ENV, encoding: 'utf8' });
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /REFUSED/);
  // The gate names every unmerged branch of every ticket (todo's too), and
  // passes over the held one with a note; the board marks done tickets only.
  const named = [...r.stderr.matchAll(/^ {4}(\S+) — /gm)].map((m) => m[1]).filter((b) => !b.includes(ID.todo)).sort();
  assert.deepEqual(named, fromViewer);
  assert.match(r.stderr, new RegExp(`tiket-${ID.ditahan} is not in HEAD, but its merge is held`));
});

test('tanda hilang sendiri setelah cabang digabung atau dihapus, juga di halaman yang sedang terbuka', async () => {
  const root = tempRoot();
  const dir = repoProject(root);
  const v = await startViewer(root);
  try {
    assert.ok(marks(await readPapan(v))[ID.lepas]);
    // A page open on the board hears of it, though nothing under .kerjaan/ moved.
    const merged = listenEvents(`${v.base}/repo/events`, (t) => t.includes('event: change'), 8000);
    await new Promise((r) => setTimeout(r, 300));
    git(dir, 'merge', '-q', '--no-ff', '-m', 'gabung', `tiket-${ID.lepas}`);
    assert.ok((await merged).ok, 'halaman diberi tahu setelah digabung');
    assert.equal(marks(await readPapan(v))[ID.lepas], undefined);

    const deleted = listenEvents(`${v.base}/repo/events`, (t) => t.includes('event: change'), 8000);
    await new Promise((r) => setTimeout(r, 300));
    git(dir, 'branch', '-q', '-D', `tiket-${ID.ditahan}`);
    assert.ok((await deleted).ok, 'halaman diberi tahu setelah dihapus');
    const now = marks(await readPapan(v));
    assert.equal(now[ID.ditahan], undefined);
    // One of two branches deleted: the other is still named.
    git(dir, 'branch', '-q', '-D', `tiket-${ID.dua}`);
    assert.deepEqual(marks(await readPapan(v))[ID.dua], [`coba/${ID.dua}-lain`]);
  } finally { await v.close(); }
});

test('proyek yang bukan repo git, atau repo tanpa commit: tampil tanpa galat dan tanpa tanda', async () => {
  const root = tempRoot();
  makeBoard(root, 'polos', { [`done/${ID.lepas} Lepas.md`]: ticket() });
  const kosong = path.dirname(makeBoard(root, 'kosong', { [`done/${ID.lepas} Lepas.md`]: ticket() }));
  git(kosong, 'init', '-q', '-b', 'main');
  // A git repository above the projects must not lend them its branches.
  git(root, 'init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(root, 'x.txt'), 'x');
  git(root, 'add', 'x.txt');
  git(root, 'commit', '-q', '-m', 'x');
  branchWithWork(root, `tiket-${ID.lepas}`);
  const v = await startViewer(root);
  try {
    for (const name of ['polos', 'kosong']) {
      const res = await v.get(`/${name}/api/papan`);
      assert.equal(res.status, 200, name);
      const papan = await res.json();
      assert.equal(papan.tickets.length, 1, name);
      assert.deepEqual(marks(papan), {}, name);
      assert.equal((await v.get(`/${name}/`)).status, 200, name);
    }
    assert.deepEqual((await (await v.get('/api/proyek')).json()).map((p) => p.name), ['kosong', 'polos']);
  } finally { await v.close(); }
});

// ---------- in a real browser ----------

const LONG = `tiket-${ID.dua}-cabang-dengan-nama-yang-sangat-panjang-sekali-untuk-diuji`;

test('tanda di kartu: terbaca di layar lebar, di ponsel, dan di mode gelap', { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
  const root = tempRoot();
  const dir = repoProject(root);
  branchWithWork(dir, LONG);
  const v = await startViewer(root);
  try {
    for (const dark of [false, true]) {
      const page = await openBrowser({ dark });
      if (!page) return;
      try {
        for (const [w, h, where] of [[1280, 800, 'lebar'], [375, 700, 'ponsel']]) {
          await page.size(w, h);
          await page.goto(`${v.base}/repo/`);
          await page.until(() => document.querySelectorAll('.card').length > 0);
          await page.eval(() => document.fonts.ready.then(() => true));
          if (where === 'ponsel') {
            // On a phone one column shows at a time: pick done.
            await page.eval(() => { document.querySelector('[data-status="done"]').click(); return true; });
            await page.until(() => document.querySelector('.col.picked')?.getAttribute('aria-label') === 'done');
          }
          const look = await page.eval((ids) => {
            const card = (id) => document.querySelector(`.card[data-id="${id}"]`);
            const mark = (id) => card(id)?.querySelector('.belum-gabung');
            const r = (el) => el.getBoundingClientRect();
            const m = mark(ids.lepas);
            const long = mark(ids.dua);
            const cs = getComputedStyle(m);
            return {
              dark: matchMedia('(prefers-color-scheme: dark)').matches,
              text: m?.textContent.trim(),
              branches: [...long.querySelectorAll('.cabang')].map((c) => c.textContent),
              tip: m.title.includes(`tiket-${ids.lepas}`),
              // marked ones only; every other card has no mark
              markedIds: [...document.querySelectorAll('.belum-gabung')].map((x) => x.closest('.card').dataset.id).sort(),
              inCard: [m, long].every((x) => r(x).left >= r(x.closest('.card')).left && r(x).right <= r(x.closest('.card')).right + 0.5),
              visible: r(m).width > 0 && r(m).height > 0,
              noSideScroll: document.documentElement.scrollWidth <= innerWidth,
              bg: cs.backgroundColor,
              ink: cs.color,
            };
          }, ID);
          const want = dark ? { bg: 'rgb(58, 42, 16)', ink: 'rgb(255, 207, 135)' } : { bg: 'rgb(255, 244, 224)', ink: 'rgb(138, 83, 0)' };
          assert.deepEqual(look, {
            dark,
            text: `belum digabung tiket-${ID.lepas}`,
            branches: [`coba/${ID.dua}-lain`, `tiket-${ID.dua}`, LONG].sort(),
            tip: true,
            markedIds: [ID.lepas, ID.dua, ID.ditahan].sort(),
            inCard: true,
            visible: true,
            noSideScroll: true,
            ...want,
          }, `${where} ${dark ? 'gelap' : 'terang'}`);
          // GABUNG_SHOT=<path prefix> keeps a picture of each, to look at by eye.
          if (process.env.GABUNG_SHOT) await page.screenshot(`${process.env.GABUNG_SHOT}-${where}-${dark ? 'gelap' : 'terang'}.png`);
        }
      } finally {
        await page.close();
      }
    }
  } finally { await v.close(); }
});

test('tanda di kartu hilang sendiri di halaman yang terbuka saat cabangnya dihapus', { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
  const root = tempRoot();
  const dir = repoProject(root);
  const v = await startViewer(root);
  const page = await openBrowser();
  if (!page) { await v.close(); return; }
  try {
    await page.size(1280, 800);
    await page.goto(`${v.base}/repo/`);
    await page.until(() => document.querySelector('.card .belum-gabung'));
    await page.until(() => document.getElementById('live').classList.contains('on'));
    git(dir, 'branch', '-q', '-D', `tiket-${ID.lepas}`);
    await page.until(() => !document.querySelector(`.card[data-id="261001000001"] .belum-gabung`), 8000);
    assert.ok(await page.eval(() => !!document.querySelector('.card[data-id="261001000005"] .belum-gabung')));
  } finally {
    await page.close();
    await v.close();
  }
});
