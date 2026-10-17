// The skill's description is shorter and still calls the skill as often, and
// stays silent as often, as the old one (261011073101). The trigger test itself
// calls Claude and is run by hand (uji/pemicu/jalankan.mjs); this file checks
// that its stored results belong to the sentences and descriptions in the repo,
// and that the new description is not worse than the old.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KALIMAT, sha, kata, ringkas, deskripsiSkill } from './pemicu/jalankan.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const baca = (f) => JSON.parse(fs.readFileSync(path.join(here, 'pemicu', f), 'utf8'));
const kalimat = baca('kalimat.json');
const lama = baca('hasil-lama.json');
const baru = baca('hasil-baru.json');
const deskripsiLama = fs.readFileSync(path.join(here, 'pemicu', 'deskripsi-lama.txt'), 'utf8').trim();

test('the sentence set has both languages, for sentences that should and should not call the skill', () => {
  assert.ok(kalimat.length >= 30 && kalimat.length <= 45, `${kalimat.length} sentences`);
  for (const harus of [true, false]) {
    for (const bahasa of ['en-', 'id-']) {
      assert.ok(kalimat.some((k) => k.harus === harus && k.id.startsWith(bahasa)), `${bahasa} harus=${harus}`);
    }
  }
  assert.equal(new Set(kalimat.map((k) => k.id)).size, kalimat.length, 'ids are unique');
});

const ada = (teks, repo, harus) => assert.ok(
  kalimat.some((k) => k.kalimat === teks && k.repo === repo && k.harus === harus), `${teks} (${repo}, harus=${harus})`);
test('the set holds the queue requests and the plain review/done in a repo without a board', () => {
  ada('kerjakan tiket berikutnya', 'papan', true);
  ada('work the queue', 'papan', true);
  ada('review kode ini', 'kosong', false);
  ada('sudah done', 'kosong', false);
});

for (const [nama, h, deskripsi] of [['old', lama, deskripsiLama], ['new', baru, deskripsiSkill()]]) {
  test(`the ${nama} description's results were run on this sentence set and this description`, () => {
    assert.equal(h.kalimatSha, sha(KALIMAT), 'kalimat.json changed after the run; run node uji/pemicu/jalankan.mjs again for both descriptions');
    assert.equal(h.deskripsi, deskripsi, 'the description changed after the run; run node uji/pemicu/jalankan.mjs again (README, "Running the tests")');
    assert.ok(h.ulang >= 3, `ulang ${h.ulang}`);
    assert.deepEqual(h.hasil.map((x) => x.id), kalimat.map((k) => k.id));
    for (const x of h.hasil) assert.equal(x.jalan.length, h.ulang, x.id);
    assert.deepEqual(h.ringkasan, ringkas(h.hasil), 'the summary is the one computed from the runs');
  });
}

test('the new description is shorter than the old', () => {
  assert.ok(kata(deskripsiSkill()) < kata(deskripsiLama), `${kata(deskripsiSkill())} vs ${kata(deskripsiLama)} words`);
});

test('the new description calls the skill at least as often where it should', () => {
  const [l, b] = [lama.ringkasan.harus, baru.ringkasan.harus];
  assert.ok(b.terpanggil >= l.terpanggil, `runs: new ${b.terpanggil}, old ${l.terpanggil}`);
  assert.ok(b.kalimatLolos >= l.kalimatLolos, `sentences: new ${b.kalimatLolos}, old ${l.kalimatLolos}`);
});

test('the new description calls the skill no more often where it should not', () => {
  const [l, b] = [lama.ringkasan.tidak, baru.ringkasan.tidak];
  assert.ok(b.terpanggil <= l.terpanggil, `runs: new ${b.terpanggil}, old ${l.terpanggil}`);
  assert.ok(b.kalimatLolos >= l.kalimatLolos, `sentences: new ${b.kalimatLolos}, old ${l.kalimatLolos}`);
});

// Per sentence, not per group: every queue request calls the skill in every run,
// and every plain review/done/todo in a repo without a board calls it in none.
for (const x of baru.hasil.filter((x) => x.kelompok === 'antrean')) {
  test(`the new description calls the skill for the queue request "${x.kalimat}"`, () => {
    assert.ok(x.jalan.every((o) => o === 'skill'), x.jalan.join(', '));
  });
}
for (const x of baru.hasil.filter((x) => x.kelompok === 'review-tanpa-papan')) {
  test(`the new description does not call the skill for "${x.kalimat}" without a board`, () => {
    assert.ok(x.jalan.every((o) => o !== 'skill'), x.jalan.join(', '));
  });
}
