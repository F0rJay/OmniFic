import { useEffect, type RefObject } from "react";

interface FrontendPageProps {
  webviewKey: number;
  partition: string;
  webviewRef: RefObject<HTMLElement | null>;
  onDiagnostic: (message: string) => void;
}

interface WebviewLoadFailureEvent extends Event {
  errorCode: number;
  errorDescription: string;
  validatedURL: string;
}

interface WebviewRenderProcessGoneEvent extends Event {
  reason: string;
  exitCode: number;
}

interface WebviewConsoleMessageEvent extends Event {
  level: number;
  message: string;
  line: number;
  sourceId: string;
}

export function FrontendPage({ webviewKey, partition, webviewRef, onDiagnostic }: FrontendPageProps) {
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const onFailLoad = (event: Event) => {
      const failure = event as WebviewLoadFailureEvent;
      onDiagnostic(`webview did-fail-load code=${failure.errorCode} url=${failure.validatedURL} error=${failure.errorDescription}`);
    };
    const onRenderProcessGone = (event: Event) => {
      const details = event as WebviewRenderProcessGoneEvent;
      onDiagnostic(`webview render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
    };
    const onConsoleMessage = (event: Event) => {
      const message = event as WebviewConsoleMessageEvent;
      // Chromium levels 0-1 are verbose/info. Persist warnings and errors only.
      if (message.level < 2) return;
      onDiagnostic(`webview console level=${message.level} source=${message.sourceId}:${message.line} message=${message.message}`);
    };

    webview.addEventListener("did-fail-load", onFailLoad);
    webview.addEventListener("render-process-gone", onRenderProcessGone);
    webview.addEventListener("console-message", onConsoleMessage);
    return () => {
      webview.removeEventListener("did-fail-load", onFailLoad);
      webview.removeEventListener("render-process-gone", onRenderProcessGone);
      webview.removeEventListener("console-message", onConsoleMessage);
    };
  }, [onDiagnostic, webviewKey, webviewRef]);

  return (
    <section className="content-page content-page-fill">
      <webview
        key={webviewKey}
        ref={webviewRef}
        className="frontend-webview"
        src="app://omnific/"
        partition={partition}
        preload={window.omnificDesktop.frontendHostPreloadPath}
      />
    </section>
  );
}
