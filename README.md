# N3 Sanctuary

A cozy pixel-art sanctuary for gentle, habit-based JLPT N3 study. It's plain HTML, CSS and JavaScript, with no build step and no backend. Your progress and settings are saved in the browser's `localStorage`.

## Run it

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8743
```

Then visit http://localhost:8743.

## What's inside

- **Sanctuary stage:** a living pixel scene with the Tutor Cat, the Kanji Jar and a gentle Pomodoro timer. There are four themes: Sunlit Meadow Bakery, Sakura Breeze, Rainy Rooftop Café and Starlit Lanterns.
- **Desk:** three daily N3 kanji, or one in low-battery mode. Each card has readings, two compounds, an example sentence with a furigana toggle, and a tracing scratchpad. **Got it** adds a gem to the jar. **Still fuzzy** sends the kanji to the Tricky Shelf with no penalty.
- **Library:** a pixel bookshelf. With a mouse, hover over a spine to peek and click to open the book. On touch screens, tap once to peek and tap again to open. The books cover grammar contrasts, vocabulary in context, compound readings, short reading passages with clue hints, connectors, and the *N3 Passing Field Guide*.
- **Tricky Shelf:** review missed or fuzzy items and graduate them when they feel comfortable.
- **Keepsakes:** Cat Closet cosmetics, themes and secret notes, unlocked at gem milestones.
- **Comfort toggles:** Reduced motion, Quiet synth (an optional Web Audio ambience) and Low-battery mode.

## Customize

- Study content, the 40 cat lines, unlock milestones and the placeholder secret notes are all in `js/data.js`.
- You can also personalize the notes in the app: open **Keepsakes**, then choose **Personalize** on an unlocked note.
- Pixel sprites are string grids in `js/sprites.js`, and theme colors are CSS variables at the top of `css/styles.css`.
