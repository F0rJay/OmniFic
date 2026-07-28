import { Check, Circle, LoaderCircle, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { MOTION_TRANSITION } from "@/lib/motion";

import "./save-status-indicator.css";

export type SaveStatus = "unsaved" | "saving" | "saved" | "error";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  label: string;
  retryLabel: string;
  onRetry: () => void;
}

const STATUS_ICON = {
  unsaved: Circle,
  saving: LoaderCircle,
  saved: Check,
  error: TriangleAlert,
} as const;

export function SaveStatusIndicator({
  status,
  label,
  retryLabel,
  onRetry,
}: SaveStatusIndicatorProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isSettled, setIsSettled] = useState(status === "saved");
  const Icon = STATUS_ICON[status];
  const canRetry = status === "error" || status === "unsaved";

  useEffect(() => {
    if (status !== "saved") {
      setIsSettled(false);
      return undefined;
    }

    setIsSettled(false);
    const timer = window.setTimeout(() => setIsSettled(true), 1600);
    return () => window.clearTimeout(timer);
  }, [status]);

  return (
    <button
      type="button"
      className="chapter-save-status"
      data-status={status}
      data-settled={isSettled ? "true" : undefined}
      disabled={!canRetry}
      onClick={canRetry ? onRetry : undefined}
      aria-label={canRetry ? retryLabel : label}
      title={canRetry ? retryLabel : label}
    >
      <span
        className="chapter-save-status__live"
        aria-live="polite"
        aria-atomic="true"
      >
        {label}
      </span>
      <AnimatePresence
        mode="wait"
        initial={false}
      >
        <motion.span
          key={status}
          className="chapter-save-status__content"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, y: -3 }}
          transition={MOTION_TRANSITION.fast}
        >
          <motion.span
            className="chapter-save-status__icon"
            aria-hidden="true"
            initial={false}
            animate={{ rotate: status === "saving" && !shouldReduceMotion ? 360 : 0 }}
            transition={{ ...MOTION_TRANSITION.slow, duration: 0.62 }}
          >
            <Icon
              size={13}
              fill={status === "unsaved" ? "currentColor" : "none"}
            />
          </motion.span>
          <span>{label}</span>
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
