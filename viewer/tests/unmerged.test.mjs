import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { longLivedPatterns, globToRegExp, unmergedBranches } from '../unmerged.mjs';
import { ticket, makeBoard, tempRoot, startViewer, listenEvents } from './helpers.mjs';
import { openBrowser, chromePath } from './browser.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const UPDATE = path.join(here, '..', '..', 'skills', 'kerjaan', 'scripts', 'update-ticket.sh');

// ---------- pure ----------

test('long_lived_branches read the way update-ticket.sh reads it', () => {
  assert.deepEqual(longLivedPatterns('---\nlong_lived_branches: []\n---'), []);
  assert.deepEqual(longLivedPatterns('---\nlong_lived_branches: [develop, "release/*", \'hotfix-?\']\n---'), ['develop', 'release/*', 'hotfix-?']);
  assert.deepEqual(longLivedPatterns('---\nlanguage: x\n---'), []);
  assert.deepEqual(longLivedPatterns(''), []);
});

test('long-lived branch patterns: globs as in a shell `case`', () => {
  const m = (glob, name) => globToRegExp(glob).test(name);
  assert.ok(m('develop', 'develop'));
  assert.ok(!m('develop', 'develop-2'));
  assert.ok(m('release/*', 'release/261011073102'));
  assert.ok(m('*', 'a/b/c'), '* also crosses /, as in case');
  assert.ok(m('hotfix-?', 'hotfix-1'));
  assert.ok(!m('hotfix-?', 'hotfix-12'));
  assert.ok(m('v[0-9]', 'v3'));
  assert.ok(!m('v[!0-9]', 'v3'));
  assert.ok(m('a.b', 'a.b'));
  assert.ok(!m('a.b', 'axb'), 'a dot is not any character');
  assert.ok(m('x+(y)', 'x+(y)'));
});

// ---------- a real repository ----------

const ID = {
  loose: '261001000001', // done, branch with work outside main
  merged: '261001000002', // done, branch already merged
  longLived: '261001000003', // done, branch listed as long-lived
  two: '261001000004', // done, two branches
  held: '261001000005', // done, merge held for the owner
  todo: '261001000006', // todo, its branch unmerged: not a done ticket
  clean: '261001000007', // done, no branch at all
  start: '261001000008', // todo, used to ask the start gate
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

const heldBody = '## Done when\n- [x] a\n\n## Notes\n- 2026-10-16 10:00:00: merge held for the owner — uncommitted changes in the main tree\n';

function repoProject(root, name = 'repo', { longLived = '[release/*]' } = {}) {
  const board = makeBoard(root, name, {
    [`done/${ID.loose} Loose.md`]: ticket(),
    [`done/${ID.merged} Already merged.md`]: ticket(),
    [`done/${ID.longLived} Long-lived.md`]: ticket(),
    [`done/${ID.two} Two branches.md`]: ticket(),
    [`done/${ID.held} Held.md`]: ticket({ body: heldBody }),
    [`todo/${ID.todo} Still todo.md`]: ticket(),
    [`done/${ID.clean} No branch.md`]: ticket(),
    [`todo/${ID.start} Start.md`]: ticket(),
    'settings.md': `---\nlanguage: English\nlong_lived_branches: ${longLived}\n---\n`,
  });
  const dir = path.dirname(board);
  fs.writeFileSync(path.join(dir, 'code.txt'), 'first');
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'first');
  branchWithWork(dir, `ticket-${ID.loose}`);
  branchWithWork(dir, `ticket-${ID.merged}`);
  git(dir, 'merge', '-q', '--no-ff', '-m', 'merge', `ticket-${ID.merged}`);
  branchWithWork(dir, `release/${ID.longLived}`);
  branchWithWork(dir, `ticket-${ID.two}`);
  branchWithWork(dir, `try/${ID.two}-other`);
  branchWithWork(dir, `ticket-${ID.held}`);
  branchWithWork(dir, `ticket-${ID.todo}`);
  return dir;
}

const marks = (data) => Object.fromEntries(data.tickets.filter((t) => t.unmerged).map((t) => [t.id, t.unmerged]));
const readBoardData = async (v, name = 'repo') => (await v.get(`/${name}/api/board`)).json();

test('a done ticket whose branch holds work outside main is marked, with its branch\'s name', async () => {
  const root = tempRoot();
  repoProject(root);
  const v = await startViewer(root);
  try {
    assert.deepEqual(marks(await readBoardData(v)), {
      [ID.loose]: [`ticket-${ID.loose}`],
      [ID.two]: [`ticket-${ID.two}`, `try/${ID.two}-other`],
      // held for the owner: still not on main, so still marked
      [ID.held]: [`ticket-${ID.held}`],
    });
  } finally { await v.close(); }
});

test('the mark per case: already merged, long-lived, not done, no branch — not marked', async () => {
  const root = tempRoot();
  repoProject(root);
  const v = await startViewer(root);
  try {
    const data = await readBoardData(v);
    const byId = Object.fromEntries(data.tickets.map((t) => [t.id, t]));
    for (const id of [ID.merged, ID.longLived, ID.todo, ID.clean, ID.start]) {
      assert.equal(byId[id].unmerged, undefined, id);
    }
  } finally { await v.close(); }
});

test('long-lived branches: without that setting, the same branch is marked', async () => {
  const root = tempRoot();
  repoProject(root, 'repo', { longLived: '[]' });
  const v = await startViewer(root);
  try {
    assert.deepEqual(marks(await readBoardData(v))[ID.longLived], [`release/${ID.longLived}`]);
  } finally { await v.close(); }
});

test('the board and update-ticket.sh\'s start gate agree on which branches are unmerged', async () => {
  const root = tempRoot();
  const dir = repoProject(root);
  const unmerged = await unmergedBranches(dir);
  const fromViewer = [...new Set([...unmerged.values()].flat())]
    .filter((b) => !b.includes(ID.todo) && !b.includes(ID.held)).sort();
  const r = spawnSync('bash', [UPDATE, ID.start, '--status', 'in_progress'], { cwd: dir, env: ENV, encoding: 'utf8' });
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /REFUSED/);
  // The gate names every unmerged branch of every ticket (todo's too), and
  // passes over the held one with a note; the board marks done tickets only.
  const named = [...r.stderr.matchAll(/^ {4}(\S+) — /gm)].map((m) => m[1]).filter((b) => !b.includes(ID.todo)).sort();
  assert.deepEqual(named, fromViewer);
  assert.match(r.stderr, new RegExp(`ticket-${ID.held} is not in HEAD, but its merge is held`));
});

test('the mark goes by itself once the branch is merged or deleted, on an open page too', async () => {
  const root = tempRoot();
  const dir = repoProject(root);
  const v = await startViewer(root);
  try {
    assert.ok(marks(await readBoardData(v))[ID.loose]);
    // A page open on the board hears of it, though nothing under .kerjaan/ moved.
    const merged = listenEvents(`${v.base}/repo/events`, (t) => t.includes('event: change'), 8000);
    await new Promise((r) => setTimeout(r, 300));
    git(dir, 'merge', '-q', '--no-ff', '-m', 'merge', `ticket-${ID.loose}`);
    assert.ok((await merged).ok, 'the page is told once it is merged');
    assert.equal(marks(await readBoardData(v))[ID.loose], undefined);

    const deleted = listenEvents(`${v.base}/repo/events`, (t) => t.includes('event: change'), 8000);
    await new Promise((r) => setTimeout(r, 300));
    git(dir, 'branch', '-q', '-D', `ticket-${ID.held}`);
    assert.ok((await deleted).ok, 'the page is told once it is deleted');
    const now = marks(await readBoardData(v));
    assert.equal(now[ID.held], undefined);
    // One of two branches deleted: the other is still named.
    git(dir, 'branch', '-q', '-D', `ticket-${ID.two}`);
    assert.deepEqual(marks(await readBoardData(v))[ID.two], [`try/${ID.two}-other`]);
  } finally { await v.close(); }
});

test('a project that is not a git repository, or a repository without commits: shown without an error and without a mark', async () => {
  const root = tempRoot();
  makeBoard(root, 'plain', { [`done/${ID.loose} Loose.md`]: ticket() });
  const empty = path.dirname(makeBoard(root, 'empty', { [`done/${ID.loose} Loose.md`]: ticket() }));
  git(empty, 'init', '-q', '-b', 'main');
  // A git repository above the projects must not lend them its branches.
  git(root, 'init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(root, 'x.txt'), 'x');
  git(root, 'add', 'x.txt');
  git(root, 'commit', '-q', '-m', 'x');
  branchWithWork(root, `ticket-${ID.loose}`);
  const v = await startViewer(root);
  try {
    for (const name of ['plain', 'empty']) {
      const res = await v.get(`/${name}/api/board`);
      assert.equal(res.status, 200, name);
      const data = await res.json();
      assert.equal(data.tickets.length, 1, name);
      assert.deepEqual(marks(data), {}, name);
      assert.equal((await v.get(`/${name}/`)).status, 200, name);
    }
    assert.deepEqual((await (await v.get('/api/projects')).json()).map((p) => p.name), ['empty', 'plain']);
  } finally { await v.close(); }
});

// ---------- in a real browser ----------

const LONG = `ticket-${ID.two}-a-branch-with-a-very-long-name-made-for-this-test`;

test('the mark on a card: readable on a wide screen, on a phone, and in dark mode', { skip: !chromePath() && 'Chrome is not installed' }, async () => {
  const root = tempRoot();
  const dir = repoProject(root);
  branchWithWork(dir, LONG);
  const v = await startViewer(root);
  try {
    for (const dark of [false, true]) {
      const page = await openBrowser({ dark });
      if (!page) return;
      try {
        for (const [w, h, where] of [[1280, 800, 'wide'], [375, 700, 'phone']]) {
          await page.size(w, h);
          await page.goto(`${v.base}/repo/`);
          await page.until(() => document.querySelectorAll('.card').length > 0);
          await page.eval(() => document.fonts.ready.then(() => true));
          if (where === 'phone') {
            // On a phone one column shows at a time: pick done.
            await page.eval(() => { document.querySelector('[data-status="done"]').click(); return true; });
            await page.until(() => document.querySelector('.col.picked')?.getAttribute('aria-label') === 'done');
          }
          const look = await page.eval((ids) => {
            const card = (id) => document.querySelector(`.card[data-id="${id}"]`);
            const mark = (id) => card(id)?.querySelector('.unmerged');
            const r = (el) => el.getBoundingClientRect();
            const m = mark(ids.loose);
            const long = mark(ids.two);
            const cs = getComputedStyle(m);
            return {
              dark: matchMedia('(prefers-color-scheme: dark)').matches,
              text: m?.textContent.trim(),
              branches: [...long.querySelectorAll('.branch')].map((c) => c.textContent),
              tip: m.title.includes(`ticket-${ids.loose}`),
              // marked ones only; every other card has no mark
              markedIds: [...document.querySelectorAll('.unmerged')].map((x) => x.closest('.card').dataset.id).sort(),
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
            text: `not merged ticket-${ID.loose}`,
            branches: [`try/${ID.two}-other`, `ticket-${ID.two}`, LONG].sort(),
            tip: true,
            markedIds: [ID.loose, ID.two, ID.held].sort(),
            inCard: true,
            visible: true,
            noSideScroll: true,
            ...want,
          }, `${where} ${dark ? 'dark' : 'light'}`);
          // UNMERGED_SHOT=<path prefix> keeps a picture of each, to look at by eye.
          if (process.env.UNMERGED_SHOT) await page.screenshot(`${process.env.UNMERGED_SHOT}-${where}-${dark ? 'dark' : 'light'}.png`);
        }
      } finally {
        await page.close();
      }
    }
  } finally { await v.close(); }
});

test('the mark on a card goes by itself on an open page when its branch is deleted', { skip: !chromePath() && 'Chrome is not installed' }, async () => {
  const root = tempRoot();
  const dir = repoProject(root);
  const v = await startViewer(root);
  const page = await openBrowser();
  if (!page) { await v.close(); return; }
  try {
    await page.size(1280, 800);
    await page.goto(`${v.base}/repo/`);
    await page.until(() => document.querySelector('.card .unmerged'));
    await page.until(() => document.getElementById('live').classList.contains('on'));
    git(dir, 'branch', '-q', '-D', `ticket-${ID.loose}`);
    await page.until(() => !document.querySelector(`.card[data-id="261001000001"] .unmerged`), 8000);
    assert.ok(await page.eval(() => !!document.querySelector('.card[data-id="261001000005"] .unmerged')));
  } finally {
    await page.close();
    await v.close();
  }
});
