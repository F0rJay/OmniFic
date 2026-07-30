import { Box } from "@radix-ui/themes";

import type { AgentMessage } from "../../../../../../../lib/agent.types";
import { MessageCardShell } from "../../shared/message-shell";
import {
  getClarificationPromptData,
  getClarificationPromptKey,
  type ClarificationAnswerItem,
  type ClarificationPromptData,
} from "./clarification-flow-state";
import {
  ClarificationQuestionActions,
  ClarificationQuestionBody,
  ClarificationQuestionHeader,
} from "./clarification-question-flow";
import { useClarificationQuestionFlow } from "./use-clarification-question-flow";

interface ClarificationMessageCardProps {
  message: Pick<AgentMessage, "questions" | "payload" | "correlationId">;
  onSubmitQuestionAnswer?: (actionId: string, answer: ClarificationAnswerItem[]) => void;
}

export function ClarificationMessageCard({
  message,
  onSubmitQuestionAnswer,
}: ClarificationMessageCardProps) {
  const prompt = getClarificationPromptData(message);

  if (prompt.questions.length === 0) return null;

  return (
    <ClarificationMessageCardContent
      key={getClarificationPromptKey(prompt)}
      prompt={prompt}
      onSubmitQuestionAnswer={onSubmitQuestionAnswer}
    />
  );
}

interface ClarificationMessageCardContentProps {
  prompt: ClarificationPromptData;
  onSubmitQuestionAnswer?: (actionId: string, answer: ClarificationAnswerItem[]) => void;
}

function ClarificationMessageCardContent({
  prompt,
  onSubmitQuestionAnswer,
}: ClarificationMessageCardContentProps) {
  const model = useClarificationQuestionFlow(prompt, { onSubmitQuestionAnswer });
  const currentQuestion = prompt.questions[model.currentStep];

  return (
    <MessageCardShell>
      <ClarificationQuestionHeader model={model} />
      <ClarificationQuestionBody
        model={model}
        bodyClassName="agent-question-panel-body"
      />
      {currentQuestion?.multiSelect ? (
        <Box mt="3">
          <ClarificationQuestionActions model={model} />
        </Box>
      ) : null}
    </MessageCardShell>
  );
}
