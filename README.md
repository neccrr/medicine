# Medicine — static study tool

A fully static, zero-backend study app: flashcards (SM-2 spaced repetition),
multiple-choice quizzes, chaptered ebooks, written summaries, and
client-side search — installable as an offline-capable PWA. All content
ships as JSON/Markdown in the repo; all progress lives in the browser's
`localStorage`. No accounts, no database, no server round-trip — free to
host forever on Vercel's hobby tier (static hosting only, no serverless
invocations).

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

`content/ebooks/cardiology` demonstrates chapters + resources;
`content/ebooks/pharmacology` demonstrates a PDF-only book.

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

`content/quizzes/histology` demonstrates an HTML-only quiz game.

## Client-side logic

- **`src/lib/sm2.ts`** — SM-2 spaced-repetition algorithm. Grading a card
  (0–5 quality) returns a new `{ interval, easeFactor, dueDate, reps, lapses }`.
- **`src/hooks/useSpacedRepetition.ts`** — wraps SM-2 with per-deck
  `localStorage` state, exposes due cards, a `grade(cardId, quality)`
  function, and the deck's "hardest cards" (most lapses).
- **`src/hooks/useQuizProgress.ts`** — scores a quiz submission against the
  answer key and appends an attempt (`{ score, total, date, missedIds }`) to
  `localStorage`, powering the "review missed only" flow and the score
  history sparkline.
- **`src/lib/tipOfDay.ts`** — deterministic pick from `tips.json` based on
  the calendar date, so everyone sees the same tip on a given day without a
  server.
- **`src/lib/activity.ts`** — logs a "study day" on any flashcard grade,
  quiz submission, or ebook chapter view; computes current/longest streaks
  for the navbar badge and the Progress page's calendar heatmap.
- **`src/hooks/useTheme.ts`** — light/dark theme, defaults to the OS
  preference, persisted and toggleable from the navbar.
- **`src/lib/storage.ts`** — thin `localStorage` JSON helpers, plus
  `exportAllProgress` / `importAllProgress` for the Progress page's backup
  flow (all `medicine:*` keys, whole state as one downloadable JSON file).

## Pages

| Route                       | Purpose                                          |
|-------------------------------|----------------------------------------------------|
| `/`                          | Home, tip of the day, quick links                |
| `/flashcards`                | Subject list with due-card counts                |
| `/flashcards/:subjectId`     | SM-2 study session — flip animation, keyboard shortcuts (space to flip, 1–5 to grade), session summary, hardest-cards list |
| `/quizzes`                   | Subject list with last score                     |
| `/quizzes/:subjectId`        | Quiz with instant scoring, missed-only retry, score trend sparkline (or an embedded interactive HTML quiz game) |
| `/ebooks`                    | Ebook list with resume position                  |
| `/ebooks/:subjectId/:chapterId` | Chapter reader with table of contents, prev/next nav |
| `/summaries`                 | Subject list                                     |
| `/summaries/:subjectId`      | Rendered Markdown summary                        |
| `/search`                    | Fuzzy search across every flashcard & quiz question |
| `/progress`                  | Streak stats, activity heatmap, export/import as JSON |

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
- 3D flip animation on flashcards, keyboard-driven review (space/1–5)
- Study streak tracking with a GitHub-style activity heatmap
- Command palette (⌘K) for fast navigation
- Installable PWA with offline support (manifest + service worker,
  PDFs included in the precache)
- Accessibility: skip-to-content link, focus-visible outlines, ARIA
  roles on the quiz radiogroup, `prefers-reduced-motion` respected
  everywhere animation is used (pulse-line draw-in, card stagger, page
  transitions, quiz feedback)

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
npm run build     # type-checks, builds to dist/, generates the service worker
npm run preview   # serve the production build locally
npm run lint       # oxlint
```

## Deploying to Vercel

This repo includes `vercel.json` (build command, `dist` output dir, and an
SPA rewrite so client-side routes work on refresh/deep-link). Import the
repo in Vercel — no environment variables or serverless functions are
needed; it's served as pure static assets on the hobby tier.
