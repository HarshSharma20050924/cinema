import React, { useState, useEffect } from "react";
import { MediaCard } from "./MediaCard";
import { Pagination } from "./Pagination";
import { GlobalSearchShelf } from "./GlobalSearchShelf";
import { ArrowLeftIcon } from "../../icons";
import { getProviderDisplayName } from "../../utils/providerNames";
import type { Post } from "../../types";

interface MediaGridProps {
  posts: Post[];
  title: string;
  loading: boolean;
  providerName?: string;
  page: number;
  onPageChange: (newPage: number) => void;
  onSelectPost: (post: Post) => void;
  onBack?: () => void;
  showBack?: boolean;
  isGlobalSearch?: boolean;
  isStreaming?: boolean;
  totalPages?: number;
  onToggleGlobalSearch?: () => void;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  posts,
  title,
  loading,
  providerName,
  page,
  onPageChange,
  onSelectPost,
  onBack,
  showBack,
  isGlobalSearch = false,
  isStreaming = false,
  totalPages = 94,
  onToggleGlobalSearch,
}) => {
  const [showSlowLoadHint, setShowSlowLoadHint] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowSlowLoadHint(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowSlowLoadHint(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, [loading]);

  // If in global search mode, group results by extension source into horizontal shelves
  if (isGlobalSearch) {
    const grouped = posts.reduce((acc, p) => {
      const pKey = (p.provider || "").toLowerCase();
      const pName = getProviderDisplayName(pKey, p.providerName);
      if (!acc[pName]) {
        acc[pName] = {
          name: pName,
          key: pKey,
          items: [],
        };
      }
      acc[pName].items.push(p);
      return acc;
    }, {} as Record<string, { name: string; key: string; items: Post[] }>);

    const shelfGroups = Object.values(grouped);

    return (
      <main className="main-container" style={{ padding: "20px 24px" }}>
        {/* Title & Navigation Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {showBack && onBack && (
              <button
                onClick={onBack}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <ArrowLeftIcon size={14} />
                <span>Back</span>
              </button>
            )}

            <div style={{ width: "4px", height: "20px", background: "#e50914", borderRadius: "3px" }} />
            <h2 style={{ fontSize: "18px", fontWeight: 800 }}>{title}</h2>
            {!loading && posts.length > 0 && (
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
                ({posts.length} results)
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "280px",
              padding: "50px 20px",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                border: "3px solid rgba(229, 9, 20, 0.18)",
                borderTopColor: "var(--accent-red, #e50914)",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                Searching movies & shows...
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Finding available streams...
              </span>
            </div>

            {showSlowLoadHint && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "8px",
                  padding: "12px 20px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "14px",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.8)", fontWeight: 500 }}>
                  Taking longer than usual to load.
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 16px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #e50914, #ff334b)",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)",
                    }}
                  >
                    <span>↻ Reload</span>
                  </button>
                  {showBack && onBack && (
                    <button
                      onClick={onBack}
                      style={{
                        padding: "7px 12px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        cursor: "pointer",
                      }}
                    >
                      Back
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : shelfGroups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "15px", fontWeight: 600 }}>No titles found</div>
            <div style={{ fontSize: "12px", marginTop: "6px" }}>
              Try searching with another title or keyword.
            </div>
            {showBack && onBack && (
              <button
                onClick={onBack}
                style={{
                  marginTop: "14px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  cursor: "pointer",
                }}
              >
                ← Back to Home
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {shelfGroups.map((group) => (
              <GlobalSearchShelf
                key={group.name}
                providerName={group.name}
                providerKey={group.key}
                posts={group.items}
                onSelectPost={onSelectPost}
              />
            ))}

            {isStreaming && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "32px 0 20px 0",
                  color: "var(--text-muted)",
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    border: "2.5px solid rgba(229, 9, 20, 0.2)",
                    borderTopColor: "var(--accent-red, #e50914)",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255, 255, 255, 0.7)" }}>
                  Loading more results...
                </span>
              </div>
            )}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="main-container" style={{ padding: "20px 24px" }}>
      {/* Title & Navigation Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {showBack && onBack && (
            <button
              onClick={onBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <ArrowLeftIcon size={14} />
              <span>Back</span>
            </button>
          )}

          <div style={{ width: "4px", height: "20px", background: "#e50914", borderRadius: "3px" }} />
          <h2 style={{ fontSize: "18px", fontWeight: 800 }}>{title}</h2>
          {!loading && posts.length > 0 && (
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
              ({posts.length} titles)
            </span>
          )}
        </div>
      </div>

      {/* Animated Loader during loading */}
      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "320px",
            padding: "60px 20px",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              border: "3px solid rgba(229, 9, 20, 0.18)",
              borderTopColor: "var(--accent-red, #e50914)",
              animation: "spin 0.8s linear infinite",
            }}
          />

          {showSlowLoadHint && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                marginTop: "10px",
                padding: "12px 20px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "14px",
                backdropFilter: "blur(12px)",
              }}
            >
              <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.8)", fontWeight: 500 }}>
                Taking longer than usual to load.
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 16px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #e50914, #ff334b)",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)",
                  }}
                >
                  <span>↻ Reload</span>
                </button>
                {showBack && onBack && (
                  <button
                    onClick={onBack}
                    style={{
                      padding: "7px 12px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "15px", fontWeight: 600 }}>No titles found</div>
          <div style={{ fontSize: "12px", marginTop: "6px" }}>
            Try searching with another title or keyword.
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: "14px" }}>
            {!isGlobalSearch && onToggleGlobalSearch && (
              <button
                onClick={onToggleGlobalSearch}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #e50914, #ff334b)",
                  color: "#fff",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)",
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <span>🔍 Search Globally Across All Sources</span>
              </button>
            )}
            {showBack && onBack && (
              <button
                onClick={onBack}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  cursor: "pointer",
                }}
              >
                ← Back to Home
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
            <div className="media-post-grid">
              {posts.map((post, idx) => (
                <MediaCard
                  key={`${post.provider || ""}:${post.link || post.title}-${idx}`}
                  post={post}
                  onClick={onSelectPost}
                  priority={idx < 8}
                />
              ))}
            </div>

          {isStreaming && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "24px 0",
                color: "var(--text-muted)",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: "2px solid rgba(229, 9, 20, 0.25)",
                  borderTopColor: "var(--accent-red, #e50914)",
                  animation: "spin 0.75s linear infinite",
                }}
              />
              <span style={{ color: "rgba(255,255,255,0.7)" }}>Loading more titles...</span>
            </div>
          )}

          {/* Pagination */}
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </>
      )}
    </main>
  );
};
