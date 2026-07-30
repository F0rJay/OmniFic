// Modified by OmniFic contributors from OpenFic v0.7.5.
import { Box, Button } from "@radix-ui/themes";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import type { ClarificationQuestion } from "../../../../../../../lib/agent.types";
import { CUSTOM_CLARIFICATION_ANSWER } from "./clarification-flow-state";
import type { ClarificationQuestionFlowModel } from "./use-clarification-question-flow";

interface ClarificationQuestionViewProps {
  model: ClarificationQuestionFlowModel;
}

interface ClarificationQuestionBodyProps extends ClarificationQuestionViewProps {
  bodyClassName?: string;
}

export function ClarificationQuestionHeader({ model }: ClarificationQuestionViewProps) {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const question = model.prompt.questions[model.currentStep];
  if (!question) return null;

  return (
    <header className="agent-clarification-header">
      <AnimatePresence
        initial={false}
        mode="wait"
        custom={model.navigationDirection}
      >
        <motion.div
          key={model.currentStep}
          className="agent-clarification-header-copy"
          custom={model.navigationDirection}
          variants={{
            enter: (direction: -1 | 1) => ({
              opacity: 0,
              x: shouldReduceMotion ? 0 : direction * 10,
            }),
            center: { opacity: 1, x: 0 },
            exit: (direction: -1 | 1) => ({
              opacity: 0,
              x: shouldReduceMotion ? 0 : direction * -8,
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: "easeOut" }}
        >
          <div className="agent-clarification-header-title">{question.title}</div>
          {question.description ? (
            <div className="agent-clarification-header-description">{question.description}</div>
          ) : null}
        </motion.div>
      </AnimatePresence>
      <nav
        className="agent-clarification-navigation"
        aria-label={t("assistant.clarification.progress")}
      >
        <button
          type="button"
          className="agent-clarification-navigation-button"
          onClick={model.handleGoPrevious}
          disabled={!model.canGoPrevious}
          aria-label={t("assistant.clarification.previous")}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="agent-clarification-navigation-count">
          {model.currentStep + 1} / {model.prompt.questions.length}
        </span>
        <button
          type="button"
          className="agent-clarification-navigation-button"
          onClick={model.handleGoNext}
          disabled={!model.canGoNext}
          aria-label={t("assistant.clarification.next")}
        >
          <ChevronRight size={18} />
        </button>
      </nav>
    </header>
  );
}

export function ClarificationQuestionBody({
  model,
  bodyClassName,
}: ClarificationQuestionBodyProps) {
  const shouldReduceMotion = useReducedMotion();
  const question = model.prompt.questions[model.currentStep];
  if (!question) return null;

  const className = ["agent-clarification-flow-body", bodyClassName].filter(Boolean).join(" ");
  return (
    <AnimatePresence
      initial={false}
      mode="wait"
      custom={model.navigationDirection}
    >
      <motion.div
        key={model.currentStep}
        className="agent-clarification-question-transition"
        custom={model.navigationDirection}
        variants={{
          enter: (direction: -1 | 1) => ({
            opacity: 0,
            x: shouldReduceMotion ? 0 : direction * 14,
          }),
          center: { opacity: 1, x: 0 },
          exit: (direction: -1 | 1) => ({
            opacity: 0,
            x: shouldReduceMotion ? 0 : direction * -12,
          }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: "easeOut" }}
      >
        <Box className={className}>
          <ClarificationQuestionItem
            question={question}
            index={model.currentStep}
            selectedValue={model.answers[model.currentStep]}
            customValue={model.customAnswers[model.currentStep] ?? ""}
            isCommitting={model.isCommitting}
            onSelect={model.handleSelectAnswer}
            onCustomChange={model.handleCustomAnswerChange}
            onConfirm={model.handleConfirmCurrent}
          />
        </Box>
      </motion.div>
    </AnimatePresence>
  );
}

export function ClarificationQuestionActions({ model }: ClarificationQuestionViewProps) {
  const { t } = useTranslation();
  const question = model.prompt.questions[model.currentStep];
  if (!question?.multiSelect) return null;

  return (
    <Button
      size="1"
      variant="soft"
      className="agent-clarification-multi-confirm"
      onClick={model.handleConfirmCurrent}
      disabled={!model.isCurrentStepValid}
    >
      {t("assistant.clarification.confirmSelection")}
      <ChevronRight size={14} />
    </Button>
  );
}

interface ClarificationQuestionItemProps {
  customValue: string;
  index: number;
  isCommitting: boolean;
  question: ClarificationQuestion;
  selectedValue?: string | string[];
  onConfirm: () => void;
  onCustomChange: (index: number, value: string) => void;
  onSelect: (index: number, value: string, isMulti?: boolean) => void;
}

function resizeCustomInput(textarea: HTMLTextAreaElement): void {
  textarea.style.height = "auto";
  const computedMaxHeight = Number.parseFloat(window.getComputedStyle(textarea).maxHeight);
  const maxHeight = Number.isFinite(computedMaxHeight) ? computedMaxHeight : textarea.scrollHeight;
  const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}

function ClarificationQuestionItem({
  customValue,
  index,
  isCommitting,
  question,
  selectedValue,
  onConfirm,
  onCustomChange,
  onSelect,
}: ClarificationQuestionItemProps) {
  const { t } = useTranslation();
  const isMulti = question.multiSelect === true;
  const customInputRef = useRef<HTMLTextAreaElement | null>(null);

  const isSelected = (value: string): boolean => {
    if (isMulti && Array.isArray(selectedValue)) return selectedValue.includes(value);
    return selectedValue === value;
  };
  const isCustomSelected = isSelected(CUSTOM_CLARIFICATION_ANSWER);

  useEffect(() => {
    if (!isCustomSelected) return;
    const frame = window.requestAnimationFrame(() => {
      customInputRef.current?.focus();
      customInputRef.current?.scrollIntoView({ block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isCustomSelected]);

  useLayoutEffect(() => {
    if (customInputRef.current) resizeCustomInput(customInputRef.current);
  }, [customValue, isCustomSelected]);

  const customInputId = `clarification-${index}-${CUSTOM_CLARIFICATION_ANSWER}`;

  return (
    <fieldset
      className="agent-clarification-question"
      aria-label={question.title}
    >
      <legend className="agent-clarification-visually-hidden">{question.title}</legend>
      <div className="agent-clarification-options">
        {question.options.map((option, optionIndex) => {
          const inputId = `clarification-${index}-${option.label}`;
          const checked = isSelected(option.label);
          return (
            <label
              key={option.label}
              className="agent-clarification-option"
              data-selected={checked}
              data-committing={checked && isCommitting}
              data-multi={isMulti}
              htmlFor={inputId}
            >
              <input
                id={inputId}
                className="agent-clarification-option-input"
                type={isMulti ? "checkbox" : "radio"}
                name={`clarification-${index}`}
                value={option.label}
                checked={checked}
                onChange={() => onSelect(index, option.label, isMulti)}
              />
              <span className="agent-clarification-option-badge">{optionIndex + 1}</span>
              <span className="agent-clarification-option-copy">
                <span className="agent-clarification-option-label">{option.label}</span>
                {option.description ? (
                  <span className="agent-clarification-option-description">
                    {option.description}
                  </span>
                ) : null}
              </span>
              {!isMulti ? (
                <ChevronRight
                  className="agent-clarification-option-arrow"
                  size={18}
                />
              ) : null}
            </label>
          );
        })}

        {isCustomSelected ? (
          <div
            className="agent-clarification-option agent-clarification-custom-option"
            data-selected="true"
            data-committing={isCommitting}
          >
            <label
              className="agent-clarification-custom-option-toggle"
              htmlFor={customInputId}
            >
              <input
                id={customInputId}
                className="agent-clarification-option-input"
                type={isMulti ? "checkbox" : "radio"}
                name={`clarification-${index}`}
                value={CUSTOM_CLARIFICATION_ANSWER}
                checked
                onChange={() => onSelect(index, CUSTOM_CLARIFICATION_ANSWER, isMulti)}
              />
              <span className="agent-clarification-option-badge">
                <Pencil size={14} />
              </span>
            </label>
            <textarea
              ref={customInputRef}
              className="agent-clarification-custom-input"
              value={customValue}
              onChange={(event) => {
                resizeCustomInput(event.currentTarget);
                onCustomChange(index, event.currentTarget.value);
              }}
              rows={1}
              placeholder={t("assistant.clarification.customInputPlaceholder")}
              aria-label={t("assistant.clarification.customAnswerAriaLabel", {
                title: question.title,
              })}
            />
            <button
              type="button"
              className="agent-clarification-custom-confirm"
              onClick={onConfirm}
              disabled={!customValue.trim()}
              aria-label={t("assistant.clarification.confirmCustomAnswer")}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <label
            className="agent-clarification-option agent-clarification-custom-option"
            data-selected="false"
            htmlFor={customInputId}
          >
            <input
              id={customInputId}
              className="agent-clarification-option-input"
              type={isMulti ? "checkbox" : "radio"}
              name={`clarification-${index}`}
              value={CUSTOM_CLARIFICATION_ANSWER}
              checked={false}
              onChange={() => onSelect(index, CUSTOM_CLARIFICATION_ANSWER, isMulti)}
            />
            <span className="agent-clarification-option-badge">
              <Pencil size={14} />
            </span>
            <span className="agent-clarification-option-copy">
              <span className="agent-clarification-option-label">
                {t("assistant.clarification.customInput")}
              </span>
              <span className="agent-clarification-option-description">
                {t("assistant.clarification.customInputDescription")}
              </span>
            </span>
          </label>
        )}
      </div>
    </fieldset>
  );
}
