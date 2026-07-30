import { readFileSync } from "node:fs";

import {
  buildClarificationAnswerItems,
  canSubmitClarificationAnswers,
  CUSTOM_CLARIFICATION_ANSWER,
  getClarificationCompletionAction,
  isClarificationStepComplete,
  updateClarificationAnswerSelection,
} from "./message-blocks/messages/special/clarification-flow-state";

const stylesheet = readFileSync(new URL("../assistant-sidebar.css", import.meta.url), "utf8");
const questionFlowSource = readFileSync(
  new URL("./message-blocks/messages/special/clarification-question-flow.tsx", import.meta.url),
  "utf8",
);
const questionFlowHookSource = readFileSync(
  new URL("./message-blocks/messages/special/use-clarification-question-flow.ts", import.meta.url),
  "utf8",
);

function getRuleBody(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`));
  if (!match?.[1]) throw new Error(`找不到样式规则：${selector}`);
  return match[1];
}

describe("clarification special panel layout", () => {
  it("caps the composer panel height and scrolls long question content internally", () => {
    expect(getRuleBody(".agent-clarification-special-panel")).toContain(
      "max-height: min(720px, calc(100dvh - 180px));",
    );
    expect(getRuleBody(".agent-clarification-special-panel")).toContain("display: flex;");
    expect(getRuleBody(".agent-clarification-special-panel")).toContain("flex-direction: column;");
    expect(getRuleBody(".agent-clarification-special-panel")).toContain("height: auto;");
    expect(getRuleBody(".agent-clarification-special-panel")).toContain("overflow: hidden;");
    expect(
      getRuleBody(".agent-clarification-special-panel .agent-special-panel-content"),
    ).toContain("flex: 1 1 auto;");
    expect(
      getRuleBody(".agent-clarification-special-panel .agent-special-panel-content"),
    ).toContain("max-height: min(588px, calc(100dvh - 312px));");
    expect(
      getRuleBody(".agent-clarification-special-panel .agent-special-panel-content"),
    ).toContain("overflow-y: auto;");
    expect(
      getRuleBody(".agent-clarification-special-panel .agent-special-panel-content"),
    ).not.toContain("padding-right:");
    expect(
      getRuleBody(".agent-clarification-special-panel .agent-special-panel-content"),
    ).not.toContain("scrollbar-gutter:");
    expect(
      getRuleBody(".agent-clarification-special-panel .agent-special-panel-content"),
    ).toContain("scrollbar-width: thin;");
    const actionRule = getRuleBody(
      ".agent-clarification-special-panel .agent-special-panel-actions",
    );
    expect(actionRule).toContain("flex: 0 0 auto;");
    expect(actionRule).toContain("justify-content: flex-end;");
    expect(getRuleBody(".agent-clarification-header")).toContain("flex: 0 0 auto;");
  });

  it("renders Codex-style flat choices and inline free-form input", () => {
    expect(questionFlowSource).toContain("question.options.map((option, optionIndex)");
    expect(questionFlowSource).toContain('className="agent-clarification-option-badge"');
    expect(questionFlowSource).toContain('className="agent-clarification-custom-input"');
    expect(questionFlowSource).toContain("rows={1}");
    expect(questionFlowSource).toContain('className="agent-clarification-custom-confirm"');
    expect(questionFlowSource).not.toContain("agent-clarification-stepper");
    expect(questionFlowSource).toContain('scrollIntoView({ block: "nearest" })');
    expect(getRuleBody(".agent-clarification-option")).toContain(
      "grid-template-columns: 28px minmax(0, 1fr) auto;",
    );
    expect(getRuleBody(".agent-clarification-option")).toContain("width: 100%;");
    expect(getRuleBody(".agent-clarification-option-arrow")).toContain("right: 12px;");
    expect(getRuleBody(".agent-clarification-option-input")).toContain("opacity: 0;");
    expect(getRuleBody(".agent-clarification-custom-input")).toContain(
      "max-height: calc(4.35em + 8px);",
    );
  });

  it("adds choice feedback and animated question transitions", () => {
    expect(questionFlowSource).toContain("AnimatePresence");
    expect(questionFlowSource).toContain('className="agent-clarification-question-transition"');
    expect(questionFlowSource).toContain("data-committing={checked && isCommitting}");
    expect(getRuleBody('.agent-clarification-option[data-committing="true"]')).toContain(
      "animation: agentClarificationChoiceCommit 140ms ease-out both;",
    );
  });

  it("blocks forward navigation until the current answer is valid", () => {
    expect(questionFlowHookSource).toContain(
      "canGoNext: isCurrentStepValid && !isCommitting && !isLastStep",
    );
    expect(questionFlowHookSource).toContain(
      "if (!isCurrentStepValid || isCommitting || currentStep >= prompt.questions.length - 1)",
    );
  });

  it("enables progression for preset and non-empty custom answers", () => {
    const questions = [
      {
        title: "题材",
        description: "选择或自行输入",
        options: [{ label: "都市", description: "现代背景" }],
      },
    ];

    expect(isClarificationStepComplete(questions, { 0: "都市" }, {}, 0)).toBe(true);
    expect(
      isClarificationStepComplete(
        questions,
        { 0: CUSTOM_CLARIFICATION_ANSWER },
        { 0: "公路奇幻" },
        0,
      ),
    ).toBe(true);
    expect(
      canSubmitClarificationAnswers(questions, { 0: CUSTOM_CLARIFICATION_ANSWER }, { 0: "   " }),
    ).toBe(false);
  });

  it("derives next and submit actions from the latest selection", () => {
    const questions = [
      { title: "题材", options: [{ label: "都市" }] },
      { title: "基调", options: [{ label: "温暖" }] },
    ];
    const firstAnswers = updateClarificationAnswerSelection({}, 0, "都市", false);
    expect(getClarificationCompletionAction(questions, firstAnswers, {}, 0)).toBe("next");

    const finalAnswers = updateClarificationAnswerSelection(firstAnswers, 1, "温暖", false);
    expect(getClarificationCompletionAction(questions, finalAnswers, {}, 1)).toBe("submit");
    expect(buildClarificationAnswerItems(questions, finalAnswers, {})).toEqual([
      { question: "题材", answer: "都市" },
      { question: "基调", answer: "温暖" },
    ]);
  });

  it("toggles multi-select answers without completing an empty custom choice", () => {
    const questions = [
      {
        title: "元素",
        options: [{ label: "成长" }, { label: "冒险" }],
        multiSelect: true,
      },
    ];
    const withGrowth = updateClarificationAnswerSelection({}, 0, "成长", true);
    const withBoth = updateClarificationAnswerSelection(withGrowth, 0, "冒险", true);
    expect(withBoth[0]).toEqual(["成长", "冒险"]);
    expect(getClarificationCompletionAction(questions, withBoth, {}, 0)).toBe("submit");

    const customOnly = updateClarificationAnswerSelection({}, 0, CUSTOM_CLARIFICATION_ANSWER, true);
    expect(getClarificationCompletionAction(questions, customOnly, {}, 0)).toBe("stay");
  });
});
