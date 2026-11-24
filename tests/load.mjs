// Loads the browser scripts into a sandbox so tests can call them without a page.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function load(files) {
  const store = new Map();
  const ctx = {
    console, Math, Date, JSON, Object, Array, Set, Map, String, Number,
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    document: { querySelector: () => null, addEventListener() {} },
    addEventListener() {}, setTimeout, clearTimeout,
    navigator: { onLine: true }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(readFileSync(join(root, 'js', f), 'utf8'), ctx, { filename: f });
  return ctx.N3;
}

export const ALL = ['data.js', 'kanji-n3.js', 'books-more.js', 'srs.js'];
