# Medicine: study tool

[![License: MIT](https://img.shields.io/badge/License-MIT-2dd4a7.svg)](./LICENSE)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-2dd4a7)
![Guest mode](https://img.shields.io/badge/guest_mode-no_sign--in_needed-lightgrey)

**Live:** [medicine.necr.help](https://medicine.necr.help)

A study app for medical school, organized the way
the curriculum is: by **study block**, then by **subject**. Each subject can
have spaced-repetition flashcards, quizzes, chaptered ebooks, summaries and the
original lecture and practicum PDFs. Each block can have timed practice exams
built from past papers.

All content ships as JSON, Markdown and PDF files in the repo, and progress
lives in the browser's `localStorage`, so it works with no sign-in, offline, as
a PWA. Optional **accounts** (email and password, or Google) sync that progress
across devices through one Vercel Function and MongoDB Atlas. Without the
account environment variables it runs as a plain static site.

## Screenshots

| ![Home dashboard, dark theme](docs/screenshots/home-dark.png) | ![Home dashboard, light theme](docs/screenshots/home-light.png) |
| --- | --- |
| **Home**: streak, due cards, what to continue, per-block subject cards | **Light theme**: follows the OS by default, toggle anytime |
| ![Flashcard review](docs/screenshots/flashcard-dark.png) | ![Quiz](docs/screenshots/quiz-light.png) |
| **Flashcards**: SM-2 review, tag filters, keyboard grading | **Quiz**: one question at a time, instant feedback with explanations |
| ![Timed block exam](docs/screenshots/exam-dark.png) | ![Modules viewer](docs/screenshots/modules-light.png) |
| **Exam**: timed block exam, question navigator, flag for review | **Modules**: lecture and practicum PDFs, grouped by section |
| ![Ebook chapter](docs/screenshots/ebook-dark.png) | ![Progress page](docs/screenshots/progress-light.png) |
| **Ebook**: chapters with original diagrams, reading controls, further reading | **Progress**: readiness, subject meters, trends, activity heatmap, weak spots, milestones, backup |

## What's inside

| Block | Subject | Content |
|---|---|---|
| **1.1**: Cell Biology and Hematology | Histology | 31 flashcards · 170 quiz questions · 5-chapter ebook · summary · 3 lecture PDFs |
| | Biochemistry | 45 flashcards · 42 quiz questions · 7-chapter ebook · summary · 3 lecture PDFs |
| | Physiology | 23 flashcards · 26 quiz questions · 4 lecture PDFs |
| | *Block exam* | 3 exam packages: Original Set (100 Q), Costraver (64 Q), UB 2025 (80 Q) |
| **1.2**: Integument and Musculoskeletal System | Anatomy | 144 flashcards · 986 image-occlusion labels on 88 figures · 134 quiz questions · 7-chapter ebook (22 original diagrams, 153 slide figures) · summary · 9 practicum assistance PDFs |
| | Histology | 69 flashcards · 76 quiz questions · 6-chapter ebook on muscle tissue and the integument (44 slide figures) · summary · 2 lecture PDFs |
| | Physiology | 57 flashcards · 59 quiz questions · 5-chapter ebook on muscle contraction and reflexes (12 original diagrams, 41 slide figures) · summary · 3 practicum assistance PDFs · Virtual Lab (PhysioEx Exercise 2) |
| | *Block exam* | Pooled from the anatomy, histology and physiology quiz banks (100 Q) |
| **1.3**: Digestive System and Metabolism | — | Coming soon |

## Features

**Flashcards**

- SM-2 spaced repetition with a due-card queue and a session summary
- Tag filtering (remembered per deck), with color-coded tag pills
- "Hardest cards" ranked by lapses, per deck and globally on the Progress page
- Optional card images and read-aloud (Web Speech API)

**Image Occlusion** (anatomy)

- Anki-style: atlas figures with their labels covered; name the one under the
  red box, reveal it, grade it. Every label has its own SM-2 schedule, with the
  next interval shown on each grade button
- Review (what's due) or Browse all (every figure in order): previous/next label
  and figure, tap any box or numbered chip to ask that label, swipe on phones
- Gallery of every figure with its progress, colour-coded label chips (new, due,
  learning, mastered), undo the last grade, show every label to study a figure
  whole, zoom, hide all or one, filter by region; picks up where you left off

**Explain this** (quizzes and flashcards)

- Shows the passages of the subject's own ebook and summary that match the
  question: free, instant, works offline
- Signed-in students can ask an AI to explain the answer (and why their pick was
  wrong), streamed in, grounded in those passages, with a daily allowance per
  student

**Alfond** (study assistant)

- A chat that can be asked anything, from its own page or from a floating button
  on every page
- From the button, each question carries the text of the page on screen, so
  "what does this mean?" is about what you're reading (switch it off per
  question)
- One conversation across pages, kept on the device; stop, retry, new chat
- The floating button can be turned off on Alfond's page or in Account
- Signed-in students only, on the same daily AI allowance as "Explain this"

**Quizzes**

- One question at a time with instant feedback and an explanation for every answer
- A numbered navigator, previous/next, and full keyboard control
- Question and option order reshuffled on every attempt, so answers can't be
  memorized by position
- Banks over 50 questions split into about 25-question sections you can take one
  at a time
- An unfinished attempt resumes where you left off
- "Review missed only" retry, and a due queue where missed questions come back
  until you answer them correctly
- Score-trend sparkline, question images (micrographs and diagrams), and
  confetti on a perfect score

**Exam**

- Timed block exams: up to 100 questions at 1 minute each, scaled down for
  smaller banks
- A block can have several **exam packages** (e.g. past papers from different
  sources) to choose between. Without packages, the exam pools the block's quiz
  banks.
- **Real exam** mode (scored only at the end) or **instant feedback** mode
- Flag for review, a navigator showing answered and flagged questions, and a
  low-time warning
- Submitting with questions unanswered or flagged asks for confirmation first
- Review with explanations after submitting, a "retry missed" round, and score
  history per package

**Modules**

- The original lecture slides and practicum PDFs, viewable in-app with an "open
  in new tab" fallback
- Grouped as **Lecture**, then **Practicum** (Reports, Assistance), with empty
  sections marked "To be added"
- **Class Drive** (signed-in students): the class's Google Drive folder, live.
  Every slide deck, recording, tutorial and exam file, folder by folder, in
  Google's own viewer (← and → step through a folder, Esc closes). "New this
  week" and per-folder counts show what was just added until it's opened; `/`
  searches every file and folder name. Each subject's module page lists its
  Drive files above the cleaned PDFs. Files added to or removed from the Drive
  show up within a few minutes, and the listing opens instantly from the
  device's last copy

**Virtual Lab**

- A practice simulator for the PhysioEx 9.1 Exercise 2 (skeletal muscle) dry
  lab: all seven activities, from the twitch and latent period to the
  load–velocity relationship
- A muscle on a force transducer with an oscilloscope trace, voltage, length,
  stimulus rate and weight controls, and a **Measure** line for the latent
  period
- Summation, unfused and fused tetanus, fatigue with rest periods,
  length–tension (active, passive, total) and isotonic lifts, from one tested
  model (`src/lib/muscleSim.ts`) tuned to the practicum's numbers (threshold 0.8
  V, maximal 8.5 V, 1.82 g twitch, optimal length 75 mm). Every equation and
  the numbers it gives are in [How the numbers are worked
  out](#virtual-lab-physioex-91-exercise-2-skeletal-muscle)
- **Record Data** into a table that is kept per activity, **Plot Data**, CSV
  download, and check questions with explanations

**Ebooks and summaries**

- Chaptered Markdown with original inline SVG diagrams, a table of contents, and
  previous/next navigation
- Resume position and chapter-completion tracking
- Adjustable font size, an accessible-font toggle (Atkinson Hyperlegible), and
  print-friendly styling
- Optional PDFs and a "Further reading" list of external links

**Search and navigation**

- Fuzzy search (Fuse.js) across every flashcard, quiz question, summary section
  and ebook chapter, with type and subject filters
- A **⌘K / Ctrl+K** command palette to jump to any page or subject
- A collapsible sidebar that shrinks to an icon rail on desktop (remembered
  between visits), giving pages such as the ebook reader a wider column

**Knowledge map** (`/map`)

- One graph of every concept across all blocks and subjects (about 700), from
  the terms the ebooks and summaries put in bold, linked where they come up
  together in a paragraph, flashcard or quiz question; a concept taught in two
  subjects or blocks is one dot that joins them
- Built at deploy time into `/knowledge-graph.json` (layout included, so it
  opens instantly); past-paper exam questions are never read
- Tap a concept: what it links to, the exact ebook and summary sections about
  it, its flashcards (opened as just those cards), quiz questions (as a drill)
  and labelled figures, and "Ask Alfond" how it connects
- Color by subject or by your own mastery (weak concepts ringed), search, block
  and subject filters, "only links between subjects", focus on one concept's
  links, and a list view
- Optional AI relationship labels ("innervates", "part of"…): `AI_BASE_URL=…
  AI_API_KEY=… AI_MODEL=… npm run graph:relations`, then commit
  `content/graph/relations.json`

**Exam plan** (`/plan`)

- One exam date per block: the block's official date (`examDate` in
  `src/lib/blocks.ts`) unless the student sets their own
- A readiness score per subject and block, from card and image-occlusion
  mastery, quiz accuracy and coverage, chapters read and timed mock scores (the
  formulas are in [Readiness and the exam plan](#readiness-and-the-exam-plan))
- **Today's plan**, also on Home: a checklist sized to the minutes the student
  has, which ticks itself off as they study and spreads a missed day over the
  days left
- Phases that change the plan as the exam nears: Learn (new material) →
  Strengthen (2 weeks out: weak spots) → Mock exams (last 3 days) → Final review
- Mock score trend against a target score, projected to exam day
- Weak spots by name (flashcard topics, most-missed questions, slipping labels),
  each with a one-tap drill
- "Add to calendar" (.ics), "Plan my week with Alfond", and readiness against
  the class average (signed in; shown once 3+ classmates have one)

**Progress**

- A summary of the current block (readiness, countdown, weakest subject) and
  every subject with meters for cards, labels, quiz, reading and mocks
- This week against last week, reviews per day, quiz and mock score trends
- An activity heatmap shaded by how much was studied; tap a day to see what; the
  time of day you study most
- Weak spots, milestones, and "Ask Alfond about my progress"
- Export and import of all progress as a JSON file, plus a reminder if you
  haven't backed up in 14 days

**Accounts (optional)**

- Guest mode by default: everything works without signing in
- Sign up with Google (one tap, with the account chooser) or email and password;
  profile with name and cohort
- Connect Google to a password account from the Account page; a Google sign-in
  never silently joins an unverified password account with the same email
- Clear messages when Google sign-in is cancelled or fails, and a hint to open
  the page in a real browser when it's inside an app (Instagram, LINE…) where
  Google blocks sign-in
- Flashcard reviews, quiz and exam history, reading progress, streak days and
  settings sync across devices, offline-first
- Guest progress is merged into the account on first sign-in (per-card,
  per-attempt, per-day, so nothing studied on either device is lost)
- Sign out keeps local progress; "sign out and clear" for shared computers;
  download all account data; delete the account
- A "current block" setting (guests too) that puts your block first on Home
- Opt-in **leaderboard**: this week, all time and study streak, for everyone or
  just your cohort. Points are worked out on the server from synced progress (1
  per correct answer, 2 per learned flashcard or label, 10 per finished
  chapter, 5 per study day; see [Leaderboard](#leaderboard)), and you choose the
  display name

**App**

- Installable PWA that works offline after the first visit (details in [Offline
  and updates](#offline-and-updates))
- Light and dark themes, with a color per content type and per subject
- Blocks with no content yet appear as "coming soon" placeholders
- A recovery screen instead of a blank page if saved progress from an older
  version breaks something

## How the numbers are worked out

Every figure the app shows comes from small pure functions (in `src/lib`, plus
`server/leaderboard.ts` for points), each with tests. This section lists them
with their constants, so any result can be checked by hand.

### Virtual Lab: PhysioEx 9.1 Exercise 2 (skeletal muscle)

`src/lib/muscleSim.ts` models an isolated muscle on a force transducer. It
reproduces the landmark numbers of the practicum's PhysioEx dry lab, not the
published program's internal equations. Times are in milliseconds and forces in
grams unless a name says otherwise.

| Constant | Value |
| --- | --- |
| Threshold stimulus | 0.8 V |
| Maximal stimulus | 8.5 V (stimulator range 0–10 V) |
| Latent period | 2.8 ms |
| Contraction phase | 15 ms (peak force 17.8 ms after the stimulus) |
| Relaxation | time constant 55 ms, shape 1.4 (over after about 237 ms) |
| Single maximal twitch | 1.82 g at the optimal length |
| Optimal length | 75 mm (range 50–100 mm) |

**Recruitment (Activity 2, stimulus voltage).** The fraction of motor units a
stimulus of `V` volts recruits:

```text
x    = clamp((V − 0.8) / (8.5 − 0.8), 0, 1)
R(V) = 0                                  below 0.8 V
R(V) = 0.02 + 0.98 · (1 − (1 − x)^2.2)    from 0.8 V up
```

| Voltage (V) | 0.7 | 0.8 | 1.0 | 2.0 | 3.0 | 4.0 | 6.0 | 8.0 | 8.5 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Recruited | 0 | 0.02 | 0.08 | 0.33 | 0.53 | 0.70 | 0.92 | 1.00 | 1 | 1 |
| Twitch force (g) | 0 | 0.04 | 0.14 | 0.59 | 0.97 | 1.27 | 1.67 | 1.82 | 1.82 | 1.82 |

**Twitch shape (Activity 1, the latent period).** One stimulus at time 0 gives
a normalised twitch `w(t)` (peak 1):

```text
c    = t − 2.8                          (w = 0 during the latent period)
w(t) = sin²(π/2 · c / 15)               for 0 < c < 15  (contraction)
w(t) = exp(−((c − 15) / 55)^1.4)        after that      (relaxation)
```

The latent period is the same 2.8 ms at every voltage, which is the point of
the activity. Students measure it with the **Measure** line: the time where
they place it is recorded, and the force under it is read off the trace by
linear interpolation between samples (`valueAt` in `src/lib/labTraces.ts`).

**Summation and force (Activities 1–4 and 6).** Every twitch still in progress
adds its `w`, and the sum saturates towards the maximal tetanic tension:

```text
S(t)  = Σ w(t − tᵢ)   over every stimulus i still in progress
F_cap = 1.82 / (1 − e^(−1/2)) = 4.63 g          (maximal tetanic tension)
F(t)  = R · F_cap · (1 − e^(−S / 2)) · L(length) · fatigue
```

`R` is the largest recruitment among the twitches in progress. A single twitch
(`S` peaks at 1) gives exactly 1.82 g, and each extra overlapping twitch adds
less than the last. Two maximal stimuli (Activity 3, stimulus frequency):

| Second stimulus after | 10 ms | 20 ms | 50 ms | 100 ms | 200 ms |
| --- | --- | --- | --- | --- | --- |
| Peak force (g) | 2.85 | 2.73 | 2.35 | 1.96 | 1.82 (no summation) |

**Tetanus (Activity 4).** A train at `rate` stimuli per second settles at

```text
A            = rate / 1000 × ∫ w dt          (twitch area, in ms)
steady force = R · F_cap · (1 − e^(−A / 2))
```

| Stimuli/s (8.5 V) | 20 | 50 | 80 | 100 | 120 | 130 | 140 | 150 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Peak force over 1 s (g) | 2.48 | 3.63 | 4.18 | 4.37 | 4.48 | 4.52 | 4.54 | 4.56 |

At low rates the trace ripples (unfused tetanus: its peak sits above the
steady 2.03 g at 20/s). From about 100–130/s it is smooth and close to the
4.63 g ceiling (fused tetanus).

**Length–tension (Activity 6).** Active force scales with filament overlap,
lost faster on stretching than on shortening; passive (elastic) force appears
only when the muscle is stretched past 75 mm:

```text
d       = (length − 75) / 28       when stretched
d       = (length − 75) / 32.4     when shortened
L       = exp(−d²)
passive = 0.000705 · (length − 75)^2.4   (0 at 75 mm and shorter)
total   = active + passive
```

| Length (mm) | 50 | 60 | 70 | 75 | 80 | 90 | 100 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Active (g) | 1.00 | 1.47 | 1.78 | 1.82 | 1.76 | 1.37 | 0.82 |
| Passive (g) | 0 | 0 | 0 | 0 | 0.03 | 0.47 | 1.60 |
| Total (g) | 1.00 | 1.47 | 1.78 | 1.82 | 1.80 | 1.84 | 2.42 |

**Fatigue (Activity 5).** This runs over seconds, so it works on the tetanic
plateau. A reserve `φ` (1 = fresh) drains while the muscle is stimulated and
refills at rest:

```text
stimulating:  φ ← φ · e^(−dt / 6 s)
resting:      φ ← 1 − (1 − φ) · e^(−dt / 15 s)
force         → plateau · φ   (time constant 0.08 s while stimulating)
force         → 0             (time constant 0.1 s at rest)
```

At 8.5 V and 120/s the force peaks at 4.23 g and falls to 0.86 g after 10 s
(`φ` = 0.19). Restarting after 5 s of rest gives a peak of 1.77 g; after 20 s,
3.33 g. The recorded rest period is the start of the last bout minus the end
of the bout before it.

**Load–velocity (Activity 7, isotonic contractions).** The muscle develops
tension without moving until its twitch force reaches the load. Then it
shortens at the force–velocity (Hill) speed, and the load stretches it back at
the same speed once tension falls below the load:

```text
P₀ = R · 1.82 g                          (isometric twitch peak)
v  = 100 mm/s · 0.3 · (P₀ − load) / (load + 0.3 · P₀)
```

| Load at 8.5 V | 0.5 g | 1.0 g | 1.5 g | 2.0 g |
| --- | --- | --- | --- | --- |
| Time to lift (ms) | 8.0 | 10.5 | 13.5 | never |
| Velocity (mm/s) | 37.9 | 15.9 | 4.7 | 0 |
| Distance (mm) | 3.12 | 0.81 | 0.12 | 0 |

The 2.0 g weight is heavier than the 1.82 g twitch, so it is never lifted.

**What Record Data saves.** One row per run, kept per activity on the device.
"Active force" is the run's peak active force, "Peak force" its peak trace
value, and "Total" is active plus passive. Runs are sampled every 0.25 ms
(twitch, voltage and length), 1 ms (frequency), 0.5 ms (tetanus and load) or
0.05 s (fatigue). They play slowed down 8× (2× for tetanus, 4× for frequency),
except fatigue, which plays 3× faster than real time. Up to eight tracings
stay on screen, each keeping its colour until it is cleared.

### Flashcards and image occlusion (SM-2)

Each grade button is an SM-2 quality: Blackout 0, Hard 2, Okay 3, Good 4,
Easy 5 (keys 1–5). A new card starts with ease 2.5 (`src/lib/sm2.ts`):

```text
quality < 3:  interval = 1 day, reps = 0, lapses + 1   (ease unchanged)
quality ≥ 3:  reps + 1
              interval = 1 day, then 6 days, then round(interval × ease)
              ease = max(1.3, ease + 0.1 − (5 − q) · (0.08 + 0.02 · (5 − q)))
```

So Easy adds 0.10 to the ease, Good leaves it, and Okay takes 0.14 off. A card
is due once its due date has passed. Graded the same way every time:

| Grade | 1st | 2nd | 3rd | 4th | 5th |
| --- | --- | --- | --- | --- | --- |
| Easy | 1 day | 6 days | 16 days | 45 days | 131 days |
| Good | 1 day | 6 days | 15 days | 38 days | 95 days |
| Okay | 1 day | 6 days | 13 days | 27 days | 52 days |

- **Mastered** means an interval of 21 days or more (the fourth Good). A card's
  **strength** is `min(1, interval / 21)`.
- **Hardest cards** are ranked by lapses, then by lower ease: the top 5 per deck
  and the top 8 overall.
- Each image-occlusion label is a card with its own schedule. Zoom shows a window
  around the label, `0.6 ×` the figure's shorter side wide (at least 2.2× the
  label's width) and `0.45 ×` tall (at least 4× its height), kept inside the
  figure.

### Quiz scores, sections and exam length

- **Score:** correct answers out of the questions in the attempt. An unanswered
  question counts as missed.
- **Retry queue:** a missed question joins it and leaves only when a later attempt
  answers it correctly.
- **Shuffle:** question order and option order are new on every attempt, each
  order equally likely; the answer index follows its option.
- **Sections:** a bank over 50 questions is split into `ceil(N / 25)` sections
  whose sizes differ by at most one, the first ones taking the extra. For
  example, 51 becomes 17 + 17 + 17, 134 becomes 23 + 23 + 22 + 22 + 22 + 22,
  and 170 becomes 25 + 25 + 24 × 5.
- **Exam:** `min(100, questions available)` questions at 60 seconds each, so the
  64-question Costraver package runs 64 minutes. The score shows as
  `score / total × 100`.

### Readiness and the exam plan

A **subject's readiness** (0–100) is a weighted average of the parts it has,
re-weighted over those parts. A subject with no image occlusion, for
example, is scored on the other three (`src/lib/readiness.ts`):

| Part | Score | Weight |
| --- | --- | --- |
| Flashcards | average strength × 100 | 0.35 |
| Image-occlusion labels | average strength × 100 | 0.15 |
| Quiz | accuracy × √coverage × 100 | 0.35 |
| Reading | chapters finished / chapters × 100 | 0.15 |

Accuracy is correct over answered across the last 3 attempts. Coverage is
questions answered across all attempts over the bank size, capped at 1. The
square root means a perfect score on one section of a big bank doesn't count
as readiness for all of it. For example, card strength 0.60, quiz accuracy
80% with half the bank covered, and 3 of 5 chapters read give
`(0.35 × 60 + 0.35 × 56.6 + 0.15 × 60) / 0.85 = 58.6`.

A **block's readiness** is the mean of its subjects. Once there are mock exams,
it becomes `0.7 × subjects + 0.3 × mocks`, where `mocks` is the mean of the
last two mock scores. The weakest subject is the one with the lowest
readiness.

- **Projected exam score:** a least-squares line through the mock scores by date,
  read at the exam date and clipped to 0–100. It needs two mocks on different
  days.
- **Phases** count whole local days to the exam:

  | Days left | 15+ | 4–14 | 2–3 | 1 | 0 | below 0 |
  | --- | --- | --- | --- | --- | --- | --- |
  | Phase | Learn | Strengthen | Mock exams | Final review | Exam day | Over |

- **Class average:** the mean readiness of the student's cohort (or everyone,
  without one), rounded, shown only once 3 or more students have one. A
  student's number is sent only when it moves by a whole point.
- **Defaults:** 60 minutes a day, a 70% target, a 19:00 study time for the
  calendar file.

### Today's plan

`src/lib/todayPlan.ts` sizes a checklist to the student's minutes:

| Work | Minutes each |
| --- | --- |
| Flashcard review | 0.4 (24 s) |
| Image-occlusion label | 0.35 (21 s) |
| Quiz question | 0.75 (45 s) |
| Ebook chapter | 20 |
| Summary | 10 |
| Mock exam | 100 |

- **Candidates, first to last:**
  1. Due cards and labels.
  2. In the mock phase, a timed mock (the next past paper not yet sat).
  3. Retries of missed questions.
  4. From the strengthen phase on, the weakest flashcard topic and up to 15
     most-missed questions of each of the two weakest subjects.
  5. Until the mock phase, new cards and labels, then one unread chapter (not
     while strengthening) and a 25-question quiz sitting.

  The final review day has only due reviews and the weakest subject's summary;
  exam day has up to two summaries to skim.
- **New material a day** is spread so everything is seen before the next phase:
  `min(cap, unseen, ceil(unseen / days until then))`. "Then" is the strengthen
  phase while learning and the mock phase while strengthening. The cap is 30
  cards or 20 labels; with no exam date it is 15 cards and 10 labels a day.
  Because it's worked out from what's left, a missed day spreads over the days
  that remain.
- **Fitting:** items are added in order until the minutes run out. Due reviews
  (at least 5 of them) and the mock exam always get a place, and reviews that
  don't fit are shown as overflow.
  Other items are trimmed to fit if at least 5 remain (10 for a quiz sitting);
  chapters, summaries and mock exams are whole or left out.
- The plan is drawn up once a day per block and budget, and each item ticks
  itself off from the study log as the work is done.

### Study log, streaks, weak spots and milestones

- **Streaks:** a study day is recorded by its UTC date. The current streak counts
  back from today, or from yesterday if today has no study yet; the longest is
  the longest run of consecutive days.
- **Heatmap:** each local day's amount is
  `cards + labels + questions + 10 × chapters + 30 × exams`. Shading is level 1
  below 20, level 2 below 60 and level 3 from 60. A study day without a logged
  amount shows at level 1. The grid covers 16 weeks.
- **This week against last:** the last 7 days, today included, against the 7
  before.
- **Best study time:** the two-hour window with the most study actions, shown
  once 40 actions are logged.
- **Weak spots:** a card or label is "struggling" when it has lapsed and its
  interval is under 21 days. Flashcard topics (tags) are ranked by struggling
  cards, then lapses. Questions are ranked by how often they were missed
  across all attempts. Each subject's drill takes its 15 most-missed questions.
- **Milestones:** first study day; 7- and 30-day streaks; 100 and 1,000 reviews;
  100 and 500 cards mastered; 10 quizzes; a perfect quiz of 10+ questions; a
  first mock; a mock of 70%+; a finished ebook; a mastered deck. The "next" one
  is the unearned milestone furthest along (`have / need`).
- **Backup reminder:** shown once there is some study and the last export is 14
  or more days old (or there has never been one).

### Leaderboard

Points are worked out on the server from synced progress
(`server/leaderboard.ts`), never from a score the browser reports:

| Earned for | Points |
| --- | --- |
| Correct answer (quiz or exam attempt) | 1 |
| Flashcard or label learned (reviewed successfully at least once) | 2 |
| Ebook chapter finished | 10 |
| Study day | 5 |

- **This week** sums the points gained over the last 7 UTC days, today
  included. A gain is never negative, so a reset card subtracts nothing. Daily
  gains are kept for 14 days.
- **All time** is the total. **Streak** is the latest run of consecutive study
  days, if it ended today or yesterday (UTC).
- Progress synced before an account's leaderboard record existed counts towards
  all time but not this week, so guest history doesn't land on one day.
- Equal scores share a rank (1, 2, 2, 4), and only scores above zero are listed.
- Values that can't be real don't count: at most 5,000 cards and 1,000
  attempts are read per key, and an attempt of more than 500 questions or a
  study day before 2020 or after tomorrow is ignored.

### Knowledge map

Built once at deploy time by `src/lib/knowledgeGraph/build.ts`.

- **Concepts** are bold terms in the ebooks and summaries: 1–5 words and at most
  48 characters, with no numbers or leftover punctuation. A single word needs 5+
  letters and must not be an everyday or positional word. Words are matched
  lower case and singular. A concept is kept with 3 or more mentions, and the
  700 most-mentioned are kept.
- **Links:** concepts found together in a section paragraph score 1 for that
  pair; in a flashcard or quiz question, 2. Labels only add references. A pair
  needs a total of 2 or more, and a link is kept when it's among the 10
  strongest of either concept.
- **Dot size:** `min(16, 3 + 1.15 × √mentions)`.
- **Layout:** each subject gets a point on a circle of radius 420, and a shared
  concept starts between its subjects. A d3-force simulation then runs 400
  ticks: link distance 46 with strength `min(0.7, weight / 10)`, repulsion −42
  out to 380, no overlap (radius + 3) and a 0.045 pull towards the subject.
- **Mastery** (colour by my mastery) is the average over the concept's studied
  cards and labels of `min(1, interval / 21)`, and over its quiz questions: 1,
  or 0 if missed in the last 3 attempts. Questions only count once that
  subject's quiz has been taken. A concept with nothing studied stays grey.
  Below 0.5 it's ringed as weak, and its colour is mixed from the surface
  towards the accent at `0.3 + 0.7 × mastery`.

### "Explain this" and search

- **Matching passages** are the sections of the subject's summary and ebook. The
  question's words of 4+ letters, without common question words (up to 20),
  are each weighted by rarity: `idf = ln(1 + passages / passages containing
  it)`. A passage scores the sum for the words it contains (×1.5 in its
  title). The top 3 are shown, cut to 1,500 characters.
- **Search** (Fuse.js) weighs titles 2, details 1 and keywords 0.5, with a match
  threshold of 0.35 (0.4 in the command palette) anywhere in the text, from 2
  characters.

### AI allowance

- 30 AI answers per student per day by default (`AI_DAILY_LIMIT`), explanations
  and Alfond's replies together. The day is the UTC day, so it resets at 07:00
  WIB, and an answer that fails isn't counted.
- A model gets 60 s to start answering, 30 s of silence and 150 s in all before
  the next model in `AI_MODEL` takes over. Answers are capped at 700 tokens for
  explanations and 900 for chat.
- A chat request carries the last 12 messages (up to 3,000 characters each) and
  up to 6,000 characters of the page on screen. Alfond keeps the last 40
  messages on the device.

### Sync and the Class Drive

- **Sync** runs 4 s after a change, every 5 minutes, and when the tab regains
  focus or the network returns. A request carries up to 1,000 changes (2 MB),
  and each download re-sends the last 5 s to cover clock overlap.
- **Merging two copies of a key:**
  - Flashcard and label states keep, per card, the copy reviewed more often
    (then the later due date).
  - Quiz and exam attempts are joined without duplicates.
  - Study days and finished chapters are joined as sets.
  - Daily study counts keep the larger number.
  - A reading position keeps the later one.
  - Anything else keeps the most recently changed copy.
- **Class Drive:**
  - The server reuses a listing for 5 minutes; a Refresh reaches Drive once it's
    30 s old.
  - A stale listing is served if Drive takes over 3 s, and a failed read isn't
    retried for 30 s.
  - A read lists up to 25 folders per request, 8 requests at a time, up to 600
    folders and 10 levels deep.
  - The browser checks again after 5 minutes away.
  - A file is **new** for 7 days after it was added or changed (whichever is
    later) until the student opens it.

### Small things

- **Subject colours:** the subject id is hashed (`hash × 31 + char`), spread over
  the colour wheel with the golden ratio, and moved on by 40° until it is out
  of the red (345–25°) and green (135–185°) bands kept for wrong and right.
- **Tip of the day:** the day of the year, modulo the number of tips: the same
  tip for everyone on a given date.

## Quick start

```bash
git clone https://github.com/neccrr/medicine.git
cd medicine
npm install
npm run dev       # http://localhost:5173
```

That runs the guest-only app; nothing else is needed. To try accounts
locally, run `npm run dev:api` instead: it serves the real API from the Vite dev
server with in-memory storage (or your database, if `MONGODB_URI` is set).

## Adding content

Everything under `/content` is discovered at build time with `import.meta.glob`
(see `src/lib/content.ts`). Adding a file is enough; you don't need to change
any code. Nothing is fetched at runtime.

```
content/
  flashcards/block/{blockId}/{subject}/
    deck.json        → Flashcard[] { id, front, back, tags, image? }
  occlusion/block/{blockId}/{subject}/
    notes.json       → OcclusionNote[] { id, image, width, height, title,
                       region, chapter, masks: [{ id, x, y, w, h, label }] }
  quizzes/block/{blockId}/{subject}/
    bank.json        → QuizQuestion[] { id, question, options, answer,
                       explanation, image? }
    *.html           → self-contained interactive quiz, embedded in an iframe
  exams/block/{blockId}/{packageId}/
    bank.json        → QuizQuestion[], one exam package
    meta.json        → { name }, the package's display name
  ebooks/block/{blockId}/{subject}/
    meta.json        → { title, description, chapters: [{ id, title }],
                       resources?: [{ title, url }] }
    chapter-NN.md    → Markdown chapter (inline <svg> diagrams allowed)
    *.pdf            → PDF shown alongside the chapters
  summaries/block/{blockId}/
    {subject}.md     → Markdown summary
  modules/block/{blockId}/{subject}/
    lecture/*.pdf              → lecturer slides
    practicum/reports/*.pdf    → practicum reports
    practicum/assistance/*.pdf → practicum assistance (asistensi) decks
  tips/
    tips.json        → string[], the tip of the day
```

### Blocks and subjects

Subjects and their blocks are both derived from folder paths: a file under
`content/{type}/block/1.2/physiology/` belongs to physiology in Block 1.2. The
same subject can therefore appear in more than one block (physiology is in
both 1.1 and 1.2), each with its own card. `src/lib/blocks.ts` holds only
each block's display name:

```ts
{ id: "1.2", label: "Block 1.2: Integument and Musculoskeletal System" }
```

`upcomingSubjects` in the same file adds "coming soon" cards for a subject
that's announced but has no content yet. A new block is a new entry in
`studyBlocks` plus its content folders.

Every content map and every progress entry in localStorage is keyed by
`{blockId}/{subjectId}` (`subjectKey` in `src/lib/content.ts`), so 1.1 and 1.2
physiology keep separate decks, quizzes and progress. Progress saved by older
versions under the bare subject id is renamed on startup (and after importing
an old backup) by `src/lib/progressMigration.ts`. Flashcard and quiz-question
ids must be unique across all decks; `src/lib/contentIntegrity.test.ts` checks
this.

### Quizzes and exams

- `image` is an optional HTML string rendered above the question. Use an `<img>`
  pointing into `public/`, or an inline `<svg>` that uses the theme's CSS
  variables (e.g. `var(--accent)`) so it follows light and dark mode. An `<img>`
  can be tapped to open it full screen. Wrap labelled diagrams in
  `<div class="quiz-photo-diagram quiz-diagram-wide" style="aspect-ratio: W / H;">`
  so they use the full card width on a white background.
- A bank with more than 50 questions is split into sections automatically.
- A block with folders under `content/exams/block/{blockId}/` offers those
  packages on its Exam page. A block with no packages gets a pooled exam built
  from its subjects' quiz banks.

### Modules

A PDF placed directly in a subject's module folder (with no subfolder) is shown
in a plain list. Once a subject uses any section subfolder, the viewer shows
the full **Lecture / Practicum → Reports, Assistance** layout. Other subfolder
names also work and are listed after the standard sections.

Module and ebook PDFs are served as separate static files, never inlined into
the JavaScript bundle. They aren't downloaded upfront for offline use; each is
cached the first time it's opened.

> **Before adding PDFs from a course,** check them for personal data. Lab and
> class decks often include assistants' profiles, phone numbers, birth dates,
> or group invite links and QR codes. Remove those pages first: this repo is
> public, and the files are served as-is.

## Pages

| Route | What's there |
|---|---|
| `/` | Home: streak, stat tiles, "continue" list, tip of the day, per-block subject cards |
| `/subjects` → `/subjects/:blockId/:subjectId` | Every subject → its page: cover, what's due next, every section, chapters and labs |
| `/flashcards` → `/flashcards/:blockId/:subjectId` | Subject list with due counts → SM-2 review session |
| `/occlusion` → `/occlusion/:blockId/:subjectId` | Subjects with figures → image occlusion (review or browse, figure gallery) |
| `/quizzes` → `/quizzes/:blockId/:subjectId` | Subject list with last score and due counts → quiz (with section picker for large banks) |
| `/exam` → `/exam/:blockId[/:packageId]` | Block list → package picker → timed exam |
| `/modules` → `/modules/:blockId/:subjectId` | Subjects with PDFs → sectioned PDF viewer |
| `/ebooks` → `/ebooks/:blockId/:subjectId/:chapterId` | Book list with resume position → chapter reader |
| `/summaries` → `/summaries/:blockId/:subjectId` | Summary list → rendered summary |
| `/lab` → `/lab/:exerciseId/:activity` | Virtual Lab activities → simulator bench, data table, plot and check questions |
| `/search` | Fuzzy search with type and subject filters |
| `/progress` | Readiness, subject meters, trends, heatmap, weak spots, milestones, export/import |
| `/map` | Knowledge map of every concept across all blocks |
| `/drive` | Class Drive: the class's Google Drive folder, live (signed-in only) |
| `/alfond` | Alfond, the study assistant's own page |
| `/plan`, `/plan/:block` | Exam plan: today's plan, phases, readiness, mock trend, weak spots, class average |
| `/leaderboard` | Weekly, all-time and streak rankings, filtered to your cohort; join or leave, and pick a display name (signed-in only) |
| `/account` | Sign in or create an account; profile, sync status, current block, sign out, data download, account deletion |

Every page is code-split and loaded on demand.

## Keyboard shortcuts

| Where | Keys |
|---|---|
| Anywhere | **⌘K / Ctrl+K**: command palette |
| Anywhere (desktop) | **⌘\\ / Ctrl+\\**: collapse or expand the sidebar |
| Flashcards | **Space / Enter**: flip · **1–5**: grade (Blackout → Easy) |
| Image occlusion | **Space**: reveal · **1–5**: grade · **← →**: previous/next label · **Shift+← →** or **[ ]**: previous/next figure · **G**: gallery · **A**: show all labels · **H**: hide all / one · **Z**: zoom · **U** or **Ctrl+Z**: undo |
| Quiz | **A–E** or **1–5**: answer · **Enter / Space**: continue · **← →**: previous/next question |
| Exam | **A–E** or **1–5**: answer · **← →**: previous/next question |
| Class Drive | **/**: find a file · **← →**: previous/next file · **Esc**: close the viewer or clear the search |

## Offline and updates

- The service worker (vite-plugin-pwa / Workbox) precaches the app shell,
  styles, fonts and images, so the app loads with no connection after the
  first visit.
- PDFs are cached the first time you open them, which keeps the first visit
  fast even though the modules add up to about 300 MB.
- When a new version is deployed, the app checks for it on focus and every
  30 minutes, then shows a **"A new version is ready"** prompt. It never
  reloads on its own, so a quiz or exam in progress isn't lost.

## Project layout

```
src/
  pages/        one component per route (lazy-loaded)
  components/   sidebar, command palette, heatmap, badges, nudges, error boundary…
  hooks/        useSpacedRepetition, useQuizProgress, useExamHistory, useTheme,
                useReadingPrefs, useServiceWorkerUpdate, useLocalStorage…
  lib/          pure logic (each piece has a *.test.ts beside it)
  styles/       theme.css (design tokens) plus one stylesheet per area,
                imported by index.css
  types/        content.ts: Flashcard, QuizQuestion, ExamAttempt, EbookMeta…
  context/      AccountContext: session, sync scheduling, sign-in actions
api/
  index.ts      the Vercel Function; vercel.json rewrites /api/* here
server/         the API behind it:
  app.ts          routes: auth (Better Auth), config, sync, export, leaderboard
  schema.ts       every MongoDB collection and its indexes, created once per
                  cold start
  progressStore.ts  synced progress, one document per user per key
                    (MongoDB and in-memory)
  leaderboard.ts  scoring and ranking, one document per user (MongoDB and in-memory)
  ai.ts           "Explain this" and Alfond through the AI gateway, daily allowance
  drive.ts        the Class Drive: walks the Drive folder, caches the listing
  mongo.ts        the shared client; devApi.ts serves the API from the Vite
                  dev server
```

### Storage

Progress lives in the browser's `localStorage` as `medicine:{type}` or
`medicine:{type}:{id}` keys. `src/lib/storageSchema.ts` declares every type in
one table: what its id is, whether it syncs and which merge rule applies,
whether it survives "sign out and clear". The storage helpers, the sync engine,
the legacy-key migration and the server's scoring all read that table, so a new
kind of progress is added in one place.

With an account, each synced key is one MongoDB document (`progress`), indexed
by user and key for merges and by user and revision for "what changed since my
last sync". The leaderboard keeps one small document per student with a score
part per scoring key. A sync rescores only the keys it wrote, as separate field
updates, so it never re-reads a student's whole history and two syncs at once
can't overwrite each other. Expired sessions and verification tokens are
deleted by MongoDB TTL indexes.

Key modules in `src/lib`:

| File | Responsibility |
|---|---|
| `content.ts` | Discovers every content file at build time and exposes decks, banks, exam packages, ebooks, summaries and modules |
| `blocks.ts` | Block display names, "coming soon" subjects, grouping lists by block |
| `sm2.ts` | SM-2 scheduling: a 0–5 grade becomes the next interval, ease factor and due date |
| `quizScoring.ts` | Scores an attempt and keeps the "due for review" queue of missed questions |
| `quizShuffle.ts` | Per-attempt shuffle of question order and option order (answer index remapped) |
| `quizSections.ts` | Splits large banks into even sections |
| `examFormat.ts` | Exam length and time limit (100 questions max, 60 s each) |
| `moduleSections.ts` | Groups module PDFs into Lecture / Practicum sections |
| `searchIndex.ts` | Builds the Fuse.js index over all content |
| `textExtract.ts` | Strips Markdown, HTML and inline SVG down to searchable plain text |
| `activity.ts` | Study days and streaks, and the study log (what was studied each day, per subject) |
| `readiness.ts` | Readiness per subject and block, mock-score projection |
| `examPlan.ts` | Exam dates, days left and the plan's phases |
| `todayPlan.ts` | Today's plan, sized to the student's minutes |
| `weakSpots.ts` | Weakest flashcard topics, most-missed questions, slipping labels |
| `studyStats.ts` | Daily series, this week against last, best study time, heatmap amounts |
| `milestones.ts` | Milestones and the next one to earn |
| `hardestCards.ts` | Ranks cards by lapses, then ease factor |
| `muscleSim.ts` | The Virtual Lab's muscle model (recruitment, twitch, summation, length–tension, fatigue, load–velocity) |
| `labTraces.ts` | Oscilloscope tracing colours and reading a value off a trace |
| `occlusion.ts` | Image-occlusion cards, figure navigation and the zoom window |
| `explain.ts` | Finds the note passages that match a question, asks the AI to explain |
| `knowledgeGraph/` | Builds the knowledge map (concepts, links, layout) and each concept's mastery |
| `drive.ts` | The Class Drive listing: device cache, folder lookup, search, new files |
| `records.ts` | Safe reads and writes of objects keyed by untrusted ids |
| `backupReminder.ts` | When to show the export reminder |
| `tipOfDay.ts` | Deterministic daily tip (same for everyone, no server) |
| `subjectStyle.ts` | Stable per-subject hue from the subject id, avoiding the red and green used for wrong/right |
| `storageSchema.ts` | The registry of every `localStorage` key type: id, sync and merge rule, clearing (shared with the server) |
| `routeMeta.ts` | Title, description, breadcrumbs and indexability for every route (the app and the prerendered pages) |
| `storage.ts` | `localStorage` helpers, the key builders, and export/import of all `medicine:*` keys |
| `progressMigration.ts` | Renames progress saved under old subject-only keys to per-block keys |
| `syncMerge.ts` | How two copies of one key are merged, by the key's rule in the registry (shared with the server) |
| `sync.ts` | The sync round: upload changed keys, download the account's changes, apply them safely |
| `syncDirty.ts` | Records which synced keys changed on this device since the last sync |

## Design

The look is **frosted glass over a clinical monitor**: translucent,
blurred panels float over slowly drifting color blobs, on a faint graph-paper
grid. An EKG pulse trace is the logo and hero decoration.

- **Type:** Fraunces (headings), Archivo (UI), IBM Plex Mono for anything that
  reads as data (counts, stats, badges, shortcut hints), and Atkinson
  Hyperlegible as the accessible reading font
- **Color:** a phosphor-teal accent; a fixed color per content type
  (flashcards, quizzes, exams, modules, ebooks, summaries); a hue per subject
  derived from its id
- **Theming:** all tokens live in `src/styles/theme.css`, with a dark default
  and a warm-paper light theme. Change the variables to retheme the app.
- **Accessibility:** skip-to-content link, visible focus outlines, ARIA roles
  on quiz options, toggles and timers, and `prefers-reduced-motion` respected
  by every animation

## Data and privacy

- As a guest, progress stays in this browser on this device. Use **Progress →
  Export** to back up, and **Import** to restore on another device.
- With an account, the same `medicine:*` progress keys (not theme, sidebar
  state or half-finished quizzes) are stored in MongoDB under your user id,
  plus your name, email, optional cohort and a hashed password. Nothing is
  shared with other users unless you join the leaderboard, which shows your
  chosen display name, cohort and scores to other signed-in students (never
  your email or answers). Leave it any time. **Account → Download my data**
  exports it all, and
  **Delete account** removes the account and its stored progress.
- The public [Privacy Policy](https://medicine.necr.help/privacy) and
  [Terms of Service](https://medicine.necr.help/terms) are static pages in
  `public/legal/`, served at `/privacy` and `/terms` (the old `.html` addresses
  redirect there); update them if what the app stores changes.
- Content is the same for everyone.
- Clearing site data erases progress. If saved progress from an older version
  ever breaks a page, the recovery screen offers **Reload** or **Clear local
  data and reload**.

## Development

```bash
npm run dev          # dev server on http://localhost:5173 (guest-only)
npm run dev:api      # same, plus the account API with in-memory storage
npm run build        # type-check (tsc -b), build to dist/ and generate the
                     # service worker
npm run preview      # serve the production build locally
npm run lint         # oxlint
npm run lint:css     # Stylelint
npm run test         # vitest, single run
npm run test:watch   # vitest, watch mode
```

Tests cover the pure logic in `src/lib`: SM-2, quiz scoring, shuffling and
sections, exam format, readiness and today's plan, the muscle model and trace
reading, image occlusion, the knowledge map, note matching, search indexing,
text extraction, streaks, backup timing, tip of the day, the key registry and
sync merging, the Class Drive helpers, and content integrity. They also cover
the API in `server/`: sign-up, sync, per-user isolation, validation, export
and deletion, leaderboard scoring and ranking, the AI routes and allowance, and
the Drive crawl and cache. A two-device sync run drives the browser engine
against the real handler, and the prerendered pages are checked for past-paper
questions. There are no DOM or component tests.

The MongoDB stores and indexes have an integration test that runs against a
real server when `MONGODB_TEST_URI` is set, using a throwaway database:

```bash
MONGODB_TEST_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0" npx vitest run server/mongo.integration.test.ts
```

Better Auth uses transactions, so a local MongoDB for `npm run dev:api` with
`MONGODB_URI` must run as a replica set (a single node is fine); Atlas always is.

## Deploying

`vercel.json` sets the build command, the `dist` output directory, the
function region (`sin1`, Singapore, next to the Atlas cluster; change both
together if you move either), a rewrite
of `/api/*` to the API function, and an SPA rewrite so deep links work on
refresh. It also marks `sw.js`, the manifest and `index.html` as `no-cache`, so
a new deploy reaches installed copies promptly.

Without environment variables the app deploys as guest-only. To turn on
accounts (see `.env.example`):

1. In MongoDB Atlas, create a database user with **readWrite** on the
   `medicine` database only, and allow network access from Vercel: either
   `0.0.0.0/0` (the database user's password is then the protection) or the
   Vercel ↔ Atlas integration.
2. In Vercel → Settings → Environment Variables, set `MONGODB_URI`,
   `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and `BETTER_AUTH_URL`
   (`https://medicine.necr.help`).
3. Redeploy. `/api/config` answering `{"accounts":true,...}` means it worked.

### AI: explanations and Alfond (optional, free tier)

"Ask AI to explain" and Alfond's chat call any OpenAI-compatible gateway from
the server; the
site is set up for [NaraRouter](https://bynara.id/) and its free daily
allowance. In Vercel → Environment Variables (never in the repo):

- `AI_BASE_URL`: the gateway's OpenAI-compatible address from its API docs,
  up to and including `/v1` (`/chat/completions` is added)
- `AI_API_KEY`: your NaraRouter API key
- `AI_MODEL`: a model id from its model list (a free one). List backups after it,
  comma-separated (`fast-model,backup-model`); a model that fails or doesn't start
  answering within a minute hands over to the next
- `AI_DAILY_LIMIT` (optional): AI answers per student per day (explanations and
  Alfond's replies together), default 30

Redeploy; `/api/config` then answers `"ai":true`: the AI button and Alfond appear.
Without these variables the AI button and Alfond's floating button stay hidden,
Alfond's page says it isn't switched on, and "Explain this" shows only the
matching passages from the notes.

### Class Drive (optional)

The Class Drive page lists a shared Google Drive folder for signed-in
students. The server walks the folder with the Drive API, keeps the listing
for five minutes (a student's Refresh asks again after 30 seconds) and saves
the latest copy in MongoDB for cold starts. Only names and file ids reach the
browser, never folder ids, and nothing from the Drive goes into the static
pages, the search index or the knowledge map.

1. In [Google Cloud](https://console.cloud.google.com/), enable the **Google
   Drive API** and create an **API key** under APIs & Services → Credentials.
   Restrict it to the Drive API.
2. Share the folder as "Anyone with the link" (**Viewer** is enough; see
   below).
3. In Vercel → Environment Variables, set `GOOGLE_DRIVE_API_KEY` and
   `GOOGLE_DRIVE_FOLDER_ID` (the folder's id, or its whole share link).
   `GOOGLE_DRIVE_REFRESH_MINUTES` (optional) changes the five minutes.
4. Redeploy. `/api/config` then answers `"drive":true`.

Students open files in Google's viewer, so they get the folder's own sharing
rights: if the folder is shared as "Anyone with the link can **edit**", any
student can rename, change or remove the class's files from there. Share it as
**Viewer** and keep editing for the people who upload.

### Search engines

`npm run build` ends with `scripts/prerender.mjs`, which writes a static page for
every public route into `dist/`: its own title, description, canonical URL and
breadcrumbs, with the content itself (card fronts, quiz questions, full ebook
chapters and summaries) as plain HTML. Past exam papers are listed by name only.
`vercel.json` serves those pages directly, so search engines don't have to run
the app to read them, and people get the app as usual (React replaces the static
content on start). The same step writes `sitemap.xml`, `robots.txt` (which keeps
the API, lecture PDFs, slide figures and past-paper images out of search) and
`404.html`. Titles and descriptions come from `src/lib/routeMeta.ts`, which the
app also uses to update the page title while you navigate. Personal pages
(progress, account, leaderboard, search, exam plan, Alfond, Class Drive) are
`noindex`, and preview deployments on `*.vercel.app` send
`X-Robots-Tag: noindex`.

To get indexed:

1. In [Google Search Console](https://search.google.com/search-console), add a
   **Domain** property for `necr.help` and verify it with the DNS TXT record it
   shows you (at your domain registrar). Alternatively add a URL-prefix property
   for `https://medicine.necr.help`, choose the **HTML tag** method, and put the
   token (the `content` value only) in Vercel as `GOOGLE_SITE_VERIFICATION`, then
   redeploy.
2. **Sitemaps**: submit `https://medicine.necr.help/sitemap.xml`.
3. **URL inspection**: inspect the home page and a chapter page, and **Request
   indexing**.

### Google sign-in

1. In the [Google Cloud console](https://console.cloud.google.com/), create a
   project, then open **Google Auth Platform** and **Get started**: app name
   "Medicine", your support email, audience **External**.
2. **Branding**: home page `https://medicine.necr.help`, privacy policy
   `https://medicine.necr.help/privacy`, terms of service
   `https://medicine.necr.help/terms`, authorized domain `necr.help`. Skip
   the logo (uploading one starts a Google review).
3. **Audience**: **Publish app**. While it's in "Testing", only listed test
   users can sign in. The app asks only for name, email and profile picture, so
   publishing needs no review.
4. **Clients → Create client → Web application**:
   - Authorized JavaScript origin: `https://medicine.necr.help`
   - Authorized redirect URI: `https://medicine.necr.help/api/auth/callback/google`
5. Copy the client ID and secret into Vercel as `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`, and redeploy. `/api/config` then answers
   `"google":true` and the button appears.

Google doesn't accept wildcard redirect URIs, so preview deployments on
`*.vercel.app` can't use Google sign-in unless you add their exact callback
URL. For local testing, add `http://localhost:5173` and
`http://localhost:5173/api/auth/callback/google` to the client and run
`npm run dev:api` with both variables set.

The link-preview tags in `index.html` (Open Graph, Twitter) point at
`https://medicine.necr.help`. A fork deployed elsewhere sets `SITE_URL` at build
time.

Collections and indexes (listed in `server/schema.ts`) are created
automatically. Any static host with an SPA
fallback works for guest-only mode, if it sends the same no-cache headers.

## Contributing

- **Content** (flashcards, questions, chapters, summaries, PDFs) never needs a
  code change. Follow [Adding content](#adding-content), and read the
  personal-data note there before adding course PDFs.
- **Code:** keep pure logic in `src/lib` with a matching `*.test.ts`, and run
  the full check before opening a PR:

  ```bash
  npm run lint && npm run test && npm run build
  ```
- Open an issue first for changes to the data model (`src/types/content.ts`)
  or the content folder layout.

## License

The code and the original study material written for this app (flashcards,
quiz questions, ebook chapters, summaries, diagrams) are [MIT](./LICENSE)
licensed.

The PDFs under `content/modules/` are lecture and practicum materials from
their respective lecturers and lab assistants. They remain their authors'
work, are included only as study references, and are not covered by the MIT
license. The same applies to the slide figures under `public/ebook-figures/`,
which are cropped from those decks (many reproduce figures from published
atlases and textbooks); each is captioned with its source deck and slide. The
anatomy quiz figures in `public/ebook-figures/anatomy-quiz/` come from the same
decks, some with labels covered by a "?" so the figure doesn't give the answer
away. To have a file removed, open an issue.
