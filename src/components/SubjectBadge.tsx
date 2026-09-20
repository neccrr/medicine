import type { ComponentType } from "react";
import { subjectAccent } from "../lib/subjectStyle";
import { AtomIcon, DropletPulseIcon, MicroscopeIcon, MoleculeIcon } from "./icons";

const SUBJECT_ICONS: Record<string, ComponentType> = {
  biochem: MoleculeIcon,
  histology: MicroscopeIcon,
  physiology: DropletPulseIcon,
};

export function SubjectBadge({ id, label }: { id: string; label: string }) {
  const Icon = SUBJECT_ICONS[id] ?? AtomIcon;
  return (
    <span className="subject-badge" style={{ background: subjectAccent(id) }} aria-hidden="true" title={label}>
      <Icon />
    </span>
  );
}
