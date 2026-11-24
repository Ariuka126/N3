// Spaced review scheduling, today's queue, and auto-generated kanji questions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, ALL } from './load.mjs';

const N3 = load(ALL);
const { review, buildQueue, migrate, kanjiQuestion, nearMisses, nextJlpt, strength, INTERVALS } = N3.SRS;

test('right answers climb the boxes, a miss drops back to tomorrow', () => {
  let r = review(undefined, true, 100);
  assert.equal(r.box, 1); assert.equal(r.due, 101);
  r = review(r, true, 101);
  assert.equal(r.box, 2); assert.equal(r.due, 101 + INTERVALS[2]);
  r = review(r, true, 104); r = review(r, true, 111);
  assert.equal(r.box, 4);
  r = review(r, false, 125);
  assert.equal(r.box, 1); assert.equal(r.due, 126); assert.equal(r.lapses, 1); assert.equal(r.wrong, 1);
});

test('box never exceeds the top interval', () => {
  let r;
  for (let i = 0; i < 20; i++) r = review(r, true, i * 200);
  assert.equal(r.box, INTERVALS.length - 1);
});

test('strength labels follow the box', () => {
  assert.equal(strength(undefined), 'new');
  assert.equal(strength({ box: 1 }), 'learning');
  assert.equal(strength({ box: 4 }), 'growing');
  assert.equal(strength({ box: 6 }), 'strong');
});

test('queue: due reviews first (oldest first, capped), then new kanji up to the daily limit', () => {
  const state = {
    srs: {
      'k:a': { box: 2, due: 98 }, 'ex:g1': { box: 1, due: 100 }, 'k:b': { box: 3, due: 99 }, 'k:c': { box: 1, due: 105 }
    },
    day: { newDone: ['x'] }
  };
  const kanji = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => ({ id }));
  const q = buildQueue(state, kanji, 100, { newLimit: 3, reviewLimit: 2 });
  assert.equal(q.reviews.join(','), 'k:a,k:b');
  assert.equal(q.fresh.join(','), 'd,e'); // 3 a day, 1 already done today
  const skipped = buildQueue(state, kanji, 100, { newLimit: 3, reviewLimit: 5, skip: ['d'] });
  assert.equal(skipped.fresh.join(','), 'e,f');
  assert.equal(skipped.reviews.length, 3);
});

test('migration spreads old "Got it" cards over several days', () => {
  const state = { earned: {} };
  for (let i = 0; i < 45; i++) state.earned['k:' + i] = true;
  state.earned['guide:guide'] = true;
  assert.equal(migrate(state, 500), 45);
  const dues = Object.values(state.srs).map(r => r.due);
  assert.equal(Math.min(...dues), 500);
  assert.equal(Math.max(...dues), 502);
  assert.equal(migrate(state, 500), 0, 'running twice changes nothing');
});

test('every kanji yields valid questions at every stage', () => {
  for (const k of N3.KANJI) {
    for (let box = 0; box < 8; box++) {
      for (let salt = 0; salt < 3; salt++) {
        const q = kanjiQuestion(k, N3.KANJI, box, salt);
        assert.equal(q.opts.length, 4, `${k.k} ${q.kind}`);
        assert.equal(new Set(q.opts).size, 4, `${k.k} ${q.kind} duplicate options`);
        const expected = q.kind === 'meaning' ? k.mean : q.kind === 'reading' ? q.word[1] : q.word[0];
        assert.equal(q.opts[q.a], expected, `${k.k} ${q.kind} wrong answer key`);
      }
    }
  }
});

test('new cards ask the meaning; questions are repeatable for the same card', () => {
  const k = N3.KANJI[0];
  assert.equal(kanjiQuestion(k, N3.KANJI, 0, 0).kind, 'meaning');
  assert.equal(JSON.stringify(kanjiQuestion(k, N3.KANJI, 3, 1)), JSON.stringify(kanjiQuestion(k, N3.KANJI, 3, 1)));
});

test('near-miss readings are plausible mistakes, never the real reading', () => {
  const m = nearMisses('しゅうかん');
  assert.ok(m.includes('しゅかん') && m.includes('じゅうかん'));
  assert.ok(!m.includes('しゅうかん'));
  assert.ok(!nearMisses('いっしょうけんめい').includes('いっじょうけんめい'), 'no voicing after small っ');
  assert.ok(!nearMisses('けっこん').includes('けっこんう'), 'no う after ん');
});

test('next JLPT date is the first Sunday of July or December', () => {
  assert.equal(nextJlpt(new Date(2026, 10, 25)).toDateString(), 'Sun Dec 06 2026');
  assert.equal(nextJlpt(new Date(2026, 11, 7)).toDateString(), 'Sun Jul 04 2027');
  assert.equal(nextJlpt(new Date(2027, 6, 4)).toDateString(), 'Sun Jul 04 2027');
});
