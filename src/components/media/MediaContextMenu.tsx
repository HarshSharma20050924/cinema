import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { MediaPost } from "../../types";
import {
  isItemSaved,
  toggleSavedItem,
  getUserRatingForItem,
  setUserRatingForItem,
  getCustomLists,
  addItemToCustomList,
  removeItemFromCustomList,
  createCustomList,
  addToWatchHistory,
  type CustomList,
  type UserRatingType,
} from "../../utils/userListsService";

export interface MediaContextMenuProps {
  post: MediaPost;
  isOpen: boolean;
  onClose: () => void;
  onPlay?: (post: MediaPost) => void;
  onOpenDetails?: (post: MediaPost) => void;
  onOpenDownloads?: (post: MediaPost) => void;
  position?: { x: number; y: number };
}

export const MediaContextMenu: React.FC<MediaContextMenuProps> = ({
  post,
  isOpen,
  onClose,
  onPlay,
  onOpenDetails,
  onOpenDownloads,
  position,
}) => {
  const [isSaved, setIsSaved] = useState(() => isItemSaved(post?.id || post?.tmdbId));
  const [currentRating, setCurrentRating] = useState<UserRatingType>(() =>
    getUserRatingForItem(post?.id || post?.tmdbId)
  );
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [newListName, setNewListName] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsSaved(isItemSaved(post?.id || post?.tmdbId));
      setCurrentRating(getUserRatingForItem(post?.id || post?.tmdbId));
      setCustomLists(getCustomLists());
    }
  }, [isOpen, post]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen || !post || typeof document === "undefined") return null;

  const handleToggleSaved = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nowSaved = toggleSavedItem(post);
    setIsSaved(nowSaved);
  };

  const handleSetRating = (rating: UserRatingType, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRating = currentRating === rating ? null : rating;
    setUserRatingForItem(post, nextRating);
    setCurrentRating(nextRating);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/?id=${post.id || post.tmdbId}` : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url: shareUrl });
      } catch (_) {}
    } else {
      navigator.clipboard?.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
    onClose();
  };

  const handleMarkWatched = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToWatchHistory(post);
    alert(`Marked "${post.title}" as Watched!`);
    onClose();
  };

  // Compute smart coordinates so menu does not overflow viewport edge
  const menuStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 99999,
    width: "250px",
    background: "rgba(18, 22, 30, 0.88)",
    backdropFilter: "blur(24px) saturate(190%)",
    WebkitBackdropFilter: "blur(24px) saturate(190%)",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    borderRadius: "18px",
    padding: "12px",
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    animation: "fadeInScale 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
    userSelect: "none",
  };

  if (position) {
    const maxX = typeof window !== "undefined" ? window.innerWidth - 270 : 800;
    const maxY = typeof window !== "undefined" ? window.innerHeight - 440 : 600;
    // Align menu so it opens nicely below and aligned with the button
    const targetX = position.x - 240;
    menuStyle.left = `${Math.max(16, Math.min(targetX, maxX))}px`;
    menuStyle.top = `${Math.max(16, Math.min(position.y, maxY))}px`;
  } else {
    menuStyle.top = "50%";
    menuStyle.left = "50%";
    menuStyle.transform = "translate(-50%, -50%)";
  }

  const rawYear = post.year || (post.releaseDate ? post.releaseDate.slice(0, 4) : "2024");
  const mediaTypeLabel = post.type === "tv" || post.type === "series" ? "TV Series" : "Movie";

  return createPortal(
    <>
      {/* Full-screen click-outside catcher overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99998,
          background: "transparent",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />

      <div ref={menuRef} style={menuStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header: Title & Subtitle */}
        <div style={{ padding: "6px 8px 10px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <h4
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 700,
              color: "#ffffff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {post.title}
          </h4>
          <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 500 }}>
            {mediaTypeLabel} · {rawYear}
          </span>
        </div>

        {/* Action 1: Play */}
        <button
          className="cinema-ctx-item"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            if (onPlay) onPlay(post);
          }}
          style={menuItemStyle}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>Play</span>
        </button>

        {/* Action 2: Details */}
        <button
          className="cinema-ctx-item"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            if (onOpenDetails) onOpenDetails(post);
          }}
          style={menuItemStyle}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>Details</span>
        </button>

        {/* Action 3: Add to My List */}
        <button className="cinema-ctx-item" onClick={handleToggleSaved} style={menuItemStyle}>
          {isSaved ? (
            <>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#e50914" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ color: "#e50914", fontWeight: 700 }}>In My List</span>
            </>
          ) : (
            <>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add to My List</span>
            </>
          )}
        </button>

        {/* Action 4: Add to a List... */}
        <button
          className="cinema-ctx-item"
          onClick={(e) => {
            e.stopPropagation();
            setShowAddToListModal(true);
          }}
          style={menuItemStyle}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span>Add to a List...</span>
        </button>

        {/* Action 5: Reaction Row (Thumbs Down / Up / Heart) matching Screenshot 1 */}
        <div style={{ display: "flex", gap: "6px", padding: "6px 4px 8px" }}>
          <button
            onClick={(e) => handleSetRating("dislike", e)}
            title="Not for me"
            style={ratingButtonStyle(currentRating === "dislike")}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill={currentRating === "dislike" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
            </svg>
          </button>

          <button
            onClick={(e) => handleSetRating("like", e)}
            title="I like this"
            style={ratingButtonStyle(currentRating === "like")}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill={currentRating === "like" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </button>

          <button
            onClick={(e) => handleSetRating("favorite", e)}
            title="Love this"
            style={ratingButtonStyle(currentRating === "favorite")}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill={currentRating === "favorite" ? "#e50914" : "none"} stroke={currentRating === "favorite" ? "#e50914" : "currentColor"} strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "4px 0" }} />

        {/* Action 6: Mark as Watched */}
        <button className="cinema-ctx-item" onClick={handleMarkWatched} style={menuItemStyle}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Mark as Watched</span>
        </button>

        {/* Action 7: Download */}
        <button
          className="cinema-ctx-item"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            if (onOpenDownloads) onOpenDownloads(post);
          }}
          style={menuItemStyle}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Download...</span>
        </button>

        {/* Action 8: Share */}
        <button className="cinema-ctx-item" onClick={handleShare} style={menuItemStyle}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>Share</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ADD TO LIST MODAL (Screenshot 4)                              */}
      {/* ------------------------------------------------------------- */}
      {showAddToListModal && (
        <div
          style={modalOverlayStyle}
          onClick={(e) => {
            e.stopPropagation();
            setShowAddToListModal(false);
          }}
        >
          <div
            style={modalCardStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#fff" }}>Add to List</h3>
                <p style={{ margin: "3px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>{post.title}</p>
              </div>
              <button
                onClick={() => setShowAddToListModal(false)}
                style={closeBtnStyle}
              >
                ✕
              </button>
            </div>

            {/* List Selection Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "16px 0" }}>
              {/* Option: + New List */}
              <button
                onClick={() => {
                  setShowNewListModal(true);
                }}
                style={listOptionButtonStyle}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={plusIconCircleStyle}>+</div>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>New List</span>
                </div>
              </button>

              {/* Existing User Lists */}
              {customLists.map((list) => {
                const isItemInList = list.items.some(
                  (i) => String(i.id) === String(post.id) || (post.tmdbId && i.tmdbId === post.tmdbId)
                );
                return (
                  <button
                    key={list.id}
                    onClick={() => {
                      if (isItemInList) {
                        removeItemFromCustomList(list.id, post.id || post.tmdbId || "");
                      } else {
                        addItemToCustomList(list.id, post);
                      }
                      setCustomLists(getCustomLists());
                    }}
                    style={listOptionButtonStyle}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: isItemInList ? "2px solid #e50914" : "2px solid rgba(255, 255, 255, 0.4)",
                          background: isItemInList ? "#e50914" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isItemInList && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff" }} />}
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>{list.name}</span>
                    </div>
                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)" }}>
                      {list.items.length} {list.items.length === 1 ? "title" : "titles"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Done Button */}
            <button
              onClick={() => {
                setShowAddToListModal(false);
                onClose();
              }}
              style={actionBtnStyle}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* NEW LIST MODAL (Screenshot 5)                                 */}
      {/* ------------------------------------------------------------- */}
      {showNewListModal && (
        <div
          style={modalOverlayStyle}
          onClick={(e) => {
            e.stopPropagation();
            setShowNewListModal(false);
          }}
        >
          <div
            style={modalCardStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: "19px", fontWeight: 700, color: "#fff" }}>New List</h3>
            <input
              type="text"
              placeholder="Name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                marginBottom: "20px",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newListName.trim()) {
                  const created = createCustomList(newListName.trim());
                  addItemToCustomList(created.id, post);
                  setCustomLists(getCustomLists());
                  setShowNewListModal(false);
                  setNewListName("");
                }
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowNewListModal(false)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  color: "#fff",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newListName.trim()) {
                    const created = createCustomList(newListName.trim());
                    addItemToCustomList(created.id, post);
                    setCustomLists(getCustomLists());
                    setShowNewListModal(false);
                    setNewListName("");
                  }
                }}
                disabled={!newListName.trim()}
                style={{
                  padding: "9px 22px",
                  borderRadius: "999px",
                  background: newListName.trim() ? "#e50914" : "rgba(255, 255, 255, 0.14)",
                  border: "none",
                  color: "#fff",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: newListName.trim() ? "pointer" : "not-allowed",
                  boxShadow: newListName.trim() ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "9px 10px",
  borderRadius: "10px",
  background: "transparent",
  border: "none",
  color: "#ffffff",
  fontSize: "13.5px",
  fontWeight: 500,
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.15s ease",
  width: "100%",
};

const ratingButtonStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  height: "36px",
  borderRadius: "10px",
  background: active ? "rgba(229, 9, 20, 0.22)" : "rgba(255, 255, 255, 0.07)",
  border: active ? "1px solid #e50914" : "1px solid rgba(255, 255, 255, 0.12)",
  color: active ? "#ffffff" : "rgba(255, 255, 255, 0.75)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.15s ease",
});

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 999999,
  background: "rgba(0, 0, 0, 0.72)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  animation: "fadeIn 0.15s ease",
};

const modalCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "400px",
  background: "rgba(18, 22, 30, 0.88)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  borderRadius: "20px",
  padding: "22px",
  boxShadow: "0 28px 70px rgba(0, 0, 0, 0.9)",
  display: "flex",
  flexDirection: "column",
  animation: "scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
};

const closeBtnStyle: React.CSSProperties = {
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  background: "rgba(255, 255, 255, 0.08)",
  border: "none",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "14px",
};

const listOptionButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "11px 12px",
  borderRadius: "12px",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  cursor: "pointer",
  transition: "all 0.15s ease",
  width: "100%",
};

const plusIconCircleStyle: React.CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  background: "rgba(255, 255, 255, 0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "15px",
  fontWeight: 700,
  color: "#fff",
};

const actionBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px",
  borderRadius: "999px",
  background: "#e50914",
  border: "none",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(229, 9, 20, 0.45)",
  transition: "all 0.15s ease",
};
