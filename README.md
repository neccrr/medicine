# Medicine — static study tool

A fully static, zero-backend study app: flashcards (SM-2 spaced repetition),
multiple-choice quizzes, written summaries, and client-side search. All
content ships as JSON/Markdown in the repo; all progress lives in the
browser's `localStorage`. No accounts, no database, no server round-trip —
free to host forever on Vercel's hobby tier (static hosting only, no
serverless invocations).

## Stack

- **Vite + React + TypeScript** — static SPA, `npm run build` outputs plain
  HTML/CSS/JS to `dist/`
- **react-router-dom** — client-side routing (`BrowserRouter`; `vercel.json`
  rewrites all paths to `index.html` for deep-link support)
- **Fuse.js** — fuzzy search across flashcards and quiz questions, built at
  runtime from the same bundled content
- **marked** — renders the Markdown summary files
- No backend, no auth, no database

## Content structure

Content lives in `/content` at the repo root and is bundled into the app at
**build time** via `import.meta.glob` (see `src/lib/content.ts`) — there is
no runtime fetch.

```
content/
  flashcards/{subject}/deck.json   → Flashcard[]  { id, front, back, tags }
  quizzes/{subject}/bank.json      → QuizQuestion[] { id, question, options, answer, explanation }
  summaries/{subject}.md           → Markdown, rendered client-side
  tips/tips.json                   → string[]
```

Adding a new subject is just adding a new folder + JSON file — no code
changes required; subject lists on the Flashcards/Quizzes/Summaries pages
are derived automatically from what's present in `/content`.

## Client-side logic

- **`src/lib/sm2.ts`** — SM-2 spaced-repetition algorithm. Grading a card
  (0–5 quality) returns a new `{ interval, easeFactor, dueDate, reps, lapses }`.
- **`src/hooks/useSpacedRepetition.ts`** — wraps SM-2 with per-deck
  `localStorage` state (`medicine:flashcards:{deckId}`), exposes due cards
  and a `grade(cardId, quality)` function.
- **`src/hooks/useQuizProgress.ts`** — scores a quiz submission against the
  answer key and appends an attempt (`{ score, total, date, missedIds }`) to
  `localStorage` (`medicine:quiz:{quizId}`).
- **`src/lib/tipOfDay.ts`** — deterministic pick from `tips.json` based on
  the calendar date (day-of-year mod tip count), so everyone sees the same
  tip on a given day without any server involved.
- **`src/lib/storage.ts`** — thin `localStorage` JSON helpers, plus
  `exportAllProgress` / `importAllProgress` for the Progress page's backup
  flow (all `medicine:*` keys, whole state as one downloadable JSON file).

## Pages

| Route                    | Purpose                                   |
|---------------------------|--------------------------------------------|
| `/`                       | Home, tip of the day, quick links          |
| `/flashcards`             | Subject list with due-card counts          |
| `/flashcards/:subjectId`  | SM-2 study session for one deck            |
| `/quizzes`                | Subject list with last score               |
| `/quizzes/:subjectId`     | Quiz with instant scoring + explanations   |
| `/summaries`              | Subject list                               |
| `/summaries/:subjectId`   | Rendered Markdown summary                  |
| `/search`                 | Fuzzy search across flashcards & quizzes   |
| `/progress`               | Export/import your local progress as JSON  |

## Trade-offs

- Progress is per-browser/per-device — clearing site data or switching
  devices loses it. Use **Progress → Export** to back up, and **Import** to
  restore on another device/browser.
- No multi-user stats or leaderboards — there's no server-side user data to
  aggregate.
- No auth, no accounts — anyone with the URL sees the same content; only
  their own local progress is personal.

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-checks then builds to dist/
npm run preview   # serve the production build locally
npm run lint       # oxlint
```

## Deploying to Vercel

This repo includes `vercel.json` (build command, `dist` output dir, and an
SPA rewrite so client-side routes work on refresh/deep-link). Import the
repo in Vercel — no environment variables or serverless functions are
needed; it's served as pure static assets on the hobby tier.
