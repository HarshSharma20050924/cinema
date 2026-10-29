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
import {
  isUserSignedIn,
  getActiveProfile,
  type UserProfile,
} from "../../utils/profileService";
import { ProfileAvatar } from "../auth/ProfileAvatar";
import { ProfileMenuDropdown } from "../auth/ProfileMenuDropdown";
import { NotificationsPopover } from "../auth/NotificationsPopover";
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
  onOpenSignIn?: () => void;
  onOpenCreateAccount?: () => void;
  onOpenManageProfiles?: () => void;
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
  onOpenSignIn,
  onOpenCreateAccount,
  onOpenManageProfiles,
  activeNavTab = "home",
  isModalNavbar = false,
  onClose,
  hasHero = true,
}) => {
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDownloadCount, setActiveDownloadCount] = useState(0);
  const [signedIn, setSignedIn] = useState(() => isUserSignedIn());
  const [profile, setProfile] = useState<UserProfile>(() => getActiveProfile());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const isDesktop = typeof window !== "undefined" && Boolean((window as any).CinemaDesktop?.isDesktop);

  const [localTab, setLocalTab] = useState<string>(activeNavTab || "home");

  useEffect(() => {
    if (activeNavTab) setLocalTab(activeNavTab);
  }, [activeNavTab]);

  const effectiveActiveTab = searchQuery ? "home" : localTab;
  const navContainerRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    ready: boolean;
  }>({ left: 0, top: 0, width: 0, height: 0, ready: false });

  useLayoutEffect(() => {
    const update = () => {
      const activeEl = tabRefs.current[effectiveActiveTab];
      if (!activeEl) {
        setIndicatorStyle((prev) => ({ ...prev, ready: false }));
        return;
      }

      setIndicatorStyle({
        left: activeEl.offsetLeft,
        top: activeEl.offsetTop,
        width: activeEl.offsetWidth,
        height: activeEl.offsetHeight,
        ready: true,
      });
    };

    update();
    const t = setTimeout(update, 30);
    window.addEventListener("resize", update);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
    };
  }, [effectiveActiveTab]);

  useEffect(() => {
    const handleProfileChange = () => {
      setSignedIn(isUserSignedIn());
      setProfile(getActiveProfile());
    };
    window.addEventListener("cinema:profile_changed", handleProfileChange);
    return () => window.removeEventListener("cinema:profile_changed", handleProfileChange);
  }, []);

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
      label: "Watchlist",
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
          ref={navContainerRef}
          aria-label="Primary"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            zIndex: 10,
            padding: "6px 10px",
            borderRadius: "9999px",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(18, 22, 32, 0.45) 45%, rgba(8, 10, 16, 0.55) 100%)",
            backdropFilter: "blur(28px) saturate(200%)",
            WebkitBackdropFilter: "blur(28px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.4)",
          }}
        >
          <style>{`
            @keyframes cinemaNavIconPop {
              0% {
                opacity: 0;
                transform: scale(0.4);
              }
              100% {
                opacity: 1;
                transform: scale(1);
              }
            }
            .cinema-nav-tab {
              transition: background 0.18s ease, color 0.18s ease !important;
            }
            .cinema-nav-tab:hover {
              background: rgba(255, 255, 255, 0.10) !important;
            }
          `}</style>

          {/* Inner Relative Track (padding 0 ensures offsetLeft is 100% exact) */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: 0,
            }}
          >
            {/* Sliding Cinema Red Pill */}
            <div
              style={{
                position: "absolute",
                top: `${indicatorStyle.top}px`,
                left: 0,
                transform: `translate3d(${indicatorStyle.left}px, 0, 0)`,
                width: `${indicatorStyle.width}px`,
                height: `${indicatorStyle.height}px`,
                borderRadius: "9999px",
                background: "linear-gradient(135deg, #ff1723 0%, #e50914 100%)",
                boxShadow: "0 4px 18px rgba(229, 9, 20, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.4)",
                transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), width 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease",
                willChange: "transform, width",
                pointerEvents: "none",
                zIndex: 1,
                opacity: indicatorStyle.ready ? 1 : 0,
              }}
            />

            {navItems.map((item) => {
              const isActive = item.id === effectiveActiveTab;

              return (
                <button
                  key={item.id}
                  className="cinema-nav-tab"
                  ref={(el) => {
                    tabRefs.current[item.id] = el;
                  }}
                  onClick={() => {
                    setLocalTab(item.id);
                    item.onClick();
                  }}
                  style={{
                    position: "relative",
                    zIndex: 2,
                    padding: "8px 20px",
                    borderRadius: "9999px",
                    background: "transparent",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    border: "none",
                    outline: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {/* Dynamic icon: only visible on active tab */}
                  {isActive && item.icon && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        animation: "cinemaNavIconPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                        pointerEvents: "none",
                      }}
                    >
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

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
        </nav>

        {/* Right Corner: Notification, Setting & Sign In / Profile Capsule */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "160px", justifyContent: "flex-end" }}>
          {/* Downloads button if active downloads */}
          {onOpenDownloads && (isDesktop || activeDownloadCount > 0) && (
            <button
              onClick={onOpenDownloads}
              title="Downloads"
              style={{
                position: "relative",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
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
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <DownloadIcon size={16} />
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

          {/* Right Corner Frosted Glass Capsule */}
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 8px",
              borderRadius: "9999px",
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(18, 22, 32, 0.45) 45%, rgba(8, 10, 16, 0.55) 100%)",
              backdropFilter: "blur(28px) saturate(200%)",
              WebkitBackdropFilter: "blur(28px) saturate(200%)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.3)",
              zIndex: 30,
            }}
          >
            {/* 1. Notifications Button */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setProfileMenuOpen(false);
                }}
                title="Notifications"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: notificationsOpen ? "rgba(255, 255, 255, 0.18)" : "transparent",
                  border: "none",
                  color: notificationsOpen ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                  e.currentTarget.style.transform = "scale(1.06)";
                }}
                onMouseLeave={(e) => {
                  if (!notificationsOpen) {
                    e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>

              {/* Notifications Popover */}
              <NotificationsPopover
                isOpen={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
              />
            </div>

            {/* 2. Direct Settings Gear Button */}
            <button
              onClick={() => {
                setNotificationsOpen(false);
                setProfileMenuOpen(false);
                onOpenSettings();
              }}
              title="Settings"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                color: "rgba(255, 255, 255, 0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                e.currentTarget.style.transform = "scale(1.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <SettingsIcon size={17} />
            </button>

            {/* Vertical Divider */}
            <div style={{ width: "1px", height: "18px", background: "rgba(255, 255, 255, 0.18)", margin: "0 2px" }} />

            {/* 3. Sign In or Profile Avatar */}
            <div style={{ position: "relative" }}>
              {signedIn ? (
                <button
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setNotificationsOpen(false);
                  }}
                  title={profile.name}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "2px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "50%",
                    transition: "transform 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <ProfileAvatar
                    avatarKey={profile.avatar}
                    size={32}
                    gradient={profile.avatarColor}
                  />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (onOpenSignIn) onOpenSignIn();
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    background: "#e50914",
                    border: "1px solid #e50914",
                    color: "#ffffff",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(229, 9, 20, 0.4)",
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Sign In</span>
                </button>
              )}

              {/* Profile Menu Dropdown */}
              <ProfileMenuDropdown
                isOpen={profileMenuOpen}
                onClose={() => setProfileMenuOpen(false)}
                onOpenManageProfiles={() => {
                  if (onOpenManageProfiles) onOpenManageProfiles();
                }}
                onOpenSettings={onOpenSettings}
              />
            </div>
          </div>
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
          <>
            <div
              onClick={() => setMobileDropdownOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.70)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                zIndex: 100040,
                animation: "cinemaFadeIn 0.2s ease",
              }}
            />
            <div
              className="cinema-no-scrollbar"
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: "75vh",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                borderTopLeftRadius: "24px",
                borderTopRightRadius: "24px",
                padding: "10px 0 24px 0",
                boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.85)",
                zIndex: 100050,
                borderTop: "1px solid rgba(255, 255, 255, 0.16)",
                background: "rgba(16, 18, 24, 0.98)",
                backdropFilter: "blur(32px) saturate(200%)",
                WebkitBackdropFilter: "blur(32px) saturate(200%)",
                display: "flex",
                flexDirection: "column",
                animation: "cinemaSlideUpSheet 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Drag Handle Pill */}
              <div
                style={{
                  width: "36px",
                  height: "4px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.28)",
                  margin: "2px auto 14px auto",
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  padding: "0 22px 10px 22px",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "1.5px",
                  color: "rgba(255, 255, 255, 0.5)",
                  textTransform: "uppercase",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  marginBottom: "4px",
                  flexShrink: 0,
                }}
              >
                <span>SOURCES ({providers.length})</span>
                <button
                  onClick={() => setMobileDropdownOpen(false)}
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "none",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <XIcon size={12} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {providers.map((p) => {
                  const isSelected = activeProvider?.value === p.value;
                  return (
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
                        height: "48px",
                        padding: "0 22px",
                        background: isSelected ? "rgba(255, 255, 255, 0.08)" : "transparent",
                        color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
                        fontSize: "15px",
                        fontWeight: isSelected ? 700 : 500,
                        textAlign: "left",
                        border: "none",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        cursor: "pointer",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span>{p.name}</span>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: "rgba(255, 255, 255, 0.08)",
                            color: "rgba(255, 255, 255, 0.6)",
                            fontWeight: 600,
                          }}
                        >
                          {p.type}
                        </span>
                      </div>
                      {isSelected && (
                        <span style={{ color: "#e50914", fontSize: "16px", fontWeight: 800 }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
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
