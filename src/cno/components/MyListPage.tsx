import React, { useState } from "react";
import { Plus } from "lucide-react";
import { MediaCard } from "./MediaCard";
import type { CnoMedia } from "../types";

interface MyListPageProps {
  continueWatching: CnoMedia[];
  savedItems: CnoMedia[];
  onPlay: (media: CnoMedia) => void;
  onOpenDetails: (media: CnoMedia) => void;
  onToggleWatchlist: (media: CnoMedia) => void;
  watchlist: string[];
  onShowToast: (msg: string) => void;
}

export const MyListPage: React.FC<MyListPageProps> = ({
  continueWatching,
  savedItems,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  watchlist,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<"saved" | "ratings" | "history" | "stats">("saved");

  return (
    <div style={{ paddingTop: "90px", paddingBottom: "80px", minHeight: "100vh" }}>
      <div style={{ padding: "0 48px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "32px" }}>
          My List
        </h1>

        {/* Continue Watching Row */}
        {continueWatching.length > 0 && (
          <section style={{ marginBottom: "40px" }}>
            <h2 style={{ fontSize: "19px", fontWeight: "700", marginBottom: "14px" }}>
              Continue Watching
            </h2>
            <div style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "12px" }}>
              {continueWatching.map((item) => (
                <MediaCard
                  key={item.id}
                  media={item}
                  variant="continue_watching"
                  onPlay={onPlay}
                  onOpenDetails={onOpenDetails}
                  onToggleWatchlist={onToggleWatchlist}
                  isWatchlisted={watchlist.includes(item.id)}
                  onShowToast={onShowToast}
                />
              ))}
            </div>
          </section>
        )}

        {/* Your Lists */}
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "19px", fontWeight: "700", marginBottom: "14px" }}>
            Your Lists
          </h2>
          <div style={{ display: "flex", gap: "16px" }}>
            {/* + New List Card */}
            <div
              className="cno-card-portrait"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                borderStyle: "dashed",
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
              onClick={() => onShowToast("New list creator")}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus size={20} />
              </div>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1" }}>
                New List
              </span>
            </div>

            {savedItems.map((item) => (
              <MediaCard
                key={item.id}
                media={item}
                variant="portrait"
                onPlay={onPlay}
                onOpenDetails={onOpenDetails}
                onToggleWatchlist={onToggleWatchlist}
                isWatchlisted={watchlist.includes(item.id)}
                onShowToast={onShowToast}
              />
            ))}
          </div>
        </section>

        {/* Bottom Filter Tabs */}
        <div style={{ marginTop: "40px" }}>
          <div className="cno-nav-pills" style={{ display: "inline-flex" }}>
            <button
              className={`cno-nav-pill-btn ${activeTab === "saved" ? "active" : ""}`}
              onClick={() => setActiveTab("saved")}
            >
              Saved
            </button>
            <button
              className={`cno-nav-pill-btn ${activeTab === "ratings" ? "active" : ""}`}
              onClick={() => setActiveTab("ratings")}
            >
              Ratings
            </button>
            <button
              className={`cno-nav-pill-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              History
            </button>
            <button
              className={`cno-nav-pill-btn ${activeTab === "stats" ? "active" : ""}`}
              onClick={() => setActiveTab("stats")}
            >
              Stats
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
