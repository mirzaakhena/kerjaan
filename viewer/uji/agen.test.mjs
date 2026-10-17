import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readAgents, encodeProject, stepLabel, programName, STEPS } from '../agen.mjs';
import { agentState, agentLine, agentSteps, span, ago, clock, QUIET, GONE } from '../web/agen.js';
import { tempRoot, agentLog, appendLog, line } from './bantu.mjs';

const ID = { a: '260101000001', b: '260101000002', c: '260101000003' };
const MIN = 60 * 1000;

function setup() {
  const root = tempRoot();
  const project = path.join(root, 'alpha');
  fs.mkdirSync(project);
  return { root, project, claude: path.join(root, 'claude') };
}

// ---------- reading Claude Code's logs ----------

test('nama folder catatan: setiap karakter selain huruf dan angka menjadi "-"', () => {
  assert.equal(encodeProject('/Users/a/Workspace/kerjaan'), '-Users-a-Workspace-kerjaan');
  assert.equal(encodeProject('/Users/a/.claude'), '-Users-a--claude');
  assert.equal(encodeProject('/home/a/shinobi_mobile v2'), '-home-a-shinobi-mobile-v2');
});

test('agen per tiket: yang paling baru aktif, jenisnya, langkah terakhirnya, dan jam mulainya', () => {
  const { project, claude } = setup();
  const t0 = Date.parse('2026-10-16T01:00:00Z');
  agentLog(claude, project, { session: 's1', id: 'lama', description: `Kerjakan tiket ${ID.a}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1000, 'Bash', { description: 'Langkah lama' }), line.interrupt(t0 + 2000)] });
  agentLog(claude, project, { session: 's2', id: 'baru', description: `Kerjakan tiket ${ID.a}`, lines: [line.prompt(t0 + 5000, 'x'), line.step(t0 + 6000, 'Bash', { description: 'Langkah baru' })] });
  agentLog(claude, project, { session: 's2', id: 'tinjau', agentType: 'kerjaan:kerjaan-reviewer', description: `Tinjau tiket ${ID.b}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 100, 'Read', { file_path: path.join(project, 'README.md') })] });
  agentLog(claude, project, { session: 's2', id: 'lain', agentType: 'general-purpose', description: 'Audit tanpa tiket', lines: [line.prompt(t0, 'x'), line.step(t0 + 100, 'Bash', { description: 'z' })] });

  const all = readAgents(project, { claudeDir: claude });
  assert.deepEqual([...all.keys()].sort(), [ID.a, ID.b], 'agen tanpa ID tiket tidak dipakai');
  const a = all.get(ID.a);
  assert.equal(a.kind, 'worker');
  assert.equal(a.step.label, 'Langkah baru', 'agen yang paling baru aktif');
  assert.equal(a.ended, null);
  assert.equal(a.startedAt, t0 + 5000);
  assert.equal(a.lastAt, t0 + 6000);
  const b = all.get(ID.b);
  assert.equal(b.kind, 'reviewer');
  assert.deepEqual(b.step, { at: t0 + 100, tool: 'Read', label: 'README.md' });

  assert.deepEqual([...readAgents(project, { claudeDir: claude, ids: [ID.b] }).keys()], [ID.b], 'hanya tiket yang diminta');
});

test('agen yang menyebut beberapa tiket: hanya tiket yang diminta yang mendapatnya', () => {
  const { project, claude } = setup();
  const t0 = Date.now();
  agentLog(claude, project, { id: 'dua', description: `Kerjakan tiket ${ID.a} sesudah ${ID.c}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { description: 'd' })] });
  assert.deepEqual([...readAgents(project, { claudeDir: claude, ids: [ID.a, ID.b] }).keys()], [ID.a]);
  assert.deepEqual([...readAgents(project, { claudeDir: claude }).keys()].sort(), [ID.a, ID.c]);
});

test('agen yang lama dihentikan kalah dari yang baru, juga bila yang baru dimulai lebih dulu tetapi dilanjutkan', () => {
  const { project, claude } = setup();
  const t0 = Date.parse('2026-10-16T01:00:00Z');
  // A worker resumed after a rejection writes to its own old log again.
  agentLog(claude, project, { id: 'worker', description: `Kerjakan tiket ${ID.a}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1000, 'SubagentHandback', { message: 'laporan' }), line.prompt(t0 + 90000, 'lanjut'), line.step(t0 + 91000, 'Bash', { description: 'Perbaiki temuan' })] });
  agentLog(claude, project, { id: 'reviewer', agentType: 'kerjaan:kerjaan-reviewer', description: `Tinjau tiket ${ID.a}`, lines: [line.prompt(t0 + 2000, 'x'), line.step(t0 + 3000, 'SubagentHandback', {})] });
  const a = readAgents(project, { claudeDir: claude }).get(ID.a);
  assert.equal(a.kind, 'worker');
  assert.equal(a.ended, null, 'dilanjutkan setelah menyerahkan laporan: bekerja lagi');
  assert.equal(a.step.label, 'Perbaiki temuan');
});

test('ID tiket dari baris Ticket: di prompt pertama bila keterangan agen tidak menyebutnya', () => {
  const { project, claude } = setup();
  const t0 = Date.now();
  agentLog(claude, project, { id: 'x', description: 'Kerjakan tiket berikutnya', lines: [line.prompt(t0, `Repo: /r\nTicket: .kerjaan/in_progress/${ID.c} Judul.md\nLihat juga ${ID.a}`), line.step(t0 + 1, 'Bash', { description: 'd' })] });
  assert.deepEqual([...readAgents(project, { claudeDir: claude }).keys()], [ID.c]);
});

test('step label: the description, a file name, or for Bash only the program name; never the command itself', () => {
  const p = '/proj';
  const cases = [
    ['Bash', { command: 'cat RAHASIA', description: 'Jalankan uji' }, 'Jalankan uji'],
    ['Bash', { command: 'cat RAHASIA' }, 'cat'],
    ['Bash', { command: 'cat RAHASIA', description: '  ' }, 'cat'],
    ['Bash', {}, ''],
    ['Bash', { command: ['cat', 'RAHASIA'] }, ''],
    ['Read', { file_path: '/proj/viewer/app.mjs' }, 'viewer/app.mjs'],
    ['Edit', { file_path: '/proj/a.md', old_string: 'RAHASIA', new_string: 'RAHASIA' }, 'a.md'],
    ['Write', { file_path: '/lain/tempat/b.txt', content: 'RAHASIA' }, 'b.txt'],
    ['NotebookEdit', { notebook_path: '/proj/n.ipynb', new_source: 'RAHASIA' }, 'n.ipynb'],
    ['Grep', { pattern: 'RAHASIA', path: '/proj' }, ''],
    ['Glob', { pattern: 'RAHASIA*' }, ''],
    ['WebFetch', { url: 'https://x/RAHASIA', prompt: 'RAHASIA' }, ''],
    ['mcp__x__y', { query: 'RAHASIA' }, ''],
    ['SubagentHandback', { message: 'RAHASIA' }, 'menyerahkan laporan'],
    ['Bash', { description: 'baris\nkedua\u0007' + 'x'.repeat(400) }, null],
    [null, null, ''],
  ];
  for (const [name, input, want] of cases) {
    const got = stepLabel(name, input, p);
    assert.ok(!JSON.stringify(got).includes('RAHASIA'), `${name}: ${JSON.stringify(got)}`);
    if (want !== null) assert.equal(got.label, want, name);
    else {
      assert.ok(!/[\n\u0007]/.test(got.label), 'tanpa baris baru atau karakter kendali');
      assert.ok(got.label.length <= 160, 'dipotong');
    }
  }
});

// Each shape of command a Bash step can carry without a description: only
// the program's name is shown, and nothing else on the line, RAHASIA standing
// for whatever must never reach the panel.
test('Bash step without a description: the program name alone, for every shape of command', () => {
  const cases = [
    ['argument', 'cat RAHASIA.txt', 'cat'],
    ['options and arguments', 'node --test --test-timeout=RAHASIA viewer/uji/RAHASIA.test.mjs', 'node'],
    ['token in an argument', 'curl -H "Authorization: Bearer RAHASIA" https://x/RAHASIA', 'curl'],
    ['variable set before the program', 'API_TOKEN=RAHASIA node --test', 'node'],
    ['several, quoted and substituted, before the program', 'A="RAHASIA b" B=\'RAHASIA\' C=$(cat /RAHASIA) D=`cat RAHASIA` npm test', 'npm'],
    ['only an assignment', 'RAHASIA_TOKEN=RAHASIA', ''],
    ['a cd first', 'cd /home/RAHASIA && git status RAHASIA', 'git'],
    ['several cd first, then a newline', 'cd "/RAHASIA dir"; cd RAHASIA\n"$K/test-run.sh" RAHASIA', 'test-run.sh'],
    ['a cd only', 'cd /RAHASIA', 'cd'],
    ['program given by its path', '/home/RAHASIA/bin/tool --key RAHASIA', 'tool'],
    ['program in a variable', '$RAHASIA arg', ''],
    ['program in braces', '${RAHASIA}/bin x', 'bin'],
    ['program from a substitution', '$(echo RAHASIA) x', ''],
    ['program from backticks', '`echo RAHASIA` x', ''],
    ['program quoted with a space', '"RAHASIA prog" x', ''],
    ['leading option-like word', '--RAHASIA', ''],
    ['comment before the program', '# RAHASIA\nls -la RAHASIA', 'ls'],
    ['subshell', '(cd RAHASIA && make RAHASIA)', 'make'],
    ['pipeline', 'echo "RAHASIA|x" | grep RAHASIA', 'echo'],
    ['heredoc', "cat > RAHASIA.md <<'EOF'\nRAHASIA\nEOF", 'cat'],
    ['negated group', '! { grep -q RAHASIA f; }', 'grep'],
    ['nothing but spaces', '   ', ''],
  ];
  for (const [shape, command, want] of cases) {
    const got = stepLabel('Bash', { command }, '/proj');
    assert.equal(got.tool, 'Bash');
    assert.ok(!got.label.includes('RAHASIA'), `${shape}: ${got.label}`);
    if (want !== null) assert.equal(got.label, want, shape);
    assert.equal(got.label, programName(command), shape);
  }
});

test('Bash step without a description, read from an agent log: the panel gets the program name', () => {
  const { project, claude } = setup();
  const t0 = Date.now();
  agentLog(claude, project, { id: 'tanpa', description: `Kerjakan tiket ${ID.a}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { command: 'GH_TOKEN=RAHASIA gh pr list --search RAHASIA' }), line.step(t0 + 2, 'Bash', { command: 'ls RAHASIA', description: 'List the folder' })] });
  const a = readAgents(project, { claudeDir: claude }).get(ID.a);
  assert.deepEqual(a.steps.map((s) => [s.tool, s.label]), [['Bash', 'gh'], ['Bash', 'List the folder']]);
  assert.ok(!JSON.stringify(a).includes('RAHASIA'));
});

test('akhir agen: laporan diserahkan, pesan penutup, tanda selesai di meta, dan dihentikan', () => {
  const { project, claude } = setup();
  const t0 = Date.now() - 10 * MIN;
  const ids = ['260101000011', '260101000012', '260101000013', '260101000014', '260101000015', '260101000016'];
  agentLog(claude, project, { id: 'a', description: `Kerjakan tiket ${ids[0]}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'SubagentHandback', {}), line.result(t0 + 2, 'ok')] });
  agentLog(claude, project, { id: 'b', description: `Kerjakan tiket ${ids[1]}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { description: 'd' }), line.say(t0 + 2, 'Selesai.', 'end_turn')] });
  agentLog(claude, project, { id: 'c', description: `Kerjakan tiket ${ids[2]}`, finished: true, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { description: 'd' })] });
  agentLog(claude, project, { id: 'd', description: `Kerjakan tiket ${ids[3]}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { description: 'd' }), line.result(t0 + 2, 'r'), line.interrupt(t0 + 3)] });
  agentLog(claude, project, { id: 'e', description: `Kerjakan tiket ${ids[4]}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { description: 'd' }), line.think(t0 + 2, 'hmm'), line.say(t0 + 3, 'Sekarang membaca.')] });
  // Marked finished, then resumed: the log runs on past the meta file.
  const resumed = agentLog(claude, project, { id: 'f', description: `Kerjakan tiket ${ids[5]}`, finished: true, lines: [line.prompt(t0, 'x')] });
  const metaF = resumed.replace(/\.jsonl$/, '.meta.json');
  fs.utimesSync(metaF, new Date(t0), new Date(t0));
  appendLog(resumed, line.step(t0 + 5 * MIN, 'Bash', { description: 'lagi' }));

  const all = readAgents(project, { claudeDir: claude });
  assert.deepEqual(ids.map((id) => all.get(id).ended), ['selesai', 'selesai', 'selesai', 'dihentikan', null, null]);
});

test('catatan panjang: 15 langkah terakhir ditemukan dari ekor, juga di balik baris yang sangat besar', () => {
  const { project, claude } = setup();
  const t0 = Date.now() - 60 * MIN;
  const lines = [line.prompt(t0, 'x')];
  for (let i = 0; i < 40; i++) {
    lines.push(line.step(t0 + i * 1000, 'Bash', { description: `Langkah ${i}`, command: 'x' }));
    lines.push(line.request(t0 + i * 1000 + 500, 'y'.repeat(200 * 1024)));
  }
  const log = agentLog(claude, project, { id: 'besar', description: `Kerjakan tiket ${ID.a}`, lines });
  assert.ok(fs.statSync(log).size > 8 * 1024 * 1024 * 0.9);
  const a = readAgents(project, { claudeDir: claude }).get(ID.a);
  assert.equal(a.steps.length, STEPS);
  assert.deepEqual(a.steps.map((s) => s.label), Array.from({ length: 15 }, (_, i) => `Langkah ${25 + i}`), 'urut, yang terakhir di ujung');
  assert.equal(a.startedAt, t0, 'jam mulai dari baris pertama');

  // Grows: only the new part is read, and a line still being written waits.
  appendLog(log, line.step(t0 + 50000, 'Bash', { description: 'Langkah baru' }));
  fs.appendFileSync(log, JSON.stringify(line.step(t0 + 60000, 'Bash', { description: 'Setengah' })).slice(0, 40));
  const b = readAgents(project, { claudeDir: claude }).get(ID.a);
  assert.equal(b.step.label, 'Langkah baru');
  assert.equal(b.steps.length, STEPS);
  assert.equal(b.steps[0].label, 'Langkah 26');
  fs.appendFileSync(log, JSON.stringify(line.step(t0 + 60000, 'Bash', { description: 'Setengah' })).slice(40) + '\n');
  assert.equal(readAgents(project, { claudeDir: claude }).get(ID.a).step.label, 'Setengah');
});

test('catatan yang hilang, tak terbaca, atau berubah format: tidak ada agen, tidak ada galat', () => {
  const { root, project, claude } = setup();
  const t0 = Date.now();
  assert.equal(readAgents(project, { claudeDir: path.join(root, 'tidak-ada') }).size, 0, 'folder Claude tidak ada');
  fs.mkdirSync(claude);
  fs.writeFileSync(path.join(claude, 'projects'), 'bukan folder');
  assert.equal(readAgents(project, { claudeDir: claude }).size, 0, 'projects bukan folder');
  fs.rmSync(path.join(claude, 'projects'));

  const ok = [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { description: 'd' })];
  agentLog(claude, project, { id: 'meta-rusak', meta: '{bukan json', lines: ok });
  agentLog(claude, project, { id: 'meta-aneh', meta: '[1,2]', lines: ok });
  agentLog(claude, project, { id: 'sampah', description: `Kerjakan tiket ${ID.a}`, lines: ['bukan json', '{"type":', '42', 'null', '[]'] });
  agentLog(claude, project, { id: 'tanpa-waktu', description: `Kerjakan tiket ${ID.b}`, lines: [{ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { description: 'd' } }] } }] });
  agentLog(claude, project, { id: 'bentuk-baru', description: `Kerjakan tiket ${ID.c}`, lines: [{ kind: 'step', when: t0, what: { tool: 'Bash' } }, { type: 'assistant', message: 'teks', timestamp: 'kemarin' }] });
  agentLog(claude, project, { session: 'sesi-2', id: 'tanpa-log', description: `Kerjakan tiket ${ID.a}` });
  fs.rmSync(path.join(claude, 'projects', encodeProject(project), 'sesi-2', 'subagents', 'agent-tanpa-log.jsonl'));
  fs.writeFileSync(path.join(claude, 'projects', encodeProject(project), 'berkas-lepas.jsonl'), 'x');
  assert.equal(readAgents(project, { claudeDir: claude }).size, 0);

  if (process.getuid?.() !== 0) {
    agentLog(claude, project, { session: 'terkunci', id: 'k', description: `Kerjakan tiket ${ID.a}`, lines: ok });
    const locked = path.join(claude, 'projects', encodeProject(project), 'terkunci');
    fs.chmodSync(locked, 0o000);
    try {
      assert.equal(readAgents(project, { claudeDir: claude }).size, 0, 'folder sesi tak terbaca');
    } finally {
      fs.chmodSync(locked, 0o755);
    }
  }
});

// ---------- what the page makes of it ----------

const now = Date.parse('2026-10-16T05:00:00Z');
const agent = (over = {}) => ({ kind: 'worker', startedAt: now - 34 * MIN, lastAt: now - 12000, ended: null, step: { at: now - 12000, tool: 'Bash', label: 'Update README <API>' }, ...over });

test('penanda: hijau saat baru melangkah, kuning saat diam beberapa menit, merah saat berhenti', () => {
  const cases = [
    [agent(), 'in_progress', 'jalan', ''],
    [agent({ lastAt: now - QUIET + 1000 }), 'in_progress', 'jalan', ''],
    [agent({ lastAt: now - QUIET }), 'in_progress', 'diam', 'diam'],
    [agent({ lastAt: now - GONE + 1000 }), 'review', 'diam', 'diam'],
    [agent({ lastAt: now - GONE }), 'in_progress', 'berhenti', 'tidak ada kabar'],
    [agent({ ended: 'dihentikan' }), 'in_progress', 'berhenti', 'dihentikan'],
    [agent({ ended: 'dihentikan' }), 'review', 'berhenti', 'dihentikan'],
    [agent({ ended: 'selesai' }), 'in_progress', 'berhenti', 'berhenti'],
    [agent({ ended: 'selesai' }), 'review', 'selesai', 'selesai'],
  ];
  for (const [a, status, tone, word] of cases) {
    const st = agentState(a, status, now);
    assert.deepEqual([st.tone, st.word], [tone, word], JSON.stringify([a.ended, (now - a.lastAt) / 1000, status]));
    assert.match(agentLine(a, status, now), new RegExp(`class="agen ${tone}"`));
  }
});

test('baris agen: jenis, langkah terakhir (di-escape), dan berapa lama yang lalu', () => {
  const html = agentLine(agent(), 'in_progress', now);
  assert.match(html, /<span class="jenis">worker<\/span>/);
  assert.match(html, /<span class="langkah" title="Update README &lt;API&gt;">Update README &lt;API&gt;<\/span>/);
  assert.match(html, /<span class="lalu">12 dtk lalu<\/span>/);
  assert.ok(!html.includes('keadaan'), 'agen yang bekerja tidak diberi kata keadaan');
  assert.match(agentLine(agent({ step: { at: now - 5 * MIN, tool: 'Grep', label: '' }, lastAt: now - 5 * MIN }), 'review', now), /keadaan">diam<\/span><span class="langkah" title="Grep">Grep<\/span><span class="lalu">5 mnt lalu/, 'tanpa keterangan: nama alatnya');
  assert.match(agentLine(agent({ step: null }), 'review', now), /belum melangkah/);
});

test('daftar langkah: terbaru di atas, jam tiap langkah, lama berjalan, bisa dibuka', () => {
  const steps = Array.from({ length: 15 }, (_, i) => ({ at: now - (15 - i) * 60000, tool: i % 2 ? 'Read' : 'Bash', label: `L${i} <x>` }));
  const a = agent({ steps, step: steps[14] });
  const html = agentSteps(a, 'in_progress', now);
  const rows = [...html.matchAll(/<li><time>([^<]+)<\/time><span class="alat">(\w+)<\/span><span class="ket">(.*?)<\/span><\/li>/g)];
  assert.equal(rows.length, 15);
  assert.deepEqual(rows.map((r) => [r[2], r[3]]), steps.map((s) => [s.tool, s.label.replace('<x>', '&lt;x&gt;')]).reverse());
  assert.equal(rows[0][1], clock(steps[14].at, now));
  assert.match(html, /15 langkah terakhir worker/);
  assert.match(html, /berjalan 34 mnt/);
  assert.match(html, new RegExp(`mulai ${clock(a.startedAt, now)}`));
  assert.ok(!/<details[^>]*open/.test(html), 'tertutup');
  assert.match(agentSteps(a, 'in_progress', now, { open: true }), /<details class="agen-langkah" open>/);
  assert.match(agentSteps(agent({ ended: 'selesai', lastAt: now - 10 * MIN }), 'review', now), /bekerja 24 mnt/, 'yang sudah selesai: lama bekerjanya');
  assert.match(agentSteps(agent({ steps: [] }), 'review', now), /Belum ada langkah/);
});

test('penulisan waktu', () => {
  assert.deepEqual([span(0), span(59999), span(60000), span(3599999), span(3600000), span(49 * 3600000)], ['0 dtk', '59 dtk', '1 mnt', '59 mnt', '1 j 0 mnt', '2 hari']);
  assert.equal(ago(now, now), 'baru saja');
  assert.equal(ago(now - 5000, now), '5 dtk lalu');
  assert.match(clock(now - 1000, now), /^\d\d:\d\d:\d\d$/);
  assert.match(clock(now - 3 * 86400000, now), /^\d\d\/\d\d \d\d:\d\d:\d\d$/, 'hari lain: dengan tanggal');
});
