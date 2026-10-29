import React, { useState, useEffect } from "react";
import { subscribeToast, type ToastItem } from "../../utils/toastService";

export const GlassToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    return subscribeToast((toast) => {
      setActiveToast(toast);
      if (toast.type === "undo") {
        setSecondsLeft(toast.undoSecondsLeft || 5);
      }
    });
  }, []);

  useEffect(() => {
    if (!activeToast) return;

    if (activeToast.type === "undo") {
      const interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setActiveToast(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, activeToast.durationMs || 3500);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  if (!activeToast) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "34px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999999,
        display: "inline-flex",
        alignItems: "center",
        gap: "12px",
        padding: activeToast.type === "undo" ? "8px 10px 8px 18px" : "11px 22px",
        borderRadius: "9999px",
        background: "rgba(255, 255, 255, 0.10)",
        backdropFilter: "blur(32px) saturate(200%)",
        WebkitBackdropFilter: "blur(32px) saturate(200%)",
        border: "1px solid rgba(255, 255, 255, 0.24)",
        boxShadow: "0 16px 45px rgba(0, 0, 0, 0.5), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.45)",
        color: "#ffffff",
        textShadow: "0 1px 3px rgba(0, 0, 0, 0.7)",
        fontSize: "13.5px",
        fontWeight: 600,
        pointerEvents: "auto",
        animation: "cinemaToastPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`
        @keyframes cinemaToastPop {
          0% {
            opacity: 0;
            transform: translate3d(-50%, 16px, 0) scale(0.92);
          }
          100% {
            opacity: 1;
            transform: translate3d(-50%, 0, 0) scale(1);
          }
        }
      `}</style>

      {/* Status Icon - Pure frosted glass, zero neon */}
      {activeToast.type === "success" && (
        <div
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.12)",
            border: "1px solid rgba(255, 255, 255, 0.24)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {activeToast.type === "error" && (
        <div
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "rgba(229, 9, 20, 0.25)",
            border: "1px solid rgba(229, 9, 20, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
      )}

      {activeToast.type === "undo" && (
        <div
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.12)",
            border: "1px solid rgba(255, 255, 255, 0.24)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </div>
      )}

      {/* Message */}
      <span style={{ letterSpacing: "-0.1px" }}>{activeToast.message}</span>

      {/* Telegram-style Undo Button */}
      {activeToast.type === "undo" && activeToast.onUndo && (
        <button
          onClick={() => {
            if (activeToast.onUndo) activeToast.onUndo();
            setActiveToast(null);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 14px",
            borderRadius: "9999px",
            background: "linear-gradient(135deg, #ff1723 0%, #e50914 100%)",
            border: "none",
            color: "#ffffff",
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(229, 9, 20, 0.45)",
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span>Undo</span>
          <span
            style={{
              fontSize: "11px",
              opacity: 0.85,
              background: "rgba(0, 0, 0, 0.2)",
              padding: "1px 6px",
              borderRadius: "999px",
            }}
          >
            {secondsLeft}s
          </span>
        </button>
      )}

      {/* Close button for non-undo toasts */}
      {activeToast.type !== "undo" && (
        <button
          onClick={() => setActiveToast(null)}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255, 255, 255, 0.6)",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            marginLeft: "4px",
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};
