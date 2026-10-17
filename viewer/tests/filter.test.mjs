import test from 'node:test';
import assert from 'node:assert/strict';
import { matches, columnOrder, readFilter, writeFilter, choices, readHidden } from '../web/saring.js';

const t = (id, o = {}) => ({ id, title: o.title || `Tiket ${id}`, status: o.status || 'todo', type: o.type || 'task', priority: o.priority || 'medium', labels: o.labels || [], updated: o.updated || '' });

test('saringan tipe, prioritas, label, dan kata dalam urutan apa pun', () => {
  const a = t('260101000001', { title: 'Foto mitra tampil', type: 'bug', priority: 'high', labels: ['mitra', 'berkas'] });
  assert.ok(matches(a, readFilter('')));
  assert.ok(matches(a, readFilter('?q=tampil+foto')));
  assert.ok(matches(a, readFilter('?q=260101000001')));
  assert.ok(!matches(a, readFilter('?q=foto+kontrak')));
  assert.ok(matches(a, readFilter('?type=bug&priority=high&label=berkas')));
  assert.ok(!matches(a, readFilter('?type=feature')));
  assert.ok(!matches(a, readFilter('?label=kontrak')));
});

test('saringan bolak-balik lewat alamat', () => {
  const f = { q: 'foto mitra', type: 'bug', priority: '', label: 'mitra' };
  assert.deepEqual(readFilter(writeFilter(f)), f);
  assert.equal(writeFilter(readFilter('')), '');
});

test('todo mengikuti order.md, lalu prioritas', () => {
  const list = [t('3', { priority: 'low' }), t('1'), t('4', { priority: 'high' }), t('2')];
  assert.deepEqual(columnOrder(list, 'todo', ['2', '1']).map((x) => x.id), ['2', '1', '4', '3']);
});

test('kolom lain: yang terakhir disentuh di atas', () => {
  const list = [t('1', { updated: '2026-10-01 09:00:00' }), t('2', { updated: '2026-10-03 09:00:00' }), t('3', { updated: '2026-10-02 09:00:00' })];
  assert.deepEqual(columnOrder(list, 'done', []).map((x) => x.id), ['2', '3', '1']);
});

test('pilihan saringan beserta jumlahnya', () => {
  const c = choices([t('1', { labels: ['a', 'b'], priority: 'low' }), t('2', { labels: ['a'], priority: 'high' })]);
  assert.deepEqual(c.label, [['a', 2], ['b', 1]]);
  assert.deepEqual(c.priority.map(([p]) => p), ['high', 'low']);
});

test('kolom tersembunyi: cancel secara bawaan, pilihan yang tersimpan dihormati', () => {
  assert.deepEqual([...readHidden(null)], ['cancel']);
  assert.deepEqual([...readHidden('bukan json')], ['cancel']);
  assert.deepEqual([...readHidden('{"a":1}')], ['cancel']);
  assert.deepEqual([...readHidden('[]')], [], 'semua kolom ditampilkan bila itu yang dipilih');
  assert.deepEqual([...readHidden('["done","bukan-status","backlog"]')], ['done', 'backlog']);
});
