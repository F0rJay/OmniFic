import {
  ArrowLeft,
  Box as Cube,
  Brain,
  Check,
  ChevronRight,
  CircleGauge,
  Flag,
  Network,
  PackageOpen,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ModelIdSelectOption } from "@/components";
import { Spinner } from "@/components";
import { getModelValue } from "@/components/model-id-select";
import { ProviderIcon } from "@/features/settings/lib/provider-icons";
import type { ReasoningEffort } from "@/lib/agent.types";
import type { Skill } from "@/lib/skill.types";

import type { AgentRuntimeStatusInfo } from "./agent-runtime-status.types";
import { useElapsedDuration } from "./use-elapsed-duration";

import "./agent-skill-suggestions.css";

export type SkillSuggestionItem = Pick<Skill, "id" | "name" | "summary" | "source">;
export type SlashPanelPage = "root" | "mcp" | "reasoning" | "model" | "status" | "goal";

interface AgentSkillSuggestionsProps {
  items: SkillSuggestionItem[];
  query: string;
  selectedIndex: number;
  isLoading: boolean;
  page: SlashPanelPage;
  modelId: string;
  models: ModelIdSelectOption[];
  reasoningEffort?: ReasoningEffort;
  reasoningSupported: boolean;
  goal: string;
  goalSaving: boolean;
  runtimeStatus?: AgentRuntimeStatusInfo;
  onPageChange: (page: SlashPanelPage) => void;
  onSelectedIndexChange: (index: number) => void;
  onSelectSkill: (item: SkillSuggestionItem) => void;
  onModelChange: (modelId: string) => void;
  onReasoningEffortChange?: (value: ReasoningEffort) => void;
  onGoalSave: (goal: string) => Promise<void>;
}

const REASONING_OPTIONS: ReasoningEffort[] = ["low", "medium", "high", "xhigh", "max"];

export function AgentSkillSuggestions({
  items,
  query,
  selectedIndex,
  isLoading,
  page,
  modelId,
  models,
  reasoningEffort,
  reasoningSupported,
  goal,
  goalSaving,
  runtimeStatus,
  onPageChange,
  onSelectedIndexChange,
  onSelectSkill,
  onModelChange,
  onReasoningEffortChange,
  onGoalSave,
}: AgentSkillSuggestionsProps) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const goalInputRef = useRef<HTMLTextAreaElement>(null);
  const [goalDraft, setGoalDraft] = useState(goal);
  const elapsed = useElapsedDuration(
    runtimeStatus?.runStartedAt,
    runtimeStatus?.status === "running",
  );
  const selectedModel = models.find((model) => getModelValue(model) === modelId);

  useEffect(() => {
    if (page !== "goal") setGoalDraft(goal);
  }, [goal, page]);

  useEffect(() => {
    if (page === "goal") goalInputRef.current?.focus();
  }, [page]);

  const rootRows = useMemo(
    () => [
      {
        key: "mcp" as const,
        icon: <Network size={15} />,
        label: t("assistant.slashMcp"),
        value: t("assistant.slashMcpUnavailableShort"),
      },
      {
        key: "reasoning" as const,
        icon: <Brain size={15} />,
        label: t("assistant.slashReasoning"),
        value: reasoningSupported
          ? t(`assistant.reasoning.${reasoningEffort ?? "medium"}`)
          : t("assistant.slashUnavailable"),
      },
      {
        key: "model" as const,
        icon: <PackageOpen size={15} />,
        label: t("assistant.slashModel"),
        value: selectedModel?.name ?? modelId,
      },
      {
        key: "status" as const,
        icon: <CircleGauge size={15} />,
        label: t("assistant.slashStatus"),
        value: getRuntimeStatusSummary(runtimeStatus, elapsed, t),
      },
      {
        key: "goal" as const,
        icon: <Flag size={15} />,
        label: t("assistant.slashGoal"),
        value: goal || t("assistant.slashGoalEmpty"),
      },
    ],
    [
      goal,
      modelId,
      reasoningEffort,
      reasoningSupported,
      runtimeStatus,
      elapsed,
      selectedModel?.name,
      t,
    ],
  );

  const filteredRootRows = query
    ? rootRows.filter((row) =>
        `${row.label} ${row.value}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      )
    : rootRows;
  const visibleRootCount = filteredRootRows.length;
  const totalRootCount = visibleRootCount + items.length;

  useEffect(() => {
    if (page !== "root") return;
    const element = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`) as
      | HTMLElement
      | undefined;
    element?.scrollIntoView({ block: "nearest" });
  }, [page, selectedIndex]);

  useEffect(() => {
    const selectableCount =
      page === "root"
        ? totalRootCount
        : page === "reasoning"
          ? reasoningSupported
            ? REASONING_OPTIONS.length
            : 0
          : page === "model"
            ? models.length
            : 0;
    if (selectableCount <= 0) return;
    onSelectedIndexChange(Math.min(selectedIndex, selectableCount - 1));
  }, [
    models.length,
    onSelectedIndexChange,
    page,
    reasoningSupported,
    selectedIndex,
    totalRootCount,
  ]);

  const openRootItem = (key: SlashPanelPage) => {
    onSelectedIndexChange(0);
    onPageChange(key);
  };

  if (page === "goal") {
    return (
      <div className="agent-skill-suggestions">
        <PanelHeader
          title={t("assistant.slashGoal")}
          onBack={() => onPageChange("root")}
        />
        <div className="agent-slash-goal-editor">
          <textarea
            ref={goalInputRef}
            value={goalDraft}
            maxLength={4000}
            placeholder={t("assistant.slashGoalPlaceholder")}
            onChange={(event) => setGoalDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onPageChange("root");
              }
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void onGoalSave(goalDraft);
              }
            }}
          />
          <div className="agent-slash-goal-actions">
            <button
              type="button"
              className="agent-slash-secondary-button"
              disabled={goalSaving || !goal}
              onClick={() => void onGoalSave("")}
            >
              {t("assistant.slashGoalClear")}
            </button>
            <button
              type="button"
              className="agent-slash-primary-button"
              disabled={goalSaving}
              onClick={() => void onGoalSave(goalDraft)}
            >
              {goalSaving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (page === "mcp") {
    return (
      <div className="agent-skill-suggestions">
        <PanelHeader
          title={t("assistant.slashMcp")}
          onBack={() => onPageChange("root")}
        />
        <div className="agent-slash-info-state">
          <Network size={22} />
          <strong>{t("assistant.slashMcpUnavailableTitle")}</strong>
          <span>{t("assistant.slashMcpUnavailableDescription")}</span>
        </div>
      </div>
    );
  }

  if (page === "reasoning") {
    return (
      <ChoicePage
        title={t("assistant.slashReasoning")}
        selectedIndex={selectedIndex}
        onBack={() => onPageChange("root")}
        emptyText={t("assistant.slashReasoningUnsupported")}
        items={
          reasoningSupported
            ? REASONING_OPTIONS.map((option) => ({
                key: option,
                label: t(`assistant.reasoning.${option}`),
                selected: option === reasoningEffort,
                onSelect: () => onReasoningEffortChange?.(option),
              }))
            : []
        }
        onHover={onSelectedIndexChange}
      />
    );
  }

  if (page === "model") {
    return (
      <ChoicePage
        title={t("assistant.slashModel")}
        selectedIndex={selectedIndex}
        onBack={() => onPageChange("root")}
        emptyText={t("writing.aiSidebar.noModelsMessage")}
        items={models.map((model) => ({
          key: getModelValue(model),
          label: model.name ?? getModelValue(model),
          selected: getModelValue(model) === modelId,
          prefix: (
            <ProviderIcon
              size={14}
              iconPath={model.providerIconPath}
            />
          ),
          onSelect: () => onModelChange(getModelValue(model)),
        }))}
        onHover={onSelectedIndexChange}
      />
    );
  }

  if (page === "status") {
    return (
      <RuntimeStatusPanel
        status={runtimeStatus}
        elapsed={elapsed}
        onBack={() => onPageChange("root")}
      />
    );
  }

  return (
    <div className="agent-skill-suggestions">
      <div
        ref={listRef}
        className="agent-skill-suggestions-list agent-slash-root-list"
      >
        {filteredRootRows.map((row, index) => (
          <button
            key={row.key}
            type="button"
            data-index={index}
            className="agent-skill-suggestion-item agent-slash-control-item"
            data-selected={index === selectedIndex}
            onClick={() => openRootItem(row.key)}
            onMouseEnter={() => onSelectedIndexChange(index)}
          >
            <span className="agent-skill-suggestion-icon">{row.icon}</span>
            <span className="agent-skill-suggestion-name">{row.label}</span>
            <span className="agent-slash-control-value">{row.value}</span>
            <ChevronRight
              size={14}
              className="agent-slash-chevron"
            />
          </button>
        ))}

        <div className="agent-skill-suggestions-title">{t("assistant.slashSkillsTitle")}</div>
        {isLoading ? (
          <div className="agent-skill-suggestions-state">
            <Spinner size={12} />
            <span>{t("common.loading")}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="agent-skill-suggestions-state">
            {query ? t("assistant.slashNoMatch") : t("assistant.slashNoSkills")}
          </div>
        ) : (
          items.map((item, itemIndex) => {
            const index = visibleRootCount + itemIndex;
            return (
              <button
                key={item.id}
                type="button"
                data-index={index}
                className="agent-skill-suggestion-item"
                data-selected={index === selectedIndex}
                onClick={() => onSelectSkill(item)}
                onMouseEnter={() => onSelectedIndexChange(index)}
              >
                <span className="agent-skill-suggestion-icon">
                  <Cube size={15} />
                </span>
                <span className="agent-skill-suggestion-copy">
                  <span className="agent-skill-suggestion-name">{item.name}</span>
                  {item.summary ? (
                    <span className="agent-skill-suggestion-summary">{item.summary}</span>
                  ) : null}
                </span>
                <span className="agent-skill-suggestion-source">
                  {item.source === "custom"
                    ? t("assistant.slashSourcePersonal")
                    : t("assistant.slashSourceBuiltin")}
                </span>
              </button>
            );
          })
        )}
        {totalRootCount === 0 && !isLoading ? (
          <div className="agent-skill-suggestions-state">{t("assistant.slashNoCommandMatch")}</div>
        ) : null}
      </div>
    </div>
  );
}

function getRuntimeStatusSummary(
  status: AgentRuntimeStatusInfo | undefined,
  elapsed: string,
  t: (key: string) => string,
): string {
  if (!status?.taskId) return t("assistant.slashRuntimeNoTask");
  if (status.status === "running") {
    const activity = status.activityLabel || t("assistant.slashRuntimeRunning");
    return elapsed ? `${activity} · ${elapsed}` : activity;
  }
  if (status.status === "waiting_answer") return t("assistant.slashRuntimeWaitingAnswer");
  if (status.status === "waiting_approval") return t("assistant.slashRuntimeWaitingApproval");
  if (status.status === "error") return t("assistant.slashRuntimeError");
  if (status.status === "completed") return t("assistant.slashRuntimeCompleted");
  return t("assistant.slashRuntimeReady");
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.max(0, value));
}

function RuntimeStatusPanel({
  status,
  elapsed,
  onBack,
}: {
  status?: AgentRuntimeStatusInfo;
  elapsed: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const contextLength = status?.contextLength ?? 0;
  const contextInput = status?.contextInputTokens ?? 0;
  const contextPercent =
    contextLength > 0 ? Math.min(100, (contextInput / contextLength) * 100) : 0;
  const copyId = async (value: string | null | undefined) => {
    if (!value || !navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="agent-skill-suggestions">
      <PanelHeader
        title={t("assistant.slashStatus")}
        onBack={onBack}
      />
      <div className="agent-slash-status-panel">
        <div className="agent-slash-status-now">
          <span>{getRuntimeStatusSummary(status, elapsed, t)}</span>
        </div>
        <div className="agent-slash-status-section">
          <StatusRow
            label={t("assistant.slashRuntimeTaskId")}
            value={status?.taskId ?? "—"}
            onCopy={status?.taskId ? () => void copyId(status.taskId) : undefined}
          />
          <StatusRow
            label={t("assistant.slashRuntimeSessionId")}
            value={status?.sessionId ?? "—"}
            onCopy={status?.sessionId ? () => void copyId(status.sessionId) : undefined}
          />
        </div>
        <div className="agent-slash-status-section">
          <StatusRow
            label={t("assistant.slashRuntimeContext")}
            value={`${formatTokenCount(contextInput)} / ${formatTokenCount(contextLength)} (${contextPercent.toFixed(1)}%)`}
          />
          <div
            className="agent-slash-context-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(contextPercent)}
            data-level={
              contextPercent >= 90 ? "danger" : contextPercent >= 75 ? "warning" : "normal"
            }
          >
            <span style={{ width: `${contextPercent}%` }} />
          </div>
          <StatusRow
            label="Input / Output / Cache"
            value={`${formatTokenCount(status?.tokenInput ?? 0)} / ${formatTokenCount(status?.tokenOutput ?? 0)} / ${formatTokenCount(status?.tokenCache ?? 0)}`}
          />
        </div>
        <div className="agent-slash-status-section">
          <StatusRow
            label={t("assistant.slashRuntimeRateLimits")}
            value={t("assistant.slashRuntimeRateUnavailable")}
          />
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="agent-slash-status-row">
      <span>{label}</span>
      <code title={value}>{value}</code>
      {onCopy ? (
        <button
          type="button"
          onClick={onCopy}
          aria-label={`${label}: ${value}`}
        >
          {"⧉"}
        </button>
      ) : null}
    </div>
  );
}

function PanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="agent-slash-panel-header">
      <button
        type="button"
        onClick={onBack}
        aria-label={title}
      >
        <ArrowLeft size={14} />
      </button>
      <span>{title}</span>
    </div>
  );
}

interface ChoiceItem {
  key: string;
  label: string;
  selected: boolean;
  disabled?: boolean;
  prefix?: React.ReactNode;
  onSelect: () => void;
}

function ChoicePage({
  title,
  items,
  selectedIndex,
  emptyText,
  onBack,
  onHover,
}: {
  title: string;
  items: ChoiceItem[];
  selectedIndex: number;
  emptyText: string;
  onBack: () => void;
  onHover: (index: number) => void;
}) {
  return (
    <div className="agent-skill-suggestions">
      <PanelHeader
        title={title}
        onBack={onBack}
      />
      <div className="agent-skill-suggestions-list">
        {items.length === 0 ? (
          <div className="agent-skill-suggestions-state">{emptyText}</div>
        ) : (
          items.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className="agent-skill-suggestion-item agent-slash-choice-item"
              data-selected={index === selectedIndex}
              disabled={item.disabled}
              onMouseEnter={() => onHover(index)}
              onClick={item.onSelect}
            >
              <span className="agent-skill-suggestion-icon">{item.prefix}</span>
              <span className="agent-skill-suggestion-name">{item.label}</span>
              {item.selected ? (
                <Check
                  size={14}
                  className="agent-slash-check"
                />
              ) : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
