/* Progress tab: exam countdown, gentle study calendar, memory strength, accuracy by area, study settings.
   The stat helpers are pure so tests can call them; render() reads live state through N3.App. */
window.N3 = window.N3 || {};

N3.Progress = (function () {
  const $ = s => document.querySelector(s);
  const dayKey = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const fmtDate = d => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

  const AREAS = ['Kanji', 'Vocabulary', 'Grammar', 'Reading'];
  function areaOf(key) {
    if (key.startsWith('k:')) return 'Kanji';
    const id = key.slice(3);
    const book = N3.BOOKS.find(b => (b.items || []).some(i => i.id === id));
    return book ? book.area : null;
  }

  function areaStats(state) {
    const out = Object.fromEntries(AREAS.map(a => [a, { right: 0, wrong: 0 }]));
    Object.entries(state.srs || {}).forEach(([key, r]) => {
      const a = areaOf(key);
      if (!a || !out[a]) return;
      out[a].right += r.right || 0;
      out[a].wrong += r.wrong || 0;
    });
    Object.values(out).forEach(s => { s.n = s.right + s.wrong; s.acc = s.n ? s.right / s.n : null; });
    return out;
  }

  function memoryStats(state, keys) {
    const out = { new: 0, learning: 0, growing: 0, strong: 0 };
    keys.forEach(k => { out[N3.SRS.strength((state.srs || {})[k])]++; });
    return out;
  }

  function weakest(state, minAttempts = 6) {
    const s = areaStats(state);
    return AREAS.filter(a => s[a].n >= minAttempts && s[a].acc < 0.7)
      .sort((a, b) => s[a].acc - s[b].acc)[0] || null;
  }

  // Remaining new kanji vs days left: is the current pace enough before exam day?
  function pace(state, today = new Date()) {
    const left = N3.KANJI.filter(k => !(state.srs || {})['k:' + k.id]).length;
    const per = Math.max(1, state.settings.newPerDay || 3);
    const finish = new Date(today); finish.setDate(finish.getDate() + Math.ceil(left / per));
    if (!state.examDate) return { left, per, finish, daysLeft: null, needed: null };
    const exam = parseDate(state.examDate);
    const daysLeft = N3.SRS.dayNum(exam) - N3.SRS.dayNum(today);
    const needed = daysLeft > 0 ? Math.ceil(left / daysLeft) : null;
    return { left, per, finish, daysLeft, exam, needed, onTrack: daysLeft > 0 && needed <= per };
  }

  // One honest, specific line for the cat, or null when there's nothing useful to say.
  function insight(state) {
    const weak = weakest(state);
    if (weak) {
      const s = areaStats(state)[weak];
      const book = { Kanji: null, Vocabulary: 'Words in Context', Grammar: 'Twin Grammar Notebook', Reading: 'Short Reading Window' }[weak];
      return `${weak} has been slippery so far (${Math.round(s.acc * 100)}% right). ${book ? `A few minutes with ${book} could help.` : 'Your daily reviews will keep bringing the tricky ones back.'}`;
    }
    const p = pace(state);
    if (p.daysLeft > 0 && !p.onTrack && p.left) return `At ${p.per} new kanji a day, some will still be new on exam day. Maybe try ${p.needed} a day?`;
    if (p.daysLeft > 0 && p.daysLeft <= 30) return `${p.daysLeft} days until the exam. Steady reviews now beat cramming later.`;
    return null;
  }

  /* ---------- Rendering ---------- */

  function bar(parts) {
    const total = parts.reduce((s, p) => s + p.n, 0) || 1;
    return `<div class="stack" role="img" aria-label="${parts.map(p => `${p.n} ${p.label}`).join(', ')}">${parts.map(p =>
      `<span class="seg seg-${p.cls}" style="width:${(p.n / total) * 100}%"></span>`).join('')}</div>
      <ul class="legend">${parts.map(p => `<li><span class="sw seg-${p.cls}"></span>${p.label} <b>${p.n}</b></li>`).join('')}</ul>`;
  }

  function render() {
    const S = N3.App.state(), esc = N3.App.esc;
    const today = new Date(), todayN = N3.SRS.dayNum();

    // Exam countdown + pace
    const p = pace(S);
    const next = N3.SRS.nextJlpt();
    $('#pg-exam').innerHTML = `<h2>Exam countdown</h2>
      ${p.daysLeft != null ? `<p class="big-num">${p.daysLeft > 0 ? `${p.daysLeft} days` : p.daysLeft === 0 ? 'Today!' : 'Exam date has passed'}</p>
        <p class="muted small">until ${fmtDate(p.exam)}</p>` : '<p class="muted">Set your exam date to see a countdown and whether your pace fits.</p>'}
      <p>${p.left ? `${p.left} kanji are still new. At ${p.per} a day you’ll have met them all by <b>${fmtDate(p.finish)}</b>.` : 'You’ve met every kanji in the set ✦'}
        ${p.daysLeft > 0 && p.left ? (p.onTrack ? ' That’s before the exam — you’re on track.' : ` That’s after the exam; about <b>${p.needed} a day</b> would get you there in time.`) : ''}</p>
      <div class="exam-row">
        <label>Exam date <input type="date" id="pg-date" value="${esc(S.examDate || '')}"></label>
        ${next ? `<button class="btn soft small" id="pg-next" data-date="${dayKeyIso(next)}">Use next JLPT (${next.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })})</button>` : ''}
      </div>
      <p class="muted small">JLPT is usually held on the first Sunday of July and December; check your local test site.</p>`;

    // Calendar: last 12 weeks, ending this week. No streaks — just a record of good days.
    const start = new Date(today); start.setDate(start.getDate() - start.getDay() - 7 * 11);
    let cells = '', monthDays = 0, monthN = 0, weekFocus = 0;
    for (let i = 0; i < 84; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const log = S.log[dayKey(d)];
      const n = log ? log.n : 0;
      const future = d > today;
      if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && n) { monthDays++; monthN += n; }
      if (log && N3.SRS.dayNum(d) > todayN - 7) weekFocus += log.focus || 0;
      const lvl = future ? 'f' : n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4;
      cells += `<span class="cal-cell l${lvl}" title="${d.toLocaleDateString()}: ${n} answered"></span>`;
    }
    $('#pg-calendar').innerHTML = `<h2>Study days</h2>
      <div class="cal" role="img" aria-label="Study activity for the last 12 weeks">${cells}</div>
      <p class="muted small">This month: ${monthDays} day${monthDays === 1 ? '' : 's'} with study, ${monthN} questions answered. Focus this week: ${weekFocus} min.
        No streaks to break here — every day you show up simply counts.</p>`;

    // Memory strength
    const kKeys = N3.KANJI.map(k => 'k:' + k.id);
    const exKeys = N3.BOOKS.flatMap(b => (b.items || []).map(i => 'ex:' + i.id));
    const km = memoryStats(S, kKeys), em = memoryStats(S, exKeys);
    const due = d => Object.values(S.srs).filter(r => r.due === d).length;
    const parts = m => [
      { label: 'Strong', n: m.strong, cls: 'strong' }, { label: 'Growing', n: m.growing, cls: 'growing' },
      { label: 'Learning', n: m.learning, cls: 'learning' }, { label: 'New', n: m.new, cls: 'new' }];
    $('#pg-memory').innerHTML = `<h2>Memory</h2>
      <h3 class="sub">Kanji (${kKeys.length})</h3>${bar(parts(km))}
      <h3 class="sub">Library questions (${exKeys.length})</h3>${bar(parts(em))}
      <p class="muted small">Due today: ${Object.values(S.srs).filter(r => r.due <= todayN).length} · tomorrow: ${due(todayN + 1)} ·
        “Strong” means you’ve remembered it across reviews spaced weeks apart.</p>`;

    // Accuracy by area
    const st = areaStats(S), weak = weakest(S);
    $('#pg-areas').innerHTML = `<h2>Accuracy by area</h2>
      <ul class="areas">${AREAS.map(a => {
        const s = st[a];
        return `<li class="${a === weak ? 'weak' : ''}"><span class="area-name">${a}</span>
          <span class="bp-bar"><span style="width:${s.acc == null ? 0 : Math.round(s.acc * 100)}%"></span></span>
          <span class="area-num">${s.acc == null ? '—' : `${Math.round(s.acc * 100)}%`}</span>
          <span class="muted small">${s.n} answer${s.n === 1 ? '' : 's'}</span></li>`;
      }).join('')}</ul>
      <p class="muted small">${weak ? `${weak} is your weakest area so far.` : 'Areas need a few answers before a weak spot shows up.'}
        Listening isn’t practiced here — keep it in your routine elsewhere.</p>`;

    // Study settings
    $('#pg-settings').innerHTML = `<h2>Study settings</h2>
      <div class="pg-set">
        <label>New kanji per day <span class="stepper"><button data-set="newPerDay,-1" aria-label="Fewer new kanji">−</button>
          <output>${S.settings.newPerDay}</output><button data-set="newPerDay,1" aria-label="More new kanji">+</button></span></label>
        <label>Max reviews per day <span class="stepper"><button data-set="reviewLimit,-10" aria-label="Fewer reviews">−</button>
          <output>${S.settings.reviewLimit}</output><button data-set="reviewLimit,10" aria-label="More reviews">+</button></span></label>
      </div>
      <p class="muted small">Low-battery mode overrides these with 1 new kanji and 5 reviews.</p>`;
  }

  const dayKeyIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  function bind() {
    const panel = document.querySelector('[data-panel="progress"]');
    panel.addEventListener('change', e => {
      if (e.target.id === 'pg-date') N3.App.update(S => { S.examDate = e.target.value; });
    });
    panel.addEventListener('click', e => {
      const next = e.target.closest('#pg-next');
      if (next) N3.App.update(S => { S.examDate = next.dataset.date; });
      const b = e.target.closest('[data-set]');
      if (b) {
        const [k, d] = b.dataset.set.split(',');
        const lim = k === 'newPerDay' ? [1, 15] : [10, 200];
        N3.App.update(S => { S.settings[k] = Math.min(lim[1], Math.max(lim[0], S.settings[k] + +d)); });
      }
    });
  }

  if (typeof document !== 'undefined' && document.querySelector && document.querySelector('[data-panel="progress"]')) bind();

  return { render, insight, areaStats, memoryStats, weakest, pace, AREAS };
})();
