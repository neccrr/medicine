import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { CommandPalette } from "./components/CommandPalette";
import { Home } from "./pages/Home";
import { FlashcardSubjects } from "./pages/FlashcardSubjects";
import { FlashcardStudy } from "./pages/FlashcardStudy";
import { QuizSubjects } from "./pages/QuizSubjects";
import { QuizPlay } from "./pages/QuizPlay";
import { Summaries } from "./pages/Summaries";
import { SummaryDetail } from "./pages/SummaryDetail";
import { EbookSubjects } from "./pages/EbookSubjects";
import { EbookReader } from "./pages/EbookReader";
import { Search } from "./pages/Search";
import { Progress } from "./pages/Progress";

export default function App() {
  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <CommandPalette />
      <main className="main" id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/flashcards" element={<FlashcardSubjects />} />
          <Route path="/flashcards/:subjectId" element={<FlashcardStudy />} />
          <Route path="/quizzes" element={<QuizSubjects />} />
          <Route path="/quizzes/:subjectId" element={<QuizPlay />} />
          <Route path="/summaries" element={<Summaries />} />
          <Route path="/summaries/:subjectId" element={<SummaryDetail />} />
          <Route path="/ebooks" element={<EbookSubjects />} />
          <Route path="/ebooks/:subjectId" element={<EbookReader />} />
          <Route path="/ebooks/:subjectId/:chapterId" element={<EbookReader />} />
          <Route path="/search" element={<Search />} />
          <Route path="/progress" element={<Progress />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
