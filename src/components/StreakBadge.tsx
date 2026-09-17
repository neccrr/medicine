import { useState } from "react";
import { getActivityDays, getCurrentStreak } from "../lib/activity";

export function StreakBadge() {
  const [streak] = useState(() => getCurrentStreak(getActivityDays()));

  if (streak === 0) return null;

  return (
    <span className="streak-badge" title={`${streak}-day study streak`}>
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.3-2-.8-2.8.9.4 2.8 1.9 2.8 5.3A8 8 0 1 1 8.5 5.6C9.7 4.3 11.3 3.3 12 2Z"
        />
      </svg>
      {streak}
    </span>
  );
}
