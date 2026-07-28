import type { CSSProperties } from "react";

import type { ThemeMode, ThemePresetId } from "./settings.types";

export const DEFAULT_THEME_PRESET: ThemePresetId = "default";
export const DEFAULT_THEME_ACCENT_COLOR = "#6f5fa5";
export const DEFAULT_APP_BACKGROUND_COLOR = "#ffffff";
export const DEFAULT_EDITOR_BACKGROUND_COLOR = "#fffaf2";

export interface ThemePresetDefinition {
  id: Exclude<ThemePresetId, "custom">;
  labelKey: string;
  accent: Record<ThemeMode, string>;
  appBackground: Record<ThemeMode, string>;
  editorBackground: Record<ThemeMode, string>;
}

export const THEME_PRESETS: ThemePresetDefinition[] = [
  {
    id: "default",
    labelKey: "settings.themePresetDefault",
    accent: { light: "#000000", dark: "#ffffff" },
    appBackground: { light: "#ffffff", dark: "#111111" },
    editorBackground: { light: "#ffffff", dark: "#111111" },
  },
  {
    id: "paper",
    labelKey: "settings.themePresetPaper",
    accent: { light: "#8a5a2b", dark: "#d7a86e" },
    appBackground: { light: "#f7f2e8", dark: "#191612" },
    editorBackground: { light: "#fffaf0", dark: "#211c16" },
  },
  {
    id: "mist",
    labelKey: "settings.themePresetMist",
    accent: { light: "#4f6f8f", dark: "#86aed6" },
    appBackground: { light: "#edf3f7", dark: "#141b22" },
    editorBackground: { light: "#f7fafc", dark: "#17212b" },
  },
  {
    id: "mint",
    labelKey: "settings.themePresetMint",
    accent: { light: "#337c65", dark: "#65b99a" },
    appBackground: { light: "#edf5f0", dark: "#141c18" },
    editorBackground: { light: "#f7fbf8", dark: "#17231f" },
  },
  {
    id: "lavender",
    labelKey: "settings.themePresetLavender",
    accent: { light: "#6f5fa5", dark: "#a895db" },
    appBackground: { light: "#f2eef6", dark: "#19161f" },
    editorBackground: { light: "#faf7fc", dark: "#211d2a" },
  },
];

const THEME_PRESET_IDS = new Set<ThemePresetId>([
  ...THEME_PRESETS.map((preset) => preset.id),
  "custom",
]);

interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

export interface ResolvedThemeColors {
  accentColor: string;
  appBackgroundColor: string;
  editorBackgroundColor: string;
}

export interface ThemeCustomizationInput {
  themePreset: ThemePresetId;
  themeAccentColor: string;
  appBackgroundColor: string;
  editorBackgroundColor: string;
}

type ThemeCssProperties = CSSProperties & Record<`--${string}`, string>;

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function normalizeHexColor(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    const [red, green, blue] = normalized.slice(1);
    return `#${red}${red}${green}${green}${blue}${blue}`;
  }
  return fallback;
}

export function normalizeThemePreset(value: string | undefined): ThemePresetId {
  return value && THEME_PRESET_IDS.has(value as ThemePresetId)
    ? (value as ThemePresetId)
    : DEFAULT_THEME_PRESET;
}

export function hexToRgb(value: string): RgbColor {
  const normalized = normalizeHexColor(value, "#000000");
  return {
    red: Number.parseInt(normalized.slice(1, 3), 16),
    green: Number.parseInt(normalized.slice(3, 5), 16),
    blue: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHex(first: string, second: string, secondWeight: number): string {
  const firstRgb = hexToRgb(first);
  const secondRgb = hexToRgb(second);
  const weight = Math.min(1, Math.max(0, secondWeight));
  return rgbToHex(
    firstRgb.red + (secondRgb.red - firstRgb.red) * weight,
    firstRgb.green + (secondRgb.green - firstRgb.green) * weight,
    firstRgb.blue + (secondRgb.blue - firstRgb.blue) * weight,
  );
}

function withAlpha(value: string, opacity: number): string {
  const { red, green, blue } = hexToRgb(value);
  return `rgb(${red} ${green} ${blue} / ${opacity})`;
}

function getRelativeLuminance(value: string): number {
  const { red, green, blue } = hexToRgb(value);
  const channels = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

export function resolveThemeColors(
  customization: ThemeCustomizationInput,
  appearance: ThemeMode,
): ResolvedThemeColors {
  if (customization.themePreset === "custom") {
    return {
      accentColor: normalizeHexColor(customization.themeAccentColor, DEFAULT_THEME_ACCENT_COLOR),
      appBackgroundColor: normalizeHexColor(
        customization.appBackgroundColor,
        DEFAULT_APP_BACKGROUND_COLOR,
      ),
      editorBackgroundColor: normalizeHexColor(
        customization.editorBackgroundColor,
        DEFAULT_EDITOR_BACKGROUND_COLOR,
      ),
    };
  }

  const preset =
    THEME_PRESETS.find((candidate) => candidate.id === customization.themePreset) ??
    THEME_PRESETS[0]!;
  return {
    accentColor: preset.accent[appearance],
    appBackgroundColor: preset.appBackground[appearance],
    editorBackgroundColor: preset.editorBackground[appearance],
  };
}

export function createThemeCssVariables(
  customization: ThemeCustomizationInput,
  appearance: ThemeMode,
): ThemeCssProperties {
  const { accentColor, appBackgroundColor, editorBackgroundColor } = resolveThemeColors(
    customization,
    appearance,
  );
  const scaleWeights = [0.035, 0.07, 0.12, 0.18, 0.26, 0.36, 0.48, 0.64];
  const appIsDark = getRelativeLuminance(appBackgroundColor) < 0.42;
  const appForeground = appIsDark ? "#ffffff" : "#000000";
  const surfaceIsDark = getRelativeLuminance(editorBackgroundColor) < 0.42;
  const editorForeground = surfaceIsDark ? "#f5f5f5" : "#1b1b1d";
  const accentTextTarget = appearance === "dark" ? "#ffffff" : "#000000";
  const accentContrast = getRelativeLuminance(accentColor) > 0.46 ? "#111111" : "#ffffff";

  const properties: ThemeCssProperties = {
    "--color-background": appBackgroundColor,
    "--color-panel-solid": mixHex(appBackgroundColor, appForeground, appIsDark ? 0.035 : 0.018),
    "--color-panel-translucent": withAlpha(
      mixHex(appBackgroundColor, appForeground, appIsDark ? 0.045 : 0.025),
      0.88,
    ),
    "--color-surface": mixHex(appBackgroundColor, appForeground, appIsDark ? 0.055 : 0.028),
    "--gray-1": mixHex(appBackgroundColor, appForeground, appIsDark ? 0.025 : 0.012),
    "--gray-2": mixHex(appBackgroundColor, appForeground, appIsDark ? 0.045 : 0.025),
    "--gray-3": mixHex(appBackgroundColor, appForeground, appIsDark ? 0.075 : 0.055),
    "--gray-4": mixHex(appBackgroundColor, appForeground, appIsDark ? 0.11 : 0.085),
    "--accent-9": accentColor,
    "--accent-10": mixHex(accentColor, accentTextTarget, 0.09),
    "--accent-11": mixHex(accentColor, accentTextTarget, appearance === "dark" ? 0.28 : 0.2),
    "--accent-12": mixHex(accentColor, accentTextTarget, appearance === "dark" ? 0.58 : 0.5),
    "--accent-contrast": accentContrast,
    "--accent-surface": withAlpha(accentColor, appearance === "dark" ? 0.16 : 0.1),
    "--writing-editor-background": editorBackgroundColor,
    "--writing-editor-foreground": editorForeground,
    "--writing-editor-muted": mixHex(editorBackgroundColor, editorForeground, 0.56),
    "--writing-editor-border": withAlpha(editorForeground, 0.14),
    "--writing-editor-selection": withAlpha(accentColor, 0.2),
  };

  scaleWeights.forEach((weight, index) => {
    properties[`--accent-${index + 1}`] = mixHex(appBackgroundColor, accentColor, weight);
  });

  const alphaWeights = [0.025, 0.055, 0.1, 0.15, 0.22, 0.32, 0.44, 0.58, 0.92, 0.96, 0.98, 1];
  alphaWeights.forEach((opacity, index) => {
    properties[`--accent-a${index + 1}`] = withAlpha(accentColor, opacity);
  });

  return properties;
}
