import test from 'node:test';
import assert from 'node:assert/strict';
import { matches, columnOrder, readFilter, writeFilter, choices, readHidden } from '../web/filter.js';

const t = (id, o = {}) => ({ id, title: o.title || `Ticket ${id}`, status: o.status || 'todo', type: o.type || 'task', priority: o.priority || 'medium', labels: o.labels || [], updated: o.updated || '' });

test('filters by type, priority, label, and words in any order', () => {
  const a = t('260101000001', { title: 'Partner photo shown', type: 'bug', priority: 'high', labels: ['partner', 'files'] });
  assert.ok(matches(a, readFilter('')));
  assert.ok(matches(a, readFilter('?q=shown+photo')));
  assert.ok(matches(a, readFilter('?q=260101000001')));
  assert.ok(!matches(a, readFilter('?q=photo+contract')));
  assert.ok(matches(a, readFilter('?type=bug&priority=high&label=files')));
  assert.ok(!matches(a, readFilter('?type=feature')));
  assert.ok(!matches(a, readFilter('?label=contract')));
});

test('filters round-trip through the address', () => {
  const f = { q: 'partner photo', type: 'bug', priority: '', label: 'partner' };
  assert.deepEqual(readFilter(writeFilter(f)), f);
  assert.equal(writeFilter(readFilter('')), '');
});

test('todo follows order.md, then priority', () => {
  const list = [t('3', { priority: 'low' }), t('1'), t('4', { priority: 'high' }), t('2')];
  assert.deepEqual(columnOrder(list, 'todo', ['2', '1']).map((x) => x.id), ['2', '1', '4', '3']);
});

test('other columns: the most recently touched on top', () => {
  const list = [t('1', { updated: '2026-10-01 09:00:00' }), t('2', { updated: '2026-10-03 09:00:00' }), t('3', { updated: '2026-10-02 09:00:00' })];
  assert.deepEqual(columnOrder(list, 'done', []).map((x) => x.id), ['2', '3', '1']);
});

test('filter choices with their counts', () => {
  const c = choices([t('1', { labels: ['a', 'b'], priority: 'low' }), t('2', { labels: ['a'], priority: 'high' })]);
  assert.deepEqual(c.label, [['a', 2], ['b', 1]]);
  assert.deepEqual(c.priority.map(([p]) => p), ['high', 'low']);
});

test('hidden columns: cancel by default, a stored choice respected', () => {
  assert.deepEqual([...readHidden(null)], ['cancel']);
  assert.deepEqual([...readHidden('not json')], ['cancel']);
  assert.deepEqual([...readHidden('{"a":1}')], ['cancel']);
  assert.deepEqual([...readHidden('[]')], [], 'every column shown when that is what was chosen');
  assert.deepEqual([...readHidden('["done","not-a-status","backlog"]')], ['done', 'backlog']);
});
