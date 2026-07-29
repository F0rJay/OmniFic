// Modified by OmniFic contributors from OpenFic v0.7.5.
import { Box, Flex, IconButton, Text, Tooltip } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, CircleUserRound, ExternalLink, ShieldCheck, Square } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { ModelIdSelect, Spinner, type ModelIdSelectOption } from "@/components";
import { SimpleSelect, type SelectOption } from "@/components/select";
import { ProviderIcon } from "@/features/settings/lib/provider-icons";
import type { AgentPendingMessage, AgentSessionStatus, ReasoningEffort } from "@/lib/agent.types";
import { fetchSkills } from "@/lib/api-client";

import {
  AgentComposerEditor,
  type AgentComposerEditorHandle,
  type AgentComposerSuggestionState,
} from "./agent-composer-editor";
import { AgentIndexStatusIndicator } from "./agent-index-status-indicator";
import { canSendAgentInput, getAgentInputBodyMode, isAgentInputLocked } from "./agent-input-state";
import { AgentMentionSuggestions } from "./agent-mention-suggestions";
import type { AgentRuntimeStatusInfo } from "./agent-runtime-status.types";
import {
  AgentSkillSuggestions,
  type SkillSuggestionItem,
  type SlashPanelPage,
} from "./agent-skill-suggestions";
import { AgentPendingMessageCard } from "./pending-message-card";

interface AgentInputProps {
  projectId: string;
  value: string;
  modelId: string;
  models: ModelIdSelectOption[];
  reasoningEffort?: ReasoningEffort;
  agentKey?: string;
  agentOptions: SelectOption[];
  isSending: boolean;
  disabled: boolean;
  isModelsLoading: boolean;
  modelsError: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onAbort: () => void;
  onModelChange: (modelId: string) => void;
  onReasoningEffortChange?: (reasoningEffort: ReasoningEffort) => void;
  onAgentChange?: (agentKey: string) => void;
  onGoToSettings: () => void;
  agentStatus?: AgentSessionStatus;
  pendingMessage?: AgentPendingMessage | null;
  onOpenMentionChapter?: (chapterId: string, chapterTitle: string) => void;
  toolApprovalBypassEnabled?: boolean;
  toolApprovalBypassDisabled?: boolean;
  goal?: string;
  goalSaving?: boolean;
  runtimeStatus?: AgentRuntimeStatusInfo;
  onGoalChange?: (goal: string) => Promise<void>;
  onToggleToolApprovalBypass?: () => void;
  onCancelPendingMessage?: () => void;
  specialPanels?: ReactNode;
  forceSpecialPanels?: boolean;
  readOnly?: boolean;
  readOnlyMessage?: ReactNode;
  [ignoredModeSelectorProp: string]: unknown;
}

export function AgentInput({
  projectId,
  value,
  modelId,
  models,
  reasoningEffort,
  agentKey,
  agentOptions,
  isSending,
  disabled,
  isModelsLoading,
  modelsError,
  onChange,
  onSend,
  onAbort,
  onModelChange,
  onReasoningEffortChange,
  onAgentChange,
  onGoToSettings,
  agentStatus,
  pendingMessage = null,
  onOpenMentionChapter,
  toolApprovalBypassEnabled = false,
  toolApprovalBypassDisabled = false,
  goal = "",
  goalSaving = false,
  runtimeStatus,
  onGoalChange,
  onToggleToolApprovalBypass,
  onCancelPendingMessage,
  specialPanels,
  forceSpecialPanels = false,
  readOnly = false,
  readOnlyMessage,
}: AgentInputProps) {
  const { t } = useTranslation();
  const bodyMode = getAgentInputBodyMode(agentStatus, Boolean(specialPanels), forceSpecialPanels);
  const hasContent = value.trim().length > 0;
  const hasPendingMessage = pendingMessage !== null;
  const isComposerLocked = isAgentInputLocked({
    disabled,
    readOnly,
    hasPendingMessage,
  });
  const shouldAbort = isSending && !hasContent;
  const canSend = canSendAgentInput({
    hasContent,
    disabled,
    readOnly,
    hasPendingMessage,
    bodyMode,
  });
  const shouldShowPendingMessage = hasPendingMessage && bodyMode === "composer" && !readOnly;
  const buttonActive = shouldAbort || canSend;
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const composerEditorRef = useRef<AgentComposerEditorHandle>(null);
  const [pendingClearanceHeight, setPendingClearanceHeight] = useState(0);
  const [mentionSuggestions, setMentionSuggestions] = useState<AgentComposerSuggestionState | null>(
    null,
  );

  // === 斜杠命令状态 ===
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [slashPage, setSlashPage] = useState<SlashPanelPage>("root");

  const { data: skillsData } = useQuery({
    queryKey: ["skills"],
    queryFn: () => fetchSkills(),
    staleTime: 60 * 1000,
  });

  const allSkills: SkillSuggestionItem[] = useMemo(() => {
    if (!skillsData) return [];
    return (skillsData.items ?? [])
      .filter((s) => s.isEnabled !== false)
      .map((s) => ({
        id: s.id,
        name: s.name,
        summary: s.summary,
        source: s.source,
      }));
  }, [skillsData]);

  const selectedModel = useMemo(
    () => models.find((model) => model.value === modelId || model.id === modelId),
    [modelId, models],
  );
  const shouldShowReasoningEffort = selectedModel?.reasoning === true;
  const reasoningEffortOptions = useMemo<SelectOption[]>(
    () => [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "xhigh", label: "Xhigh" },
      { value: "max", label: "Max" },
    ],
    [],
  );

  const filteredSkills = useMemo(() => {
    const query = slashQuery.trim().toLowerCase();
    if (!query) return allSkills;
    return allSkills.filter(
      (s) => s.name.toLowerCase().includes(query) || s.summary.toLowerCase().includes(query),
    );
  }, [allSkills, slashQuery]);

  const rootControlCount = useMemo(() => {
    const query = slashQuery.trim().toLowerCase();
    if (!query) return 5;
    const selectedModel = models.find((model) => model.value === modelId || model.id === modelId);
    const values = [
      `${t("assistant.slashMcp")} ${t("assistant.slashMcpUnavailableShort")}`,
      `${t("assistant.slashReasoning")} ${reasoningEffort ?? ""}`,
      `${t("assistant.slashModel")} ${selectedModel?.name ?? modelId}`,
      `${t("assistant.slashStatus")} ${runtimeStatus?.activityLabel ?? runtimeStatus?.status ?? ""}`,
      `${t("assistant.slashGoal")} ${goal || t("assistant.slashGoalEmpty")}`,
    ];
    return values.filter((value) => value.toLowerCase().includes(query)).length;
  }, [goal, modelId, models, reasoningEffort, runtimeStatus, slashQuery, t]);

  const rootSelectableCount = rootControlCount + filteredSkills.length;

  const closeSlashPanel = useCallback(() => {
    setSlashOpen(false);
    setSlashPage("root");
    setSlashSelectedIndex(0);
  }, []);

  const handleSlashSelect = useCallback((item: SkillSuggestionItem) => {
    composerEditorRef.current?.insertSkill(item);
    setSlashOpen(false);
    setSlashPage("root");
  }, []);

  const handleSlashPageChange = useCallback((page: SlashPanelPage) => {
    setSlashPage(page);
    setSlashSelectedIndex(0);
  }, []);

  const selectRootItem = useCallback(
    (index: number) => {
      if (index < rootControlCount) {
        const query = slashQuery.trim().toLowerCase();
        const rootKeys: SlashPanelPage[] = ["mcp", "reasoning", "model", "status", "goal"];
        const selectedModel = models.find(
          (model) => model.value === modelId || model.id === modelId,
        );
        const searchable = [
          `${t("assistant.slashMcp")} ${t("assistant.slashMcpUnavailableShort")}`,
          `${t("assistant.slashReasoning")} ${reasoningEffort ?? ""}`,
          `${t("assistant.slashModel")} ${selectedModel?.name ?? modelId}`,
          `${t("assistant.slashStatus")} ${runtimeStatus?.activityLabel ?? runtimeStatus?.status ?? ""}`,
          `${t("assistant.slashGoal")} ${goal || t("assistant.slashGoalEmpty")}`,
        ];
        const visibleKeys = query
          ? rootKeys.filter((_, keyIndex) => searchable[keyIndex]?.toLowerCase().includes(query))
          : rootKeys;
        const page = visibleKeys[index];
        if (page) handleSlashPageChange(page);
        return;
      }
      const skill = filteredSkills[index - rootControlCount];
      if (skill) handleSlashSelect(skill);
    },
    [
      filteredSkills,
      goal,
      handleSlashPageChange,
      handleSlashSelect,
      modelId,
      models,
      reasoningEffort,
      rootControlCount,
      runtimeStatus,
      slashQuery,
      t,
    ],
  );

  const handleSlashKeyDownCapture = useCallback(
    (e: KeyboardEvent) => {
      if (!slashOpen || slashPage === "goal") return;
      const count =
        slashPage === "root"
          ? rootSelectableCount
          : slashPage === "reasoning"
            ? shouldShowReasoningEffort
              ? reasoningEffortOptions.length
              : 0
            : slashPage === "model"
              ? models.length
              : 0;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (slashPage !== "root") handleSlashPageChange("root");
        else closeSlashPanel();
        return;
      }
      if (e.key === "ArrowLeft" && slashPage !== "root") {
        e.preventDefault();
        e.stopPropagation();
        handleSlashPageChange("root");
        return;
      }
      if (count === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSlashSelectedIndex((prev) => (prev + 1) % count);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSlashSelectedIndex((prev) => (prev - 1 + count) % count);
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        if (slashPage === "root") {
          selectRootItem(Math.min(slashSelectedIndex, count - 1));
        } else if (slashPage === "reasoning" && onReasoningEffortChange) {
          onReasoningEffortChange(
            reasoningEffortOptions[slashSelectedIndex]!.value as ReasoningEffort,
          );
          composerEditorRef.current?.clearSlashQuery();
          closeSlashPanel();
        } else if (slashPage === "model") {
          const model = models[slashSelectedIndex];
          if (model) onModelChange(model.value ?? model.id);
          composerEditorRef.current?.clearSlashQuery();
          closeSlashPanel();
        }
      }
    },
    [
      closeSlashPanel,
      handleSlashPageChange,
      models,
      onModelChange,
      onReasoningEffortChange,
      reasoningEffortOptions,
      rootSelectableCount,
      selectRootItem,
      shouldShowReasoningEffort,
      slashOpen,
      slashPage,
      slashSelectedIndex,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleSlashKeyDownCapture, true);
    return () => window.removeEventListener("keydown", handleSlashKeyDownCapture, true);
  }, [handleSlashKeyDownCapture]);

  // 同步检测斜杠命令 — 包装 onChange，在值变化时立即检测
  const handleEditorChange = useCallback(
    (newValue: string) => {
      onChange(newValue);

      if (disabled || readOnly) {
        setSlashOpen(false);
        return;
      }

      const activeSlashQuery = newValue.match(/(?:^|\s)\/([^\s/]*)$/u);
      if (activeSlashQuery) {
        setSlashOpen(true);
        setSlashQuery(activeSlashQuery[1] ?? "");
        setSlashPage("root");
        setSlashSelectedIndex(0);
        return;
      }
      setSlashOpen(false);
    },
    [onChange, disabled, readOnly],
  );

  // 检测输入值中的斜杠命令（后备：外部 value 变化时也检测）
  useEffect(() => {
    if (disabled || readOnly) {
      setSlashOpen(false);
      return;
    }
    const activeSlashQuery = value.match(/(?:^|\s)\/([^\s/]*)$/u);
    if (activeSlashQuery) {
      setSlashOpen(true);
      setSlashQuery(activeSlashQuery[1] ?? "");
      if (!slashOpen) setSlashPage("root");
      return;
    }
    setSlashOpen(false);
  }, [value, disabled, readOnly, slashOpen]);

  const modelTriggerPrefix = selectedModel ? (
    <ProviderIcon
      size={14}
      iconPath={selectedModel.providerIconPath}
    />
  ) : null;

  useLayoutEffect(() => {
    const container = inputContainerRef.current;
    if (!container) return;

    const syncHeight = () => {
      const nextHeight = Math.round(container.getBoundingClientRect().height);
      setPendingClearanceHeight((currentHeight) =>
        currentHeight === nextHeight ? currentHeight : nextHeight,
      );
    };

    syncHeight();

    if (typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(() => {
      syncHeight();
    });
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (bodyMode === "composer" && !readOnly && !isComposerLocked) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setMentionSuggestions(null);
    });
    return () => {
      cancelled = true;
    };
  }, [bodyMode, isComposerLocked, readOnly]);

  const getPlaceholder = () => {
    if (agentStatus === "waiting_answer")
      return t("writing.aiSidebar.inputPlaceholderWaitingAnswer");
    if (agentStatus === "waiting_approval")
      return t("writing.aiSidebar.inputPlaceholderWaitingApproval");
    return t("writing.aiSidebar.inputPlaceholder");
  };

  return (
    <Box className="ai-sidebar-input-area">
      <motion.div
        layout
        className="ai-sidebar-input-stage"
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence initial={false}>
          {mentionSuggestions ? (
            <AgentMentionSuggestions
              key="mention-suggestions"
              clearanceHeight={pendingClearanceHeight}
              items={mentionSuggestions.items}
              selectedIndex={mentionSuggestions.selectedIndex}
              status={mentionSuggestions.status}
              visible
              onSelect={mentionSuggestions.onSelect}
              onSelectedIndexChange={mentionSuggestions.onSelectedIndexChange}
              onClose={mentionSuggestions.onClose}
            />
          ) : null}
        </AnimatePresence>

        {/* 斜杠命令必须放在 input-container 外部；容器有 overflow:hidden */}
        {slashOpen && (
          <Box
            style={{
              position: "absolute",
              bottom: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 100,
            }}
          >
            <AgentSkillSuggestions
              items={filteredSkills}
              query={slashQuery}
              selectedIndex={Math.max(0, slashSelectedIndex)}
              isLoading={!skillsData}
              page={slashPage}
              modelId={modelId}
              models={models}
              reasoningEffort={reasoningEffort}
              reasoningSupported={shouldShowReasoningEffort}
              goal={goal}
              goalSaving={goalSaving}
              runtimeStatus={runtimeStatus}
              onPageChange={handleSlashPageChange}
              onSelectedIndexChange={setSlashSelectedIndex}
              onSelectSkill={handleSlashSelect}
              onModelChange={(nextModelId) => {
                onModelChange(nextModelId);
                composerEditorRef.current?.clearSlashQuery();
                closeSlashPanel();
              }}
              onReasoningEffortChange={(nextEffort) => {
                onReasoningEffortChange?.(nextEffort);
                composerEditorRef.current?.clearSlashQuery();
                closeSlashPanel();
              }}
              onGoalSave={async (nextGoal) => {
                await onGoalChange?.(nextGoal);
                composerEditorRef.current?.clearSlashQuery();
                closeSlashPanel();
              }}
            />
          </Box>
        )}

        <AnimatePresence initial={false}>
          {shouldShowPendingMessage ? (
            <AgentPendingMessageCard
              key={`pending-${pendingMessage!.messageId}`}
              pendingMessage={pendingMessage!}
              clearanceHeight={pendingClearanceHeight}
              onCancel={onCancelPendingMessage}
              onOpenMentionChapter={onOpenMentionChapter}
            />
          ) : null}
        </AnimatePresence>

        <motion.div
          ref={inputContainerRef}
          layout
          className="ai-sidebar-input-container"
          data-mode={bodyMode}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence
            initial={false}
            mode="wait"
          >
            {bodyMode === "special_panels" ? (
              <motion.div
                key="special-panels"
                className="ai-sidebar-input-body"
                data-mode="special_panels"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {specialPanels}
              </motion.div>
            ) : readOnly ? (
              <motion.div
                key="read-only"
                className="ai-sidebar-input-body"
                data-mode="read_only"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Box
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "var(--gray-a3)",
                    color: "var(--gray-11)",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  {readOnlyMessage}
                </Box>
              </motion.div>
            ) : (
              <motion.div
                key="composer"
                className="ai-sidebar-input-body"
                data-mode="composer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{ position: "relative" }}
              >
                <AgentComposerEditor
                  ref={composerEditorRef}
                  projectId={projectId}
                  skills={(skillsData?.items ?? []).filter((skill) => skill.isEnabled !== false)}
                  placeholder={getPlaceholder()}
                  value={value}
                  disabled={isComposerLocked}
                  onOpenMentionChapter={onOpenMentionChapter}
                  onMentionSuggestionsChange={setMentionSuggestions}
                  onChange={handleEditorChange}
                  onSubmit={onSend}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {readOnly ? null : (
        <Flex
          justify="between"
          align="center"
          gap="2"
        >
          <Flex
            align="center"
            gap="2"
            wrap="wrap"
            style={{ flex: "1 1 auto", minWidth: 0 }}
          >
            {isModelsLoading ? (
              <Flex
                align="center"
                gap="2"
                style={{ flex: "0 0 auto" }}
              >
                <Spinner size={18} />
                <Text
                  size="1"
                  color="gray"
                >
                  {t("common.loading")}
                </Text>
              </Flex>
            ) : models.length === 0 || modelsError ? (
              <Tooltip content={t("writing.aiSidebar.noModelsTooltip")}>
                <Flex
                  align="center"
                  gap="1"
                  className="ai-sidebar-no-models"
                >
                  <Text
                    size="1"
                    color="gray"
                  >
                    {t("writing.aiSidebar.noModelsMessage")}
                  </Text>
                  <button
                    type="button"
                    className="ai-sidebar-no-models-action"
                    onClick={onGoToSettings}
                  >
                    <Text
                      size="1"
                      className="ai-sidebar-no-models-action-text"
                    >
                      {t("writing.aiSidebar.noModelsAction")}
                    </Text>
                    <ExternalLink
                      size={12}
                      aria-hidden="true"
                    />
                  </button>
                </Flex>
              </Tooltip>
            ) : (
              <>
                {agentOptions.length > 0 && onAgentChange ? (
                  <Box
                    className="ai-sidebar-model-selector"
                    style={{ flex: "0 0 auto", minWidth: 0, marginRight: 4 }}
                  >
                    <SimpleSelect
                      value={agentKey ?? ""}
                      options={agentOptions}
                      onChange={onAgentChange}
                      size="1"
                      triggerPrefix={
                        <CircleUserRound
                          size={14}
                          aria-hidden="true"
                        />
                      }
                      hideTriggerChevron
                      triggerClassName="ai-sidebar-inline-select-trigger ai-sidebar-agent-select-trigger"
                      triggerStyle={{
                        fontSize: "12px",
                        border: "none",
                        background: "transparent",
                        boxShadow: "none",
                      }}
                    />
                  </Box>
                ) : null}
                <Flex
                  align="center"
                  gap="2"
                  className="ai-sidebar-model-reasoning-group"
                >
                  <Box
                    className="ai-sidebar-model-selector"
                    style={{ flex: "0 1 auto", minWidth: 0 }}
                  >
                    <ModelIdSelect
                      value={modelId}
                      models={models}
                      onChange={onModelChange}
                      editable={false}
                      allowCustomValue={false}
                      compact
                      triggerPrefix={modelTriggerPrefix}
                      hideTriggerChevron
                      triggerClassName="ai-sidebar-inline-select-trigger"
                      triggerStyle={{
                        fontSize: "12px",
                        border: "none",
                        background: "transparent",
                        boxShadow: "none",
                      }}
                    />
                  </Box>
                  {shouldShowReasoningEffort && reasoningEffort && onReasoningEffortChange ? (
                    <Box className="ai-sidebar-reasoning-effort-selector">
                      <SimpleSelect
                        value={reasoningEffort}
                        options={reasoningEffortOptions}
                        onChange={(value) => onReasoningEffortChange(value as ReasoningEffort)}
                        size="1"
                        hideTriggerChevron
                        triggerClassName="ai-sidebar-inline-select-trigger ai-sidebar-reasoning-effort-trigger"
                        triggerStyle={{
                          fontSize: "12px",
                          border: "none",
                          background: "transparent",
                          boxShadow: "none",
                        }}
                      />
                    </Box>
                  ) : null}
                </Flex>
              </>
            )}
          </Flex>

          <Flex
            align="center"
            gap="2"
          >
            <AgentIndexStatusIndicator projectId={projectId} />

            <Tooltip
              content={
                toolApprovalBypassEnabled
                  ? t("writing.aiSidebar.toolApprovalBypassOn")
                  : t("writing.aiSidebar.toolApprovalBypassOff")
              }
            >
              <IconButton
                type="button"
                variant="ghost"
                size="1"
                onClick={onToggleToolApprovalBypass}
                disabled={toolApprovalBypassDisabled}
                aria-pressed={toolApprovalBypassEnabled}
                aria-label={
                  toolApprovalBypassEnabled
                    ? t("writing.aiSidebar.toolApprovalBypassOn")
                    : t("writing.aiSidebar.toolApprovalBypassOff")
                }
                style={{
                  width: "26px",
                  height: "26px",
                  padding: 0,
                  borderRadius: "999px",
                  background: toolApprovalBypassEnabled ? "var(--green-a3)" : "transparent",
                  color: toolApprovalBypassEnabled ? "var(--green-11)" : "#111111",
                  border: "none",
                }}
              >
                <ShieldCheck size={14} />
              </IconButton>
            </Tooltip>

            <motion.div
              animate={{
                opacity: buttonActive ? 1 : 0.2,
                scale: 1,
              }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{ display: "flex" }}
            >
              <IconButton
                variant="solid"
                size="1"
                className="ai-sidebar-send-button"
                onClick={shouldAbort ? onAbort : onSend}
                disabled={shouldAbort ? false : !canSend}
                aria-disabled={!buttonActive || undefined}
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  opacity: 1,
                  pointerEvents: buttonActive ? undefined : "none",
                }}
              >
                {shouldAbort ? (
                  <Square
                    size={12}
                    fill="currentColor"
                  />
                ) : disabled ? (
                  <Spinner size={18} />
                ) : (
                  <ArrowUp size={14} />
                )}
              </IconButton>
            </motion.div>
          </Flex>
        </Flex>
      )}
    </Box>
  );
}
