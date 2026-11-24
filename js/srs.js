/* Spaced review: when each card comes back, today's queue, and auto-graded kanji questions.
   Pure functions only (no DOM), so tests can run them directly. */
window.N3 = window.N3 || {};

N3.SRS = (function () {
  // Days until the next review for each box. Right answers move a card up a box, misses send it back to box 1.
  const INTERVALS = [0, 1, 3, 7, 14, 30, 60, 120];
  const MAX_BOX = INTERVALS.length - 1;

  // Local calendar day as an integer, so "due tomorrow" follows the user's midnight.
  function dayNum(d = new Date()) {
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
  }

  function review(rec, correct, today) {
    const r = Object.assign({ box: 0, due: today, seen: 0, right: 0, wrong: 0, lapses: 0 }, rec);
    r.seen++;
    r.last = today;
    if (correct) {
      r.right++;
      r.box = Math.min(r.box + 1, MAX_BOX);
    } else {
      r.wrong++;
      if (r.box >= 3) r.lapses++;
      r.box = 1;
    }
    r.due = today + INTERVALS[r.box];
    return r;
  }

  const isDue = (rec, today) => !!rec && rec.due <= today;

  // learning: just met or recently missed · growing: a few successful reviews · strong: weeks between reviews
  function strength(rec) {
    if (!rec) return 'new';
    if (rec.box <= 2) return 'learning';
    if (rec.box <= 4) return 'growing';
    return 'strong';
  }

  /* Today's queue: due reviews (oldest first, capped) then new kanji in list order. */
  function buildQueue(state, kanji, today, opts) {
    const srs = state.srs || {};
    const reviews = Object.keys(srs)
      .filter(k => isDue(srs[k], today))
      .sort((a, b) => srs[a].due - srs[b].due || srs[a].box - srs[b].box || (a < b ? -1 : 1))
      .slice(0, opts.reviewLimit);
    const doneToday = (state.day && state.day.newDone) || [];
    const room = Math.max(0, opts.newLimit - doneToday.length);
    const skip = new Set(opts.skip || []);
    const fresh = kanji.filter(k => !srs['k:' + k.id] && !skip.has(k.id)).slice(0, room).map(k => k.id);
    return { reviews, fresh };
  }

  /* Cards that only had the old honor-system "Got it" get a first real check, spread over a few days. */
  function migrate(state, today) {
    state.srs = state.srs || {};
    let n = 0;
    Object.keys(state.earned || {}).forEach(key => {
      if (!/^(k|ex):/.test(key) || state.srs[key]) return;
      state.srs[key] = { box: 1, due: today + Math.floor(n / 20), seen: 1, right: 1, wrong: 0, lapses: 0, last: today };
      n++;
    });
    return n;
  }

  /* ---------- Kanji questions ---------- */

  // Seeded random so tests (and re-renders of the same card) are repeatable.
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  const hash = str => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const shuffle = (arr, rand) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const VOICE = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
    た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ' };
  const UNVOICE = Object.fromEntries(Object.entries(VOICE).map(([a, b]) => [b, a]));

  // Plausible misreadings: long/short vowels, voicing, and small っ — the classic N3 traps.
  function nearMisses(r) {
    const out = new Set();
    const swap = (i, ch) => r.slice(0, i) + ch + r.slice(i + 1);
    for (let i = 0; i < r.length; i++) {
      const c = r[i];
      // Voicing never follows a small っ in real words, so don't invent that.
      if (r[i - 1] !== 'っ') {
        if (VOICE[c] && c !== 'ち' && c !== 'つ') out.add(swap(i, VOICE[c]));
        if (UNVOICE[c] && c !== 'ぢ' && c !== 'づ') out.add(swap(i, UNVOICE[c]));
      }
      if (c === 'う' && i > 0 && /[おこそとのほもよろごぞどぼぽょゅうくすつぬふむゆるぐずぶぷ]/.test(r[i - 1])) out.add(r.slice(0, i) + r.slice(i + 1));
      if (c === 'っ') out.add(r.slice(0, i) + r.slice(i + 1));
    }
    for (let i = 1; i < r.length; i++) {
      if (/[ょゅ]/.test(r[i]) && r[i + 1] !== 'う') out.add(r.slice(0, i + 1) + 'う' + r.slice(i + 1));
    }
    if (/[こそとのほもよろごぞどぼ]$/.test(r)) out.add(r + 'う');
    out.delete(r);
    return [...out].filter(Boolean);
  }

  /* Build one multiple-choice question for a kanji. Kind rotates with the card's box:
     new cards ask the meaning, later ones ask a compound's reading or pick the compound from its English. */
  function kanjiQuestion(k, all, box, salt = 0) {
    const rand = rng(hash(k.id) + box * 101 + salt * 7919);
    const kinds = box <= 0 ? ['meaning'] : ['reading', 'word', 'reading', 'meaning'];
    const kind = kinds[Math.floor(rand() * kinds.length)];
    const others = all.filter(o => o.id !== k.id);

    if (kind === 'meaning') {
      const pool = shuffle(others, rand).map(o => o.mean).filter((m, i, a) => m !== k.mean && a.indexOf(m) === i);
      const opts = shuffle([k.mean, ...pool.slice(0, 3)], rand);
      return { kind, prompt: k.k, ask: 'What does this kanji mean?', opts, a: opts.indexOf(k.mean), jp: false };
    }

    const w = k.words[Math.floor(rand() * k.words.length)];
    if (kind === 'reading') {
      const misses = shuffle(nearMisses(w[1]), rand);
      // Prefer readings of a similar length; long words fall back to closest lengths, then extra near-misses.
      const byLen = shuffle(others.flatMap(o => o.words.map(x => x[1])), rand)
        .sort((x, y) => Math.abs(x.length - w[1].length) - Math.abs(y.length - w[1].length));
      const pool = [...misses.slice(0, 2), ...byLen.slice(0, 6), ...misses.slice(2)]
        .filter((x, i, a) => x !== w[1] && a.indexOf(x) === i);
      const opts = shuffle([w[1], ...pool.slice(0, 3)], rand);
      return { kind, prompt: w[0], ask: 'How is this word read?', opts, a: opts.indexOf(w[1]), jp: true, word: w };
    }

    // word: English meaning → pick the compound. Distractors share a kanji or a length to stay tricky.
    const sharing = others.flatMap(o => o.words).filter(x => x[0] !== w[0] && (x[0].length === w[0].length));
    const pool = shuffle(sharing, rand).map(x => x[0]).filter((x, i, a) => a.indexOf(x) === i && x !== w[0]);
    const opts = shuffle([w[0], ...pool.slice(0, 3)], rand);
    return { kind, prompt: w[2], ask: 'Which word means this?', opts, a: opts.indexOf(w[0]), jp: true, word: w };
  }

  /* Next JLPT date: first Sunday of July or December. */
  function nextJlpt(from = new Date()) {
    for (let y = from.getFullYear(); y <= from.getFullYear() + 1; y++) {
      for (const m of [6, 11]) {
        const d = new Date(y, m, 1);
        d.setDate(1 + ((7 - d.getDay()) % 7));
        if (dayNum(d) >= dayNum(from)) return d;
      }
    }
    return null;
  }

  return { INTERVALS, dayNum, review, isDue, strength, buildQueue, migrate, kanjiQuestion, nearMisses, nextJlpt };
})();
