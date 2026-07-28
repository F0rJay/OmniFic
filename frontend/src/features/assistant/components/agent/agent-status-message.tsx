import { Box, Text } from "@radix-ui/themes";
import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { MOTION_TRANSITION } from "@/lib/motion";

import "./agent-status-message.css";

export interface AgentExecutionStep {
  id: number;
  key: string;
  content: string;
}

interface AgentStatusMessageProps {
  steps: AgentExecutionStep[];
  currentContent: string;
  elapsed?: string;
}

export function AgentStatusMessage({ steps, currentContent, elapsed }: AgentStatusMessageProps) {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(true);
  const visibleSteps =
    steps.length > 0 ? steps : [{ id: 0, key: "current", content: currentContent }];

  return (
    <Box
      className="agent-execution-timeline"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className="agent-execution-timeline__toggle"
        aria-expanded={expanded}
        aria-label={
          expanded
            ? t("assistant.collapseExecutionTimeline")
            : t("assistant.expandExecutionTimeline")
        }
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="agent-execution-timeline__heading">
          <span
            className="agent-execution-timeline__active-dot"
            aria-hidden="true"
          />
          <Text
            as="span"
            size="1"
            weight="medium"
          >
            {t("assistant.executionTimeline")}
          </Text>
          {!expanded ? (
            <Text
              as="span"
              size="1"
              className="agent-execution-timeline__current"
            >
              {currentContent}
            </Text>
          ) : null}
        </span>
        <span className="agent-execution-timeline__meta">
          {elapsed ? <span>{elapsed}</span> : null}
          <motion.span
            className="agent-execution-timeline__chevron"
            aria-hidden="true"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={MOTION_TRANSITION.fast}
          >
            <ChevronDown size={13} />
          </motion.span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.ol
            className="agent-execution-timeline__steps"
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={MOTION_TRANSITION.normal}
          >
            {visibleSteps.map((step, index) => {
              const isCurrent = index === visibleSteps.length - 1;
              return (
                <motion.li
                  key={step.id}
                  className="agent-execution-timeline__step"
                  data-current={isCurrent ? "true" : undefined}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={MOTION_TRANSITION.fast}
                >
                  <span
                    className="agent-execution-timeline__step-icon"
                    aria-hidden="true"
                  >
                    {isCurrent ? (
                      <span className="agent-execution-timeline__active-dot" />
                    ) : (
                      <Check size={12} />
                    )}
                  </span>
                  <span>{isCurrent ? currentContent : step.content}</span>
                </motion.li>
              );
            })}
          </motion.ol>
        ) : null}
      </AnimatePresence>
    </Box>
  );
}
