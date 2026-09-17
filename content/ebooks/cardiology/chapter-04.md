# Chapter 4: Reading the ECG

A 12-lead ECG can feel overwhelming, but almost every question comes down
to recognizing one waveform and measuring three intervals. Get comfortable
with the normal complex below before moving on to the abnormal patterns
covered elsewhere in this book.

<figure class="diagram">
  <svg viewBox="0 0 640 235" role="img" aria-labelledby="ecg-title ecg-desc">
    <title id="ecg-title">Normal sinus PQRST waveform</title>
    <desc id="ecg-desc">A single PQRST complex on an ECG grid, with the P wave, QRS complex, and T wave labeled, and the PR interval, QRS duration, and QT interval marked below the baseline.</desc>
    <defs>
      <pattern id="ecgGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M20 0H0V20" fill="none" stroke="var(--grid-line)" stroke-width="1" />
      </pattern>
    </defs>
    <rect x="0" y="0" width="640" height="235" fill="url(#ecgGrid)" />
    <line x1="20" y1="120" x2="620" y2="120" stroke="var(--border)" stroke-width="1" />
    <path
      d="M20,120 L80,120 Q105,95 130,120 L160,120 L168,132 L182,35 L196,145 L210,120 L240,120 Q275,75 310,120 L620,120"
      fill="none"
      stroke="var(--accent)"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <text x="105" y="82" fill="var(--text-muted)" font-size="14" text-anchor="middle">P</text>
    <text x="182" y="25" fill="var(--text)" font-size="14" font-weight="700" text-anchor="middle">R</text>
    <text x="158" y="152" fill="var(--text-muted)" font-size="13" text-anchor="middle">Q</text>
    <text x="202" y="164" fill="var(--text-muted)" font-size="13" text-anchor="middle">S</text>
    <text x="275" y="58" fill="var(--text-muted)" font-size="14" text-anchor="middle">T</text>
    <path d="M80,155 L80,160 L160,160 L160,155" fill="none" stroke="var(--text-muted)" stroke-width="1" />
    <text x="120" y="173" fill="var(--text-muted)" font-size="11" text-anchor="middle">PR interval</text>
    <path d="M160,178 L160,183 L210,183 L210,178" fill="none" stroke="var(--text-muted)" stroke-width="1" />
    <text x="185" y="196" fill="var(--text-muted)" font-size="11" text-anchor="middle">QRS</text>
    <path d="M160,201 L160,206 L310,206 L310,201" fill="none" stroke="var(--text-muted)" stroke-width="1" />
    <text x="235" y="219" fill="var(--text-muted)" font-size="11" text-anchor="middle">QT interval</text>
  </svg>
  <figcaption>Normal sinus rhythm — one full cardiac cycle.</figcaption>
</figure>

## The five waveforms, in order

1. **P wave** — atrial depolarization. Should be upright in lead II; absent
   or abnormal P waves point to atrial fibrillation, junctional rhythm, or
   ectopic atrial activity.
2. **PR interval** (start of P to start of QRS, normal 120–200 ms) —
   conduction time through the AV node. Prolonged = first-degree AV block;
   progressively prolonging then dropping a beat = Mobitz I; fixed but
   intermittently non-conducted = Mobitz II (higher risk, often needs a
   pacemaker).
3. **QRS complex** (normal <120 ms) — ventricular depolarization. Widened
   QRS suggests a bundle branch block, ventricular origin (e.g., V-tach),
   or a sodium-channel-blocking drug effect (e.g., TCA overdose).
4. **ST segment** — should be isoelectric. Elevation localizes an MI;
   diffuse elevation with PR depression suggests pericarditis instead.
5. **T wave** — ventricular repolarization. Peaked = early hyperkalemia;
   inverted = ischemia; flattened = hypokalemia.

## Localizing an MI by lead group

| Leads | Territory | Artery |
|---|---|---|
| II, III, aVF | Inferior | Right coronary artery (RCA) |
| V1–V4 | Anterior/septal | Left anterior descending (LAD) |
| I, aVL, V5–V6 | Lateral | Left circumflex (LCx) |

## Key teaching point

Read every ECG the same way, every time: rate → rhythm → axis → intervals
→ QRS morphology → ST/T changes. A fixed sequence catches subtle findings
that a "gestalt glance" misses, especially under exam pressure.
