import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { lazy, StrictMode, Suspense, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router";

import App from "./App.tsx";
import { GlobalLoading } from "./components";
import { Toaster } from "./components/toaster";
import { AppLayout } from "./features/app-shell";
import { CharactersPage } from "./features/characters";
import { PromptChainsPage } from "./features/prompt-chains";
import { fetchSettings } from "./features/settings/lib/settings-api";
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
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(false);

  const toggleTheme = () => {
    setAppearance((prev) => (prev === "light" ? "dark" : "light"));
  };

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;
    const startTime = Date.now();

    const initializeApp = async () => {
      try {
        await loadRuntimeConfig();

        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ["settings"],
            queryFn: fetchSettings,
          }),
          checkHealth(),
          preloadTiktokenEncoding(),
          connectSocket(),
        ]);

        if (mounted) {
          setIsReady(true);
        }
      } catch {
        if (mounted) {
          if (Date.now() - startTime > 30000) {
            setError(true);
            return;
          }
          timer = setTimeout(initializeApp, 500);
        }
      }
    };

    initializeApp();

    return () => {
      mounted = false;
      clearTimeout(timer);
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

  return (
    <>
      <Theme
        appearance={appearance}
        accentColor="gray"
        grayColor="gray"
        radius="medium"
        scaling="100%"
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
    </>
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
