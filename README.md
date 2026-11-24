# N3 Sanctuary

A cozy pixel-art sanctuary for gentle, habit-based JLPT N3 study. It's plain HTML, CSS and JavaScript, with no build step. Progress saves in the browser first and can sync across devices with an optional sign-in.

## Run it

Serve the folder and open http://localhost:8743:

```bash
python3 -m http.server 8743
```

Opening `index.html` directly also works, but offline mode and installing as an app need it served over http(s).

## How studying works

- **Recall first, then check.** New kanji are shown in full so you can study them (with a tracing scratchpad), then you're quizzed. Every question is auto-graded multiple choice: the meaning, how a compound is read (with realistic wrong readings like しゅかん for しゅうかん), or which compound matches an English meaning.
- **Spaced review.** Each card and Library question has its own schedule: a right answer moves it up a box (back in 1, 3, 7, 14, 30, 60, then 120 days), a miss brings it back tomorrow. The Desk's **Today's session** shows what's due, then today's new kanji.
- **Gems mean remembering.** You earn a gem the first time you answer an item correctly, and again for each correct answer on a review that was due. Clicking through without answering earns nothing.
- **No penalties.** Missed items rest on the Tricky Shelf and come back on schedule; there are no streaks to lose.

## What's inside

- **Desk:** today's session plus a browser for all 373 kanji: every kanji on the [tanos.co.uk JLPT N3 list](http://www.tanos.co.uk/jlpt/) (367) plus 6 bonus ones. Daily new kanji (default 3) and review cap are adjustable; Low-battery mode drops to 1 new kanji and 5 reviews.
- **Library:** 12 books and 85 questions on three shelves, covering the N3 written question types: kanji reading and spelling (表記), vocabulary in context, paraphrase (言い換え), usage (用法), grammar contrasts, ★ sentence building, grammar in a passage, connectors, short and information-search reading, plus the *N3 Passing Field Guide*. Mouse: hover a spine to peek, click to open. Touch: tap to peek, tap again to open.
- **Progress:** exam countdown with a pace check, a 12-week study calendar (no streaks), memory strength, accuracy by area, and study settings.
- **Sanctuary:** the Tutor Cat (who also points out your weak area and waiting reviews), the Kanji Jar, a Pomodoro that reports what you answered in each focus session, four unlockable themes, closet items and secret notes.
- **Comfort toggles:** Reduced motion, Quiet synth (ambient, off by default), Sound effects (on by default) and Low-battery mode.
- **Works offline and installs as an app** (service worker + manifest). App files are fetched fresh whenever you're online, so updates show up without manual cache-busting.

Listening isn't practiced here; keep it in your routine elsewhere.

## Cloud sync

Signing in with **☁ Sync** (email magic link, no password) keeps gems, review schedules, unlocks, closet, themes, notes, the Tricky Shelf and the study log in sync through [Supabase](https://supabase.com). Device preferences (reduced motion, sounds) stay per device.

- Settings live in `js/config.js` (Project URL + publishable key; never the secret key).
- The `progress` table holds one JSON row per user, protected by row level security.
- Free Supabase projects pause after about a week without use; restart from the dashboard if that happens. The built-in email sender only allows a few login emails per hour.

## Tests

```bash
node --test tests/
```

27 tests cover content integrity (every kanji and question is well-formed and answerable), the review scheduler and question generator, sync merging between devices, and progress stats.

For an end-to-end run in headless Chromium (study flow, every book, all tabs at desktop/tablet/phone sizes, JavaScript errors, and loading with the server stopped):

```bash
node tests/e2e.mjs
```

## Customize

- Kanji cards: `js/kanji-n3.js` (plus the original hand-written set in `js/data.js`). Library books: `js/data.js` and `js/books-more.js`. Cat lines, milestones and secret notes: `js/data.js`.
- You can personalize the notes in the app: **Keepsakes** → **Personalize** on an unlocked note.
- Pixel sprites are string grids in `js/sprites.js`; theme colors are CSS variables at the top of `css/styles.css`.
- If you add a new file the app needs offline, add it to the `CORE` list in `sw.js`.

The study content was written with AI assistance and checked by automated tests for structure, not by a Japanese teacher. If a card looks wrong, trust your textbook.
