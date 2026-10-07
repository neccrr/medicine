import type { ReactNode } from "react";

// Line icons for the 3D atlas's view controls: 24-unit grid, round 2-unit strokes, no fills.

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const ZoomInIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const ZoomOutIcon = () => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
);

export const TurnLeftIcon = () => (
  <Icon>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
);

export const TurnRightIcon = () => (
  <Icon>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </Icon>
);

export const TiltUpIcon = () => (
  <Icon>
    <path d="m18 15-6-6-6 6" />
  </Icon>
);

export const TiltDownIcon = () => (
  <Icon>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const FitIcon = () => (
  <Icon>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const ExpandIcon = () => (
  <Icon>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </Icon>
);

export const ShrinkIcon = () => (
  <Icon>
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
  </Icon>
);

export const BackIcon = () => (
  <Icon>
    <path d="m15 18-6-6 6-6" />
  </Icon>
);

export const ForwardIcon = () => (
  <Icon>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);

export const PivotIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="2.5" />
    <path d="M12 3a9 9 0 0 1 8.5 6M12 21a9 9 0 0 1-8.5-6" />
    <path d="m20.5 3.5.2 5.4-5.3-.6M3.5 20.5l-.2-5.4 5.3.6" />
  </Icon>
);

export const MouseIcon = () => (
  <Icon>
    <rect x="6" y="3" width="12" height="18" rx="6" />
    <path d="M12 7v4" />
  </Icon>
);

export const HelpIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
  </Icon>
);
