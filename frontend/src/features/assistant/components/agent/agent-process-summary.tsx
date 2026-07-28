import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { MOTION_TRANSITION } from "@/lib/motion";

import "./agent-process-summary.css";

export type AgentProcessStatus =
  | "running"
  | "completed"
  | "error"
  | "waiting_answer"
  | "waiting_approval";

interface AgentProcessSummaryProps {
  status: AgentProcessStatus;
  elapsedMs: number;
  expandable: boolean;
  children?: ReactNode;
}

function isTerminalStatus(status: AgentProcessStatus): boolean {
  return status === "completed" || status === "error";
}

function formatAgentProcessDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function AgentProcessSummary({
  status,
  elapsedMs,
  expandable,
  children,
}: AgentProcessSummaryProps) {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const previousStatusRef = useRef(status);
  const [expanded, setExpanded] = useState(() => !isTerminalStatus(status));

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;
    if (previousStatus === status) return;

    if (!isTerminalStatus(previousStatus) && isTerminalStatus(status)) {
      setExpanded(false);
      return;
    }
    if (isTerminalStatus(previousStatus) && !isTerminalStatus(status)) {
      setExpanded(true);
    }
  }, [status]);

  const statusLabel = t(`assistant.processSummary.${status}`);
  const toggleLabel = expanded
    ? t("assistant.processSummary.collapseAriaLabel", { status: statusLabel })
    : t("assistant.processSummary.expandAriaLabel", { status: statusLabel });

  return (
    <section
      className="agent-process-summary"
      data-status={status}
      data-expanded={expanded ? "true" : "false"}
    >
      <button
        type="button"
        className="agent-process-summary__toggle"
        data-expandable={expandable ? "true" : "false"}
        aria-expanded={expandable ? expanded : undefined}
        aria-label={expandable ? toggleLabel : undefined}
        disabled={!expandable}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="agent-process-summary__label">{statusLabel}</span>
        <span className="agent-process-summary__duration">
          {formatAgentProcessDuration(elapsedMs)}
        </span>
        {expandable ? (
          <motion.span
            className="agent-process-summary__chevron"
            aria-hidden="true"
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={MOTION_TRANSITION.fast}
          >
            <ChevronRight size={15} />
          </motion.span>
        ) : null}
      </button>

      <AnimatePresence initial={false}>
        {expandable && expanded ? (
          <motion.div
            className="agent-process-summary__content"
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={MOTION_TRANSITION.normal}
          >
            <div className="agent-process-summary__content-inner">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
