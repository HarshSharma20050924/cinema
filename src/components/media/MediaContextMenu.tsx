import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { MediaPost } from "../../types";
import {
  isItemSaved,
  toggleSavedItem,
  getUserRatingForItem,
  setUserRatingForItem,
  type UserRatingType,
} from "../../utils/userListsService";
import { AddToListModal } from "./AddToListModal";
import { isUserSignedIn } from "../../utils/profileService";

export interface MediaContextMenuProps {
  post: MediaPost;
  isOpen: boolean;
  onClose: () => void;
  onPlay?: (post: MediaPost) => void;
  onResume?: (post: MediaPost) => void;
  onRemoveFromContinueWatching?: (post: MediaPost) => void;
  onOpenDetails?: (post: MediaPost) => void;
  onOpenDownloads?: (post: MediaPost) => void;
  position?: { x: number; y: number };
}

export const MediaContextMenu: React.FC<MediaContextMenuProps> = ({
  post,
  isOpen,
  onClose,
  onPlay,
  onResume,
  onRemoveFromContinueWatching,
  onOpenDetails,
  onOpenDownloads,
  position,
}) => {
  const [isSaved, setIsSaved] = useState(() => isItemSaved(post?.id || post?.tmdbId));
  const [currentRating, setCurrentRating] = useState<UserRatingType>(() =>
    getUserRatingForItem(post?.id || post?.tmdbId)
  );
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsSaved(isItemSaved(post?.id || post?.tmdbId));
      setCurrentRating(getUserRatingForItem(post?.id || post?.tmdbId));
    }
  }, [isOpen, post]);

  // Dismiss on any scroll anywhere
  useEffect(() => {
    if (!isOpen || showAddToListModal) return;
    const handleScroll = () => {
      onClose();
    };
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    window.addEventListener("wheel", handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("wheel", handleScroll, { capture: true });
    };
  }, [isOpen, showAddToListModal, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen || showAddToListModal) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, showAddToListModal, onClose]);

  if (!isOpen || !post || typeof document === "undefined" || !document.body) return null;

  const handleToggleSaved = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nowSaved = toggleSavedItem(post);
    setIsSaved(nowSaved);
  };

  const handleSetRating = (rating: UserRatingType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isUserSignedIn()) {
      onClose();
      toast.info("Sign up to like movies and personalize your experience");
      window.dispatchEvent(new CustomEvent("cinema:open_create_account"));
      return;
    }
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
      toast.success("Link copied to clipboard!");
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
  const rawYear = post.year || (post.releaseDate ? post.releaseDate.slice(0, 4) : "2025");
  const mediaTypeLabel = isTv ? "TV Show" : "Movie";

  // Exact transparent glass design tokens matching the user's reference image
  const menuWidth = 264;
  const menuEstimatedHeight = onResume || onRemoveFromContinueWatching ? 415 : 356;
  const padding = 16;

  const menuStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 99999,
    width: `${menuWidth}px`,
    background: "rgba(36, 42, 52, 0.68)",
    backdropFilter: "blur(36px) saturate(190%)",
    WebkitBackdropFilter: "blur(36px) saturate(190%)",
    border: "1px solid rgba(255, 255, 255, 0.14)",
    borderRadius: "24px",
    padding: "12px 10px 14px",
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55), inset 0 1px 1px 0 rgba(255, 255, 255, 0.22)",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    animation: "cinemaMenuPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
    userSelect: "none",
  };

  if (position) {
    const maxX = typeof window !== "undefined" ? window.innerWidth - (menuWidth + padding) : 800;
    const maxY = typeof window !== "undefined" ? window.innerHeight - (menuEstimatedHeight + padding) : 600;

    let targetX = position.x - (menuWidth - 28);
    if (targetX < padding) targetX = position.x + 8;
    targetX = Math.max(padding, Math.min(targetX, maxX));

    // Flip upwards if in lower half of screen (y > 42%) or if position.y + height overflows viewport
    const shouldFlipUp =
      position.y > (typeof window !== "undefined" ? window.innerHeight * 0.42 : 340) ||
      position.y + menuEstimatedHeight + 20 > (typeof window !== "undefined" ? window.innerHeight : 800);

    let targetY: number;
    if (shouldFlipUp) {
      targetY = Math.max(padding, position.y - menuEstimatedHeight - 10);
    } else {
      targetY = Math.min(maxY, position.y + 8);
    }

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
    padding: "9px 12px",
    borderRadius: "12px",
    background: "transparent",
    border: "none",
    color: "#f1f5f9",
    fontSize: "13.5px",
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
            transform: scale(0.94) translateY(6px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .cinema-ctx-item:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
        }
        .cinema-ctx-reaction:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          transform: translateY(-1px);
        }
      `}</style>

      {/* Invisible backdrop to capture outside clicks (only when modal is not open) */}
      {!showAddToListModal && (
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
      )}

      <div
        ref={menuRef}
        style={{
          ...menuStyle,
          display: showAddToListModal ? "none" : "flex",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching user reference typography */}
        <div style={{ padding: "4px 10px 8px" }}>
          <h4
            style={{
              margin: 0,
              fontSize: "15px",
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
          <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.55)", fontWeight: 500 }}>
            {mediaTypeLabel} · {rawYear}
          </span>
        </div>

        {/* 0. Resume (when opened from Continue Watching) */}
        {onResume && (
          <button
            className="cinema-ctx-item"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              onResume(post);
            }}
            style={menuItemStyle}
          >
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Resume</span>
          </button>
        )}

        {/* 1. Go to Movie / Show */}
        <button
          className="cinema-ctx-item"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            if (onOpenDetails) onOpenDetails(post);
            else if (onPlay) onPlay(post);
          }}
          style={menuItemStyle}
        >
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{isTv ? "Go to Show" : "Go to Movie"}</span>
        </button>

        {/* 2. Add / Remove from Watchlist */}
        <button className="cinema-ctx-item" onClick={handleToggleSaved} style={menuItemStyle}>
          {isSaved ? (
            <>
              <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Remove from Watchlist</span>
            </>
          ) : (
            <>
              <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add to Watchlist</span>
            </>
          )}
        </button>

        {/* 2b. Remove from Continue Watching */}
        {onRemoveFromContinueWatching && (
          <button
            className="cinema-ctx-item"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              onRemoveFromContinueWatching(post);
            }}
            style={menuItemStyle}
          >
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>Remove from Continue Watching</span>
          </button>
        )}

        {/* 3. Add to a List... */}
        <button
          className="cinema-ctx-item"
          onClick={(e) => {
            e.stopPropagation();
            setShowAddToListModal(true);
          }}
          style={menuItemStyle}
        >
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span>Add to a List...</span>
        </button>

        {/* 4. Reaction Row: [Dislike] [Like] [Heart] */}
        <div style={{ display: "flex", gap: "6px", padding: "4px 2px" }}>
          {/* Dislike */}
          <button
            className="cinema-ctx-reaction"
            onClick={(e) => handleSetRating("dislike", e)}
            title="Not for me"
            style={{
              flex: 1,
              height: "40px",
              borderRadius: "12px",
              background: currentRating === "dislike" ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <svg width={17} height={17} viewBox="0 0 24 24" fill={currentRating === "dislike" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              height: "40px",
              borderRadius: "12px",
              background: currentRating === "like" ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <svg width={17} height={17} viewBox="0 0 24 24" fill={currentRating === "like" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </button>

          {/* Heart */}
          <button
            className="cinema-ctx-reaction"
            onClick={(e) => handleSetRating("favorite", e)}
            title="Love this"
            style={{
              flex: 1,
              height: "40px",
              borderRadius: "12px",
              background: currentRating === "favorite" ? "rgba(229, 9, 20, 0.24)" : "rgba(255, 255, 255, 0.08)",
              border: currentRating === "favorite" ? "1px solid rgba(229, 9, 20, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
              color: currentRating === "favorite" ? "#e50914" : "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <svg
              width={17}
              height={17}
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

        {/* Divider matching reference */}
        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "4px 2px" }} />

        {/* 5. Not Interested */}
        <button className="cinema-ctx-item" onClick={handleNotInterested} style={menuItemStyle}>
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
          <span>Not Interested</span>
        </button>

        {/* 6. Share */}
        <button className="cinema-ctx-item" onClick={handleShare} style={menuItemStyle}>
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span>Share</span>
        </button>
      </div>

      {/* Add To List Modal */}
      <AddToListModal
        post={post}
        isOpen={showAddToListModal}
        onClose={() => {
          setShowAddToListModal(false);
          onClose();
        }}
      />
    </>,
    document.body
  );
};
