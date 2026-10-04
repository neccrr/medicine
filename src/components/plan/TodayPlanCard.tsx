import { Link } from "react-router-dom";
import { useExamPlan } from "../../hooks/useExamPlan";
import { countdownText, PHASE_INFO, focusBlockId } from "../../lib/examPlan";
import { CalendarIcon } from "../icons";
import { TodayPlanList } from "./PlanParts";

/** Today's plan at the top of Home: the countdown, the phase and the first few items. */
export function TodayPlanCard() {
  const blockId = focusBlockId();
  return blockId ? <PlanCard blockId={blockId} /> : null;
}

function PlanCard({ blockId }: { blockId: string }) {
  const p = useExamPlan(blockId);
  return (
    <div className="dashboard-section today-plan-card">
      <div className="today-plan-head">
        <h2 className="section-heading">
          <CalendarIcon />
          Today's plan
        </h2>
        <span className="today-plan-countdown">
          Block {blockId} · {countdownText(p.daysLeft)} · {Math.round(p.readiness.readiness)}% ready
        </span>
      </div>
      <p className="today-plan-phase">
        <span className={`phase-chip phase-${p.phase}`}>{PHASE_INFO[p.phase].name}</span>
        {p.phase === "no-date" ? (
          <>
            {" "}
            <Link to={`/plan/${blockId}`}>Set your exam date</Link> for a plan that changes as it gets closer.
          </>
        ) : (
          ` ${PHASE_INFO[p.phase].focus}`
        )}
      </p>
      {p.plan ? <TodayPlanList plan={p.plan} progress={p.progress} limit={4} /> : <p className="plan-empty">Working it out…</p>}
      <Link to={`/plan/${blockId}`} className="today-plan-link">
        Open the exam plan
      </Link>
    </div>
  );
}
