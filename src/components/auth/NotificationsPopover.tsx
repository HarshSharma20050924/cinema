import React, { useRef, useEffect } from "react";

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  isOpen,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      style={{
        position: "absolute",
        top: "calc(100% + 12px)",
        right: 0,
        width: "320px",
        background: "linear-gradient(145deg, rgba(255, 255, 255, 0.14) 0%, rgba(18, 22, 32, 0.88) 100%)",
        backdropFilter: "blur(36px) saturate(200%)",
        WebkitBackdropFilter: "blur(36px) saturate(200%)",
        border: "1px solid rgba(255, 255, 255, 0.22)",
        borderRadius: "22px",
        padding: "18px 20px",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.35)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        animation: "cinemaMenuPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header matching image copy 4.png */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span style={{ fontSize: "14.5px", fontWeight: 700, color: "#ffffff" }}>Notifications</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.10)" }} />

      {/* Body: You're all caught up */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 12px",
          textAlign: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#22c55e",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff" }}>
          You're all caught up
        </div>
        <p style={{ margin: 0, fontSize: "12.5px", color: "rgba(255, 255, 255, 0.55)", lineHeight: 1.45 }}>
          No new notifications or season updates right now. Check back soon!
        </p>
      </div>
    </div>
  );
};
