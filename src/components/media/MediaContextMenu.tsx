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

  // Dismiss on any scroll anywhere (window, document, or container)
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => {
      onClose();
    };
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    window.addEventListener("wheel", handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("wheel", handleScroll, { capture: true });
    };
  }, [isOpen, onClose]);

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

  const handleNotInterested = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const raw = localStorage.getItem("cinema_hidden_titles") || "[]";
      const list = JSON.parse(raw);
      const id = String(post.id || post.tmdbId);
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem("cinema_hidden_titles", JSON.stringify(list));
        window.dispatchEvent(new CustomEvent("cinema:hidden_titles_updated"));
      }
    } catch (_) {}
    onClose();
  };

  const isTv = post.type === "tv" || post.type === "series";
  const rawYear = post.year || (post.releaseDate ? post.releaseDate.slice(0, 4) : "2024");
  const mediaTypeLabel = isTv ? "TV Show" : "Movie";

  // Compute smart coordinates matching Screenshot 3
  const menuStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 99999,
    width: "256px",
    background: "rgba(255, 255, 255, 0.12)",
    backdropFilter: "blur(32px) saturate(200%)",
    WebkitBackdropFilter: "blur(32px) saturate(200%)",
    border: "1px solid rgba(255, 255, 255, 0.24)",
    borderRadius: "22px",
    padding: "10px 10px 12px",
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.4)",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    animation: "cinemaMenuPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
    userSelect: "none",
  };

  if (position) {
    const menuWidth = 256;
    const menuHeight = 360;
    const maxX = typeof window !== "undefined" ? window.innerWidth - (menuWidth + 16) : 800;
    const maxY = typeof window !== "undefined" ? window.innerHeight - (menuHeight + 16) : 600;

    // Anchor smoothly near the card's trigger button
    let targetX = position.x - (menuWidth - 20);
    if (targetX < 16) targetX = position.x + 8;
    targetX = Math.max(16, Math.min(targetX, maxX));

    let targetY = position.y + 4;
    if (targetY > maxY) targetY = Math.max(16, position.y - menuHeight - 8);

    menuStyle.left = `${targetX}px`;
    menuStyle.top = `${targetY}px`;
  } else {
    menuStyle.top = "50%";
    menuStyle.left = "50%";
    menuStyle.transform = "translate(-50%, -50%)";
  }

  const menuItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "12px",
    background: "transparent",
    border: "none",
    color: "#f1f5f9",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.14s ease, color 0.14s ease, transform 0.14s ease",
    width: "100%",
  };

  return createPortal(
    <>
      <style>{`
        @keyframes cinemaMenuPop {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(-4px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .cinema-ctx-btn:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
        }
        .cinema-ctx-reaction:hover {
          background: rgba(255, 255, 255, 0.14) !important;
          transform: translateY(-1px);
        }
      `}</style>

      {/* Invisible backdrop to capture outside clicks */}
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
        {/* Header: Title & Subtitle matching Screenshot 3 */}
        <div style={{ padding: "8px 10px 10px" }}>
          <h4
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 700,
              color: "#ffffff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              letterSpacing: "-0.2px",
            }}
          >
            {post.title}
          </h4>
          <span style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.52)", fontWeight: 500 }}>
            {mediaTypeLabel} · {rawYear}
          </span>
        </div>

        {/* 1. Go to Show / Movie */}
        <button
          className="cinema-ctx-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            if (onOpenDetails) onOpenDetails(post);
            else if (onPlay) onPlay(post);
          }}
          style={menuItemStyle}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{isTv ? "Go to Show" : "Go to Movie"}</span>
        </button>

        {/* 2. Add to Watchlist */}
        <button className="cinema-ctx-btn" onClick={handleToggleSaved} style={menuItemStyle}>
          {isSaved ? (
            <>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ color: "#22c55e", fontWeight: 600 }}>In Watchlist</span>
            </>
          ) : (
            <>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add to Watchlist</span>
            </>
          )}
        </button>

        {/* 3. Add to a List... */}
        <button
          className="cinema-ctx-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowAddToListModal(true);
          }}
          style={menuItemStyle}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span>Add to a List...</span>
        </button>

        {/* 4. Reaction Row: [Dislike] [Like] [Heart] matching Screenshot 3 */}
        <div style={{ display: "flex", gap: "6px", padding: "6px 4px 6px" }}>
          {/* Dislike */}
          <button
            className="cinema-ctx-reaction"
            onClick={(e) => handleSetRating("dislike", e)}
            title="Not for me"
            style={{
              flex: 1,
              height: "44px",
              borderRadius: "12px",
              background: currentRating === "dislike" ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill={currentRating === "dislike" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
            </svg>
          </button>

          {/* Like */}
          <button
            className="cinema-ctx-reaction"
            onClick={(e) => handleSetRating("like", e)}
            title="I like this"
            style={{
              flex: 1,
              height: "44px",
              borderRadius: "12px",
              background: currentRating === "like" ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill={currentRating === "like" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </button>

          {/* Heart / Love */}
          <button
            className="cinema-ctx-reaction"
            onClick={(e) => handleSetRating("favorite", e)}
            title="Love this"
            style={{
              flex: 1,
              height: "44px",
              borderRadius: "12px",
              background: currentRating === "favorite" ? "rgba(229, 9, 20, 0.24)" : "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: currentRating === "favorite" ? "#e50914" : "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill={currentRating === "favorite" ? "#e50914" : "none"}
              stroke={currentRating === "favorite" ? "#e50914" : "currentColor"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        {/* Divider matching Screenshot 3 */}
        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "4px 4px" }} />

        {/* 5. Not Interested */}
        <button className="cinema-ctx-btn" onClick={handleNotInterested} style={menuItemStyle}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
          <span>Not Interested</span>
        </button>

        {/* 6. Share */}
        <button className="cinema-ctx-btn" onClick={handleShare} style={menuItemStyle}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span>Share</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ADD TO LIST MODAL                                             */}
      {/* ------------------------------------------------------------- */}
      {showAddToListModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowAddToListModal(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "rgba(30, 33, 40, 0.95)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.85)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#fff" }}>Add to List</h3>
                <p style={{ margin: "3px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>{post.title}</p>
              </div>
              <button
                onClick={() => setShowAddToListModal(false)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "260px", overflowY: "auto" }}>
              {customLists.length === 0 ? (
                <div style={{ padding: "20px 0", textAlign: "center", color: "rgba(255, 255, 255, 0.5)", fontSize: "13.5px" }}>
                  No custom lists created yet.
                </div>
              ) : (
                customLists.map((list) => {
                  const hasItem = list.items.some((i) => (i.id || i.tmdbId) === (post.id || post.tmdbId));
                  return (
                    <div
                      key={list.id}
                      onClick={() => {
                        if (hasItem) {
                          removeItemFromCustomList(list.id, post.id || post.tmdbId);
                        } else {
                          addItemToCustomList(list.id, post);
                        }
                        setCustomLists(getCustomLists());
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderRadius: "14px",
                        background: hasItem ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>{list.name}</span>
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "6px",
                          background: hasItem ? "#22c55e" : "rgba(255, 255, 255, 0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "13px",
                        }}
                      >
                        {hasItem && "✓"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => {
                setShowAddToListModal(false);
                setShowNewListModal(true);
              }}
              style={{
                padding: "12px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span>+ Create New List</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CREATE NEW LIST MODAL                                         */}
      {/* ------------------------------------------------------------- */}
      {showNewListModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100001,
            background: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowNewListModal(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              background: "rgba(30, 33, 40, 0.95)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.85)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#fff" }}>Create New List</h3>
            <input
              type="text"
              placeholder="List name (e.g. Weekend Binge, Favorites)"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newListName.trim()) {
                  const created = createCustomList(newListName.trim());
                  addItemToCustomList(created.id, post);
                  setNewListName("");
                  setShowNewListModal(false);
                  onClose();
                }
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowNewListModal(false)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "999px",
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
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
                    setNewListName("");
                    setShowNewListModal(false);
                    onClose();
                  }
                }}
                disabled={!newListName.trim()}
                style={{
                  padding: "9px 22px",
                  borderRadius: "999px",
                  background: "#e50914",
                  border: "none",
                  color: "#fff",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: newListName.trim() ? "pointer" : "not-allowed",
                  opacity: newListName.trim() ? 1 : 0.5,
                }}
              >
                Create & Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};
