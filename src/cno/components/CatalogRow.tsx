import React from "react";
import { ChevronRight } from "lucide-react";
import { MediaCard } from "./MediaCard";
import type { CnoMedia } from "../types";

interface CatalogRowProps {
  title: string;
  items: CnoMedia[];
  variant?: "landscape" | "portrait" | "continue_watching" | "top10";
  onPlay: (media: CnoMedia) => void;
  onOpenDetails: (media: CnoMedia) => void;
  onToggleWatchlist: (media: CnoMedia) => void;
  watchlist: string[];
  onShowToast: (msg: string) => void;
  onTitleClick?: () => void;
}

export const CatalogRow: React.FC<CatalogRowProps> = ({
  title,
  items,
  variant = "landscape",
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  watchlist,
  onShowToast,
  onTitleClick,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <section className="cno-row-container">
      <div className="cno-row-header">
        <button className="cno-row-title-btn" onClick={onTitleClick}>
          <span>{title}</span>
          <ChevronRight className="cno-row-chevron" size={18} />
        </button>
      </div>

      <div className="cno-row-scroll">
        {items.map((item) => (
          <MediaCard
            key={item.id}
            media={item}
            variant={variant}
            onPlay={onPlay}
            onOpenDetails={onOpenDetails}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={watchlist.includes(item.id)}
            onShowToast={onShowToast}
          />
        ))}
      </div>
    </section>
  );
};
