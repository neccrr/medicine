/** Deterministic accent hue per subject id, so the same subject always gets the same color. */
export function subjectHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  return hash;
}

export function subjectAccent(id: string): string {
  return `hsl(${subjectHue(id)}, 65%, 60%)`;
}

export function subjectInitial(label: string): string {
  return label.charAt(0).toUpperCase();
}
