import React, { useState, useEffect } from "react";
import { CloseIcon, FilmIcon } from "../../icons";
import {
  getContinueWatchingList,
  removeContinueWatching,
  clearAllContinueWatching,
  type ContinueWatchingItem,
} from "../../utils/continueWatchingService";
import { ContinueWatchingCard } from "./ContinueWatchingShelf";

export interface ContinueWatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: (item: ContinueWatchingItem) => void;
}

export const ContinueWatchingModal: React.FC<ContinueWatchingModalProps> = ({
  isOpen,
  onClose,
  onResume,
}) => {
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);

  const loadItems = () => {
    setItems(getContinueWatchingList());
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => loadItems();
    window.addEventListener("cinema:continue_watching_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("cinema:continue_watching_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeContinueWatching(id);
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear your entire Continue Watching history?")) {
      clearAllContinueWatching();
      setItems([]);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "980px",
          maxHeight: "88vh",
          background: "rgba(14, 16, 22, 0.82)",
          backdropFilter: "blur(28px) saturate(190%)",
          WebkitBackdropFilter: "blur(28px) saturate(190%)",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          borderRadius: "22px",
          boxShadow: "0 28px 70px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          animation: "scaleInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "22px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.10)",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#ffffff",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Continue Watching
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                padding: "3px 9px",
                borderRadius: "999px",
                background: "rgba(229, 9, 20, 0.18)",
                border: "1px solid rgba(229, 9, 20, 0.45)",
                color: "#ff4d58",
              }}
            >
              {items.length} {items.length === 1 ? "title" : "titles"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "rgba(255, 255, 255, 0.75)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(229, 9, 20, 0.25)";
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.borderColor = "#e50914";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.75)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                }}
              >
                Clear History
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <CloseIcon size={16} color="#ffffff" />
            </button>
          </div>
        </div>

        {/* Modal Body / Grid */}
        <div
          className="cinema-no-scrollbar"
          style={{
            padding: "28px",
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  background: "rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <FilmIcon size={26} color="rgba(255, 255, 255, 0.4)" />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px 0" }}>
                No Movies or Shows in Progress
              </h3>
              <p style={{ fontSize: "13px", maxWidth: "340px", margin: 0, lineHeight: 1.5 }}>
                Start watching any movie or show, and Cinema will automatically save your progress here.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <ContinueWatchingCard
                key={item.id}
                item={item}
                onResume={(it) => {
                  onResume(it);
                  onClose();
                }}
                onRemove={handleRemove}
                width={280}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
