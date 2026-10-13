import React, { useState, useEffect } from "react";
import { downloadManager, type DownloadTask } from "../../utils/downloadManager";
import { launchExternalPlayer } from "../../hooks/useSettings";

interface DownloadManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadManagerModal: React.FC<DownloadManagerModalProps> = ({ isOpen, onClose }) => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);

  useEffect(() => {
    return downloadManager.subscribe((list) => {
      setTasks([...list]);
    });
  }, []);

  if (!isOpen) return null;

  const activeCount = tasks.filter((t) => t.status === "downloading").length;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(10px)",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          maxHeight: "85vh",
          background: "#0d0e15",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(229, 9, 20, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#ffffff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
              Download Manager
            </h2>
            {activeCount > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "3px 9px",
                  borderRadius: "999px",
                  background: "rgba(229, 9, 20, 0.2)",
                  color: "#e50914",
                  border: "1px solid rgba(229, 9, 20, 0.3)",
                }}
              >
                {activeCount} Active
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {tasks.some((t) => t.status === "completed" || t.status === "error") && (
              <button
                onClick={() => downloadManager.clearCompleted()}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#94a3b8",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Clear Finished
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                color: "#e2e8f0",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Task List */}
        <div style={{ padding: "18px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
          {tasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>⬇</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#94a3b8" }}>No active downloads</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                Click Download on any movie or episode to see live progress here.
              </div>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* Title & Status Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      title={task.title}
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#f8fafc",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {task.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      {task.filename}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      background:
                        task.status === "completed"
                          ? "rgba(16, 185, 129, 0.15)"
                          : task.status === "downloading"
                          ? "rgba(59, 130, 246, 0.15)"
                          : "rgba(239, 68, 68, 0.15)",
                      color:
                        task.status === "completed"
                          ? "#10b981"
                          : task.status === "downloading"
                          ? "#60a5fa"
                          : "#f87171",
                    }}
                  >
                    {task.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    background: "rgba(255, 255, 255, 0.06)",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${task.percent}%`,
                      height: "100%",
                      background:
                        task.status === "completed"
                          ? "linear-gradient(90deg, #10b981, #059669)"
                          : task.status === "downloading"
                          ? "linear-gradient(90deg, #e50914, #ff3b30)"
                          : "#64748b",
                      borderRadius: "999px",
                      transition: "width 0.25s ease",
                    }}
                  />
                </div>

                {/* Details & Actions Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#94a3b8" }}>
                  <div>
                    {task.status === "downloading" && (
                      <span>
                        {formatBytes(task.receivedBytes)} / {formatBytes(task.totalBytes)} ({task.percent}%) • {task.speed}
                      </span>
                    )}
                    {task.status === "completed" && (
                      <span style={{ color: "#10b981", fontWeight: 700 }}>
                        Downloaded {formatBytes(task.totalBytes || task.receivedBytes)}
                      </span>
                    )}
                    {task.status === "error" && (
                      <span style={{ color: "#f87171" }}>
                        {task.error || "Download failed"}
                      </span>
                    )}
                    {task.status === "paused" && (
                      <span>Cancelled</span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    {task.status === "downloading" && (
                      <button
                        onClick={() => downloadManager.cancelDownload(task.id)}
                        style={{
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          color: "#f87171",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "10px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    )}

                    {task.status === "completed" && (
                      <>
                        <button
                          onClick={() => launchExternalPlayer(task.filePath || task.url, "vlc", "vlc://", task.title)}
                          style={{
                            background: "rgba(229, 9, 20, 0.15)",
                            border: "1px solid rgba(229, 9, 20, 0.3)",
                            color: "#ff4d4f",
                            padding: "4px 12px",
                            borderRadius: "6px",
                            fontSize: "10px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Play in VLC
                        </button>

                        <button
                          onClick={() => downloadManager.openFile(task.id)}
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            color: "#cbd5e1",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "10px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Open Folder
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
