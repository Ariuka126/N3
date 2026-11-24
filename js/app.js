/* N3 Sanctuary — app logic. Everything persists to localStorage under one key. */
(function () {
  'use strict';

  const KEY = 'n3-sanctuary-v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ruby = s => s.replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  const plain = s => s.replace(/\{([^|}]+)\|[^}]+\}/g, '$1');
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
    equipped: { head: null, neck: null, face: null },
    theme: 'meadow',
    settings: { reducedMotion: null, sound: false, sfx: true, lowEnergy: false, furigana: true, guide: true },
    pomo: { focus: 25, brk: 5, phase: 'idle', endAt: null, remaining: null, sessions: 0, sessionsDay: '' },
    visits: { count: 0, last: '' },
    day: { date: '', picks: [], steps: [] },
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
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
    }, 150);
  }

  const ui = { kIdx: 0, customK: null, selectedBook: null, lastLine: -1, lastPointer: 'mouse', idleTimer: null };

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
      ui.kIdx = 0; ui.customK = null;
      renderToday(); renderKanji();
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

  function speak(which) {
    let n;
    if (typeof which === 'number') n = which;
    else {
      const pool = N3.LINE_POOLS[which] || N3.LINE_POOLS.idle;
      const options = pool.length > 1 ? pool.filter(i => i !== ui.lastLine) : pool;
      n = pick(options);
    }
    ui.lastLine = n;
    const text = N3.LINES[n - 1];
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
    ui.mbTimer = setTimeout(() => { mb.hidden = true; }, 6500);
    resetIdle();
  }

  function resetIdle() {
    clearTimeout(ui.idleTimer);
    ui.idleTimer = setTimeout(() => speak(S.settings.lowEnergy ? 'lowEnergy' : 'idle'), 150000);
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
  function renderJar(fresh = 0) {
    $('#jar').innerHTML = N3.jarSVG(S.gems, fresh);
    $('#jar-count').textContent = S.gems;
    $('#jar-count').nextSibling.textContent = S.gems === 1 ? ' gem' : ' gems';
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
    const order = N3.KANJI.map(k => k.id);
    const trickyIds = new Set(S.tricky.filter(x => x.kind === 'kanji').map(x => x.id));
    const fresh = order.filter(id => !S.earned['k:' + id] && !trickyIds.has(id));
    const rest = order.filter(id => !fresh.includes(id));
    const seed = (S.visits.count * 3) % Math.max(1, rest.length);
    const rotated = rest.slice(seed).concat(rest.slice(0, seed));
    S.day = { date: t, picks: fresh.concat(rotated).slice(0, 3), steps: [] };
    if (S.pomo.sessionsDay !== t) { S.pomo.sessions = 0; S.pomo.sessionsDay = t; }
    save();
  }
  const goal = () => (S.settings.lowEnergy ? 1 : 3);
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

  function renderToday() {
    const h = new Date().getHours();
    const greet = h < 5 ? 'Late-night lamp is on' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const g = goal(), n = Math.min(S.day.steps.length, g);
    const seeds = Array.from({ length: g }, (_, i) => `<span class="seed ${i < n ? 'grown' : ''}" aria-hidden="true"></span>`).join('');
    const passage = N3.BOOKS.find(b => b.id === 'reading').items.find(p => !S.earned['ex:' + p.id]);
    $('#today').innerHTML = `
      <div class="today-row">
        <div>
          <p class="eyebrow">${greet}</p>
          <h2>${S.settings.lowEnergy ? 'Low-battery day: one tiny step is plenty' : 'Today’s gentle goal: three small steps'}</h2>
          <p class="muted small">${n >= g ? 'Goal met — anything else is a bonus.' : S.settings.lowEnergy ? 'One kanji card or one short reading snippet.' : 'Kanji cards, library exercises and reading all count.'}</p>
        </div>
        <div class="seeds" role="img" aria-label="${n} of ${g} steps done">${seeds}</div>
      </div>
      <div class="today-actions">
        <button class="btn soft" data-go="reading">${passage ? 'One short reading' : 'Revisit a reading'}</button>
        <button class="btn soft" data-go="library">Browse the Library</button>
        <button class="btn ghost" data-go="tricky">Tricky Shelf (${S.tricky.length})</button>
      </div>`;
    renderTrickyPeek();
  }

  /* ---------- Daily kanji ---------- */
  function todayPicks() { return S.day.picks.slice(0, S.settings.lowEnergy ? 1 : 3); }
  function currentKanji() { return KANJI[ui.customK || todayPicks()[ui.kIdx] || todayPicks()[0]]; }

  function renderKanji() {
    const picks = todayPicks();
    $('#kdots').innerHTML = picks.map((id, i) => {
      const on = !ui.customK && i === ui.kIdx;
      const done = S.day.steps.includes('k:' + id);
      return `<button role="tab" aria-selected="${on}" class="kdot ${on ? 'on' : ''} ${done ? 'done' : ''}" data-k="${i}" aria-label="Card ${i + 1}: ${KANJI[id].k}">${KANJI[id].k}</button>`;
    }).join('') + (ui.customK ? `<button class="kdot on" aria-selected="true" aria-label="Browsing ${KANJI[ui.customK].k}">${KANJI[ui.customK].k}</button>` : '');
    const k = currentKanji();
    const inJar = S.earned['k:' + k.id], onShelf = S.tricky.some(t => t.kind === 'kanji' && t.id === k.id);
    $('#kcard').innerHTML = `
      <div class="k-top">
        <div class="k-big" lang="ja">${k.k}</div>
        <div class="k-meta">
          <p class="k-mean">${esc(k.mean)}</p>
          <dl class="k-read"><dt>On</dt><dd lang="ja">${k.on}</dd><dt>Kun</dt><dd lang="ja">${k.kun}</dd></dl>
          ${inJar ? '<span class="chip gem-chip">✦ in your jar</span>' : ''}${onShelf ? '<span class="chip">on Tricky Shelf</span>' : ''}
        </div>
      </div>
      <ul class="k-words">${k.words.map(w => `<li><span class="w-jp" lang="ja"><ruby>${w[0]}<rt>${w[1]}</rt></ruby></span><span class="w-en">${esc(w[2])}</span></li>`).join('')}</ul>
      <div class="k-ex"><p lang="ja">${ruby(k.ex)}</p><p class="muted small">${esc(k.en)}</p></div>`;
    $('#pad-guide').textContent = k.k;
    clearPad();
    renderAllK();
  }

  function renderAllK() {
    $('#allk').innerHTML = N3.KANJI.map(k => {
      const st = S.earned['k:' + k.id] ? 'got' : S.tricky.some(t => t.kind === 'kanji' && t.id === k.id) ? 'fuzzy' : '';
      return `<button class="allk-cell ${st}" data-id="${k.id}" lang="ja" title="${esc(k.mean)}">${k.k}</button>`;
    }).join('');
  }

  function advanceKanji() {
    if (ui.customK) { ui.customK = null; }
    else {
      const picks = todayPicks();
      const next = picks.findIndex((id, i) => i > ui.kIdx && !S.day.steps.includes('k:' + id));
      ui.kIdx = next >= 0 ? next : (ui.kIdx + 1) % picks.length;
    }
    renderKanji();
  }

  function bindKanji() {
    $('#kdots').addEventListener('click', e => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      ui.customK = null; ui.kIdx = +b.dataset.k; renderKanji();
    });
    $('#allk').addEventListener('click', e => {
      const b = e.target.closest('[data-id]');
      if (!b) return;
      const i = todayPicks().indexOf(b.dataset.id);
      if (i >= 0) { ui.customK = null; ui.kIdx = i; } else ui.customK = b.dataset.id;
      renderKanji();
      $('#kcard').scrollIntoView({ behavior: S.settings.reducedMotion ? 'auto' : 'smooth', block: 'center' });
    });
    $('#k-got').addEventListener('click', e => {
      const k = currentKanji();
      removeTricky('kanji', k.id);
      const fresh = award('k:' + k.id, e.currentTarget);
      if (!fresh) { toast(`${k.k} is already in your jar — a lovely review.`, 'soft'); speak('kanji'); }
      step('k:' + k.id);
      advanceKanji();
    });
    $('#k-fuzzy').addEventListener('click', () => {
      const k = currentKanji();
      addTricky('kanji', k.id);
      N3.Audio.soft();
      toast(`${k.k} is resting on the Tricky Shelf. No penalty.`, 'soft');
      speak('fuzzy');
      step('k:' + k.id);
      advanceKanji();
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
    S.tricky.push({ kind, id, added: Date.now() });
    save(); renderTricky();
  }
  function removeTricky(kind, id) {
    const before = S.tricky.length;
    S.tricky = S.tricky.filter(t => !(t.kind === kind && t.id === id));
    if (S.tricky.length !== before) { save(); renderTricky(); }
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
    if (t.kind === 'kanji') {
      const k = KANJI[t.id];
      openModal(`Tricky Shelf · ${k.k}`, `
        <div class="review-k">
          <div class="k-big" lang="ja">${k.k}</div>
          <p class="k-mean">${esc(k.mean)}</p>
          <p lang="ja">On: ${k.on} · Kun: ${k.kun}</p>
          <ul class="k-words">${k.words.map(w => `<li><span class="w-jp" lang="ja"><ruby>${w[0]}<rt>${w[1]}</rt></ruby></span><span class="w-en">${esc(w[2])}</span></li>`).join('')}</ul>
          <p lang="ja">${ruby(k.ex)}</p><p class="muted small">${esc(k.en)}</p>
        </div>
        <div class="modal-actions">
          <button class="btn primary" id="grad">Feels comfortable — graduate ✦</button>
          <button class="btn soft" data-close>Keep resting</button>
        </div>`);
      $('#grad').addEventListener('click', e => {
        removeTricky('kanji', k.id);
        const fresh = award('k:' + k.id, e.currentTarget);
        if (!fresh) toast(`${k.k} graduated. It was already in your jar.`, 'soft');
        step('k:' + k.id);
        renderKanji();
        closeModal();
      });
    } else {
      const { book, item } = EX[t.id];
      openModal(`Tricky Shelf · ${book.title}`, `<div id="quiz-host"></div>`);
      renderQuestion($('#quiz-host'), book, item, {
        onCorrect: btn => { removeTricky('ex', item.id); if (!award('ex:' + item.id, btn)) toast('Graduated from the Tricky Shelf.', 'soft'); step('ex:' + item.id); },
        onWrong: () => speak('fuzzy'),
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

  function renderShelf() {
    const shelf = $('#shelf');
    shelf.innerHTML = `<div class="shelf-row">${N3.BOOKS.map(b => {
      const [d, n] = bookProgress(b);
      return `<button class="spine ${d === n ? 'complete' : ''}" data-book="${b.id}" style="--spine:${b.color};--h:${b.height}%"
        aria-label="${esc(b.title)} — ${esc(b.type)}. ${d} of ${n} done.">
        <span class="spine-jp" lang="ja">${b.jp}</span><span class="spine-band"></span>${d === n ? '<span class="spine-star" aria-hidden="true">✦</span>' : ''}</button>`;
    }).join('')}<span class="shelf-deco" aria-hidden="true"></span></div><div class="shelf-board"></div>`;
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
    tag.innerHTML = `<b>${esc(b.title)}</b><span>${esc(b.type)}</span><span class="tag-reward">✦ ${esc(b.reward)} · ${d}/${n} done</span>
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
    const session = { right: 0, missed: 0 };
    openModal(`${b.title} <span class="muted small" lang="ja">${b.jp}</span>`, `<div class="book-meta muted small">${esc(b.type)} · inspired by ${esc(b.inspired)}</div><div id="quiz-host"></div>`, true);
    const show = () => {
      const item = b.items[idx];
      renderQuestion($('#quiz-host'), b, item, {
        counter: `${idx + 1} / ${b.items.length}`,
        onCorrect: btn => { session.right++; removeTricky('ex', item.id); award('ex:' + item.id, btn); step('ex:' + item.id); renderShelf(); },
        onWrong: () => { session.missed++; addTricky('ex', item.id); speak('fuzzy'); step('ex:' + item.id); },
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
        <p>${session.right} clear · ${session.missed} sent to the Tricky Shelf to rest.</p>
        <p class="muted small">Understanding why an option doesn’t fit is just as useful as picking the right one.</p>
        <div class="modal-actions"><button class="btn primary" data-close>Back to the shelf</button>
        <button class="btn soft" id="again">Read again from page 1</button></div></div>`;
      $('#again').addEventListener('click', () => { idx = 0; show(); });
      speak(32);
    };
    show();
  }

  function renderQuestion(host, book, item, o) {
    const isReading = book.kind === 'reading';
    host.innerHTML = `
      ${o.counter ? `<div class="q-counter">${o.counter}${S.earned['ex:' + item.id] ? ' · <span class="gem-chip chip">✦ earned</span>' : ''}</div>` : ''}
      ${isReading ? `<div class="passage" lang="ja">${ruby(item.passage)}</div>
        <div class="reading-tools">
          <button class="btn ghost small" id="clue-btn" aria-expanded="false">Show clue hint</button>
          <span class="muted small">If you like, read a line or two softly aloud.</span>
        </div>
        <p class="clue" id="clue" hidden>${esc(item.clue)}</p>` : ''}
      <p class="q" lang="ja">${ruby(item.q)}</p>
      <div class="opts">${item.opts.map((t, i) => `<button class="opt" data-i="${i}" lang="ja"><span class="opt-n">${i + 1}</span>${ruby(t)}</button>`).join('')}</div>
      <div class="feedback" id="fb" hidden></div>`;
    if (isReading) {
      $('#clue-btn', host).addEventListener('click', e => {
        const c = $('#clue', host); c.hidden = !c.hidden;
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
      const fb = $('#fb', host);
      fb.hidden = false;
      fb.className = `feedback ${ok ? 'ok' : 'soft'}`;
      fb.innerHTML = `<p class="fb-head">${ok ? 'Yes — that’s it.' : 'Not this time, and that’s useful. It’s resting on your Tricky Shelf.'}</p>
        <p>${esc(item.why)}</p>
        <div class="modal-actions"><button class="btn primary" id="next-q">${o.nextLabel}</button></div>`;
      if (ok) o.onCorrect(btn); else { N3.Audio.gentle(); o.onWrong(); }
      $('#next-q', host).addEventListener('click', o.onNext);
      $('#next-q', host).focus({ preventScroll: true });
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
      if (!confirm('Reset all gems, unlocks, tricky items and settings? This cannot be undone.')) return;
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      location.reload();
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
      toast('Focus session complete. Time for a soft break.', 'soft');
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
    $('#pomo-phase').textContent = p.phase === 'idle' ? 'Ready when you are' : `${p.phase === 'focus' ? 'Focus' : 'Tea break'}${paused ? ' · paused' : ''}`;
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
    document.title = running ? `${t} · ${p.phase === 'focus' ? 'focus' : 'break'} — N3 Sanctuary` : 'N3 Sanctuary';
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
    renderTricky(); renderShelf(); renderAllK();
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

  /* ---------- Init ---------- */
  function init() {
    const t = todayKey();
    const firstVisit = S.visits.count === 0;
    if (S.visits.last !== t) { S.visits.count++; S.visits.last = t; }
    ensureDay();
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
    renderKanji();
    renderShelf();
    renderTricky();
    renderKeep();
    setTab('desk');
    $('#cat').addEventListener('click', pet);
    $('#m-cat').addEventListener('click', pet);
    $('#jar').addEventListener('click', () => speak(S.gems ? 35 : 3));
    if (S.settings.sound) {
      // Browsers need a gesture before audio can start.
      const resume = () => { N3.Audio.setAmbient(true); removeEventListener('pointerdown', resume); };
      addEventListener('pointerdown', resume);
    }
    setTimeout(() => speak(firstVisit ? 1 : S.settings.lowEnergy ? 'lowEnergy' : 'returning'), 500);
    save();
  }

  init();
})();
