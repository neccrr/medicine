import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import { PulseLine } from "./components/PulseLine";
import { useCardSpotlight } from "./hooks/useCardSpotlight";

// Each page ships as its own chunk, fetched only when its route is visited, so the initial
// load doesn't pay for e.g. the ebook reader or quiz engine before the user ever opens them.
const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const FlashcardSubjects = lazy(() =>
  import("./pages/FlashcardSubjects").then((m) => ({ default: m.FlashcardSubjects })),
);
const FlashcardStudy = lazy(() =>
  import("./pages/FlashcardStudy").then((m) => ({ default: m.FlashcardStudy })),
);
const QuizSubjects = lazy(() =>
  import("./pages/QuizSubjects").then((m) => ({ default: m.QuizSubjects })),
);
const QuizPlay = lazy(() => import("./pages/QuizPlay").then((m) => ({ default: m.QuizPlay })));
const ExamSubjects = lazy(() =>
  import("./pages/ExamSubjects").then((m) => ({ default: m.ExamSubjects })),
);
const ExamPlay = lazy(() => import("./pages/ExamPlay").then((m) => ({ default: m.ExamPlay })));
const Summaries = lazy(() => import("./pages/Summaries").then((m) => ({ default: m.Summaries })));
const SummaryDetail = lazy(() =>
  import("./pages/SummaryDetail").then((m) => ({ default: m.SummaryDetail })),
);
const EbookSubjects = lazy(() =>
  import("./pages/EbookSubjects").then((m) => ({ default: m.EbookSubjects })),
);
const EbookReader = lazy(() =>
  import("./pages/EbookReader").then((m) => ({ default: m.EbookReader })),
);
const Search = lazy(() => import("./pages/Search").then((m) => ({ default: m.Search })));
const Progress = lazy(() => import("./pages/Progress").then((m) => ({ default: m.Progress })));

function RouteFallback() {
  return (
    <div className="route-loading" role="status" aria-label="Loading page">
      <PulseLine />
    </div>
  );
}

export default function App() {
  useCardSpotlight();

  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="app-shell">
        <Sidebar />
        <div className="app-content">
          <CommandPalette />
          <main className="main" id="main-content">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/flashcards" element={<FlashcardSubjects />} />
                <Route path="/flashcards/:subjectId" element={<FlashcardStudy />} />
                <Route path="/quizzes" element={<QuizSubjects />} />
                <Route path="/quizzes/:subjectId" element={<QuizPlay />} />
                <Route path="/exam" element={<ExamSubjects />} />
                <Route path="/exam/:subjectId" element={<ExamPlay />} />
                <Route path="/summaries" element={<Summaries />} />
                <Route path="/summaries/:subjectId" element={<SummaryDetail />} />
                <Route path="/ebooks" element={<EbookSubjects />} />
                <Route path="/ebooks/:subjectId" element={<EbookReader />} />
                <Route path="/ebooks/:subjectId/:chapterId" element={<EbookReader />} />
                <Route path="/search" element={<Search />} />
                <Route path="/progress" element={<Progress />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
