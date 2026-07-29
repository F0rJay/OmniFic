// Modified by OmniFic contributors from OpenFic v0.7.5.
import type { ThemeMode } from "@/features/settings/lib/settings.types";

export interface DesktopAppearancePayload {
  appearance?: ThemeMode;
  fontFamily?: string;
  codeFontFamily?: string;
}

declare global {
  interface Window {
    omnificDesktopHost?: {
      publishAppearance: (payload: DesktopAppearancePayload) => void;
    };
  }
}

export function publishDesktopAppearance(payload: DesktopAppearancePayload): void {
  window.omnificDesktopHost?.publishAppearance(payload);
}
