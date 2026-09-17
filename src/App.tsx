import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { FlashcardSubjects } from "./pages/FlashcardSubjects";
import { FlashcardStudy } from "./pages/FlashcardStudy";
import { QuizSubjects } from "./pages/QuizSubjects";
import { QuizPlay } from "./pages/QuizPlay";
import { Summaries } from "./pages/Summaries";
import { SummaryDetail } from "./pages/SummaryDetail";
import { Search } from "./pages/Search";
import { Progress } from "./pages/Progress";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/flashcards" element={<FlashcardSubjects />} />
          <Route path="/flashcards/:subjectId" element={<FlashcardStudy />} />
          <Route path="/quizzes" element={<QuizSubjects />} />
          <Route path="/quizzes/:subjectId" element={<QuizPlay />} />
          <Route path="/summaries" element={<Summaries />} />
          <Route path="/summaries/:subjectId" element={<SummaryDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/progress" element={<Progress />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
