import { subjectAccent, subjectInitial } from "../lib/subjectStyle";

export function SubjectBadge({ id, label }: { id: string; label: string }) {
  return (
    <span
      className="subject-badge"
      style={{ background: subjectAccent(id) }}
      aria-hidden="true"
    >
      {subjectInitial(label)}
    </span>
  );
}
