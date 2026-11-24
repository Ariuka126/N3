// End-to-end check in headless Chromium: fresh user flow, every book, tabs at 3 sizes, JS errors, offline.
// Needs `chromium` and python3 on PATH. Run: node tests/e2e.mjs  (screenshots go to a temp folder it prints)
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'n3-e2e-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const server = spawn('python3', ['-m', 'http.server', '8745', '--directory', root], { stdio: 'ignore' });
const chrome = spawn('chromium', ['--headless=new', '--remote-debugging-port=9334', `--user-data-dir=${mkdtempSync(join(dir, 'chrome-'))}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
await sleep(2500);
const page = (await (await fetch('http://127.0.0.1:9334/json')).json()).find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' '));
});
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
const size = (w, h, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(dir, name), Buffer.from(r.result.data, 'base64')); };

await send('Runtime.enable'); await send('Page.enable');
await size(1400, 900);
await send('Page.navigate', { url: 'http://localhost:8745/' }); await sleep(3500);

const report = {};
// Answer helper: finds the correct option for whatever question is on screen inside `host`.
await js(`window.__answer = (host, right = true) => {
  const h = document.querySelector(host);
  const btns = [...h.querySelectorAll('.opt')];
  let idx;
  const exHost = h.querySelector('.q');
  if (exHost) {
    const all = N3.BOOKS.flatMap(b => b.items || []);
    const qText = h.querySelector('.q').innerHTML;
    const it = all.find(x => qText.includes(x.q.replace(/\\{([^|}]+)\\|([^}]+)\\}/g, '<ruby>$1<rt>$2</rt></ruby>').slice(0, 25)));
    idx = it.a;
  } else {
    const p = h.querySelector('.quiz-prompt').textContent;
    const k = N3.KANJI.find(k => k.k === p || k.words.some(w => w[0] === p || w[2] === p));
    const answers = [k.mean, ...k.words.map(w => w[1]), ...k.words.map(w => w[0])];
    idx = btns.findIndex(b => answers.includes(b.textContent.slice(1)));
  }
  if (exHost) { const b = h.querySelector('.opt[data-i="' + (right ? idx : (idx + 1) % 4) + '"]'); b.click(); return idx; }
  if (!right) idx = (idx + 1) % 4;
  btns[idx].click();
  return idx;
}`);

// 1. Fresh user: learn → quiz → right; learn → quiz → wrong.
report.start = await js(`[document.querySelector('#kanji-grid').dataset.mode, document.querySelector('#session-count').textContent].join(' | ')`);
await js(`document.querySelector('#learn-quiz').click()`); await sleep(200);
await js(`__answer('#kcard', true)`); await sleep(1400);
report.afterRight = await js(`[document.querySelector('.fb-head').textContent, 'gems=' + N3.App.state().gems, document.querySelector('#session-count').textContent].join(' | ')`);
await shot('desktop-answered.png');
await js(`document.querySelector('#kcard .next-q').click()`); await sleep(200);
await js(`document.querySelector('#learn-quiz').click()`); await sleep(200);
await js(`__answer('#kcard', false)`); await sleep(600);
report.afterWrong = await js(`[document.querySelector('.fb-head').textContent, 'tricky=' + N3.App.state().tricky.length].join(' | ')`);

// 2. Every book: open, answer the first question correctly, close.
report.books = await js(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  document.querySelector('.tab[data-tab=library]').click(); await sleep(200);
  const out = [];
  for (const b of N3.BOOKS) {
    document.querySelector('.spine[data-book=' + b.id + ']').click(); await sleep(250);
    if (b.kind === 'guide') { out.push(b.id + ':guide'); document.querySelector('.modal [data-close]').click(); await sleep(100); continue; }
    document.querySelector('#quiz-host .opt[data-i="' + b.items[0].a + '"]').click(); await sleep(1300);
    out.push(b.id + ':' + (document.querySelector('#quiz-host .fb-head').textContent.startsWith('Yes') ? 'ok' : 'WRONG'));
    document.querySelector('.modal [data-close]').click(); await sleep(150);
  }
  return out.join(' ');
})()`);
await shot('desktop-library.png');

// 3. Tricky Shelf: kanji quiz in the modal, answered right → graduates.
report.tricky = await js(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  document.querySelector('.tab[data-tab=tricky]').click(); await sleep(150);
  const before = N3.App.state().tricky.length;
  document.querySelector('.tricky-item').click(); await sleep(250);
  __answer('#quiz-host', true); await sleep(1400);
  document.querySelector('.modal .next-q').click(); await sleep(200);
  return 'modalOpen=' + !document.querySelector('#modal').hidden + ' before=' + before + ' after=' + N3.App.state().tricky.length;
})()`);

// 4. Progress tab with an exam date.
report.progress = await js(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  document.querySelector('.tab[data-tab=progress]').click(); await sleep(150);
  document.querySelector('#pg-next').click(); await sleep(150);
  return document.querySelector('#pg-exam .big-num').textContent + ' | ' + document.querySelector('#pg-areas').innerText.replace(/\\s+/g, ' ').slice(0, 90);
})()`);
await shot('desktop-progress.png');

// 5. Layout at three sizes: no sideways scroll on any tab.
for (const [w, h, m, name] of [[1400, 900, false, 'desktop'], [768, 1024, false, 'tablet'], [375, 812, true, 'mobile']]) {
  await size(w, h, m); await sleep(400);
  report[name] = await js(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const tabs = [...document.querySelectorAll('.tab')].filter(t => t.offsetParent).map(t => t.dataset.tab);
    const res = [];
    for (const t of tabs) { document.querySelector('.tab[data-tab=' + t + ']').click(); await sleep(150); res.push(t + (document.documentElement.scrollWidth > innerWidth ? ':OVERFLOW' : ':ok')); }
    document.querySelector('.tab[data-tab=desk]').click();
    return res.join(' ');
  })()`);
}
await js(`document.querySelector('.tab[data-tab=desk]').click(); scrollTo(0,0)`); await sleep(300);
await shot('mobile-desk.png');
await js(`document.querySelector('.tab[data-tab=progress]').click(); scrollTo(0,0)`); await sleep(300);
await shot('mobile-progress.png');
await js(`document.querySelector('.tab[data-tab=library]').click(); scrollTo(0,0)`); await sleep(300);
await shot('mobile-library.png');

// 6. Offline: stop the server, reload.
await send('Page.reload'); await sleep(2500);
server.kill(); await sleep(800);
await send('Page.reload'); await sleep(3500);
report.offline = await js(`[document.title, N3.KANJI.length, N3.BOOKS.length, 'gems=' + N3.App.state().gems].join(' | ')`);

report.errors = errors.filter(e => !/supabase|Failed to load resource/i.test(e));
console.log(JSON.stringify(report, null, 1));
console.log('screenshots:', dir);
const failed = report.errors.length || /WRONG|OVERFLOW/.test(JSON.stringify(report)) || !/373/.test(report.offline);
process.exitCode = failed ? 1 : 0;
ws.close(); chrome.kill();
