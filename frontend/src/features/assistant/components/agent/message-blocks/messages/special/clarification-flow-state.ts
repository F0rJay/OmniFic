// Modified by OmniFic contributors from OpenFic v0.7.5.
import type {
  AgentMessage,
  ClarificationAnswerItem,
  ClarificationQuestion,
} from "../../../../../../../lib/agent.types";

export const CUSTOM_CLARIFICATION_ANSWER = "__custom__";

export type ClarificationAnswers = Record<number, string | string[]>;
export type ClarificationCustomAnswers = Record<number, string>;

export type { ClarificationAnswerItem };

export interface ClarificationPromptData {
  actionId: string;
  questions: ClarificationQuestion[];
}

type ClarificationMessageSource = Pick<AgentMessage, "questions" | "payload" | "correlationId">;

export function getClarificationPromptData(
  message: ClarificationMessageSource,
): ClarificationPromptData {
  const actionId =
    typeof message.payload?.action_id === "string"
      ? message.payload.action_id
      : (message.correlationId ?? "");

  return {
    actionId,
    questions: message.questions ?? [],
  };
}

export function getClarificationPromptKey(prompt: ClarificationPromptData): string {
  const questionSignature = prompt.questions
    .map((question) => `${question.title}:${question.options.length}`)
    .join("|");

  return `${prompt.actionId}:${questionSignature}`;
}

function resolveClarificationAnswer(
  answers: ClarificationAnswers,
  customAnswers: ClarificationCustomAnswers,
  index: number,
): string | string[] | undefined {
  const selected = answers[index];
  if (!selected) return undefined;

  // 多选：返回数组（过滤掉自定义选项，单独处理）
  if (Array.isArray(selected)) {
    const nonCustom = selected.filter((v) => v !== CUSTOM_CLARIFICATION_ANSWER);
    if (selected.includes(CUSTOM_CLARIFICATION_ANSWER)) {
      const customAnswer = customAnswers[index]?.trim();
      if (customAnswer) return [...nonCustom, customAnswer];
    }
    return nonCustom.length > 0 ? nonCustom : undefined;
  }

  // 单选
  if (selected !== CUSTOM_CLARIFICATION_ANSWER) return selected;
  const customAnswer = customAnswers[index]?.trim();
  return customAnswer || undefined;
}

function isAnswerValid(answer: string | string[] | undefined): boolean {
  if (answer === undefined) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  return Boolean(answer);
}

export function isClarificationStepComplete(
  questions: ClarificationQuestion[],
  answers: ClarificationAnswers,
  customAnswers: ClarificationCustomAnswers,
  stepIndex: number,
): boolean {
  if (!questions[stepIndex]) return false;
  return isAnswerValid(resolveClarificationAnswer(answers, customAnswers, stepIndex));
}

export function canSubmitClarificationAnswers(
  questions: ClarificationQuestion[],
  answers: ClarificationAnswers,
  customAnswers: ClarificationCustomAnswers,
): boolean {
  if (questions.length === 0) return false;
  return questions.every((_, index) =>
    isClarificationStepComplete(questions, answers, customAnswers, index),
  );
}

export function buildClarificationAnswerItems(
  questions: ClarificationQuestion[],
  answers: ClarificationAnswers,
  customAnswers: ClarificationCustomAnswers,
): ClarificationAnswerItem[] | null {
  if (!canSubmitClarificationAnswers(questions, answers, customAnswers)) return null;

  return questions.map((question, index) => {
    const answer = resolveClarificationAnswer(answers, customAnswers, index) ?? "";
    const answerStr = Array.isArray(answer) ? answer.join("、") : answer;
    return { question: question.title, answer: answerStr };
  });
}
