export const MOTION_DURATION = {
  instant: 0.08,
  fast: 0.14,
  normal: 0.2,
  slow: 0.28,
} as const;

export const MOTION_EASING = {
  standard: [0.22, 1, 0.36, 1],
} as const;

export const MOTION_TRANSITION = {
  fast: {
    duration: MOTION_DURATION.fast,
    ease: MOTION_EASING.standard,
  },
  normal: {
    duration: MOTION_DURATION.normal,
    ease: MOTION_EASING.standard,
  },
  slow: {
    duration: MOTION_DURATION.slow,
    ease: MOTION_EASING.standard,
  },
} as const;
