const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BRISK_PACE_THRESHOLD = 25;

export type StudyPlanStatus = "no-date" | "past" | "ok" | "tight" | "done";

export interface StudyPlanInput {
  examDate: string | null;
  totalCards: number;
  masteredCards: number;
  dueCards: number;
  today?: Date;
}

export interface StudyPlan {
  status: StudyPlanStatus;
  daysRemaining: number | null;
  cardsPerDay: number;
  message: string;
}

function dateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Parses a "YYYY-MM-DD" date-input value as a local-midnight Date, avoiding
 * the UTC-midnight interpretation `new Date(str)` uses for bare date strings. */
function parseDateInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function generateStudyPlan(input: StudyPlanInput): StudyPlan {
  const { examDate, totalCards, masteredCards, dueCards } = input;
  const unmastered = Math.max(0, totalCards - masteredCards);

  if (!examDate) {
    return {
      status: "no-date",
      daysRemaining: null,
      cardsPerDay: 0,
      message: "Set an exam date to get a personalized daily review pace.",
    };
  }

  const today = dateOnly(input.today ?? new Date());
  const exam = parseDateInputValue(examDate);
  const daysRemaining = Math.round((exam.getTime() - today.getTime()) / MS_PER_DAY);

  if (daysRemaining < 0) {
    return {
      status: "past",
      daysRemaining,
      cardsPerDay: 0,
      message: "That exam date has passed — set a new one to keep planning.",
    };
  }

  if (unmastered === 0) {
    return {
      status: "done",
      daysRemaining,
      cardsPerDay: 0,
      message: "Every card in this deck is mastered — nice work. Keep up with due reviews to stay sharp.",
    };
  }

  const effectiveDays = Math.max(1, daysRemaining);
  const cardsPerDay = Math.ceil(unmastered / effectiveDays);
  const status: StudyPlanStatus = cardsPerDay > BRISK_PACE_THRESHOLD ? "tight" : "ok";

  const dayWord = daysRemaining === 1 ? "day" : "days";
  const cardWord = cardsPerDay === 1 ? "card" : "cards";
  let message =
    daysRemaining === 0
      ? `Exam is today — ${cardsPerDay} ${cardWord} left to review.`
      : `${cardsPerDay} ${cardWord} a day clears the deck in ${daysRemaining} ${dayWord}.`;

  if (status === "tight") {
    message += " That's a brisk pace — prioritize your hardest cards first.";
  }
  if (dueCards > 0) {
    message += ` ${dueCards} card${dueCards === 1 ? "" : "s"} ${dueCards === 1 ? "is" : "are"} due right now.`;
  }

  return { status, daysRemaining, cardsPerDay, message };
}
