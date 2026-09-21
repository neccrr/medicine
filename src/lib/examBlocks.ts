/** USMLE-style pacing: 1.5 minutes per question. */
export const SECONDS_PER_QUESTION = 90;

const CANDIDATE_SIZES = [10, 20, 40, 80];
/** Skip a candidate size that's too close to the full bank to be worth offering separately. */
const MIN_GAP_FROM_FULL = 5;

export interface ExamBlockOption {
  count: number;
  questionLabel: string;
  timeLimitSec: number;
  durationLabel: string;
}

function formatDuration(sec: number): string {
  const totalMin = Math.round(sec / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** Block-size choices for a subject's exam, scaled to how many questions it has. */
export function buildBlockOptions(bankSize: number): ExamBlockOption[] {
  if (bankSize <= 0) return [];

  const sizes = CANDIDATE_SIZES.filter((n) => n < bankSize && bankSize - n >= MIN_GAP_FROM_FULL);
  sizes.push(bankSize);

  return sizes.map((count) => {
    const timeLimitSec = count * SECONDS_PER_QUESTION;
    return {
      count,
      questionLabel: count === bankSize ? `All ${count} questions` : `${count} questions`,
      timeLimitSec,
      durationLabel: formatDuration(timeLimitSec),
    };
  });
}
