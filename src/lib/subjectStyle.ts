/**
 * Deterministic accent hue per subject id, so the same subject always gets the same color.
 * The hash is spread across the hue wheel with the golden-angle trick (multiply by the golden
 * ratio conjugate before wrapping) — plain `hash % 360` clusters short similar-length strings
 * like "biochem"/"histology"/"physiology" into the same narrow hue band.
 */
export function subjectHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const golden = 0.6180339887498949;
  return Math.floor(((Math.abs(hash) * golden) % 1) * 360);
}

export function subjectAccent(id: string): string {
  return `hsl(${subjectHue(id)}, 65%, 60%)`;
}
