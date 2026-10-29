import React, { useState, useEffect, useMemo } from "react";
import type { MediaPost } from "../../types";
import { ContinueWatchingShelf } from "../media/ContinueWatchingShelf";
import { MediaCard } from "../media/MediaCard";
import {
  getCustomLists,
  getSavedItems,
  getUserRatings,
  getWatchHistory,
  createCustomList,
  deleteCustomList,
  type CustomList,
  type HistoryItem,
} from "../../utils/userListsService";
import type { ContinueWatchingItem } from "../../utils/continueWatchingService";

interface MyListPageProps {
  onSelectPost: (post: MediaPost) => void;
  onResumeContinueWatching: (item: ContinueWatchingItem) => void;
  onOpenDownloads?: (post: MediaPost) => void;
  onBrowseMore?: () => void;
}

export const MyListPage: React.FC<MyListPageProps> = ({
  onSelectPost,
  onResumeContinueWatching,
  onOpenDownloads,
  onBrowseMore,
}) => {
  const [activeTab, setActiveTab] = useState<"saved" | "ratings" | "history" | "stats">("saved");
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "tv">("all");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "rating">("recent");
  const [selectedList, setSelectedList] = useState<CustomList | null>(null);

  // User state
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [savedItems, setSavedItems] = useState<MediaPost[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, any>>({});
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState("");

  const refreshData = () => {
    setCustomLists(getCustomLists());
    setSavedItems(getSavedItems());
    setHistoryItems(getWatchHistory());
    setRatingsMap(getUserRatings());
  };

  useEffect(() => {
    refreshData();
    const handleUpdate = () => refreshData();
    window.addEventListener("cinema:custom_lists_updated", handleUpdate);
    window.addEventListener("cinema:saved_updated", handleUpdate);
    window.addEventListener("cinema:ratings_updated", handleUpdate);
    window.addEventListener("cinema:history_updated", handleUpdate);
    return () => {
      window.removeEventListener("cinema:custom_lists_updated", handleUpdate);
      window.removeEventListener("cinema:saved_updated", handleUpdate);
      window.removeEventListener("cinema:ratings_updated", handleUpdate);
      window.removeEventListener("cinema:history_updated", handleUpdate);
    };
  }, []);

  // Ambient sliding backdrop images
  const ambientImages = [
    "https://image.tmdb.org/t/p/original/sHI9xlFRWCJ38AIIfOqnGjuEvXz.jpg",
    "https://image.tmdb.org/t/p/original/m4TUaeqAIf2m4Y49zB1AecQ2b19.jpg",
    "https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
    "https://image.tmdb.org/t/p/original/8YFL5QQVPy3AgrEQxNYVSgiPEbe.jpg",
  ];
  const [activeBgIdx, setActiveBgIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBgIdx((prev) => (prev + 1) % ambientImages.length);
    }, 9000);
    return () => clearInterval(timer);
  }, [ambientImages.length]);

  // Filtered and sorted items for active tab
  const displayItems = useMemo(() => {
    let list: MediaPost[] = [];
    if (activeTab === "saved") {
      list = [...savedItems];
    } else if (activeTab === "ratings") {
      list = Object.values(ratingsMap).map((r) => r.post);
    } else if (activeTab === "history") {
      list = historyItems.map((h) => h.post);
    }

    if (typeFilter !== "all") {
      list = list.filter((p) => {
        const isTv = p.type === "tv" || p.type === "series";
        return typeFilter === "tv" ? isTv : !isTv;
      });
    }

    if (sortBy === "title") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    return list;
  }, [activeTab, savedItems, ratingsMap, historyItems, typeFilter, sortBy]);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: "#07090e",
        color: "#ffffff",
        paddingTop: "90px",
        paddingBottom: "100px",
        overflowX: "hidden",
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* Dynamic Ambient Sliding Blurred Backdrop                      */}
      {/* ------------------------------------------------------------- */}
      {ambientImages.map((imgUrl, i) => (
        <div
          key={imgUrl}
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${imgUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(60px) brightness(0.25) saturate(160%)",
            transform: "scale(1.1)",
            opacity: activeBgIdx === i ? 1 : 0,
            transition: "opacity 2.5s cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      ))}

      {/* Main Content Container */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "1480px",
          margin: "0 auto",
          padding: "20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "42px",
        }}
      >
        {/* If viewing a specific custom list, show list view */}
        {selectedList ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {/* Back to all lists button */}
            <button
              onClick={() => setSelectedList(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                width: "fit-content",
                transition: "all 0.15s ease",
              }}
            >
              ← Back to My List
            </button>

            {/* List Detail Header (Screenshot 3 & Screencast 00:07) */}
            <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
              {/* Big List Playlist Icon Box */}
              <div
                style={{
                  width: "160px",
                  height: "210px",
                  borderRadius: "16px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6)",
                }}
              >
                <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.8">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>

              {/* Title & Metadata */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "rgba(255, 255, 255, 0.5)" }}>
                  LIST
                </span>
                <h1 style={{ margin: 0, fontSize: "40px", fontWeight: 800, color: "#fff" }}>{selectedList.name}</h1>
                <span style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.55)" }}>
                  {selectedList.items.length === 0 ? "Empty" : `${selectedList.items.length} titles`} · Updated Oct 29
                </span>

                {/* Actions: Share, Delete */}
                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      alert("List link copied to clipboard!");
                    }}
                    style={pillActionButtonStyle}
                  >
                    Share
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete list "${selectedList.name}"?`)) {
                        deleteCustomList(selectedList.id);
                        setSelectedList(null);
                        setCustomLists(getCustomLists());
                      }
                    }}
                    style={{ ...pillActionButtonStyle, background: "rgba(229, 9, 20, 0.15)", borderColor: "rgba(229, 9, 20, 0.4)" }}
                  >
                    Delete List
                  </button>
                </div>
              </div>
            </div>

            {/* List Media Grid */}
            {selectedList.items.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: "24px",
                }}
              >
                {selectedList.items.map((post) => (
                  <MediaCard key={post.id} post={post} onSelect={onSelectPost} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "rgba(255, 255, 255, 0.8)" }}>Nothing here yet</h3>
                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)", margin: "8px 0 24px" }}>
                  Add titles from any title's ··· menu, or press and hold a poster, then choose Add to a List.
                </p>
                <button
                  onClick={onBrowseMore}
                  style={{
                    padding: "10px 28px",
                    borderRadius: "999px",
                    background: "#ffffff",
                    border: "none",
                    color: "#000000",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Browse
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Header: My List */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
              <h1 style={{ margin: 0, fontSize: "42px", fontWeight: 800, letterSpacing: "-0.5px" }}>My List</h1>
            </div>

            {/* 1. Continue Watching Shelf (Screenshots 2 & 7) */}
            <div>
              <ContinueWatchingShelf onResume={onResumeContinueWatching} />
            </div>

            {/* 2. Your Lists Section (Screenshots 2 & 6) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#ffffff" }}>Your Lists</h2>
              <div style={{ display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "12px" }}>
                {/* + New List Card */}
                <div
                  onClick={() => setShowNewListModal(true)}
                  style={{
                    width: "180px",
                    minWidth: "180px",
                    aspectRatio: "2/3",
                    borderRadius: "14px",
                    border: "2px dashed rgba(255, 255, 255, 0.18)",
                    background: "rgba(255, 255, 255, 0.03)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#e50914";
                    e.currentTarget.style.background = "rgba(229, 9, 20, 0.08)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      fontWeight: 600,
                    }}
                  >
                    +
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#cbd5e1" }}>New List</span>
                </div>

                {/* User Created Lists */}
                {customLists.map((list) => {
                  const firstPoster = list.items[0]?.image;
                  return (
                    <div
                      key={list.id}
                      onClick={() => setSelectedList(list)}
                      style={{
                        width: "180px",
                        minWidth: "180px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        cursor: "pointer",
                        transition: "transform 0.2s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                    >
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "2/3",
                          borderRadius: "14px",
                          overflow: "hidden",
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          position: "relative",
                        }}
                      >
                        {firstPoster ? (
                          <img src={firstPoster} alt={list.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
                            <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.8">
                              <path d="M9 18V5l12-2v13" />
                              <circle cx="6" cy="18" r="3" />
                              <circle cx="18" cy="16" r="3" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>{list.name}</span>
                        <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
                          {list.items.length} {list.items.length === 1 ? "title" : "titles"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Filter Navigation & Showcase (Screenshots 2 & 7) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Category Pills Row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                {/* Left Pills: Saved, Ratings, History, Stats */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["saved", "ratings", "history", "stats"] as const).map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                          padding: "8px 20px",
                          borderRadius: "999px",
                          background: isActive ? "#e50914" : "rgba(255, 255, 255, 0.08)",
                          border: isActive ? "1px solid #e50914" : "1px solid rgba(255, 255, 255, 0.14)",
                          color: "#ffffff",
                          fontSize: "13.5px",
                          fontWeight: isActive ? 700 : 500,
                          cursor: "pointer",
                          boxShadow: isActive ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                          textTransform: "capitalize",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                {/* Right Filters: All / Movies / Shows + Sort */}
                {activeTab !== "stats" && (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.07)", borderRadius: "999px", padding: "3px" }}>
                      {(["all", "movie", "tv"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTypeFilter(t)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "999px",
                            background: typeFilter === t ? "rgba(255, 255, 255, 0.18)" : "transparent",
                            border: "none",
                            color: typeFilter === t ? "#fff" : "rgba(255, 255, 255, 0.6)",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            cursor: "pointer",
                            textTransform: "capitalize",
                          }}
                        >
                          {t === "all" ? "All" : t === "movie" ? "Movies" : "Shows"}
                        </button>
                      ))}
                    </div>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.16)",
                        color: "#fff",
                        borderRadius: "999px",
                        padding: "7px 16px",
                        fontSize: "13px",
                        fontWeight: 600,
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="recent">Recently Added</option>
                      <option value="title">Title</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Showcase Grid or Stats View */}
              {activeTab === "stats" ? (
                /* Stats Dashboard View (Screenshot 7 & Screencast 00:26) */
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Stat Summary Cards Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                    <div style={statCardStyle}>
                      <span style={{ fontSize: "32px", fontWeight: 800, color: "#fff" }}>42m</span>
                      <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)" }}>Watched</span>
                    </div>
                    <div style={statCardStyle}>
                      <span style={{ fontSize: "32px", fontWeight: 800, color: "#fff" }}>0</span>
                      <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)" }}>Films finished</span>
                    </div>
                    <div style={statCardStyle}>
                      <span style={{ fontSize: "32px", fontWeight: 800, color: "#fff" }}>0</span>
                      <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)" }}>Episodes · 3 shows</span>
                    </div>
                    <div style={statCardStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "28px" }}>🔥</span>
                        <span style={{ fontSize: "32px", fontWeight: 800, color: "#fff" }}>2</span>
                      </div>
                      <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)" }}>Days in a row</span>
                    </div>
                  </div>

                  {/* Heat Grid & Top Genres */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "20px" }}>
                    {/* Activity Heat Grid */}
                    <div style={statCardStyle}>
                      <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "12px" }}>
                        LAST 16 WEEKS
                      </span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)", gap: "6px" }}>
                        {Array.from({ length: 112 }).map((_, idx) => {
                          const isActive = idx === 110 || idx === 111 || idx === 85;
                          return (
                            <div
                              key={idx}
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "3px",
                                background: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.08)",
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Top Genres Bars */}
                    <div style={statCardStyle}>
                      <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "12px" }}>
                        TOP GENRES
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {[
                          { name: "Crime", time: "25m", width: "90%" },
                          { name: "Thriller", time: "25m", width: "85%" },
                          { name: "Action", time: "25m", width: "70%" },
                          { name: "Drama", time: "25m", width: "60%" },
                          { name: "History", time: "17m", width: "45%" },
                        ].map((g) => (
                          <div key={g.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                            <span style={{ fontSize: "13px", width: "70px", color: "rgba(255, 255, 255, 0.8)" }}>{g.name}</span>
                            <div style={{ flex: 1, height: "6px", background: "rgba(255, 255, 255, 0.10)", borderRadius: "999px", overflow: "hidden" }}>
                              <div style={{ width: g.width, height: "100%", background: "#ffffff", borderRadius: "999px" }} />
                            </div>
                            <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)" }}>{g.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : displayItems.length > 0 ? (
                /* Media Cards Grid */
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: "24px",
                  }}
                >
                  {displayItems.map((post) => (
                    <MediaCard key={post.id} post={post} onSelect={onSelectPost} />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "80px 20px" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: 700, color: "rgba(255, 255, 255, 0.8)" }}>
                    No items in {activeTab} yet
                  </h3>
                  <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)", margin: "8px 0 24px" }}>
                    Browse movies and shows to add them to your watchlist.
                  </p>
                  <button
                    onClick={onBrowseMore}
                    style={{
                      padding: "10px 28px",
                      borderRadius: "999px",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(229, 9, 20, 0.45)",
                    }}
                  >
                    Explore Titles
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* NEW LIST MODAL                                                */}
      {/* ------------------------------------------------------------- */}
      {showNewListModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowNewListModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "380px",
              background: "rgba(18, 22, 30, 0.88)",
              backdropFilter: "blur(28px)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 28px 70px rgba(0, 0, 0, 0.9)",
              display: "flex",
              flexDirection: "column",
            }}
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
                  setCustomLists(getCustomLists());
                  setShowNewListModal(false);
                  setNewListName("");
                  setSelectedList(created);
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
                    setCustomLists(getCustomLists());
                    setShowNewListModal(false);
                    setNewListName("");
                    setSelectedList(created);
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
    </div>
  );
};

const pillActionButtonStyle: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: "999px",
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const statCardStyle: React.CSSProperties = {
  background: "rgba(18, 22, 30, 0.65)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.10)",
  borderRadius: "16px",
  padding: "20px 24px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.4)",
};
