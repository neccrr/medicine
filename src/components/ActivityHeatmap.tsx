const DAYS = 7;

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function levelFor(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}

/** GitHub-style calendar heatmap: sequential single-hue magnitude, one cell per day. */
export function ActivityHeatmap({ days, weeks = 16 }: { days: string[]; weeks?: number }) {
  const counts = new Map<string, number>();
  for (const d of days) counts.set(d, (counts.get(d) ?? 0) + 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Align the grid to end on today, columns = weeks, rows = weekday.
  const totalDays = weeks * DAYS;
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1) - today.getDay());

  const cells: { date: Date; key: string; level: 0 | 1 | 2 | 3 }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = toDateKey(date);
    cells.push({ date, key, level: levelFor(counts.get(key) ?? 0) });
  }

  const weekCols: typeof cells[] = [];
  for (let w = 0; w < weeks; w++) {
    weekCols.push(cells.slice(w * DAYS, w * DAYS + DAYS));
  }

  return (
    <div className="heatmap" role="img" aria-label={`Study activity over the last ${weeks} weeks`}>
      {weekCols.map((week, wi) => (
        <div className="heatmap-col" key={wi}>
          {week.map((cell) => (
            <div
              key={cell.key}
              className={`heatmap-cell level-${cell.level}`}
              title={`${cell.date.toDateString()}: ${counts.get(cell.key) ?? 0} study action${counts.get(cell.key) === 1 ? "" : "s"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
