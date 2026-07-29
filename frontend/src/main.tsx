// Modified by OmniFic contributors from OpenFic v0.7.5.
import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { lazy, StrictMode, Suspense, useState, useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route } from "react-router";

import App from "./App.tsx";
import { GlobalLoading } from "./components";
import { Toaster } from "./components/toaster";
import { AppLayout } from "./features/app-shell";
import { CharactersPage } from "./features/characters";
import { PromptChainsPage } from "./features/prompt-chains";
import { fetchSettings } from "./features/settings/lib/settings-api";
import {
  DEFAULT_APP_BACKGROUND_COLOR,
  DEFAULT_EDITOR_BACKGROUND_COLOR,
  DEFAULT_THEME_ACCENT_COLOR,
  DEFAULT_THEME_PRESET,
  createThemeCssVariables,
} from "./features/settings/lib/theme-customization";
import { WorldInfoPage } from "./features/world-info";
import { WritingPage } from "./features/writing";
import { checkHealth } from "./lib/api-client";
import { publishDesktopAppearance } from "./lib/desktop-appearance-bridge";
import { applyCodeFontFamily, applyFontFamily, loadConfiguredFonts } from "./lib/font-utils";
import { getOrCreateRoot } from "./lib/get-or-create-root";
import { loadRuntimeConfig } from "./lib/runtime-config";
import { connectSocket } from "./lib/socket-client";
import { preloadTiktokenEncoding } from "./lib/tiktoken-utils";
import { registerSW } from "./pwa/register-sw";

import "streamdown/styles.css";
import "./styles/index.css";

// 初始化 i18n
import "./i18n";

/* oxlint-disable react-refresh/only-export-components */
// 创建 QueryClient 实例（保持在组件外部以避免重新创建）
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 分钟
      retry: 1,
    },
  },
});

const FRONTEND_VERSION = __OMNIFIC_FRONTEND_VERSION__;
const STARTUP_TASK_TIMEOUT_MS = 30_000;

function withStartupTimeout<T>(label: string, task: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`${label}超时（${STARTUP_TASK_TIMEOUT_MS / 1000} 秒）`)),
      STARTUP_TASK_TIMEOUT_MS,
    );
  });
  return Promise.race([task, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

const DashboardPage = lazy(() =>
  import("./features/dashboard/pages/dashboard-page").then((module) => ({
    default: module.DashboardPage,
  })),
);

function AppContent({
  appearance,
  version,
  setAppearance,
  toggleTheme,
}: {
  appearance: "light" | "dark";
  version: string;
  setAppearance: (appearance: "light" | "dark") => void;
  toggleTheme: () => void;
}) {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <AppLayout
              appearance={appearance}
              version={version}
              onAppearanceChange={setAppearance}
              onToggleTheme={toggleTheme}
            />
          }
        >
          <Route
            path="/"
            element={<App />}
          />
          <Route
            path="/projects/:projectId"
            element={<WritingPage />}
          />
          <Route
            path="/world-info"
            element={<WorldInfoPage />}
          />
          <Route
            path="/characters"
            element={<CharactersPage />}
          />
          <Route
            path="/prompt-chains"
            element={<PromptChainsPage />}
          />
          <Route
            path="/dashboard"
            element={
              <Suspense fallback={null}>
                <DashboardPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function AppRoot() {
  const [appearance, setAppearance] = useState<"light" | "dark">("light");
  const [runtimeConfigReady, setRuntimeConfigReady] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTheme = () => {
    setAppearance((prev) => (prev === "light" ? "dark" : "light"));
  };

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 60 * 1000,
    enabled: runtimeConfigReady,
  });

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        await withStartupTimeout("读取运行时配置", loadRuntimeConfig());
        if (mounted) setRuntimeConfigReady(true);

        const startupTasks = [
          {
            label: "读取设置",
            task: withStartupTimeout(
              "读取设置",
              queryClient.prefetchQuery({ queryKey: ["settings"], queryFn: fetchSettings }),
            ),
          },
          { label: "检查本地服务", task: withStartupTimeout("检查本地服务", checkHealth()) },
          { label: "连接实时服务", task: withStartupTimeout("连接实时服务", connectSocket()) },
        ];
        const results = await Promise.allSettled(startupTasks.map(({ task }) => task));
        const failures = results.flatMap((result, index) => {
          if (result.status !== "rejected") return [];
          const detail =
            result.reason instanceof Error ? result.reason.message : String(result.reason);
          return [`${startupTasks[index].label}失败：${detail}`];
        });
        if (failures.length) {
          throw new Error(failures.join("；"));
        }

        // Token counting improves editor features but must never block the entire
        // workspace when a dynamically imported encoding fails to load.
        void preloadTiktokenEncoding().catch((preloadError) => {
          console.warn(
            "Tiktoken preload failed; token estimation fallback remains active:",
            preloadError,
          );
        });

        if (mounted) {
          setError(null);
          setIsReady(true);
        }
      } catch (initializationError) {
        if (mounted) {
          const detail =
            initializationError instanceof Error
              ? initializationError.message
              : String(initializationError);
          setError(`初始化失败：${detail}`);
        }
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!settings) return;
    setAppearance(settings.theme);
    applyFontFamily(settings.fontFamily);
    applyCodeFontFamily(settings.codeFontFamily);
    void loadConfiguredFonts(settings.fontFamily, settings.codeFontFamily);
  }, [settings]);

  useEffect(() => {
    publishDesktopAppearance({
      appearance,
      fontFamily: settings?.fontFamily,
      codeFontFamily: settings?.codeFontFamily,
    });
  }, [appearance, settings?.fontFamily, settings?.codeFontFamily]);

  const themeCssVariables = useMemo(
    () =>
      createThemeCssVariables(
        {
          themePreset: settings?.themePreset ?? DEFAULT_THEME_PRESET,
          themeAccentColor: settings?.themeAccentColor ?? DEFAULT_THEME_ACCENT_COLOR,
          appBackgroundColor: settings?.appBackgroundColor ?? DEFAULT_APP_BACKGROUND_COLOR,
          editorBackgroundColor: settings?.editorBackgroundColor ?? DEFAULT_EDITOR_BACKGROUND_COLOR,
        },
        appearance,
      ),
    [
      appearance,
      settings?.appBackgroundColor,
      settings?.editorBackgroundColor,
      settings?.themeAccentColor,
      settings?.themePreset,
    ],
  );

  return (
    <MotionConfig reducedMotion="user">
      <Theme
        appearance={appearance}
        accentColor="gray"
        grayColor="gray"
        radius="medium"
        scaling="100%"
        style={themeCssVariables}
      >
        {!isReady ? (
          <GlobalLoading
            error={error}
            onRetry={() => window.location.reload()}
          />
        ) : (
          <AppContent
            appearance={appearance}
            version={FRONTEND_VERSION}
            setAppearance={setAppearance}
            toggleTheme={toggleTheme}
          />
        )}
      </Theme>
      {isReady ? <Toaster appearance={appearance} /> : null}
    </MotionConfig>
  );
}

function Root() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppRoot />
      </QueryClientProvider>
    </StrictMode>
  );
}

registerSW();

getOrCreateRoot(document.getElementById("root")!).render(<Root />);
