// Modified by OmniFic contributors from OpenFic v0.7.5.
/**
 * General Settings Component
 *
 * 通用设置面板，包含语言、主题、字体设置。
 */

import { Box, Button, Flex, Text, SegmentedControl } from "@radix-ui/themes";
import { Check, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LabeledSelect } from "@/components/select";
import { supportedLanguages, type LanguageCode } from "@/i18n";

import type { Settings, ThemeMode, ThemePresetId } from "../lib/settings.types";
import { getCodeFontOptions, getFontOptions } from "../lib/settings.types";
import {
  DEFAULT_APP_BACKGROUND_COLOR,
  DEFAULT_EDITOR_BACKGROUND_COLOR,
  DEFAULT_THEME_ACCENT_COLOR,
  THEME_PRESETS,
  resolveThemeColors,
} from "../lib/theme-customization";
import { ThemeColorField } from "./theme-color-field";

import "./general-settings.css";

interface GeneralSettingsProps {
  /** 当前设置 */
  settings: Settings;
  /** 设置变更回调 */
  onSettingsChange: (settings: Settings) => void;
  isSaving?: boolean;
}

export function GeneralSettings({
  settings,
  onSettingsChange,
  isSaving = false,
}: GeneralSettingsProps) {
  const { t } = useTranslation();

  /** 更新语言 */
  const handleLanguageChange = (language: string) => {
    onSettingsChange({ ...settings, language: language as LanguageCode });
  };

  /** 更新主题 */
  const handleThemeChange = (theme: string) => {
    onSettingsChange({ ...settings, theme: theme as ThemeMode });
  };

  const handleThemePresetChange = (themePreset: ThemePresetId) => {
    onSettingsChange({ ...settings, themePreset });
  };

  const handleCustomColorChange = (
    field: "themeAccentColor" | "appBackgroundColor" | "editorBackgroundColor",
    value: string,
  ) => {
    onSettingsChange({ ...settings, themePreset: "custom", [field]: value });
  };

  const handleThemeReset = () => {
    onSettingsChange({
      ...settings,
      themePreset: "default",
      themeAccentColor: DEFAULT_THEME_ACCENT_COLOR,
      appBackgroundColor: DEFAULT_APP_BACKGROUND_COLOR,
      editorBackgroundColor: DEFAULT_EDITOR_BACKGROUND_COLOR,
    });
  };

  /** 更新字体 */
  const handleFontChange = (fontFamily: string) => {
    onSettingsChange({ ...settings, fontFamily });
  };

  /** 更新代码字体 */
  const handleCodeFontChange = (codeFontFamily: string) => {
    onSettingsChange({ ...settings, codeFontFamily });
  };

  const customPreviewColors = resolveThemeColors(
    { ...settings, themePreset: "custom" },
    settings.theme,
  );

  return (
    <Box className="general-settings">
      <Flex
        direction="column"
        gap="5"
      >
        {/* 语言设置 */}
        <LabeledSelect
          label={t("settings.language")}
          value={settings.language}
          options={supportedLanguages.map((lang) => ({
            value: lang.code,
            label: lang.name,
          }))}
          onChange={handleLanguageChange}
          disabled={isSaving}
          triggerStyle={{ width: 200 }}
        />

        {/* 主题设置 */}
        <Flex
          direction="column"
          gap="3"
          className="general-settings__theme-section"
        >
          <Text
            size="2"
            weight="medium"
            color="gray"
          >
            {t("settings.theme")}
          </Text>
          <SegmentedControl.Root
            value={settings.theme}
            onValueChange={handleThemeChange}
            disabled={isSaving}
            style={{ width: 200 }}
          >
            <SegmentedControl.Item value="light">{t("settings.themeLight")}</SegmentedControl.Item>
            <SegmentedControl.Item value="dark">{t("settings.themeDark")}</SegmentedControl.Item>
          </SegmentedControl.Root>

          <Flex
            align="center"
            justify="between"
            gap="3"
            className="general-settings__theme-heading"
          >
            <Box>
              <Text
                as="div"
                size="2"
                weight="medium"
              >
                {t("settings.themeColors")}
              </Text>
              <Text
                as="div"
                size="1"
                color="gray"
                mt="1"
              >
                {t("settings.themeColorsDescription")}
              </Text>
            </Box>
            <Button
              size="1"
              variant="soft"
              color="gray"
              disabled={isSaving}
              onClick={handleThemeReset}
            >
              <RotateCcw size={13} />
              {t("settings.themeReset")}
            </Button>
          </Flex>

          <div className="theme-preset-grid">
            {THEME_PRESETS.map((preset) => {
              const selected = settings.themePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className="theme-preset-card"
                  data-selected={selected ? "true" : "false"}
                  disabled={isSaving}
                  aria-pressed={selected}
                  onClick={() => handleThemePresetChange(preset.id)}
                >
                  <span
                    className="theme-preset-card__preview"
                    style={{ background: preset.appBackground[settings.theme] }}
                  >
                    <span
                      className="theme-preset-card__accent"
                      style={{ background: preset.accent[settings.theme] }}
                    />
                    <span
                      className="theme-preset-card__paper"
                      style={{ background: preset.editorBackground[settings.theme] }}
                    >
                      <span className="theme-preset-card__line theme-preset-card__line--long" />
                      <span className="theme-preset-card__line" />
                    </span>
                  </span>
                  <span className="theme-preset-card__label">{t(preset.labelKey)}</span>
                  {selected ? (
                    <span className="theme-preset-card__check">
                      <Check size={12} />
                    </span>
                  ) : null}
                </button>
              );
            })}

            <button
              type="button"
              className="theme-preset-card"
              data-selected={settings.themePreset === "custom" ? "true" : "false"}
              disabled={isSaving}
              aria-pressed={settings.themePreset === "custom"}
              onClick={() => handleThemePresetChange("custom")}
            >
              <span
                className="theme-preset-card__preview theme-preset-card__preview--custom"
                style={{ background: customPreviewColors.appBackgroundColor }}
              >
                <span
                  className="theme-preset-card__accent"
                  style={{ background: customPreviewColors.accentColor }}
                />
                <span
                  className="theme-preset-card__paper theme-preset-card__paper--custom"
                  style={{ background: customPreviewColors.editorBackgroundColor }}
                >
                  <span className="theme-preset-card__spectrum" />
                </span>
              </span>
              <span className="theme-preset-card__label">{t("settings.themePresetCustom")}</span>
              {settings.themePreset === "custom" ? (
                <span className="theme-preset-card__check">
                  <Check size={12} />
                </span>
              ) : null}
            </button>
          </div>

          {settings.themePreset === "custom" ? (
            <div className="theme-custom-panel">
              <ThemeColorField
                label={t("settings.themeAccentColor")}
                value={settings.themeAccentColor}
                disabled={isSaving}
                onChange={(value) => handleCustomColorChange("themeAccentColor", value)}
              />
              <ThemeColorField
                label={t("settings.appBackgroundColor")}
                value={settings.appBackgroundColor}
                disabled={isSaving}
                onChange={(value) => handleCustomColorChange("appBackgroundColor", value)}
              />
              <ThemeColorField
                label={t("settings.editorBackgroundColor")}
                value={settings.editorBackgroundColor}
                disabled={isSaving}
                onChange={(value) => handleCustomColorChange("editorBackgroundColor", value)}
              />
              <Text
                as="div"
                size="1"
                color="gray"
                className="theme-custom-panel__hint"
              >
                {t("settings.themeContrastHint")}
              </Text>
            </div>
          ) : null}
        </Flex>

        {/* 字体设置 */}
        <LabeledSelect
          label={t("settings.fontFamily")}
          value={settings.fontFamily}
          options={getFontOptions(t)}
          onChange={handleFontChange}
          disabled={isSaving}
          triggerStyle={{ width: 200 }}
        />

        {/* 代码字体设置 */}
        <LabeledSelect
          label={t("settings.codeFontFamily")}
          value={settings.codeFontFamily || "JetBrainsMapleMono"}
          options={getCodeFontOptions(t)}
          onChange={handleCodeFontChange}
          disabled={isSaving}
          triggerStyle={{ width: 200 }}
        />
      </Flex>
    </Box>
  );
}
