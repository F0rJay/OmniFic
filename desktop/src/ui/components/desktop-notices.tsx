// Modified by OmniFic contributors from OpenFic v0.7.5.
import { useEffect, useState } from "react";
import { AlertTriangle, Download, ExternalLink, RefreshCw, RotateCcw, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import type { UpdateState } from "../../shared/ipc";

interface DesktopNoticesProps {
  compatibilityWarning: string | null;
  updateDialogOpen: boolean;
  updateState: UpdateState;
  onCheckForUpdate: () => void;
  onDownloadUpdate: () => void;
  onCancelDownload: () => void;
  onInstallUpdate: () => void;
  onOpenRelease: () => void;
  onCloseCompatibilityWarning: () => void;
  onCloseUpdateDialog: () => void;
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}

function getReleaseNotesText(releaseNotes: string | undefined, fallback: string): string {
  return releaseNotes || fallback;
}

function ReleaseNotes({ releaseNotes }: { releaseNotes: string }) {
  return (
    <div className="desktop-release-notes-content">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
        }}
      >
        {releaseNotes}
      </ReactMarkdown>
    </div>
  );
}

export function DesktopNotices({
  compatibilityWarning,
  updateDialogOpen,
  updateState,
  onCheckForUpdate,
  onDownloadUpdate,
  onCancelDownload,
  onInstallUpdate,
  onOpenRelease,
  onCloseCompatibilityWarning,
  onCloseUpdateDialog,
}: DesktopNoticesProps) {
  const [updatePanelVisible, setUpdatePanelVisible] = useState(false);
  const releaseNotes = getReleaseNotesText(updateState.releaseNotes, "本次更新包含稳定性改进与体验优化。");
  const hasVersionDetails = ["available", "downloading", "downloaded"].includes(updateState.status);
  const updateSummary = updateState.status === "downloaded"
    ? "更新已下载，重启后即可使用新版本。"
    : updateState.status === "downloading"
      ? "正在准备新版本，你可以继续浏览更新内容。"
      : "新版本已准备好，看看这次有哪些变化。";

  useEffect(() => {
    if (updateDialogOpen) {
      setUpdatePanelVisible(true);
      return;
    }

    const timeout = window.setTimeout(() => setUpdatePanelVisible(false), 160);
    return () => window.clearTimeout(timeout);
  }, [updateDialogOpen]);

  const showUpdatePanel = !compatibilityWarning && updatePanelVisible;
  if (!compatibilityWarning && !showUpdatePanel) return null;

  return (
    <>
      {compatibilityWarning ? (
        <aside className="desktop-notices" aria-live="polite">
          <section className="desktop-notice desktop-notice-warning" role="status">
            <AlertTriangle size={17} strokeWidth={2} aria-hidden="true" />
            <p>{compatibilityWarning}</p>
            <button
              className="desktop-notice-warning-dismiss"
              type="button"
              aria-label="关闭兼容性提示"
              onClick={onCloseCompatibilityWarning}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </section>
        </aside>
      ) : null}
      {showUpdatePanel ? (
        <>
          <button
            className="desktop-update-panel-scrim"
            data-state={updateDialogOpen ? "open" : "closed"}
            type="button"
            aria-label="关闭更新面板"
            onClick={onCloseUpdateDialog}
          />
          <aside
            className="desktop-notice desktop-notice-update desktop-update-panel"
            data-state={updateDialogOpen ? "open" : "closed"}
            role="dialog"
            aria-modal="true"
            aria-labelledby={hasVersionDetails ? "desktop-update-title" : undefined}
          >
            {!hasVersionDetails ? (
              <button className="desktop-notice-dismiss" type="button" aria-label="关闭更新提示" onClick={onCloseUpdateDialog}>
                <X size={16} strokeWidth={2} />
              </button>
            ) : null}
            {updateState.status === "checking" || updateState.status === "idle" ? (
              <div className="desktop-update-simple-state">
                <p className="desktop-notice-title">正在检查更新</p>
                <p>正在连接更新服务，请稍候。</p>
              </div>
            ) : null}
            {updateState.status === "not-available" ? (
              <div className="desktop-update-simple-state">
                <p className="desktop-notice-title">已是最新版本</p>
                <p>当前安装的 OmniFic 已是最新版本。</p>
              </div>
            ) : null}
            {updateState.status === "unsupported" ? (
              <div className="desktop-update-simple-state">
                <p className="desktop-notice-title">当前版本仅支持手动更新</p>
                <p>{updateState.message ?? "当前系统或架构不支持应用内更新。"}</p>
              </div>
            ) : null}
            {hasVersionDetails ? (
              <>
                <div className="desktop-update-heading">
                  <div className="desktop-update-app-mark" aria-hidden="true">
                    <Sparkles size={19} strokeWidth={1.9} />
                  </div>
                  <div className="desktop-update-heading-copy">
                    <p className="desktop-notice-title" id="desktop-update-title">
                      OmniFic <span>v{updateState.version}</span>
                    </p>
                    <p className="desktop-update-summary">{updateSummary}</p>
                  </div>
                  <button className="desktop-notice-dismiss" type="button" aria-label="关闭更新提示" onClick={onCloseUpdateDialog}>
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
                <section className="desktop-update-release-section">
                  <div className="desktop-release-notes-header">
                    <div className="desktop-release-notes-label">
                      <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
                      <span>本次更新</span>
                    </div>
                    <button className="desktop-release-details" type="button" onClick={onOpenRelease}>
                      完整说明
                      <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                  <ReleaseNotes releaseNotes={releaseNotes} />
                </section>
              </>
            ) : null}
            {updateState.status === "available" ? (
              <>
                <footer className="desktop-update-footer">
                  <span>下载完成后由你决定何时安装</span>
                  <button className="desktop-notice-primary" type="button" onClick={onDownloadUpdate}>
                    <Download size={15} strokeWidth={2} />
                    开始下载
                  </button>
                </footer>
              </>
            ) : null}
            {updateState.status === "downloading" ? (
              <section className="desktop-download-state">
                <div className="desktop-download-heading">
                  <span>下载中</span>
                  <button type="button" onClick={onCancelDownload}>取消</button>
                  <strong>{Math.round((updateState.progress ?? 0) * 100)}%</strong>
                </div>
                <div className="desktop-update-progress" aria-label={`下载进度 ${Math.round((updateState.progress ?? 0) * 100)}%`}>
                  <span style={{ width: `${Math.min(Math.max(updateState.progress ?? 0, 0), 1) * 100}%` }} />
                </div>
                <div className="desktop-download-metrics">
                  <span>{formatBytes(updateState.transferred)}</span>
                  <span>{formatBytes(updateState.bytesPerSecond)}/s</span>
                </div>
              </section>
            ) : null}
            {updateState.status === "downloaded" ? (
              <footer className="desktop-update-footer">
                <span>重启前请先保存正在进行的工作</span>
                <button className="desktop-notice-primary" type="button" onClick={onInstallUpdate}>
                  <RotateCcw size={15} strokeWidth={2} />
                  重启并安装
                </button>
              </footer>
            ) : null}
            {updateState.status === "error" ? (
              <div className="desktop-update-simple-state">
                <p className="desktop-notice-title">检查更新失败</p>
                <p>{updateState.message ?? "更新服务暂时不可用。"}</p>
                <button className="desktop-notice-secondary" type="button" onClick={onCheckForUpdate}>
                  <RefreshCw size={15} strokeWidth={2} />
                  重试
                </button>
              </div>
            ) : null}
          </aside>
        </>
      ) : null}
    </>
  );
}
