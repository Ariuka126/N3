/* Kanji Bakery — app logic. Everything persists to localStorage under one key. */
(function () {
  'use strict';

  // Storage key keeps the app's original name so everyone's saved progress survives the rename.
  const KEY = 'n3-sanctuary-v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ruby = s => s.replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  const plain = s => s.replace(/<[^>]+>/g, ' ').replace(/\{([^|}]+)\|[^}]+\}/g, '$1').replace(/\s+/g, ' ').trim();
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const KANJI = Object.fromEntries(N3.KANJI.map(k => [k.id, k]));
  const EX = {};
  N3.BOOKS.forEach(b => (b.items || []).forEach(it => { EX[it.id] = { book: b, item: it }; }));

  /* ---------- State ---------- */
  const defaults = () => ({
    gems: 0,
    earned: {},
    tricky: [],
    graduated: {},
    equipped: { head: null, neck: null, face: null },
    theme: 'meadow',
    settings: { reducedMotion: null, sound: false, sfx: true, lowEnergy: false, furigana: true, guide: true, newPerDay: 3, reviewLimit: 40 },
    pomo: { focus: 25, brk: 5, phase: 'idle', endAt: null, remaining: null, sessions: 0, sessionsDay: '', focusN: 0, focusRight: 0 },
    visits: { count: 0, last: '' },
    day: { date: '', steps: [], newDone: [] },
    // Spaced review record per card ("k:<id>" / "ex:<id>") and a per-day study log.
    srs: {},
    log: {},
    examDate: '',
    noteText: {},
    pets: 0
  });

  let S = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = defaults(), s = JSON.parse(raw);
        return Object.assign(d, s, {
          settings: Object.assign(d.settings, s.settings),
          pomo: Object.assign(d.pomo, s.pomo),
          equipped: Object.assign(d.equipped, s.equipped),
          day: Object.assign(d.day, s.day)
        });
      }
    } catch (e) { /* storage unavailable or corrupt: start fresh */ }
    return defaults();
  }
  let saveTimer = null;
  function save() {
    S.updatedAt = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
      if (N3.Sync) N3.Sync.schedule();
    }, 150);
  }

  const ui = { selectedBook: null, lastLine: -1, lastPointer: 'mouse', idleTimer: null };

  /* ---------- Unlocks ---------- */
  const unlocked = u => S.gems >= u.at;
  const unlockOf = (kind, id) => N3.UNLOCKS.find(u => u.kind === kind && u.id === id);
  const isUnlocked = (kind, id) => kind === 'theme' && id === 'meadow' ? true : unlocked(unlockOf(kind, id));
  function unlockName(u) {
    if (u.kind === 'closet') return N3.CLOSET[u.id].name;
    if (u.kind === 'theme') return N3.THEMES[u.id].name;
    return N3.NOTES[u.id].title;
  }
  const nextUnlock = () => N3.UNLOCKS.find(u => S.gems < u.at);

  /* ---------- Settings ---------- */
  function applySettings() {
    const st = S.settings;
    if (st.reducedMotion === null) st.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.classList.toggle('rm', st.reducedMotion);
    document.body.classList.toggle('no-furi', !st.furigana);
    document.body.classList.toggle('low-energy', st.lowEnergy);
    $('#tg-motion').setAttribute('aria-pressed', st.reducedMotion);
    $('#tg-sound').setAttribute('aria-pressed', st.sound);
    $('#tg-sfx').setAttribute('aria-pressed', st.sfx);
    N3.Audio.setSfx(st.sfx);
    $('#tg-energy').setAttribute('aria-pressed', st.lowEnergy);
    $('#furi-toggle').checked = st.furigana;
    $('#guide-toggle').checked = st.guide;
    $('#pad-guide').classList.toggle('off', !st.guide);
  }

  function bindToggles() {
    $('#tg-motion').addEventListener('click', () => {
      S.settings.reducedMotion = !S.settings.reducedMotion;
      N3.Audio.toggle(S.settings.reducedMotion);
      applySettings(); buildParticles(); save();
    });
    $('#tg-sound').addEventListener('click', () => {
      S.settings.sound = !S.settings.sound;
      N3.Audio.setAmbient(S.settings.sound);
      N3.Audio.toggle(S.settings.sound);
      applySettings(); save();
    });
    $('#tg-sfx').addEventListener('click', () => {
      // Play the "off" blip before muting, and the "on" blip after unmuting.
      if (S.settings.sfx) N3.Audio.toggle(false);
      S.settings.sfx = !S.settings.sfx;
      applySettings(); save();
      if (S.settings.sfx) N3.Audio.toggle(true);
    });
    $('#tg-energy').addEventListener('click', () => {
      S.settings.lowEnergy = !S.settings.lowEnergy;
      N3.Audio.toggle(S.settings.lowEnergy);
      applySettings(); save();
      if (S.settings.lowEnergy) speak(14); else speak('nudge');
      renderToday(); renderSession();
    });
    $('#furi-toggle').addEventListener('change', e => { S.settings.furigana = e.target.checked; N3.Audio.toggle(e.target.checked); applySettings(); save(); });
    $('#guide-toggle').addEventListener('change', e => { S.settings.guide = e.target.checked; N3.Audio.toggle(e.target.checked); applySettings(); save(); });
    // One soft tap for ordinary buttons. Toggles, the cat and answer options have their own sounds.
    document.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled || b.matches('.toggle, #cat, #m-cat, .opt')) return;
      if (b.matches('.tab')) N3.Audio.tab(); else N3.Audio.tap();
    }, true);
  }

  /* ---------- Cat ---------- */
  function renderCat() {
    $('#cat').innerHTML = N3.catSVG(S.equipped);
    $('#m-cat').innerHTML = N3.catSVG(S.equipped);
    setPose();
  }
  function setPose() {
    const p = S.pomo.phase === 'focus' ? 'focus' : S.pomo.phase === 'break' ? 'break' : 'idle';
    $$('.cat-svg').forEach(svg => svg.setAttribute('class', `cat-svg pose-${p}`));
  }

  // Speak a line from the bank (number or pool name) or, with { text }, a line about the learner's own progress.
  function speak(which) {
    let text;
    if (which && which.text) text = which.text;
    else {
      let n;
      if (typeof which === 'number') n = which;
      else {
        const pool = N3.LINE_POOLS[which] || N3.LINE_POOLS.idle;
        const options = pool.length > 1 ? pool.filter(i => i !== ui.lastLine) : pool;
        n = pick(options);
      }
      ui.lastLine = n;
      text = N3.LINES[n - 1];
    }
    const b = $('#bubble');
    b.classList.remove('show');
    void b.offsetWidth;
    b.textContent = text;
    b.classList.add('show');
    const mb = $('#m-bubble');
    mb.textContent = text;
    mb.hidden = false;
    mb.classList.remove('show'); void mb.offsetWidth; mb.classList.add('show');
    clearTimeout(ui.mbTimer);
    // On phones the bubble floats over content, so keep it brief; tapping it dismisses it.
    ui.mbTimer = setTimeout(() => { mb.hidden = true; }, 4500);
    resetIdle();
  }

  function resetIdle() {
    clearTimeout(ui.idleTimer);
    ui.idleTimer = setTimeout(() => {
      const tip = Math.random() < 0.5 && N3.Progress && N3.Progress.insight(S);
      speak(tip ? { text: tip } : S.settings.lowEnergy ? 'lowEnergy' : 'idle');
    }, 150000);
  }

  function pet(e) {
    S.pets++; save();
    const host = e.currentTarget;
    host.classList.remove('pet'); void host.offsetWidth; host.classList.add('pet');
    N3.Audio.purr();
    if (!S.settings.reducedMotion) {
      const r = host.getBoundingClientRect();
      for (let i = 0; i < 5; i++) {
        const p = document.createElement('span');
        p.className = 'purr';
        p.textContent = i === 2 ? 'purr' : '♥';
        p.style.left = (r.left + r.width * (0.25 + Math.random() * 0.5)) + 'px';
        p.style.top = (r.top + r.height * 0.25) + 'px';
        p.style.setProperty('--dx', ((Math.random() - 0.5) * 60) + 'px');
        p.style.animationDelay = (i * 0.08) + 's';
        $('#fly-layer').appendChild(p);
        setTimeout(() => p.remove(), 1600);
      }
    }
    speak(S.pets === 1 || Math.random() < 0.35 ? 31 : 'pet');
  }

  /* ---------- Jar & gems ---------- */
  // A jar holds JAR_SIZE gems; once full, a fresh jar starts and the filled count shows on the label.
  const JAR_SIZE = 78;
  const jarsFilled = () => (S.gems > 0 ? Math.floor((S.gems - 1) / JAR_SIZE) : 0);

  function renderJar(fresh = 0) {
    $('#jar').innerHTML = N3.jarSVG(S.gems - jarsFilled() * JAR_SIZE, fresh);
    $('#jar-count').textContent = S.gems;
    $('#jar-count').nextSibling.textContent = (S.gems === 1 ? ' gem' : ' gems') + (jarsFilled() ? ` · jar ${jarsFilled() + 1}` : '');
    $('#m-count').textContent = S.gems;
    const nu = nextUnlock();
    const prev = [...N3.UNLOCKS].reverse().find(u => S.gems >= u.at);
    const base = prev ? prev.at : 0;
    $('#jar-next').textContent = nu ? ` · next treat at ${nu.at}` : ' · every treat unlocked';
    $('#m-meter-fill').style.width = nu ? `${((S.gems - base) / (nu.at - base)) * 100}%` : '100%';
    $('#jar').setAttribute('aria-label', `Kanji jar: ${S.gems} gems${nu ? `, next unlock at ${nu.at}` : ''}`);
  }

  function visibleJar() {
    const j = $('#jar');
    const r = j.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight ? j : $('#m-jar');
  }

  /* Award a gem once per key. Returns true when a new gem was earned. */
  function award(key, fromEl) {
    if (S.earned[key]) return false;
    S.earned[key] = true;
    S.gems++;
    save();
    N3.Audio.gem();
    const done = () => {
      N3.Audio.clink();
      renderJar(1);
      const j = visibleJar();
      j.classList.remove('bump'); void j.offsetWidth; j.classList.add('bump');
      checkUnlock();
    };
    if (S.settings.reducedMotion || !fromEl) done();
    else flyGem(fromEl, visibleJar(), done);
    return true;
  }

  function flyGem(from, to, cb) {
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const g = document.createElement('div');
    g.className = 'fly-gem';
    g.innerHTML = N3.gemSVG([190, 320, 45, 140, 265][S.gems % 5]);
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    const x1 = b.left + b.width / 2, y1 = b.top + b.height * 0.55;
    g.style.left = x0 + 'px'; g.style.top = y0 + 'px';
    $('#fly-layer').appendChild(g);
    const dx = x1 - x0, dy = y1 - y0;
    const anim = g.animate([
      { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
      { transform: `translate(calc(-50% + ${dx * 0.3}px), calc(-50% + ${dy * 0.3 - 80}px)) scale(1.3)`, opacity: 1, offset: 0.35 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.7)`, opacity: 0.9 }
    ], { duration: 900, easing: 'cubic-bezier(.45,.05,.4,1)' });
    // Background tabs can stall animations, so a timer guarantees the jar still updates.
    let landed = false;
    const land = () => { if (landed) return; landed = true; g.remove(); cb(); };
    anim.onfinish = land;
    setTimeout(land, 1100);
  }

  function checkUnlock() {
    if (S.gems % JAR_SIZE === 0) toast(`Jar ${S.gems / JAR_SIZE} is full! A fresh jar is waiting on the counter.`, 'unlock');
    const u = N3.UNLOCKS.find(x => x.at === S.gems);
    if (u) {
      const label = u.kind === 'closet' ? 'Closet item' : u.kind === 'theme' ? 'Theme' : 'Secret note';
      toast(`<b>Unlocked:</b> ${label} — ${esc(unlockName(u))}`, 'unlock');
      setTimeout(() => N3.Audio.unlock(), 350);
      renderKeep();
      setTimeout(() => speak(38), 400);
      return;
    }
    const nu = nextUnlock();
    if (nu && nu.at - S.gems <= 2 && Math.random() < 0.5) speak(38);
    else speak('gem');
  }

  /* ---------- Daily progress ---------- */
  function ensureDay() {
    const t = todayKey();
    if (S.day.date === t) return;
    S.day = { date: t, steps: [], newDone: [] };
    if (S.pomo.sessionsDay !== t) { S.pomo.sessions = 0; S.pomo.sessionsDay = t; }
    save();
  }
  const goal = () => (S.settings.lowEnergy ? 1 : 5);
  function step(key) {
    if (S.day.steps.includes(key)) return;
    const before = S.day.steps.length;
    S.day.steps.push(key);
    save();
    renderToday();
    if (before < goal() && S.day.steps.length >= goal()) {
      toast(S.settings.lowEnergy ? 'Tiny goal met. That counts, fully.' : 'Today’s gentle goal is met. Anything more is a bonus.', 'soft');
    }
  }
  function logStat(field, n) {
    const k = todayKey();
    S.log[k] = Object.assign({ n: 0, right: 0, focus: 0 }, S.log[k]);
    S.log[k][field] += n;
  }

  /* Every answered question (desk, library, tricky shelf) goes through here.
     Gems: the first time an item is answered correctly, and again for each correct answer on a review that was due. */
  function recordResult(key, correct, fromEl) {
    const today = N3.SRS.dayNum();
    const prev = S.srs[key];
    const wasDueReview = !!prev && prev.due <= today && !!S.earned[key];
    if (!prev && key.startsWith('k:')) S.day.newDone = [...new Set([...(S.day.newDone || []), key.slice(2)])];
    S.srs[key] = N3.SRS.review(prev, correct, today);
    logStat('n', 1);
    if (correct) logStat('right', 1);
    if (S.pomo.phase === 'focus') { S.pomo.focusN++; if (correct) S.pomo.focusRight++; }
    const kind = key.startsWith('k:') ? 'kanji' : 'ex', id = key.slice(kind === 'kanji' ? 2 : 3);
    if (correct) {
      removeTricky(kind, id);
      if (!award(key, fromEl) && wasDueReview) award(`rv:${key}:${today}`, fromEl);
    } else {
      addTricky(kind, id);
    }
    step(key);
    save();
    renderSessionCount();
  }

  function renderToday() {
    const h = new Date().getHours();
    const greet = h < 5 ? 'Late-night lamp is on' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const g = goal(), n = Math.min(S.day.steps.length, g);
    const seeds = Array.from({ length: g }, (_, i) => `<span class="seed ${i < n ? 'grown' : ''}" aria-hidden="true"></span>`).join('');
    const q = queue();
    const left = q.reviews.length + q.fresh.length;
    const head = S.settings.lowEnergy ? 'Low-battery day: one tiny step is plenty'
      : left ? `Today: ${q.reviews.length} to review, ${q.fresh.length} new` : 'All caught up for today';
    $('#today').innerHTML = `
      <div class="today-row">
        <div>
          <p class="eyebrow">${greet}</p>
          <h2>${head}</h2>
          <p class="muted small">${n >= g ? 'Gentle goal met — anything else is a bonus.' : `Gentle goal: answer ${g} question${g > 1 ? 's' : ''} anywhere in the app.`}</p>
        </div>
        <div class="seeds" role="img" aria-label="${n} of ${g} answered">${seeds}</div>
      </div>
      <div class="today-actions">
        <button class="btn soft" data-go="reading">One short reading</button>
        <button class="btn soft" data-go="library">Browse the Library</button>
        <button class="btn ghost" data-go="tricky">Tricky Shelf (${S.tricky.length})</button>
      </div>`;
    renderTrickyPeek();
  }

  /* ---------- Study session (Desk) ---------- */
  // current: the item on screen; it stays until "Next" even after answering changes the queue.
  const session = { current: null, q: null, salt: 0, learned: new Set(), skip: new Set(), extra: 0, custom: null };

  function queue() {
    const low = S.settings.lowEnergy;
    return N3.SRS.buildQueue(S, N3.KANJI, N3.SRS.dayNum(), {
      newLimit: (low ? 1 : S.settings.newPerDay) + session.extra,
      reviewLimit: low ? 5 : S.settings.reviewLimit,
      skip: [...session.skip]
    });
  }

  function nextItem() {
    if (session.custom) return { type: 'kanji', id: session.custom, isNew: !S.srs['k:' + session.custom], custom: true };
    const q = queue();
    if (q.reviews.length) {
      const key = q.reviews[0];
      return key.startsWith('k:') ? { type: 'kanji', id: key.slice(2), isNew: false } : { type: 'ex', id: key.slice(3) };
    }
    return q.fresh.length ? { type: 'kanji', id: q.fresh[0], isNew: true } : null;
  }

  const kanjiCardHTML = k => `
    <div class="k-top">
      <div class="k-big" lang="ja">${k.k}</div>
      <div class="k-meta">
        <p class="k-mean">${esc(k.mean)}</p>
        <dl class="k-read"><dt>On</dt><dd lang="ja">${k.on}</dd><dt>Kun</dt><dd lang="ja">${k.kun}</dd></dl>
      </div>
    </div>
    <ul class="k-words">${k.words.map(w => `<li><span class="w-jp" lang="ja"><ruby>${w[0]}<rt>${w[1]}</rt></ruby></span><span class="w-en">${esc(w[2])}</span></li>`).join('')}</ul>
    <div class="k-ex"><p lang="ja">${ruby(k.ex)}</p><p class="muted small">${esc(k.en)}</p></div>`;

  const STRENGTH = { new: 'New', learning: 'Learning', growing: 'Growing', strong: 'Strong' };
  const days = n => (n <= 0 ? 'later today' : n === 1 ? 'tomorrow' : `in ${n} days`);

  function renderSessionCount() {
    const q = queue();
    $('#session-count').textContent = session.custom ? 'Extra practice' : `${q.reviews.length} to review · ${q.fresh.length} new`;
  }

  function renderSession() {
    renderSessionCount();
    if (!session.current) { session.current = nextItem(); session.q = null; }
    const it = session.current;
    const grid = $('#kanji-grid');
    if (!it) { grid.dataset.mode = 'done'; renderDone(); return; }
    if (it.type === 'ex') { grid.dataset.mode = 'quiz'; renderExReview(it); return; }
    const k = KANJI[it.id];
    $('#pad-guide').textContent = k.k;
    if (it.isNew && !session.learned.has(it.id)) { grid.dataset.mode = 'learn'; renderLearn(k, it); return; }
    grid.dataset.mode = 'quiz';
    renderKanjiQuiz($('#kcard'), k, it.isNew ? 'New kanji check' : it.custom ? 'Extra practice' : 'Review', nextCard);
  }

  function nextCard() {
    if (session.custom) session.custom = null;
    session.current = null; session.salt++;
    clearPad();
    renderSession(); renderToday(); renderAllK();
  }

  function renderLearn(k, it) {
    $('#kcard').innerHTML = `<p class="eyebrow">New kanji · study it, then check yourself</p>${kanjiCardHTML(k)}
      <div class="card-actions">
        <button class="btn primary" id="learn-quiz">I’ve studied it — quiz me ›</button>
        ${it.custom ? '' : '<button class="btn ghost" id="learn-skip">Skip for today</button>'}
      </div>`;
    clearPad();
    $('#learn-quiz').addEventListener('click', () => { session.learned.add(k.id); renderSession(); });
    const skip = $('#learn-skip');
    if (skip) skip.addEventListener('click', () => { session.skip.add(k.id); session.current = null; renderSession(); renderToday(); });
  }

  /* An auto-graded kanji question. Used on the Desk and on the Tricky Shelf. */
  function renderKanjiQuiz(host, k, label, onNext) {
    const key = 'k:' + k.id, rec = S.srs[key];
    const qn = N3.SRS.kanjiQuestion(k, N3.KANJI, rec ? rec.box : 0, session.salt);
    host.innerHTML = `
      <p class="eyebrow">${esc(label)} · ${STRENGTH[N3.SRS.strength(rec)]}</p>
      <div class="quiz-prompt quiz-${qn.kind}" ${qn.kind === 'word' ? '' : 'lang="ja"'}>${esc(qn.prompt)}</div>
      <p class="q-ask">${qn.ask}</p>
      <div class="opts">${qn.opts.map((t, i) => `<button class="opt" data-i="${i}" ${qn.jp ? 'lang="ja"' : ''}><span class="opt-n">${i + 1}</span>${esc(t)}</button>`).join('')}</div>
      <button class="linkish dunno">I don’t know — show me</button>
      <div class="feedback" hidden></div>`;
    const opts = $('.opts', host);
    const answer = (i, btn) => {
      if (opts.classList.contains('answered')) return;
      opts.classList.add('answered');
      const ok = i === qn.a;
      $$('.opt', opts).forEach(b => { b.disabled = true; if (+b.dataset.i === qn.a) b.classList.add('right'); });
      if (btn && !ok) btn.classList.add('wrong');
      $('.dunno', host).hidden = true;
      recordResult(key, ok, ok ? btn : null);
      if (!ok) N3.Audio.gentle();
      const due = S.srs[key].due - N3.SRS.dayNum();
      const fb = $('.feedback', host);
      fb.hidden = false;
      fb.className = `feedback ${ok ? 'ok' : 'soft'}`;
      fb.innerHTML = `<p class="fb-head">${ok ? `Remembered ✦ — next check ${days(due)}.` : `Not yet — no penalty. It comes back ${days(due)} and rests on your Tricky Shelf.`}</p>
        <div class="fb-card">${kanjiCardHTML(k)}</div>
        <div class="modal-actions"><button class="btn primary next-q">Next ›</button></div>`;
      $('#kanji-grid').dataset.mode = host.id === 'kcard' ? 'answered' : $('#kanji-grid').dataset.mode;
      $('.next-q', host).addEventListener('click', onNext);
      $('.next-q', host).focus({ preventScroll: true });
      if (!ok) speak('fuzzy');
    };
    opts.addEventListener('click', e => { const b = e.target.closest('.opt'); if (b) answer(+b.dataset.i, b); });
    $('.dunno', host).addEventListener('click', () => answer(-1, null));
  }

  function renderExReview(it) {
    const { book, item } = EX[it.id];
    $('#kcard').innerHTML = `<p class="eyebrow">Review · ${esc(book.title)}</p><div id="ex-host"></div>`;
    renderQuestion($('#ex-host'), book, item, {
      onCorrect: btn => recordResult('ex:' + item.id, true, btn),
      onWrong: () => { recordResult('ex:' + item.id, false); speak('fuzzy'); },
      nextLabel: 'Next ›',
      onNext: nextCard
    });
  }

  function renderDone() {
    const today = N3.SRS.dayNum();
    const tomorrow = Object.values(S.srs).filter(r => r.due === today + 1).length;
    const moreNew = N3.KANJI.some(k => !S.srs['k:' + k.id]);
    $('#kcard').innerHTML = `<div class="session-done">
      <p class="big">All caught up for today ✦</p>
      <p>${tomorrow ? `${tomorrow} card${tomorrow > 1 ? 's' : ''} will be back tomorrow.` : 'Nothing is scheduled for tomorrow yet.'}
        Coming back daily, even briefly, is what makes things stick.</p>
      <div class="card-actions">
        ${moreNew ? '<button class="btn primary" id="more-new">Learn 3 more new kanji</button>' : ''}
        <button class="btn soft" data-go="library">Practice in the Library</button>
      </div></div>`;
    const more = $('#more-new');
    if (more) more.addEventListener('click', () => { session.extra += 3; session.current = null; renderSession(); renderToday(); });
  }

  function renderAllK() {
    const counts = { learning: 0, growing: 0, strong: 0 };
    $('#allk').innerHTML = N3.KANJI.map(k => {
      const st = N3.SRS.strength(S.srs['k:' + k.id]);
      if (counts[st] != null) counts[st]++;
      return `<button class="allk-cell s-${st}" data-id="${k.id}" lang="ja" title="${esc(k.mean)} · ${STRENGTH[st]}">${k.k}</button>`;
    }).join('');
    $('#allk-count').textContent = `${N3.KANJI.length} kanji · ${counts.strong} strong · ${counts.growing} growing · ${counts.learning} learning`;
  }

  function bindKanji() {
    $('#allk').addEventListener('click', e => {
      const b = e.target.closest('[data-id]');
      if (!b) return;
      session.custom = b.dataset.id; session.current = null;
      renderSession();
      $('#kcard').scrollIntoView({ behavior: S.settings.reducedMotion ? 'auto' : 'smooth', block: 'center' });
    });
  }

  /* ---------- Scratchpad ---------- */
  const pad = { ctx: null, drawing: false, last: null, size: 0 };
  function setupPad() {
    const c = $('#pad');
    pad.ctx = c.getContext('2d');
    const fit = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (!r.width) return;
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      pad.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pad.size = r.width;
      pad.ctx.lineCap = 'round'; pad.ctx.lineJoin = 'round';
    };
    new ResizeObserver(fit).observe(c);
    const pos = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    c.addEventListener('pointerdown', e => {
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      pad.drawing = true; pad.last = pos(e);
      dot(pad.last, e);
    });
    c.addEventListener('pointermove', e => {
      if (!pad.drawing) return;
      const p = pos(e), ctx = pad.ctx;
      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#3b2a2a';
      ctx.lineWidth = Math.max(4, pad.size * 0.04) * (e.pressure && e.pointerType === 'pen' ? 0.6 + e.pressure : 1);
      ctx.beginPath(); ctx.moveTo(pad.last.x, pad.last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      pad.last = p;
    });
    const end = () => { pad.drawing = false; };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    $('#pad-clear').addEventListener('click', clearPad);
  }
  function dot(p) {
    const ctx = pad.ctx;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#3b2a2a';
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, pad.size * 0.02), 0, Math.PI * 2); ctx.fill();
  }
  function clearPad() {
    const c = $('#pad');
    if (pad.ctx) { pad.ctx.save(); pad.ctx.setTransform(1, 0, 0, 1, 0, 0); pad.ctx.clearRect(0, 0, c.width, c.height); pad.ctx.restore(); }
  }

  /* ---------- Tricky shelf ---------- */
  function addTricky(kind, id) {
    if (S.tricky.some(t => t.kind === kind && t.id === id)) return;
    // +1 keeps "added" strictly after a graduation stamped in the same millisecond.
    S.tricky.push({ kind, id, added: Date.now() + 1 });
    save(); renderTricky();
  }
  function removeTricky(kind, id) {
    const before = S.tricky.length;
    S.tricky = S.tricky.filter(t => !(t.kind === kind && t.id === id));
    if (S.tricky.length !== before) {
      // Remember when it graduated so cloud sync doesn't bring it back from another device.
      S.graduated = Object.assign(S.graduated || {}, { [`${kind}:${id}`]: Date.now() });
      save(); renderTricky();
    }
  }
  function trickyLabel(t) {
    if (t.kind === 'kanji') { const k = KANJI[t.id]; return { tag: 'Kanji', jp: k.k, text: k.mean }; }
    const { book, item } = EX[t.id];
    return { tag: book.title, jp: '', text: plain(item.q) };
  }
  function renderTricky() {
    const list = $('#tricky-list');
    const badge = $('#tricky-badge');
    badge.hidden = !S.tricky.length; badge.textContent = S.tricky.length;
    if (!S.tricky.length) {
      list.innerHTML = '<li class="empty">The shelf is empty and dusted. Anything marked “Still fuzzy” or missed in the Library will rest here.</li>';
    } else {
      list.innerHTML = S.tricky.map((t, i) => {
        const l = trickyLabel(t);
        return `<li><button class="tricky-item" data-i="${i}">
          <span class="ti-tag">${esc(l.tag)}</span>
          ${l.jp ? `<span class="ti-jp" lang="ja">${l.jp}</span>` : ''}
          <span class="ti-text" lang="${t.kind === 'kanji' ? 'en' : 'ja'}">${esc(l.text)}</span>
          <span class="ti-go" aria-hidden="true">Review ›</span></button></li>`;
      }).join('');
    }
    renderTrickyPeek();
  }
  function renderTrickyPeek() {
    const el = $('#tricky-peek');
    const few = S.tricky.slice(0, 4).map(t => {
      const l = trickyLabel(t);
      return `<button class="peek-chip" data-ti="${S.tricky.indexOf(t)}" lang="ja">${l.jp || esc(l.text.slice(0, 14) + (l.text.length > 14 ? '…' : ''))}</button>`;
    }).join('');
    el.innerHTML = `<div class="area-head"><h3>Tricky Shelf</h3><button class="btn ghost small" data-go="tricky">Open shelf</button></div>
      ${S.tricky.length ? `<div class="peek-row">${few}${S.tricky.length > 4 ? `<span class="muted small">+${S.tricky.length - 4} more</span>` : ''}</div>`
        : '<p class="muted small">Nothing resting here right now.</p>'}`;
  }

  function reviewTricky(i) {
    const t = S.tricky[i];
    if (!t) return;
    speak('tricky');
    // Graduating takes a correct answer, not a feeling.
    if (t.kind === 'kanji') {
      const k = KANJI[t.id];
      openModal(`Tricky Shelf · ${k.k}`, '<div id="quiz-host"></div>', true);
      session.salt++;
      renderKanjiQuiz($('#quiz-host'), k, 'Tricky Shelf', () => { closeModal(); renderSession(); });
    } else {
      const { book, item } = EX[t.id];
      openModal(`Tricky Shelf · ${book.title}`, '<div id="quiz-host"></div>', true);
      renderQuestion($('#quiz-host'), book, item, {
        onCorrect: btn => recordResult('ex:' + item.id, true, btn),
        onWrong: () => { recordResult('ex:' + item.id, false); speak('fuzzy'); },
        nextLabel: 'Back to shelf',
        onNext: () => closeModal()
      });
    }
  }

  /* ---------- Library ---------- */
  function bookProgress(b) {
    if (b.kind === 'guide') return S.earned['guide:' + b.id] ? [1, 1] : [0, 1];
    return [b.items.filter(i => S.earned['ex:' + i.id]).length, b.items.length];
  }
  const bookDue = b => (b.items || []).filter(i => N3.SRS.isDue(S.srs['ex:' + i.id], N3.SRS.dayNum())).length;

  function renderShelf() {
    const shelf = $('#shelf');
    const spine = b => {
      const [d, n] = bookProgress(b), due = bookDue(b);
      return `<button class="spine ${d === n ? 'complete' : ''}" data-book="${b.id}" style="--spine:${b.color};--h:${b.height}%"
        aria-label="${esc(b.title)} — ${esc(b.type)}. ${d} of ${n} done${due ? `, ${due} due for review` : ''}.">
        <span class="spine-jp" lang="ja">${b.jp}</span><span class="spine-band"></span>${d === n ? '<span class="spine-star" aria-hidden="true">✦</span>' : ''}${due ? `<span class="spine-due" aria-hidden="true">${due}</span>` : ''}</button>`;
    };
    const rows = [['words', '文字・語彙 · Kanji & vocabulary'], ['grammar', '文法 · Grammar'], ['reading', '読解 · Reading & guide']];
    shelf.innerHTML = rows.map(([id, label], i) => `<p class="shelf-label">${label}</p>
      <div class="shelf-row">${N3.BOOKS.filter(b => b.shelf === id).map(spine).join('')}${i === 2 ? '<span class="shelf-deco" aria-hidden="true"></span>' : ''}</div>
      <div class="shelf-board"></div>`).join('');
    $('#shelf-hint').textContent = matchMedia('(hover: hover) and (pointer: fine)').matches
      ? 'Hover a spine to peek, click to open.'
      : 'Tap a spine to peek, tap again to open.';
    $('#book-progress').innerHTML = N3.BOOKS.map(b => {
      const [d, n] = bookProgress(b);
      return `<li><span class="bp-dot" style="background:${b.color}"></span><span class="bp-title">${esc(b.title)}</span>
        <span class="bp-bar"><span style="width:${(d / n) * 100}%"></span></span><span class="bp-num">${d}/${n}</span></li>`;
    }).join('');
  }

  function showTag(spine) {
    const tag = $('#shelf-tag');
    if (!spine) { tag.classList.remove('show'); tag.innerHTML = ''; return; }
    const b = N3.BOOKS.find(x => x.id === spine.dataset.book);
    const [d, n] = bookProgress(b);
    const due = bookDue(b);
    tag.innerHTML = `<b>${esc(b.title)}</b><span>${esc(b.type)}</span><span class="tag-reward">✦ ${esc(b.reward)} · ${d}/${n} done${due ? ` · ${due} due` : ''}</span>
      ${ui.lastPointer !== 'mouse' ? '<em>Tap again to open</em>' : ''}`;
    const sr = spine.getBoundingClientRect();
    const host = tag.parentElement.getBoundingClientRect();
    // Spines lift 14px when selected/hovered; anchor the tag just above that.
    const lifted = spine.matches('.selected, :hover, :focus-visible') ? 0 : 14;
    tag.style.setProperty('--x', `${Math.min(Math.max(sr.left + sr.width / 2 - host.left, 110), host.width - 110)}px`);
    tag.style.setProperty('--y', `${sr.top - host.top - lifted - 6}px`);
    tag.classList.add('show');
  }

  function selectSpine(spine) {
    $$('.spine').forEach(s => s.classList.toggle('selected', s === spine));
    ui.selectedBook = spine ? spine.dataset.book : null;
    showTag(spine);
  }

  function bindShelf() {
    const shelf = $('#shelf');
    shelf.addEventListener('pointerdown', e => { ui.lastPointer = e.pointerType || 'mouse'; });
    shelf.addEventListener('pointerover', e => {
      const s = e.target.closest('.spine');
      if (s && e.pointerType === 'mouse') showTag(s);
    });
    shelf.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !ui.selectedBook) showTag(null); });
    shelf.addEventListener('focusin', e => { const s = e.target.closest('.spine'); if (s) showTag(s); });
    shelf.addEventListener('click', e => {
      const s = e.target.closest('.spine');
      if (!s) { selectSpine(null); return; }
      const touchy = ui.lastPointer === 'touch' || ui.lastPointer === 'pen';
      // Keyboard activation (detail 0) and mouse clicks open straight away.
      if (!touchy || e.detail === 0 || ui.selectedBook === s.dataset.book) {
        selectSpine(null);
        openBook(s.dataset.book);
      } else {
        selectSpine(s);
        if (Math.random() < 0.4) speak('shelf');
      }
      ui.lastPointer = 'mouse';
    });
    document.addEventListener('click', e => {
      if (ui.selectedBook && !e.target.closest('#shelf')) selectSpine(null);
    });
  }

  function openBook(id, startAt) {
    const b = N3.BOOKS.find(x => x.id === id);
    speak(b.kind === 'reading' ? 'reading' : 'shelf');
    if (b.kind === 'guide') return openGuide(b);
    let idx = startAt != null ? startAt : Math.max(0, b.items.findIndex(i => !S.earned['ex:' + i.id]));
    const tally = { right: 0, missed: 0 };
    openModal(`${b.title} <span class="muted small" lang="ja">${b.jp}</span>`, `<div class="book-meta muted small">${esc(b.type)} · inspired by ${esc(b.inspired)}</div><div id="quiz-host"></div>`, true);
    const show = () => {
      const item = b.items[idx];
      renderQuestion($('#quiz-host'), b, item, {
        counter: `${idx + 1} / ${b.items.length}`,
        onCorrect: btn => { tally.right++; recordResult('ex:' + item.id, true, btn); renderShelf(); },
        onWrong: () => { tally.missed++; recordResult('ex:' + item.id, false); speak('fuzzy'); },
        nextLabel: idx < b.items.length - 1 ? 'Next ›' : 'Finish',
        onNext: () => {
          if (idx < b.items.length - 1) { idx++; show(); }
          else finish();
        }
      });
    };
    const finish = () => {
      $('#quiz-host').innerHTML = `<div class="book-end">
        <p class="big">That’s the last page for now.</p>
        <p>${tally.right} clear · ${tally.missed} sent to the Tricky Shelf to rest. Everything you answered will come back for review on its own schedule.</p>
        <p class="muted small">Understanding why an option doesn’t fit is just as useful as picking the right one.</p>
        <div class="modal-actions"><button class="btn primary" data-close>Back to the shelf</button>
        <button class="btn soft" id="again">Read again from page 1</button></div></div>`;
      $('#again').addEventListener('click', () => { idx = 0; show(); });
      speak(32);
    };
    show();
  }

  // Options appear in a new order each time, so reviews test the grammar, not the remembered position.
  function shuffledOrder(n) {
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function renderQuestion(host, book, item, o) {
    const isReading = book.kind === 'reading';
    host.innerHTML = `
      ${o.counter ? `<div class="q-counter">${o.counter}${S.earned['ex:' + item.id] ? ' · <span class="gem-chip chip">✦ earned</span>' : ''}</div>` : ''}
      ${isReading ? `<div class="passage" lang="ja">${ruby(item.passage)}</div>
        <div class="reading-tools">
          <button class="btn ghost small clue-btn" aria-expanded="false">Show clue hint</button>
          <span class="muted small">If you like, read a line or two softly aloud.</span>
        </div>
        <p class="clue" hidden>${esc(item.clue)}</p>` : ''}
      <p class="q" lang="ja">${ruby(item.q)}</p>
      <div class="opts">${shuffledOrder(item.opts.length).map((i, pos) => `<button class="opt" data-i="${i}" lang="ja"><span class="opt-n">${pos + 1}</span>${ruby(item.opts[i])}</button>`).join('')}</div>
      <div class="feedback" hidden></div>`;
    if (isReading) {
      $('.clue-btn', host).addEventListener('click', e => {
        const c = $('.clue', host); c.hidden = !c.hidden;
        e.currentTarget.setAttribute('aria-expanded', !c.hidden);
        e.currentTarget.textContent = c.hidden ? 'Show clue hint' : 'Hide clue hint';
      });
    }
    const opts = $('.opts', host);
    opts.addEventListener('click', e => {
      const btn = e.target.closest('.opt');
      if (!btn || opts.classList.contains('answered')) return;
      opts.classList.add('answered');
      const i = +btn.dataset.i, ok = i === item.a;
      $$('.opt', opts).forEach(b => { b.disabled = true; if (+b.dataset.i === item.a) b.classList.add('right'); });
      if (!ok) btn.classList.add('wrong');
      const fb = $('.feedback', host);
      fb.hidden = false;
      fb.className = `feedback ${ok ? 'ok' : 'soft'}`;
      fb.innerHTML = `<p class="fb-head">${ok ? 'Yes — that’s it.' : 'Not this time, and that’s useful. It’s resting on your Tricky Shelf.'}</p>
        <p>${esc(item.why)}</p>
        <div class="modal-actions"><button class="btn primary next-q">${o.nextLabel}</button></div>`;
      if (ok) o.onCorrect(btn); else { N3.Audio.gentle(); o.onWrong(); }
      $('.next-q', host).addEventListener('click', o.onNext);
      $('.next-q', host).focus({ preventScroll: true });
    });
  }

  function openGuide(b) {
    let p = 0;
    openModal(`${b.title} <span class="muted small" lang="ja">${b.jp}</span>`, '<div id="guide-host"></div>', true);
    const show = () => {
      const pg = b.pages[p];
      $('#guide-host').innerHTML = `<div class="q-counter">Page ${p + 1} / ${b.pages.length}</div>
        <h3 class="guide-h">${esc(pg.h)}</h3><div class="guide-body">${pg.body}</div>
        <div class="modal-actions">
          <button class="btn ghost" id="g-prev" ${p === 0 ? 'disabled' : ''}>‹ Back</button>
          <button class="btn primary" id="g-next">${p < b.pages.length - 1 ? 'Next ›' : 'Close the guide ✦'}</button>
        </div>`;
      $('#g-prev').addEventListener('click', () => { p--; show(); });
      $('#g-next').addEventListener('click', e => {
        if (p < b.pages.length - 1) { p++; show(); return; }
        award('guide:' + b.id, e.currentTarget);
        step('guide:' + b.id);
        renderShelf();
        closeModal();
      });
    };
    show();
  }

  /* ---------- Keepsakes ---------- */
  function renderKeep() {
    $('#closet').innerHTML = `<div class="closet-preview">${N3.catSVG(S.equipped)}</div>
      <div class="closet-items">${Object.entries(N3.CLOSET).map(([id, c]) => {
        const u = unlockOf('closet', id), open = unlocked(u), on = S.equipped[c.slot] === id;
        return `<button class="closet-item ${open ? '' : 'locked'} ${on ? 'on' : ''}" data-item="${id}" ${open ? '' : 'disabled'} aria-pressed="${on}">
          <span class="ci-art">${N3.accessoryPreview(id)}</span>
          <span class="ci-name">${esc(c.name)}</span>
          <span class="ci-state">${open ? (on ? 'Wearing' : 'Wear') : `✦ ${u.at} gems`}</span></button>`;
      }).join('')}</div>`;
    $$('.closet-preview .cat-svg').forEach(s => s.setAttribute('class', 'cat-svg pose-idle'));

    $('#themes').innerHTML = Object.entries(N3.THEMES).map(([id, t]) => {
      const open = isUnlocked('theme', id), u = unlockOf('theme', id);
      return `<button class="theme-card ${open ? '' : 'locked'} ${S.theme === id ? 'on' : ''}" data-theme-id="${id}" ${open ? '' : 'disabled'} aria-pressed="${S.theme === id}">
        <span class="swatch sw-${id}"></span><span class="tc-name">${esc(t.name)}</span>
        <span class="tc-state">${open ? (S.theme === id ? 'Current' : 'Visit') : `✦ ${u.at} gems`}</span></button>`;
    }).join('');

    $('#notes').innerHTML = Object.entries(N3.NOTES).map(([id, n]) => {
      const u = unlockOf('note', id), open = unlocked(u);
      if (!open) return `<div class="note locked"><span class="note-seal" aria-hidden="true">✉</span><span>Sealed note · opens at ✦ ${u.at}</span></div>`;
      // Written notes show as they are; only template notes can be replaced with your own words.
      if (!n.placeholder) return `<div class="note"><p class="note-title">${esc(n.title)}</p><p class="note-body">${esc(n.body)}</p></div>`;
      const text = S.noteText[id] || n.body;
      return `<div class="note"><p class="note-title">${esc(n.title)}</p><p class="note-body ${S.noteText[id] ? '' : 'placeholder'}">${esc(text)}</p>
        <button class="linkish" data-note="${id}">Personalize</button></div>`;
    }).join('');

    $('#milestones').innerHTML = N3.UNLOCKS.map(u => `<li class="${unlocked(u) ? 'done' : ''}">
      <span class="ms-at">✦ ${u.at}</span><span>${esc(unlockName(u))}</span>
      <span class="ms-kind">${u.kind === 'closet' ? 'closet' : u.kind}</span></li>`).join('');
  }

  function bindKeep() {
    $('#closet').addEventListener('click', e => {
      const b = e.target.closest('[data-item]');
      if (!b || b.disabled) return;
      const id = b.dataset.item, slot = N3.CLOSET[id].slot;
      S.equipped[slot] = S.equipped[slot] === id ? null : id;
      save(); renderCat(); renderKeep();
      if (S.equipped[slot]) speak(pick([33, 16, 40]));
    });
    $('#themes').addEventListener('click', e => {
      const b = e.target.closest('[data-theme-id]');
      if (!b || b.disabled) return;
      S.theme = b.dataset.themeId; save(); applyTheme(); renderKeep();
    });
    $('#notes').addEventListener('click', e => {
      const b = e.target.closest('[data-note]');
      if (!b) return;
      const id = b.dataset.note;
      openModal('Personalize this note', `<label class="note-edit"><span class="muted small">${esc(N3.NOTES[id].title)}</span>
        <textarea id="note-text" rows="5">${esc(S.noteText[id] || '')}</textarea></label>
        <div class="modal-actions"><button class="btn primary" id="note-save">Save note</button><button class="btn ghost" data-close>Cancel</button></div>`);
      $('#note-save').addEventListener('click', () => {
        const v = $('#note-text').value.trim();
        if (v) S.noteText[id] = v; else delete S.noteText[id];
        save(); renderKeep(); closeModal();
      });
    });
    $('#reset-all').addEventListener('click', () => {
      const cloud = N3.Sync && N3.Sync.signedIn();
      openModal('Reset all progress?', `
        <p>This clears every gem, unlock, review schedule, Tricky Shelf item, note and setting${cloud ? ' <b>on every device signed in to sync</b>' : ' in this browser'}.</p>
        <p><b>It can’t be undone.</b></p>
        <div class="modal-actions">
          <button class="btn primary" data-close>Keep my progress</button>
          <button class="btn danger" id="reset-yes">Reset everything</button>
        </div>`);
      $('#reset-yes').addEventListener('click', async e => {
        e.currentTarget.disabled = true;
        // resetAt makes the empty state win over older copies on other devices.
        const fresh = Object.assign(defaults(), { resetAt: Date.now(), updatedAt: Date.now(), srsMigrated: true });
        try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch (err) { /* ignore */ }
        if (cloud) await N3.Sync.overwrite(fresh);
        location.reload();
      });
    });
  }

  /* ---------- Scene ---------- */
  function buildScene() {
    $('#bakery').innerHTML = N3.bakerySVG();
    $('#tree').innerHTML = N3.treeSVG();
    $('#lamp').innerHTML = N3.lampSVG();
    $('#clouds').innerHTML = [0, 1, 2, 3].map(i => `<div class="cloud c${i}">${N3.cloudSVG()}</div>`).join('');
    $('#lanterns').innerHTML = [0, 1, 2, 3, 4].map(i => `<div class="lantern l${i}">${N3.lanternSVG()}</div>`).join('');
    $('.m-gem').innerHTML = N3.gemSVG(190);
  }

  function buildParticles() {
    const host = $('#particles');
    host.innerHTML = '';
    if (S.settings.reducedMotion && S.theme !== 'starlit') return;
    const conf = {
      meadow: { n: 14, cls: 'mote' }, sakura: { n: 16, cls: 'petal' },
      rainy: { n: 36, cls: 'drop' }, starlit: { n: 26, cls: 'star' }
    }[S.theme];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < conf.n; i++) {
      const p = document.createElement('span');
      p.className = conf.cls;
      p.style.setProperty('--x', (Math.random() * 100) + '%');
      p.style.setProperty('--y', (Math.random() * (conf.cls === 'star' ? 45 : 90)) + '%');
      p.style.setProperty('--d', (conf.cls === 'drop' ? 0.7 + Math.random() * 0.5 : 7 + Math.random() * 8) + 's');
      p.style.setProperty('--delay', (-Math.random() * 12) + 's');
      p.style.setProperty('--s', (0.6 + Math.random() * 0.8).toFixed(2));
      frag.appendChild(p);
    }
    if (S.theme === 'starlit') {
      for (let i = 0; i < 7; i++) {
        const f = document.createElement('span');
        f.className = 'firefly';
        f.style.setProperty('--x', (10 + Math.random() * 80) + '%');
        f.style.setProperty('--y', (55 + Math.random() * 25) + '%');
        f.style.setProperty('--d', (5 + Math.random() * 5) + 's');
        f.style.setProperty('--delay', (-Math.random() * 8) + 's');
        frag.appendChild(f);
      }
    }
    host.appendChild(frag);
  }

  function applyTheme() {
    if (!isUnlocked('theme', S.theme)) S.theme = 'meadow';
    document.body.dataset.theme = S.theme;
    const tc = { meadow: '#f6e7c8', sakura: '#f7dde3', rainy: '#9fb0bd', starlit: '#1d2340' }[S.theme];
    $('meta[name="theme-color"]').setAttribute('content', tc);
    buildParticles();
  }

  /* ---------- Pomodoro ---------- */
  const P = () => S.pomo;
  let pomoTick = null;
  const fmt = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  function pomoRemaining() {
    const p = P();
    if (p.phase === 'idle') return p.focus * 60000;
    if (p.endAt) return p.endAt - Date.now();
    return p.remaining;
  }
  function pomoTotal() { return (P().phase === 'break' ? P().brk : P().focus) * 60000; }

  function startPhase(phase) {
    const p = P();
    p.phase = phase;
    if (phase === 'focus') { p.focusN = 0; p.focusRight = 0; }
    p.endAt = Date.now() + (phase === 'focus' ? p.focus : p.brk) * 60000;
    p.remaining = null;
    save(); setPose(); runTick(); renderPomo();
    speak(phase === 'focus' ? 'focus' : 'break');
  }
  function runTick() {
    clearInterval(pomoTick);
    pomoTick = setInterval(() => {
      if (P().endAt && pomoRemaining() <= 0) completePhase();
      renderPomo();
    }, 500);
  }
  function completePhase() {
    const p = P();
    const stage = $('#pomo');
    stage.classList.remove('glow'); void stage.offsetWidth; stage.classList.add('glow');
    N3.Audio.done();
    if (p.phase === 'focus') {
      p.sessions++; p.sessionsDay = todayKey();
      logStat('focus', p.focus);
      toast(p.focusN
        ? `Focus session done: ${p.focusN} answered, ${p.focusRight} remembered. Time for a soft break.`
        : 'Focus session complete. Time for a soft break.', 'soft');
      startPhase('break');
    } else {
      p.phase = 'idle'; p.endAt = null; p.remaining = null;
      clearInterval(pomoTick);
      save(); setPose(); renderPomo();
      toast('Break’s over whenever you are.', 'soft');
      speak(40);
    }
  }
  function renderPomo() {
    const p = P();
    const running = !!p.endAt, paused = !running && p.phase !== 'idle';
    const rem = pomoRemaining();
    const t = fmt(rem);
    $('#pomo-time').textContent = t;
    $('#m-pomo-text').textContent = t;
    $('#pomo-phase').textContent = p.phase === 'idle' ? 'Ready when you are'
      : `${p.phase === 'focus' ? `Focus${p.focusN ? ` · ${p.focusN} answered` : ''}` : 'Tea break'}${paused ? ' · paused' : ''}`;
    $('#pomo-sessions').textContent = p.sessions ? `${'●'.repeat(Math.min(p.sessions, 8))} ${p.sessions} today` : '';
    $('#pomo-start').textContent = p.phase === 'idle' ? 'Start focus' : running ? 'Pause' : 'Resume';
    $('#pomo-bar').style.width = p.phase === 'idle' ? '0%' : `${(1 - rem / pomoTotal()) * 100}%`;
    $('#set-focus').textContent = p.focus;
    $('#set-brk').textContent = p.brk;
    const pill = $('#m-pomo');
    pill.dataset.phase = p.phase;
    pill.classList.toggle('paused', paused);
    pill.setAttribute('aria-label', `Pomodoro ${$('#pomo-phase').textContent}, ${t}. Tap to ${p.phase === 'idle' ? 'start' : running ? 'pause' : 'resume'}.`);
    $('#pomo').dataset.phase = p.phase;
    document.title = running ? `${t} · ${p.phase === 'focus' ? 'focus' : 'break'} — Kanji Bakery` : 'Kanji Bakery';
  }
  function toggleRun() {
    const p = P();
    if (p.phase === 'idle') return startPhase('focus');
    if (p.endAt) { p.remaining = p.endAt - Date.now(); p.endAt = null; clearInterval(pomoTick); }
    else { p.endAt = Date.now() + p.remaining; p.remaining = null; runTick(); }
    save(); renderPomo();
  }
  function bindPomo() {
    $('#pomo-start').addEventListener('click', toggleRun);
    $('#m-pomo').addEventListener('click', toggleRun);
    $('#pomo-reset').addEventListener('click', () => {
      const p = P(); p.phase = 'idle'; p.endAt = null; p.remaining = null;
      clearInterval(pomoTick); save(); setPose(); renderPomo();
    });
    $('#pomo-skip').addEventListener('click', () => {
      const p = P();
      if (p.phase === 'idle') return startPhase('break');
      if (p.phase === 'focus') return startPhase('break');
      p.phase = 'idle'; p.endAt = null; p.remaining = null;
      clearInterval(pomoTick); save(); setPose(); renderPomo();
    });
    $('.pomo-set').addEventListener('click', e => {
      const b = e.target.closest('[data-step]');
      if (!b) return;
      const [k, d] = b.dataset.step.split(',');
      const lim = k === 'focus' ? [5, 90] : [1, 30];
      P()[k] = Math.min(lim[1], Math.max(lim[0], P()[k] + +d));
      save(); renderPomo();
    });
    if (P().phase !== 'idle') {
      if (P().endAt && pomoRemaining() <= 0) { P().phase = 'idle'; P().endAt = null; save(); }
      else if (P().endAt) runTick();
    }
    renderPomo();
  }

  /* ---------- Tabs ---------- */
  function setTab(tab) {
    if (tab === 'nook' && !isMobile()) tab = 'desk';
    document.body.dataset.mtab = tab;
    $$('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.tab === tab));
    $$('.panel').forEach(p => { p.hidden = p.dataset.panel !== tab; });
    if (tab === 'library') { renderShelf(); if (Math.random() < 0.5) speak('shelf'); }
    if (tab === 'tricky') renderTricky();
    if (tab === 'keep') renderKeep();
    if (tab === 'progress' && N3.Progress) N3.Progress.render();
    selectSpine(null);
  }
  const isMobile = () => matchMedia('(max-width: 719px)').matches;
  function bindTabs() {
    $('.tabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) setTab(t.dataset.tab); });
    $('.tabs').addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const tabs = $$('.tab').filter(t => t.offsetParent);
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      n.focus(); setTab(n.dataset.tab);
    });
    document.addEventListener('click', e => {
      const g = e.target.closest('[data-go]');
      if (g) {
        const go = g.dataset.go;
        if (go === 'reading') {
          const b = N3.BOOKS.find(x => x.id === 'reading');
          const i = b.items.findIndex(p => !S.earned['ex:' + p.id]);
          openBook('reading', i >= 0 ? i : 0);
        } else setTab(go);
      }
      const ti = e.target.closest('[data-ti]');
      if (ti) reviewTricky(+ti.dataset.ti);
    });
    $('#tricky-list').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) reviewTricky(+b.dataset.i); });
    $('#m-jar').addEventListener('click', () => setTab('keep'));
    matchMedia('(max-width: 719px)').addEventListener('change', () => { if (!isMobile() && document.body.dataset.mtab === 'nook') setTab('desk'); });
  }

  /* ---------- Modal & toasts ---------- */
  let lastFocus = null;
  function openModal(title, html, wide) {
    lastFocus = document.activeElement;
    $('#modal-title').innerHTML = title;
    $('#modal-body').innerHTML = html;
    $('.modal-card').classList.toggle('wide', !!wide);
    $('#modal').hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
      const f = $('#modal-body button:not([disabled]), #modal-body textarea') || $('.modal-card [data-close]');
      f && f.focus({ preventScroll: true });
    });
  }
  function closeModal() {
    $('#modal').hidden = true;
    document.body.classList.remove('modal-open');
    renderTricky(); renderShelf(); renderAllK(); renderToday();
    // Library answers can change today's queue; refresh the Desk unless it's mid-question.
    if (!session.current || $('#kanji-grid').dataset.mode === 'done') { session.current = null; renderSession(); }
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }
  function bindModal() {
    $('#modal').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
    document.addEventListener('keydown', e => {
      if ($('#modal').hidden) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Tab') {
        const f = $$('.modal-card button:not([disabled]), .modal-card textarea, .modal-card [href]').filter(x => x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
  }
  function toast(html, kind = '') {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.innerHTML = html;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3800);
    setTimeout(() => t.remove(), 4400);
  }

  /* ---------- Bridge for cloud sync ---------- */
  N3.App = {
    state: () => S,
    defaults,
    todayKey,
    toast,
    openModal,
    closeModal,
    speak,
    esc,
    queue,
    setTab: tab => setTab(tab),
    // Change state from outside (Progress tab settings), then save and refresh what depends on it.
    update(fn) {
      fn(S);
      save();
      session.current = null;
      renderToday(); renderSession();
      if (N3.Progress) N3.Progress.render();
    },
    // Swap in a merged state from the cloud and redraw everything.
    replaceState(next) {
      S = next;
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
      ensureDay();
      applySettings(); applyTheme(); renderCat(); renderJar();
      session.current = null;
      renderToday(); renderSession(); renderAllK(); renderShelf(); renderTricky(); renderKeep(); renderPomo();
      if (N3.Progress && document.body.dataset.mtab === 'progress') N3.Progress.render();
    }
  };

  /* ---------- Init ---------- */
  function init() {
    const t = todayKey();
    const firstVisit = S.visits.count === 0;
    if (S.visits.last !== t) { S.visits.count++; S.visits.last = t; }
    ensureDay();
    // Older saves marked cards with an honor-system "Got it"; give those a real check, spread over a few days.
    if (!S.srsMigrated) {
      const n = N3.SRS.migrate(S, N3.SRS.dayNum());
      S.srsMigrated = true;
      if (n) setTimeout(() => toast(`${n} card${n > 1 ? 's' : ''} you marked earlier will come back for a quick real check over the next few days.`, 'soft'), 1500);
    }
    applySettings();
    buildScene();
    applyTheme();
    renderCat();
    renderJar();
    bindToggles();
    bindKanji();
    setupPad();
    bindShelf();
    bindKeep();
    bindPomo();
    bindTabs();
    bindModal();
    renderToday();
    renderSession();
    renderAllK();
    renderShelf();
    renderTricky();
    renderKeep();
    setTab('desk');
    $('#cat').addEventListener('click', pet);
    $('#m-cat').addEventListener('click', pet);
    $('#m-bubble').addEventListener('click', e => { e.currentTarget.hidden = true; });
    $('#jar').addEventListener('click', () => speak(S.gems ? 35 : 3));
    if (S.settings.sound) {
      // Browsers need a gesture before audio can start.
      const resume = () => { N3.Audio.setAmbient(true); removeEventListener('pointerdown', resume); };
      addEventListener('pointerdown', resume);
    }
    // Offline support and "install as app". Service workers need http(s), so skip when opened as a file.
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('Offline mode unavailable:', err));
    }
    setTimeout(() => {
      const due = queue().reviews.length;
      if (firstVisit) speak(1);
      else if (due && !S.settings.lowEnergy) speak({ text: `Welcome back! ${due} card${due > 1 ? 's are' : ' is'} ready for a quick review — a cozy warm-up.` });
      else speak(S.settings.lowEnergy ? 'lowEnergy' : 'returning');
    }, 500);
    save();
  }

  init();
})();
