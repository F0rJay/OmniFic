// Modified by OmniFic contributors from OpenFic v0.7.5.
import { useEffect, useRef, useState } from "react";

import {
  buildClarificationAnswerItems,
  CUSTOM_CLARIFICATION_ANSWER,
  getClarificationCompletionAction,
  isClarificationStepComplete,
  updateClarificationAnswerSelection,
  type ClarificationAnswers,
  type ClarificationAnswerItem,
  type ClarificationCustomAnswers,
  type ClarificationPromptData,
} from "./clarification-flow-state";

export interface ClarificationQuestionFlowModel {
  currentStep: number;
  customAnswers: ClarificationCustomAnswers;
  answers: ClarificationAnswers;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isCommitting: boolean;
  isCurrentStepValid: boolean;
  navigationDirection: -1 | 1;
  prompt: ClarificationPromptData;
  handleCustomAnswerChange: (index: number, value: string) => void;
  handleConfirmCurrent: () => void;
  handleGoNext: () => void;
  handleGoPrevious: () => void;
  handleSelectAnswer: (index: number, value: string, isMulti?: boolean) => void;
}

interface UseClarificationQuestionFlowOptions {
  onSubmitQuestionAnswer?: (actionId: string, answer: ClarificationAnswerItem[]) => void;
}

export function useClarificationQuestionFlow(
  prompt: ClarificationPromptData,
  options: UseClarificationQuestionFlowOptions = {},
): ClarificationQuestionFlowModel {
  const { onSubmitQuestionAnswer } = options;
  const [answers, setAnswers] = useState<ClarificationAnswers>({});
  const [customAnswers, setCustomAnswers] = useState<ClarificationCustomAnswers>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isCommitting, setIsCommitting] = useState(false);
  const [navigationDirection, setNavigationDirection] = useState<-1 | 1>(1);
  const commitTimerRef = useRef<number | null>(null);
  const hasSubmittedRef = useRef(false);

  const isCurrentStepValid = isClarificationStepComplete(
    prompt.questions,
    answers,
    customAnswers,
    currentStep,
  );
  const isLastStep = currentStep === prompt.questions.length - 1;

  useEffect(
    () => () => {
      if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    },
    [],
  );

  const goToStep = (step: number, direction: -1 | 1) => {
    setNavigationDirection(direction);
    setCurrentStep(Math.max(0, Math.min(step, prompt.questions.length - 1)));
  };

  const finishCurrentStep = (
    nextAnswers: ClarificationAnswers,
    nextCustomAnswers: ClarificationCustomAnswers,
  ) => {
    const action = getClarificationCompletionAction(
      prompt.questions,
      nextAnswers,
      nextCustomAnswers,
      currentStep,
    );

    if (action === "next") {
      goToStep(currentStep + 1, 1);
      return;
    }
    if (action !== "submit" || !onSubmitQuestionAnswer) return;

    const answerItems = buildClarificationAnswerItems(
      prompt.questions,
      nextAnswers,
      nextCustomAnswers,
    );
    if (!answerItems) {
      const firstIncompleteStep = prompt.questions.findIndex(
        (_, index) =>
          !isClarificationStepComplete(prompt.questions, nextAnswers, nextCustomAnswers, index),
      );
      if (firstIncompleteStep >= 0 && firstIncompleteStep !== currentStep) {
        goToStep(firstIncompleteStep, firstIncompleteStep > currentStep ? 1 : -1);
      }
      return;
    }
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    onSubmitQuestionAnswer(prompt.actionId, answerItems);
  };

  const commitCurrentStep = (
    nextAnswers: ClarificationAnswers,
    nextCustomAnswers: ClarificationCustomAnswers,
  ) => {
    if (isCommitting || hasSubmittedRef.current) return;
    setIsCommitting(true);
    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null;
      finishCurrentStep(nextAnswers, nextCustomAnswers);
      setIsCommitting(false);
    }, 140);
  };

  const handleSelectAnswer = (index: number, value: string, isMulti?: boolean) => {
    const isMultiSelect = isMulti === true;
    const nextAnswers = updateClarificationAnswerSelection(answers, index, value, isMultiSelect);
    setAnswers(nextAnswers);

    if (isMultiSelect || value === CUSTOM_CLARIFICATION_ANSWER || index !== currentStep) return;
    commitCurrentStep(nextAnswers, customAnswers);
  };

  const handleCustomAnswerChange = (index: number, value: string) => {
    setCustomAnswers((current) => ({ ...current, [index]: value }));
  };

  const handleConfirmCurrent = () => {
    if (!isCurrentStepValid) return;
    commitCurrentStep(answers, customAnswers);
  };

  const handleGoNext = () => {
    if (!isCurrentStepValid || isCommitting || currentStep >= prompt.questions.length - 1) return;
    goToStep(currentStep + 1, 1);
  };

  const handleGoPrevious = () => {
    if (isCommitting || currentStep <= 0) return;
    goToStep(currentStep - 1, -1);
  };

  return {
    currentStep,
    customAnswers,
    answers,
    canGoNext: isCurrentStepValid && !isCommitting && !isLastStep,
    canGoPrevious: !isCommitting && currentStep > 0,
    isCommitting,
    isCurrentStepValid,
    navigationDirection,
    prompt,
    handleCustomAnswerChange,
    handleConfirmCurrent,
    handleGoNext,
    handleGoPrevious,
    handleSelectAnswer,
  };
}
