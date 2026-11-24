/* Cloud sync with Supabase: email magic-link login, one `progress` row per user.
   localStorage stays the working copy; each sync pulls the cloud row, merges, and pushes back. */
window.N3 = window.N3 || {};

N3.Sync = (function () {
  const META_KEY = 'n3-sync-meta';
  const $ = s => document.querySelector(s);
  // lastSync is only shown to the user; merging doesn't depend on it.
  let client = null, user = null, status = 'off', lastSync = 0, timer = null, running = null, again = false;

  try { lastSync = JSON.parse(localStorage.getItem(META_KEY) || '{}').lastSync || 0; } catch (e) { /* ignore */ }
  const saveMeta = () => { try { localStorage.setItem(META_KEY, JSON.stringify({ lastSync })); } catch (e) { /* ignore */ } };

  /* ---------- Merge ---------- */

  // Stable stringify so key order doesn't make equal states look different.
  const stable = v => Array.isArray(v) ? `[${v.map(stable).join(',')}]`
    : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
    : JSON.stringify(v);
  const same = (a, b) => {
    const strip = s => Object.assign({}, s, { updatedAt: 0 });
    return stable(strip(a)) === stable(strip(b));
  };

  function merge(local, remote) {
    if (!remote) return local;
    // A reset on any device wins over copies made before it.
    if ((remote.resetAt || 0) !== (local.resetAt || 0)) return (remote.resetAt || 0) > (local.resetAt || 0) ? remote : local;

    const newer = (local.updatedAt || 0) >= (remote.updatedAt || 0) ? local : remote;
    const out = JSON.parse(JSON.stringify(newer));

    // Gems: every earned item from either side counts.
    out.earned = Object.assign({}, remote.earned, local.earned);
    out.gems = Math.max(Object.keys(out.earned).length, local.gems || 0, remote.gems || 0);

    // Tricky shelf: union of both sides, minus anything graduated after it was (last) added.
    const key = t => `${t.kind}:${t.id}`;
    out.graduated = Object.assign({}, remote.graduated);
    Object.entries(local.graduated || {}).forEach(([k, t]) => { out.graduated[k] = Math.max(t, out.graduated[k] || 0); });
    const items = new Map();
    [...(remote.tricky || []), ...(local.tricky || [])].forEach(t => {
      const k = key(t), prev = items.get(k);
      if (!prev || t.added > prev.added) items.set(k, t);
    });
    out.tricky = [...items.values()]
      .filter(t => !(out.graduated[key(t)] >= t.added))
      .sort((x, y) => x.added - y.added);

    // Today's progress: union of steps when both sides are on the same day.
    if (local.day && remote.day && local.day.date === remote.day.date) {
      out.day = Object.assign({}, newer.day, { steps: [...new Set([...(local.day.steps || []), ...(remote.day.steps || [])])] });
    }

    // Device-specific bits stay with this device.
    out.settings = Object.assign({}, newer.settings, {
      reducedMotion: local.settings.reducedMotion, sound: local.settings.sound, sfx: local.settings.sfx
    });
    out.pomo = Object.assign({}, local.pomo, { focus: newer.pomo.focus, brk: newer.pomo.brk });
    out.visits = { count: Math.max(local.visits.count || 0, remote.visits.count || 0), last: local.visits.last };
    out.pets = Math.max(local.pets || 0, remote.pets || 0);
    out.noteText = Object.assign({}, older(local, remote).noteText, newer.noteText);
    out.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
    out.resetAt = local.resetAt || 0;
    return out;
  }
  const older = (a, b) => ((a.updatedAt || 0) >= (b.updatedAt || 0) ? b : a);

  /* ---------- Cloud calls ---------- */

  async function fetchRemote() {
    const { data, error } = await client.from('progress').select('state').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data ? data.state : null;
  }
  async function push(state) {
    const { error } = await client.from('progress')
      .upsert({ user_id: user.id, state, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  // One sync at a time; a request during a sync queues exactly one more.
  async function syncNow() {
    if (!user) return;
    if (running) { again = true; return running; }
    running = (async () => {
      setStatus('syncing');
      try {
        const local = N3.App.state();
        const remote = await fetchRemote();
        const merged = merge(local, remote);
        if (!same(merged, local)) N3.App.replaceState(merged);
        if (!remote || !same(merged, remote)) await push(merged);
        lastSync = Date.now(); saveMeta();
        setStatus('ok');
      } catch (e) {
        console.warn('Sync failed:', e);
        setStatus(navigator.onLine ? 'error' : 'offline');
      }
    })();
    await running;
    running = null;
    if (again) { again = false; return syncNow(); }
  }

  /* ---------- UI ---------- */

  function setStatus(s) {
    status = s;
    const b = $('#tg-cloud');
    if (!b) return;
    b.dataset.status = s;
    const label = { off: 'Sync', syncing: 'Syncing…', ok: 'Synced', error: 'Sync issue', offline: 'Offline', unavailable: 'Sync' }[s];
    $('#cloud-label').textContent = label;
    b.title = user ? `${label} — ${user.email}` : 'Sign in to sync across devices';
    b.setAttribute('aria-pressed', !!user);
  }

  const ago = t => {
    if (!t) return 'not yet';
    const s = Math.round((Date.now() - t) / 1000);
    return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`;
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function openPanel() {
    if (!client) {
      N3.App.openModal('Cloud sync', `<p>Sync couldn’t load. Check your internet connection and reload the page.</p>
        <div class="modal-actions"><button class="btn primary" data-close>Okay</button></div>`);
      return;
    }
    if (user) {
      N3.App.openModal('Cloud sync', `
        <p>Signed in as <b>${esc(user.email)}</b>. Gems, unlocks, closet, themes, notes and your Tricky Shelf follow you to any browser where you sign in.</p>
        <p class="muted small">Last synced: ${ago(lastSync)}${status === 'error' ? ' · the last attempt failed' : ''}${status === 'offline' ? ' · you’re offline' : ''}</p>
        <div class="modal-actions">
          <button class="btn ghost" id="cloud-out">Sign out</button>
          <button class="btn primary" id="cloud-now">Sync now</button>
        </div>`);
      $('#cloud-now').addEventListener('click', async e => {
        e.currentTarget.disabled = true;
        await syncNow();
        N3.App.closeModal();
        N3.App.toast(status === 'ok' ? 'All synced ✦' : 'Couldn’t sync just now. Your progress is still saved here.', 'soft');
      });
      $('#cloud-out').addEventListener('click', async () => {
        await client.auth.signOut();
        N3.App.closeModal();
        N3.App.toast('Signed out. Your progress stays saved in this browser.', 'soft');
      });
      return;
    }
    N3.App.openModal('Cloud sync', `
      <p>Sign in with your email to keep gems, unlocks and your Tricky Shelf in sync across browsers and devices. No password: we email you a login link.</p>
      <form id="cloud-form" class="cloud-form">
        <label for="cloud-email" class="muted small">Email</label>
        <input id="cloud-email" type="email" required autocomplete="email" placeholder="you@example.com">
        <div class="modal-actions"><button class="btn primary" type="submit">Send login link</button></div>
      </form>
      <p class="muted small" id="cloud-msg" aria-live="polite"></p>`);
    $('#cloud-form').addEventListener('submit', async e => {
      e.preventDefault();
      const email = $('#cloud-email').value.trim();
      const btn = e.currentTarget.querySelector('button');
      btn.disabled = true;
      const { error } = await client.auth.signInWithOtp({
        email, options: { emailRedirectTo: location.origin + location.pathname }
      });
      btn.disabled = false;
      $('#cloud-msg').textContent = error
        ? `Couldn’t send the link: ${error.message}`
        : 'Check your inbox and open the link on the device you want to sign in on. You can close this window.';
    });
  }

  /* ---------- Start ---------- */

  function init() {
    $('#tg-cloud').addEventListener('click', openPanel);
    if (!window.supabase || !N3.CLOUD || !N3.CLOUD.url) { setStatus('unavailable'); return; }
    client = window.supabase.createClient(N3.CLOUD.url, N3.CLOUD.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' }
    });
    client.auth.onAuthStateChange((event, session) => {
      const was = user;
      user = session ? session.user : null;
      setStatus(user ? status === 'off' || status === 'unavailable' ? 'syncing' : status : 'off');
      // Defer: supabase-js warns against awaiting its calls inside this callback.
      if (user && (!was || was.id !== user.id)) {
        setTimeout(() => {
          if (event === 'SIGNED_IN' && !was) N3.App.toast(`Signed in as ${esc(user.email)} — syncing your progress.`, 'soft');
          syncNow();
        }, 0);
      }
    });
    // Catch up when coming back to the tab or reconnecting.
    let lastFocusSync = 0;
    const catchUp = () => { if (user && Date.now() - lastFocusSync > 30000) { lastFocusSync = Date.now(); syncNow(); } };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') catchUp(); });
    addEventListener('online', catchUp);
  }

  return {
    init,
    signedIn: () => !!user,
    // Called after every local save; batches bursts of changes into one sync.
    schedule() {
      if (!user) return;
      clearTimeout(timer);
      timer = setTimeout(syncNow, 2500);
    },
    async overwrite(state) {
      if (!user) return;
      try { await push(state); lastSync = Date.now(); saveMeta(); } catch (e) { console.warn('Reset sync failed:', e); }
    },
    _merge: merge
  };
})();

N3.Sync.init();
