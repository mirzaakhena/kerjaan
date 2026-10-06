import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ticket, makeBoard, tempRoot } from './bantu.mjs';
import { mapData } from '../../skills/kerjaan/scripts/board.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

test('peta yang dijalankan sendiri tetap berfungsi seperti sebelumnya', async () => {
  const root = tempRoot();
  const board = makeBoard(root, 'p', {
    'todo/260101000001 Satu.md': ticket({ labels: 'a, b', related: '260101000002' }),
    'done/260101000002 Dua.md': ticket({ body: '- [x] a\n- [ ] b' }),
    'backlog/260101000003 Rusak.md': 'tanpa frontmatter',
  });
  const child = spawn(process.execPath, [path.join(here, '..', '..', 'skills', 'kerjaan', 'scripts', 'map.mjs'), path.join(root, 'p'), '--port', '0']);
  let out = '';
  child.stdout.on('data', (c) => (out += c));
  try {
    for (let i = 0; i < 50 && !out.includes('kerjaan map:'); i++) await new Promise((r) => setTimeout(r, 100));
    const address = out.match(/kerjaan map: (\S+)/)[1];
    const data = await (await fetch(`${address}data`)).json();
    assert.deepEqual(Object.keys(data), ['repo', 'board', 'readAt', 'order', 'tickets']);
    assert.deepEqual(Object.keys(data.tickets[0]), ['id', 'title', 'status', 'type', 'priority', 'labels', 'created', 'updated', 'related', 'blockedBy', 'checks', 'body']);
    assert.deepEqual(data.tickets.map((t) => t.id), ['260101000001', '260101000002']);
    const expected = mapData(board);
    delete data.readAt;
    delete expected.readAt;
    assert.deepEqual(data, expected);
    const html = await (await fetch(address)).text();
    assert.match(html, /fetch\('data'/);
    assert.match(html, /new EventSource\('events'\)/);
  } finally {
    child.kill();
  }
});
