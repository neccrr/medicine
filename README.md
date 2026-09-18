# Medicine — static study tool

[![License: MIT](https://img.shields.io/badge/License-MIT-2dd4a7.svg)](./LICENSE)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-2dd4a7)
![No backend](https://img.shields.io/badge/backend-none-lightgrey)

A fully static, zero-backend study app: flashcards (SM-2 spaced repetition),
multiple-choice quizzes and interactive quiz games, chaptered ebooks,
written summaries, and client-side search — installable as an
offline-capable PWA. All content ships as JSON/Markdown in the repo; all
progress lives in the browser's `localStorage`. No accounts, no database,
no server round-trip — free to host forever on Vercel's hobby tier (static
hosting only, no serverless invocations).

It's open source under the MIT license — clone it, point `/content` at
your own material, and it's your own study app.

## Screenshots

<table>
<tr>
<td width="50%">

![Home dashboard, dark theme](docs/screenshots/home-dark.png)
Home dashboard, dark theme — streaks, due counts, continue-where-you-left-off

</td>
<td width="50%">

![Home dashboard, light theme](docs/screenshots/home-light.png)
Same page, light theme — OS-aware default, toggle anytime

</td>
</tr>
<tr>
<td width="50%">

![Flashcard review](docs/screenshots/flashcard-dark.png)
Flashcard review — flip animation, tag filters, keyboard grading

</td>
<td width="50%">

![Quiz](docs/screenshots/quiz-light.png)
Quiz — instant scoring, plus a link to the subject's interactive game

</td>
</tr>
</table>

<details>
<summary>Ebook chapter &amp; Progress page</summary>

![Ebook chapter](docs/screenshots/ebook-dark.png)
Ebook chapter — original diagrams, reading controls, resume position

![Progress page](docs/screenshots/progress-light.png)
Progress — streak stats, activity heatmap, study-plan generator

</details>

## Features

- **SM-2 spaced repetition** for flashcards — due-card queue, tag
  filtering, session summaries, and a per-deck (plus global, cross-subject)
  "hardest cards" list ranked by lapse count
- **Quizzes** — instant scoring, a "review missed only" retry flow, a
  cross-attempt due-questions queue, a score-trend sparkline, and support
  for self-contained interactive HTML quiz games alongside the MCQ bank
- **Ebooks** — chaptered Markdown readers with a table of contents,
  prev/next nav, resume-where-you-left-off position tracking, adjustable
  font size, an accessible-font toggle, print/export styling, and
  optional PDFs
- **Full-text search** — fuzzy search (Fuse.js) across every flashcard,
  quiz question, summary, and ebook chapter, plus a **⌘K / Ctrl+K**
  command palette
- **Progress tracking** — study-streak counter, a GitHub-style activity
  heatmap, a study-plan generator (set an exam date, get a daily review
  pace), and one-click export/import of all progress as JSON
- **Installable PWA** — offline-capable after first load (service worker
  precaches the app, PDFs, and quiz games); a backup-reminder nudge
  prompts an export if it's been a while
- **Light/dark theme**, OS-aware by default, with a distinct per-subject
  accent color and initial badge
- **Zero backend** — no accounts, no database, no server round-trip;
  every byte of progress stays in the browser's `localStorage`

## Quick start

```bash
git clone https://github.com/neccrr/medicine.git
cd medicine
npm install
npm run dev       # http://localhost:5173
```

No environment variables, no API keys, no database to set up — it just
runs.

## Add your own content

Content lives in `/content` and is auto-discovered at build time — **drop
a folder in, no code changes required.** See
[Content structure](#content-structure) below for the exact file layout.

## Stack

- **Vite + React + TypeScript** — static SPA, `npm run build` outputs plain
  HTML/CSS/JS to `dist/`
- **react-router-dom** — client-side routing (`BrowserRouter`; `vercel.json`
  rewrites all paths to `index.html` for deep-link support)
- **Fuse.js** — fuzzy search, used by both the Search page and the command
  palette, over content bundled at build time
- **marked** — renders the Markdown summary and ebook chapter files
- **vite-plugin-pwa** — installable manifest + offline service worker
  (precaches the built app; works with zero connectivity after first load)
- No backend, no auth, no database

## Content structure

Content lives in `/content` at the repo root and is bundled into the app at
**build time** via `import.meta.glob` (see `src/lib/content.ts`) — there is
no runtime fetch.

```
content/
  flashcards/{subject}/deck.json   → Flashcard[]  { id, front, back, tags }
  quizzes/{subject}/bank.json      → QuizQuestion[] { id, question, options, answer, explanation }
  quizzes/{subject}/*.html         → any self-contained interactive quiz dropped here — no code changes needed
  ebooks/{subject}/meta.json       → { title, description, chapters: [{id,title}], resources?: [{title,url}] }
  ebooks/{subject}/chapter-N.md    → Markdown, one file per chapter
  ebooks/{subject}/*.pdf           → any PDF dropped here — no code changes needed
  summaries/{subject}.md           → Markdown, rendered client-side
  tips/tips.json                   → string[]
```

Adding a new subject is just adding a new folder + file — no code changes
required; subject lists everywhere (Flashcards/Quizzes/Ebooks/Summaries,
plus the search index and command palette) are derived automatically from
what's present in `/content`.

### Ebooks: chapters, PDFs, and external links

An ebook subject can mix any combination of:

- **Markdown chapters** (`chapter-N.md`) — rendered with a table-of-contents
  sidebar, prev/next nav, and resume-where-you-left-off position tracking.
- **PDFs** — drop any `.pdf` file into `content/ebooks/{subject}/` (e.g. after
  pushing it to the repo on GitHub) and it's picked up automatically at
  build time: bundled as a real static asset (never inlined, so large files
  stay out of the JS bundle — see `assetsInlineLimit` in `vite.config.ts`),
  listed in the sidebar, and rendered inline via an embedded viewer with an
  "open in new tab" fallback. A subject folder that *only* has a PDF (no
  `meta.json`) still gets a book entry — the title is derived from the
  folder name.
- **External links** — add a `resources: [{ title, url }]` array to
  `meta.json` for a "Further reading" list in the sidebar (citations,
  guideline pages, journal links, anything external), opened in a new tab.

`content/ebooks/histology` and `content/ebooks/biochem` demonstrate
chapters + resources; drop a PDF into a subject folder (with or without a
`meta.json`) to get a PDF-only or PDF-plus-chapters book, no code changes
needed.

### Quizzes: question banks and interactive HTML games

A quiz subject can be a `bank.json` (multiple-choice, scored and tracked by
the app's own quiz engine), a self-contained interactive `.html` file (its
own UI/scoring — e.g. an image-identification game), or both. Drop any
`.html` file into `content/quizzes/{subject}/` and it's picked up
automatically: bundled as a real static asset, listed on the Quizzes page,
and rendered inline via an embedded iframe with an "open in new tab"
fallback — same treatment as ebook PDFs. A subject folder that *only* has an
HTML game (no `bank.json`) still gets a quiz entry, titled from the folder
name.

`content/quizzes/histology/Guess-the-Slide.html` is an HTML-only quiz game
(image-ID with hints); `content/quizzes/histology/Structure-Labeler.html`
and `content/quizzes/biochem/Amino-Acid-Fates.html` each pair a `bank.json`
with a game, so those subjects show both the MCQ quiz and an "Also try:
<game name> ↗" link. Game display names come straight from the filename
(dashes become spaces), so name the file the way you want it to read in
the UI.

## Client-side logic

- **`src/lib/sm2.ts`** — SM-2 spaced-repetition algorithm. Grading a card
  (0–5 quality) returns a new `{ interval, easeFactor, dueDate, reps, lapses }`.
- **`src/hooks/useSpacedRepetition.ts`** — wraps SM-2 with per-deck
  `localStorage` state, exposes due cards, a `grade(cardId, quality)`
  function, and the deck's "hardest cards" (most lapses, via `lib/hardestCards.ts`).
- **`src/lib/hardestCards.ts`** — ranks cards by lapse count (ties broken by
  ease factor); used both per-deck and, on the Progress page, merged across
  every subject into a single global "hardest cards" list.
- **`src/lib/quizScoring.ts`** — pure quiz-scoring functions: `scoreQuiz`
  grades a submission against the answer key, and `updateDueIds` maintains a
  cross-attempt "due for review" queue — a missed question joins the queue
  and stays there until it's answered correctly in a later attempt.
- **`src/hooks/useQuizProgress.ts`** — wraps `quizScoring.ts` with
  `localStorage` state: appends each attempt (`{ score, total, date,
  missedIds }`) to history and updates the due-questions queue, powering the
  "review missed only" flow, the due-review banner, and the score history
  sparkline.
- **`src/lib/studyPlan.ts`** — pure function that turns an exam date plus a
  deck's stats into a daily review pace ("N cards/day clears the deck in
  M days"), powering the Progress page's study-plan generator.
- **`src/lib/tipOfDay.ts`** — deterministic pick from `tips.json` based on
  the calendar date, so everyone sees the same tip on a given day without a
  server.
- **`src/lib/activity.ts`** — logs a "study day" on any flashcard grade,
  quiz submission, or ebook chapter view; computes current/longest streaks
  for the sidebar badge and the Progress page's calendar heatmap.
- **`src/lib/textExtract.ts`** — strips markdown/HTML (including embedded
  `<svg>` diagrams, which are pure coordinate noise) down to plain text;
  used to index summaries and ebook chapters for search without polluting
  results with diagram markup.
- **`src/hooks/useTheme.ts`** — light/dark theme, defaults to the OS
  preference, persisted and toggleable from the sidebar.
- **`src/hooks/useReadingPrefs.ts`** — persisted font-scale and
  accessible-font (Atkinson Hyperlegible) preferences, shared by the ebook
  reader and summary pages.
- **`src/lib/storage.ts`** — thin `localStorage` JSON helpers, plus
  `exportAllProgress` / `importAllProgress` for the Progress page's backup
  flow (all `medicine:*` keys, whole state as one downloadable JSON file).

## Pages

| Route                       | Purpose                                          |
|-------------------------------|----------------------------------------------------|
| `/`                          | Home, tip of the day, quick links                |
| `/flashcards`                | Subject list with due-card counts                |
| `/flashcards/:subjectId`     | SM-2 study session — flip animation, keyboard shortcuts (space to flip, 1–5 to grade), tag filtering, session summary, hardest-cards list, read-aloud |
| `/quizzes`                   | Subject list with last score and due-question counts |
| `/quizzes/:subjectId`        | Quiz with instant scoring, missed-only retry, a cross-attempt due-questions banner, score trend sparkline — plus a link to the subject's interactive HTML game, if it has one |
| `/ebooks`                    | Ebook list with resume position                  |
| `/ebooks/:subjectId/:chapterId` | Chapter reader with table of contents, prev/next nav, font-size/accessible-font controls, print button |
| `/summaries`                 | Subject list                                     |
| `/summaries/:subjectId`      | Rendered Markdown summary                        |
| `/search`                    | Fuzzy search across every flashcard, quiz question, summary section, and ebook chapter, with type/subject filters |
| `/progress`                  | Streak stats, activity heatmap, study-plan generator, global hardest-cards list, export/import as JSON |

Press **⌘K / Ctrl+K** anywhere to open the command palette and jump to any
page or subject.

## Design

**"Clinical Vitals"** — the app's visual identity is an EKG-pulse motif
carried through consistently: a hand-drawn pulse trace as the logo (draws
itself in on load) and hero decoration, a fine graph-paper grid texture on
every surface, an editorial serif (**Fraunces**) for headings against a
confident grotesk (**Archivo**) for UI text, and a monospace
(**IBM Plex Mono**) reserved for anything that reads as data — streak
counts, SM-2 stats, badges, kbd hints — so numbers look like an actual
monitor read-out. Accent color is a phosphor teal (vital-monitor green)
rather than another blue-gradient SaaS look. Fonts load from Google Fonts
(see `index.html`); CSS custom properties in `src/index.css` define both
the dark (default) and light (warm paper) themes — swap the values there to
retheme.

## Polish

- Light/dark theme (OS-aware default, persisted toggle)
- Per-subject accent color + initial badge, derived deterministically from
  the subject id
- 3D flip animation on flashcards, keyboard-driven review (space/1–5),
  optional read-aloud via the Web Speech API
- Tag-based flashcard filtering — click any tag (on a card or in the filter
  row) to drill a deck down to just that topic
- Cross-attempt quiz due-questions queue: a missed question resurfaces on
  your next visit until you get it right, the same way SM-2 resurfaces due
  flashcards
- A global "hardest cards" list on the Progress page, merged and ranked
  across every subject's deck
- Study streak tracking with a GitHub-style activity heatmap
- A study-plan generator: set an exam date, get a daily review pace
- A backup-reminder nudge if it's been a while since your last progress export
- Adjustable ebook/summary font size and an accessible-font (Atkinson
  Hyperlegible) toggle, plus print-friendly styling
- A branded splash screen on first load (inlined critical CSS, fades out
  once the app is ready — see `index.html`)
- Command palette (⌘K) for fast navigation
- Installable PWA with offline support (manifest + service worker,
  PDFs and quiz games included in the precache)
- Accessibility: skip-to-content link, focus-visible outlines, ARIA
  roles on the quiz radiogroup and tag-filter toggles, `prefers-reduced-motion`
  respected everywhere animation is used (pulse-line draw-in, card stagger,
  page transitions, quiz feedback, splash screen)

## Trade-offs

- Progress is per-browser/per-device — clearing site data or switching
  devices loses it. Use **Progress → Export** to back up, and **Import** to
  restore on another device/browser.
- No multi-user stats or leaderboards — there's no server-side user data to
  aggregate.
- No auth, no accounts — anyone with the URL sees the same content; only
  their own local progress is personal.

## Testing

Pure logic (SM-2, quiz scoring, streak math, search indexing, text
extraction, study-plan pacing, backup-reminder timing) is covered by
Vitest unit tests in `src/lib/*.test.ts` — no DOM/component tests, just the
algorithms that are easy to get subtly wrong.

```bash
npm run test        # run once
npm run test:watch  # watch mode
```

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-checks, builds to dist/, generates the service worker
npm run preview   # serve the production build locally
npm run lint       # oxlint
npm run test       # vitest
```

## Deploying to Vercel

This repo includes `vercel.json` (build command, `dist` output dir, and an
SPA rewrite so client-side routes work on refresh/deep-link). Import the
repo in Vercel — no environment variables or serverless functions are
needed; it's served as pure static assets on the hobby tier.

## Contributing

Contributions are welcome — this is a small, readable codebase on purpose.

- **Adding content** (flashcards, quizzes, ebook chapters, summaries) needs
  no code changes at all — see [Content structure](#content-structure) and
  drop files into `/content`.
- **Bug fixes / features**: fork the repo, make your change, and run the
  full check before opening a PR:

  ```bash
  npm run lint && npm run test && npm run build
  ```
- Keep pure logic in `src/lib/*.ts` covered by a Vitest test in the
  matching `*.test.ts` file — see [Testing](#testing).
- Open an issue first for anything that changes the data model
  (`src/types/content.ts`) or the content file layout, so the approach can
  be discussed before the work is done.

## License

[MIT](./LICENSE) — use it, fork it, retheme it, point it at your own
content. Attribution is appreciated but not required.
