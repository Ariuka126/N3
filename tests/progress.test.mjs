// Progress stats and the cat's insights.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, ALL } from './load.mjs';

const N3 = load([...ALL, 'progress.js']);
const P = N3.Progress;

const state = (srs, extra = {}) => Object.assign({ srs, settings: { newPerDay: 3 }, examDate: '' }, extra);

test('accuracy is grouped by exam area', () => {
  const s = state({ 'k:k-an': { right: 3, wrong: 1 }, 'ex:g1': { right: 1, wrong: 3 }, 'ex:p1': { right: 2, wrong: 0 } });
  const a = P.areaStats(s);
  assert.equal(a.Kanji.acc, 0.75);
  assert.equal(a.Grammar.acc, 0.25);
  assert.equal(a.Reading.n, 2);
  assert.equal(a.Vocabulary.acc, null);
});

test('weakest area needs enough answers before it is called weak', () => {
  assert.equal(P.weakest(state({ 'ex:g1': { right: 0, wrong: 3 } })), null);
  assert.equal(P.weakest(state({ 'ex:g1': { right: 1, wrong: 6 }, 'k:k-an': { right: 5, wrong: 1 } })), 'Grammar');
});

test('the cat names the weak area', () => {
  const tip = P.insight(state({ 'ex:g1': { right: 1, wrong: 6 } }));
  assert.match(tip, /Grammar/);
  assert.match(tip, /Twin Grammar Notebook/);
});

test('pace: warns when new kanji will not be finished by exam day', () => {
  const today = new Date(2026, 10, 25);
  const p = P.pace(state({}, { examDate: '2026-12-06' }), today);
  assert.equal(p.left, N3.KANJI.length);
  assert.equal(p.daysLeft, 11);
  assert.equal(p.onTrack, false);
  assert.equal(p.needed, Math.ceil(N3.KANJI.length / 11));
  const far = P.pace(state({}, { examDate: '2027-12-05', settings: { newPerDay: 3 } }), today);
  assert.equal(far.onTrack, true);
});
