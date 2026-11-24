// Cloud sync merge: two devices with different progress combine without losing anything.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.mjs';

const N3 = load(['data.js', 'srs.js', 'sync.js']);
const merge = N3.Sync._merge;

const base = () => ({
  gems: 0, earned: {}, tricky: [], graduated: {}, equipped: {}, theme: 'meadow',
  settings: { reducedMotion: false, sound: false, sfx: true, furigana: true, newPerDay: 3 },
  pomo: { focus: 25, brk: 5, phase: 'idle' }, visits: { count: 1, last: 'x' },
  day: { date: '2026-11-25', steps: [], newDone: [] }, noteText: {}, pets: 0,
  srs: {}, log: {}, updatedAt: 0, resetAt: 0
});

test('gems from both devices add up', () => {
  const a = base(), b = base();
  a.earned = { 'k:a': true, 'k:b': true }; a.gems = 2; a.updatedAt = 10;
  b.earned = { 'k:c': true }; b.gems = 1; b.updatedAt = 20; b.theme = 'sakura';
  const r = merge(a, b);
  assert.equal(r.gems, 3);
  assert.equal(r.theme, 'sakura', 'newer device wins for choices like theme');
});

test('a Tricky item graduated on one device stays graduated', () => {
  const a = base(), b = base();
  a.tricky = [{ kind: 'kanji', id: 'x', added: 100 }]; a.updatedAt = 100;
  b.graduated = { 'kanji:x': 200 }; b.updatedAt = 200;
  assert.equal(merge(a, b).tricky.length, 0);
  a.tricky = [{ kind: 'kanji', id: 'x', added: 300 }];
  assert.equal(merge(a, b).tricky.length, 1, 'missed again later: comes back');
});

test('a reset on any device wins over older copies', () => {
  const a = base(); a.earned = { 'k:a': true }; a.gems = 1; a.updatedAt = 999;
  const b = base(); b.resetAt = 500; b.updatedAt = 500;
  const r = merge(a, b);
  assert.equal(r.gems, 0); assert.equal(r.resetAt, 500);
});

test('sound and motion stay per device; study settings sync', () => {
  const a = base(); a.settings.sound = true; a.updatedAt = 1;
  const b = base(); b.settings.sound = false; b.settings.furigana = false; b.settings.newPerDay = 6; b.updatedAt = 2;
  const r = merge(a, b);
  assert.equal(r.settings.sound, true);
  assert.equal(r.settings.furigana, false);
  assert.equal(r.settings.newPerDay, 6);
});

test("today's steps and new kanji combine", () => {
  const a = base(); a.day.steps = ['k:a']; a.day.newDone = ['a'];
  const b = base(); b.day.steps = ['k:b']; b.day.newDone = ['b'];
  const r = merge(a, b);
  assert.equal(r.day.steps.length, 2);
  assert.equal(r.day.newDone.length, 2);
});

test('review records keep the card with more history', () => {
  const a = base(); a.srs = { 'k:a': { box: 3, seen: 4, last: 10 }, 'k:b': { box: 1, seen: 1, last: 5 } };
  const b = base(); b.srs = { 'k:a': { box: 1, seen: 2, last: 12 }, 'k:c': { box: 2, seen: 2, last: 8 } };
  const r = merge(a, b);
  assert.equal(r.srs['k:a'].box, 3);
  assert.ok(r.srs['k:b'] && r.srs['k:c']);
});

test('study log takes the larger count per day instead of double counting', () => {
  const a = base(); a.log = { '2026-11-25': { n: 10, right: 8, focus: 25 } };
  const b = base(); b.log = { '2026-11-25': { n: 4, right: 4, focus: 50 }, '2026-11-24': { n: 3, right: 2, focus: 0 } };
  const r = merge(a, b);
  assert.equal(JSON.stringify(r.log['2026-11-25']), JSON.stringify({ n: 10, right: 8, focus: 50 }));
  assert.equal(r.log['2026-11-24'].n, 3);
});

test('no cloud copy yet keeps local as is', () => {
  const a = base();
  assert.equal(merge(a, null), a);
});
