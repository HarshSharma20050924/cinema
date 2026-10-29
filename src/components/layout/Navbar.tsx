import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  SettingsIcon,
  ArrowLeftIcon,
  XIcon,
  ChevronDownIcon,
  SearchIcon,
  DownloadIcon,
  TvIcon,
  HomeIcon,
  CategoryIcon,
  StarIcon,
  ClapperIcon,
  SparklesIcon,
} from "../../icons";
import { NavSearchBar } from "./NavSearchBar";
import { ProviderDropdown } from "./ProviderDropdown";
import { downloadManager } from "../../utils/downloadManager";
import type { Provider } from "../../types";

export interface NavbarProps {
  providers: Provider[];
  activeProvider: Provider | null;
  onSelectProvider: (provider: Provider) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isGlobalSearch: boolean;
  onToggleGlobalSearch: () => void;
  onOpenSettings: () => void;
  onOpenDownloads?: () => void;
  onOpenSearch?: () => void;
  onGoHome?: () => void;
  onSelectCategoryNav?: (type: "home" | "movies" | "tv" | "anime" | "coming-soon" | "categories" | "rankings" | "downloads" | "mylist") => void;
  activeNavTab?: string;
  isModalNavbar?: boolean;
  onClose?: () => void;
  hasHero?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  providers,
  activeProvider,
  onSelectProvider,
  searchQuery,
  onSearchChange,
  isGlobalSearch,
  onToggleGlobalSearch,
  onOpenSettings,
  onOpenDownloads,
  onOpenSearch,
  onGoHome,
  onSelectCategoryNav,
  activeNavTab = "home",
  isModalNavbar = false,
  onClose,
  hasHero = true,
}) => {
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDownloadCount, setActiveDownloadCount] = useState(0);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = typeof window !== "undefined" && Boolean((window as any).CinemaDesktop?.isDesktop);

  // Tab measurement and GPU sliding red pill indicator
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [indicator, setIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useLayoutEffect(() => {
    const activeId = activeNavTab === "home" && !searchQuery ? "home" : activeNavTab;
    const el = tabRefs.current[activeId];
    if (el) {
      setIndicator({
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
        opacity: 1,
      });
    } else {
      setIndicator((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeNavTab, searchQuery]);

  // Click outside listener for Settings popup menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setSettingsMenuOpen(false);
      }
    };
    if (settingsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsMenuOpen]);

  useEffect(() => {
    return downloadManager.subscribe((tasks) => {
      setActiveDownloadCount(tasks.filter((t) => t.status === "downloading").length);
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems: Array<{
    id: "home" | "movies" | "tv" | "anime" | "coming-soon" | "mylist";
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }> = [
    {
      id: "home",
      label: "Home",
      icon: <HomeIcon size={15} color="#ffffff" />,
      onClick: () => {
        if (onGoHome) onGoHome();
        onSearchChange("");
      },
    },
    {
      id: "movies",
      label: "Movies",
      icon: <ClapperIcon size={15} color="#ffffff" />,
      onClick: () => {
        if (onSelectCategoryNav) onSelectCategoryNav("movies");
      },
    },
    {
      id: "tv",
      label: "Shows",
      icon: <TvIcon size={15} color="#ffffff" />,
      onClick: () => {
        if (onSelectCategoryNav) onSelectCategoryNav("tv");
      },
    },
    {
      id: "anime",
      label: "Anime",
      icon: <SparklesIcon size={15} color="#ffffff" />,
      onClick: () => {
        if (onSelectCategoryNav) onSelectCategoryNav("anime");
      },
    },
    {
      id: "coming-soon",
      label: "Coming Soon",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ),
      onClick: () => {
        if (onSelectCategoryNav) onSelectCategoryNav("coming-soon");
      },
    },
    {
      id: "mylist",
      label: "My List",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      ),
      onClick: () => {
        if (onSelectCategoryNav) onSelectCategoryNav("mylist");
      },
    },
  ];

  return (
    <header
      className="cinema-navbar"
      style={{
        position: isModalNavbar ? "sticky" : "fixed",
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: isModalNavbar ? 60 : 40,
        borderBottom: "none",
        background: "transparent",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
      }}
    >
      {/* DESKTOP NAVBAR (> 768px) */}
      <div
        className="desktop-navbar-row"
        style={{
          padding: "14px 32px 10px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          position: "relative",
        }}
      >
        {/* Brand Logo & Back button */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {onClose ? (
            <button
              onClick={onClose}
              title="Back"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.08)",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              }}
            >
              <ArrowLeftIcon size={14} />
              <span>Back</span>
            </button>
          ) : searchQuery ? (
            <button
              onClick={() => onSearchChange("")}
              title="Back"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.08)",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              <ArrowLeftIcon size={14} />
              <span>Back</span>
            </button>
          ) : null}

          <div
            onClick={() => {
              if (onGoHome) onGoHome();
              onSearchChange("");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <img
              src="/logo.png"
              alt="Cinema Logo"
              style={{
                height: "36px",
                width: "36px",
                borderRadius: "9px",
                objectFit: "cover",
              }}
            />
            <span
              style={{
                fontSize: "24px",
                fontWeight: 900,
                letterSpacing: "0.05em",
              }}
            >
              <span style={{ color: "#e50914" }}>CINEMA</span>
            </span>
          </div>
        </div>

        {/* Center Floating Glassmorphic Pill Capsule Nav with Sliding Red Indicator */}
        <nav
          aria-label="Primary"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 10,
            padding: "6px 8px",
            borderRadius: "9999px",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(18, 22, 32, 0.45) 45%, rgba(8, 10, 16, 0.55) 100%)",
            backdropFilter: "blur(28px) saturate(200%)",
            WebkitBackdropFilter: "blur(28px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* Sliding Red Active Indicator with GPU Acceleration */}
          <div
            style={{
              position: "absolute",
              top: `${indicator.top}px`,
              left: 0,
              transform: `translate3d(${indicator.left}px, 0, 0)`,
              width: `${indicator.width}px`,
              height: `${indicator.height}px`,
              borderRadius: "9999px",
              background: "linear-gradient(135deg, #ff1723 0%, #e50914 100%)",
              boxShadow: "0 4px 18px rgba(229, 9, 20, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.4)",
              opacity: indicator.opacity,
              pointerEvents: "none",
              transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), width 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease",
              willChange: "transform, width",
              zIndex: 1,
            }}
          />

          {navItems.map((item) => {
            const isActive =
              item.id === "home"
                ? activeNavTab === "home" && !searchQuery
                : activeNavTab === item.id;
            const isHovered = hoveredNav === item.id;

            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[item.id] = el;
                }}
                onClick={item.onClick}
                onMouseEnter={() => setHoveredNav(item.id)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  position: "relative",
                  zIndex: 2,
                  padding: "8px 18px",
                  borderRadius: "9999px",
                  background: "transparent",
                  color: isActive ? "#ffffff" : isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.80)",
                  fontSize: "14px",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  border: "none",
                  outline: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  transition: "color 0.15s ease",
                }}
              >
                {/* Active icon ONLY shown on active tab */}
                {isActive && item.icon && (
                  <span style={{ display: "inline-flex", alignItems: "center", color: "#ffffff" }}>
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Vertical Divider */}
          <div
            style={{
              width: "1px",
              height: "22px",
              background: "rgba(255, 255, 255, 0.2)",
              margin: "0 2px",
              zIndex: 2,
            }}
          />

          {/* Search Button in Capsule */}
          <button
            onClick={() => {
              if (onOpenSearch) onOpenSearch();
            }}
            title="Search movies, series & actors"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              zIndex: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <SearchIcon size={17} />
          </button>

          {/* Settings & More Menu Button in Capsule */}
          <div style={{ position: "relative", zIndex: 2 }} ref={settingsMenuRef}>
            <button
              onClick={() => setSettingsMenuOpen((prev) => !prev)}
              title="Settings & More"
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: settingsMenuOpen ? "rgba(255, 255, 255, 0.18)" : "transparent",
                border: "none",
                color: settingsMenuOpen ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                e.currentTarget.style.transform = "scale(1.08)";
              }}
              onMouseLeave={(e) => {
                if (!settingsMenuOpen) {
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                }
              }}
            >
              <SettingsIcon size={17} />
            </button>

            {/* Frosted Dropdown for Top 250, Categories, Downloads, and Settings */}
            {settingsMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  right: 0,
                  minWidth: "220px",
                  borderRadius: "16px",
                  background: "rgba(16, 18, 26, 0.88)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  boxShadow: "0 20px 48px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
                  padding: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  zIndex: 100,
                  animation: "fadeIn 0.15s ease",
                }}
              >
                <button
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    if (onSelectCategoryNav) onSelectCategoryNav("rankings");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "transparent",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                >
                  <StarIcon size={16} color="#e50914" fill="#e50914" />
                  <span>Top 250 Rankings</span>
                </button>

                <button
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    if (onSelectCategoryNav) onSelectCategoryNav("categories");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "transparent",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                >
                  <CategoryIcon size={16} color="#e50914" />
                  <span>Categories & Genres</span>
                </button>

                <button
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    if (onSelectCategoryNav) onSelectCategoryNav("downloads");
                    else if (onOpenDownloads) onOpenDownloads();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "transparent",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                >
                  <DownloadIcon size={16} color="#e50914" />
                  <span>Downloads</span>
                  {activeDownloadCount > 0 && (
                    <span
                      style={{
                        marginLeft: "auto",
                        background: "#e50914",
                        color: "#fff",
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "999px",
                      }}
                    >
                      {activeDownloadCount}
                    </span>
                  )}
                </button>

                <div
                  style={{
                    height: "1px",
                    background: "rgba(255, 255, 255, 0.12)",
                    margin: "4px 0",
                  }}
                />

                <button
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    onOpenSettings();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "transparent",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.85)",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
                  }}
                >
                  <SettingsIcon size={16} />
                  <span>Extension & Player Settings</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Right Actions: Downloads / Spacer */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "120px", justifyContent: "flex-end" }}>

          {/* Desktop Downloads Button */}
          {onOpenDownloads && (isDesktop || activeDownloadCount > 0) && (
            <button
              onClick={onOpenDownloads}
              title="Downloads"
              style={{
                position: "relative",
                width: "42px",
                height: "42px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                cursor: "pointer",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.28)";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <DownloadIcon size={17} />
              {activeDownloadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#e50914",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {activeDownloadCount}
                </span>
              )}
            </button>
          )}

          {/* Modal Close / Back Button */}

        </div>
      </div>

      {/* MOBILE NAVBAR (< 768px) */}
      <div
        className="mobile-navbar-container"
        style={{
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {onClose ? (
              <button
                onClick={onClose}
                title="Back"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "5px 10px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <ArrowLeftIcon size={14} />
                <span>Back</span>
              </button>
            ) : searchQuery ? (
              <button
                onClick={() => onSearchChange("")}
                title="Back"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "5px 10px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <ArrowLeftIcon size={14} />
                <span>Back</span>
              </button>
            ) : null}

            <div
              onClick={() => {
                if (onGoHome) onGoHome();
                onSearchChange("");
              }}
              style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
            >
              <img
                src="/logo.png"
                alt="Cinema Logo"
                style={{
                  height: "30px",
                  width: "30px",
                  borderRadius: "7px",
                  objectFit: "cover",
                }}
              />
              <span style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "0.03em" }}>
                <span style={{ color: "#e50914" }}>CINEMA</span>
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "999px",
                background: "rgba(14, 14, 14, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 600,
                maxWidth: "140px",
                cursor: "pointer",
                backdropFilter: "blur(10px)",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeProvider?.name || "Provider"}
              </span>
              <ChevronDownIcon size={11} color="rgba(255, 255, 255, 0.6)" />
            </button>

            <button
              onClick={onOpenSettings}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "999px",
                background: "rgba(14, 14, 14, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                cursor: "pointer",
                backdropFilter: "blur(10px)",
              }}
            >
              <SettingsIcon size={15} />
            </button>

            {onOpenDownloads && (isDesktop || activeDownloadCount > 0) && (
              <button
                onClick={onOpenDownloads}
                title="Downloads"
                style={{
                  position: "relative",
                  width: "34px",
                  height: "34px",
                  borderRadius: "999px",
                  background: "rgba(14, 14, 14, 0.85)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                }}
              >
                <DownloadIcon size={15} />
                {activeDownloadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-2px",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "#e50914",
                      color: "#ffffff",
                      fontSize: "9px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {activeDownloadCount}
                  </span>
                )}
              </button>
            )}


          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileDropdownOpen && (
          <div
            className="glass-panel"
            style={{
              position: "absolute",
              top: "46px",
              left: "14px",
              right: "14px",
              maxHeight: "300px",
              overflowY: "auto",
              borderRadius: "16px",
              padding: "8px",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.95)",
              zIndex: 60,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "rgba(10, 14, 22, 0.96)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div
              style={{
                padding: "4px 8px 6px 8px",
                fontSize: "10px",
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.5)",
                textTransform: "uppercase",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Sources ({providers.length})</span>
              <button onClick={() => setMobileDropdownOpen(false)} style={{ color: "rgba(255, 255, 255, 0.6)", background: "none", border: "none", cursor: "pointer" }}>
                <XIcon size={13} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {providers.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    onSelectProvider(p);
                    setMobileDropdownOpen(false);
                    onSearchChange("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: "9px",
                    background:
                      activeProvider?.value === p.value
                        ? "rgba(255, 255, 255, 0.12)"
                        : "transparent",
                    color: activeProvider?.value === p.value ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
                    fontSize: "12px",
                    fontWeight: 600,
                    textAlign: "left",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span>{p.name}</span>
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "2px 6px",
                      borderRadius: "999px",
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    {p.type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Search Row with Clear / Cancel Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <NavSearchBar
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              isGlobalSearch={isGlobalSearch}
              onToggleGlobalSearch={onToggleGlobalSearch}
              activeProviderName={activeProvider?.name}
              width="100%"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              title="Cancel search"
              style={{
                height: "40px",
                padding: "0 14px",
                borderRadius: "999px",
                background: "#e50914",
                border: "none",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)",
                transition: "all 0.15s ease",
              }}
            >
              <XIcon size={13} color="#ffffff" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
