import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Info,
  Plus,
  Check,
  ListPlus,
  ThumbsDown,
  ThumbsUp,
  Heart,
  EyeOff,
  Share2,
  MoreVertical,
  Globe,
} from "lucide-react";
import type { CnoMedia } from "../types";

interface MediaCardProps {
  media: CnoMedia;
  variant?: "landscape" | "portrait" | "continue_watching" | "top10";
  onPlay: (media: CnoMedia) => void;
  onOpenDetails: (media: CnoMedia) => void;
  onToggleWatchlist: (media: CnoMedia) => void;
  isWatchlisted: boolean;
  onShowToast: (msg: string) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  variant = "landscape",
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isWatchlisted,
  onShowToast,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reaction, setReaction] = useState<"like" | "dislike" | "heart" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(window.location.origin + `?media=${media.id}`);
    onShowToast("Link copied to clipboard");
    setMenuOpen(false);
  };

  const isPortrait = variant === "portrait";
  const isTop10 = variant === "top10";
  const isContinue = variant === "continue_watching";

  const cardClass = isTop10
    ? "cno-top10-card"
    : isPortrait
    ? "cno-card-portrait"
    : "cno-card-landscape";

  return (
    <div
      className={cardClass}
      onClick={() => onOpenDetails(media)}
      ref={menuRef}
    >
      {/* Top 10 Giant Ranking Number */}
      {isTop10 && media.rank && (
        <span className="cno-top10-number">{media.rank}</span>
      )}

      {/* Poster / Backdrop Image */}
      <img
        src={isPortrait ? media.poster : media.backdrop || media.poster}
        alt={media.title}
        className="cno-card-img"
        loading="lazy"
      />

      {/* 3-Dot Context Trigger Button */}
      <button
        className="cno-card-menu-btn"
        title="More options"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
      >
        <MoreVertical size={15} />
      </button>

      {/* Bottom Title & Logo Overlay */}
      <div className="cno-card-overlay-bottom">
        <div className="cno-card-title-logo">{media.title}</div>
        {media.timeLeft && <div className="cno-card-subtitle">{media.timeLeft}</div>}

      </div>

      {/* Progress Bar for Continue Watching */}
      {isContinue && media.progress != null && (
        <div className="cno-card-progress-bar">
          <div
            className="cno-card-progress-fill"
            style={{ width: `${media.progress}%` }}
          />
        </div>
      )}

      {/* Floating Card Context Popover Menu */}
      {menuOpen && (
        <div
          className="cno-popover-menu"
          style={{
            top: "36px",
            right: "8px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="cno-popover-header">
            <div className="cno-popover-title">{media.title}</div>
            <div className="cno-popover-subtitle">
              {media.type === "movie" ? "Movie" : "Show"} • {media.year}
            </div>
          </div>

          <div className="cno-popover-list">
            <button
              className="cno-popover-item"
              onClick={() => {
                setMenuOpen(false);
                onPlay(media);
              }}
            >
              <Play size={15} /> Play
            </button>

            <button
              className="cno-popover-item"
              onClick={() => {
                setMenuOpen(false);
                onOpenDetails(media);
              }}
            >
              <Info size={15} /> Details
            </button>


            <button
              className="cno-popover-item"
              onClick={() => {
                onToggleWatchlist(media);
                setMenuOpen(false);
              }}
            >
              {isWatchlisted ? (
                <>
                  <Check size={15} color="#4ade80" /> In My List
                </>
              ) : (
                <>
                  <Plus size={15} /> Add to My List
                </>
              )}
            </button>

            <button
              className="cno-popover-item"
              onClick={() => {
                setMenuOpen(false);
                onShowToast("Added to custom list");
              }}
            >
              <ListPlus size={15} /> Add to a List...
            </button>

            {/* Reaction Buttons Row */}
            <div className="cno-reactions-row">
              <button
                className="cno-reaction-btn"
                style={{ color: reaction === "dislike" ? "#f87171" : undefined }}
                onClick={() => setReaction(reaction === "dislike" ? null : "dislike")}
                title="Not for me"
              >
                <ThumbsDown size={14} />
              </button>
              <button
                className="cno-reaction-btn"
                style={{ color: reaction === "like" ? "#60a5fa" : undefined }}
                onClick={() => setReaction(reaction === "like" ? null : "like")}
                title="I like this"
              >
                <ThumbsUp size={14} />
              </button>
              <button
                className="cno-reaction-btn"
                style={{ color: reaction === "heart" ? "#f43f5e" : undefined }}
                onClick={() => setReaction(reaction === "heart" ? null : "heart")}
                title="Loved it"
              >
                <Heart size={14} />
              </button>
            </div>

            <div className="cno-popover-divider" />

            <button
              className="cno-popover-item"
              onClick={() => {
                setMenuOpen(false);
                onShowToast("Marked as watched");
              }}
            >
              <Check size={15} /> Mark as Watched
            </button>

            <button
              className="cno-popover-item"
              onClick={() => {
                setMenuOpen(false);
                onShowToast("Hidden from recommendations");
              }}
            >
              <EyeOff size={15} /> Not Interested
            </button>

            <button className="cno-popover-item" onClick={handleShare}>
              <Share2 size={15} /> Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
