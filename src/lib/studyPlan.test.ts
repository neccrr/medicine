import { describe, expect, it } from "vitest";
import { generateStudyPlan } from "./studyPlan";

const TODAY = new Date(2024, 0, 10); // Jan 10, 2024

describe("generateStudyPlan", () => {
  it("returns 'no-date' status when no exam date is set", () => {
    const plan = generateStudyPlan({
      examDate: null,
      totalCards: 20,
      masteredCards: 5,
      dueCards: 3,
      today: TODAY,
    });
    expect(plan.status).toBe("no-date");
    expect(plan.daysRemaining).toBeNull();
  });

  it("returns 'past' status when the exam date has already passed", () => {
    const plan = generateStudyPlan({
      examDate: "2024-01-01",
      totalCards: 20,
      masteredCards: 5,
      dueCards: 0,
      today: TODAY,
    });
    expect(plan.status).toBe("past");
    expect(plan.daysRemaining).toBeLessThan(0);
  });

  it("returns 'done' status when every card is mastered", () => {
    const plan = generateStudyPlan({
      examDate: "2024-02-01",
      totalCards: 20,
      masteredCards: 20,
      dueCards: 0,
      today: TODAY,
    });
    expect(plan.status).toBe("done");
    expect(plan.cardsPerDay).toBe(0);
  });

  it("computes a daily card pace that clears the unmastered deck by the exam date", () => {
    // Jan 10 -> Jan 20 = 10 days remaining, 20 unmastered cards -> 2/day
    const plan = generateStudyPlan({
      examDate: "2024-01-20",
      totalCards: 30,
      masteredCards: 10,
      dueCards: 0,
      today: TODAY,
    });
    expect(plan.status).toBe("ok");
    expect(plan.daysRemaining).toBe(10);
    expect(plan.cardsPerDay).toBe(2);
  });

  it("flags a brisk/'tight' pace when the daily card count is high", () => {
    const plan = generateStudyPlan({
      examDate: "2024-01-11",
      totalCards: 100,
      masteredCards: 0,
      dueCards: 0,
      today: TODAY,
    });
    expect(plan.status).toBe("tight");
    expect(plan.cardsPerDay).toBeGreaterThan(25);
  });

  it("treats an exam scheduled today as needing the full unmastered count in one day", () => {
    const plan = generateStudyPlan({
      examDate: "2024-01-10",
      totalCards: 10,
      masteredCards: 4,
      dueCards: 0,
      today: TODAY,
    });
    expect(plan.daysRemaining).toBe(0);
    expect(plan.cardsPerDay).toBe(6);
  });

  it("mentions cards currently due in the message", () => {
    const plan = generateStudyPlan({
      examDate: "2024-01-20",
      totalCards: 30,
      masteredCards: 10,
      dueCards: 4,
      today: TODAY,
    });
    expect(plan.message).toContain("4 cards are due right now");
  });
});
