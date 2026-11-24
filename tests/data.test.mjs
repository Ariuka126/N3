// Content integrity: every card and question is well-formed and answerable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, ALL } from './load.mjs';

const N3 = load(ALL);
const kana = /^[぀-ヿー]+$/;
const han = /[一-鿿々]/;
const rubyPairs = s => [...s.matchAll(/\{([^|}]+)\|([^}]+)\}/g)];
const balanced = s => (s.match(/\{/g) || []).length === (s.match(/\}/g) || []).length;

test('kanji set covers the whole N3 list with no duplicates', () => {
  const chars = N3.KANJI.map(k => k.k);
  assert.equal(new Set(chars).size, chars.length, 'duplicate kanji');
  assert.equal(new Set(N3.KANJI.map(k => k.id)).size, chars.length, 'duplicate ids');
  const missing = [...N3.N3_ORDER].filter(c => !chars.includes(c));
  assert.equal(missing.join(''), '', 'kanji from the list are missing');
  assert.equal(N3.N3_ORDER.length, 367);
});

test('every kanji card is well-formed', () => {
  for (const k of N3.KANJI) {
    assert.equal(k.words.length, 2, `${k.k}: needs two compounds`);
    for (const [word, reading] of k.words) {
      assert.ok(word.includes(k.k), `${k.k}: compound ${word} doesn't use the kanji`);
      assert.match(reading, kana, `${k.k}: reading ${reading} isn't kana`);
    }
    assert.ok(k.ex.includes(k.k), `${k.k}: example sentence doesn't use the kanji`);
    assert.ok(balanced(k.ex), `${k.k}: unbalanced furigana braces`);
    for (const m of rubyPairs(k.ex)) assert.match(m[2], kana, `${k.k}: furigana ${m[2]} isn't kana`);
    assert.doesNotMatch(k.ex.replace(/\{[^}]+\}/g, ''), han, `${k.k}: a kanji in the example has no furigana`);
    assert.ok(k.mean && k.en, `${k.k}: missing meaning or translation`);
  }
});

test('every library question has one valid answer and an explanation', () => {
  const ids = new Set();
  for (const b of N3.BOOKS) {
    assert.ok(b.shelf, `${b.id}: no shelf`);
    if (b.kind === 'guide') { assert.ok(b.pages.length > 0); continue; }
    assert.ok(b.area, `${b.id}: no area`);
    for (const it of b.items) {
      assert.ok(!ids.has(it.id), `duplicate question id ${it.id}`);
      ids.add(it.id);
      assert.equal(it.opts.length, 4, `${it.id}: needs 4 options`);
      assert.equal(new Set(it.opts).size, 4, `${it.id}: duplicate options`);
      assert.ok(Number.isInteger(it.a) && it.a >= 0 && it.a < 4, `${it.id}: answer index out of range`);
      assert.ok(it.why && it.why.length > 10, `${it.id}: missing explanation`);
      for (const s of [it.q, it.passage || '', ...it.opts]) assert.ok(balanced(s), `${it.id}: unbalanced braces`);
      if (b.kind === 'reading') assert.ok(it.passage && it.clue, `${it.id}: reading needs passage and clue`);
    }
  }
  assert.ok(ids.size >= 80, `expected at least 80 questions, got ${ids.size}`);
});

test('answers are spread across positions (no "always pick 1")', () => {
  const counts = [0, 0, 0, 0];
  N3.BOOKS.forEach(b => (b.items || []).forEach(it => counts[it.a]++));
  const total = counts.reduce((a, b) => a + b, 0);
  counts.forEach((c, i) => assert.ok(c / total < 0.5, `option ${i + 1} is the answer ${c} of ${total} times`));
});

test('unlocks are ordered and point at real items', () => {
  const at = N3.UNLOCKS.map(u => u.at);
  assert.equal(at.join(','), [...at].sort((a, b) => a - b).join(','));
  for (const u of N3.UNLOCKS) {
    const table = { closet: N3.CLOSET, theme: N3.THEMES, note: N3.NOTES }[u.kind];
    assert.ok(table && table[u.id], `unlock ${u.kind}:${u.id} doesn't exist`);
  }
});

test('the cat has all 40 lines and every pool points at one', () => {
  assert.equal(N3.LINES.length, 40);
  for (const [name, pool] of Object.entries(N3.LINE_POOLS)) {
    for (const n of pool) assert.ok(n >= 1 && n <= 40, `pool ${name} has bad line ${n}`);
  }
});
