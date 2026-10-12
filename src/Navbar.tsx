import React, { useState, useEffect } from "react";
import { SettingsIcon, ArrowLeftIcon, XIcon, ChevronDownIcon, SearchIcon } from "../../icons";
import { NavSearchBar } from "./NavSearchBar";
import { ProviderDropdown } from "./ProviderDropdown";
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
  onGoHome?: () => void;
  onSelectCategoryNav?: (type: "home" | "movies" | "tv" | "categories") => void;
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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems: Array<{
    id: "home" | "movies" | "tv" | "categories";
    label: string;
    onClick: () => void;
  }> = [
    {
      id: "home",
      label: "Home",
      onClick: () => {
        if (onGoHome) onGoHome();
        onSearchChange("");
      },
    },
    {
      id: "movies",
      label: "Movies",
      onClick: () => {
        if (onSelectCategoryNav) onSelectCategoryNav("movies");
      },
    },
    {
      id: "tv",
      label: "TV Shows",
      onClick: () => {
        if (onSelectCategoryNav) onSelectCategoryNav("tv");
      },
    },
    {
      id: "categories",
      label: "Categories",
      onClick: () => {
        if (onSelectCategoryNav) onSelectCategoryNav("categories");
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
        borderBottom: isModalNavbar || !hasHero ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
        background: isModalNavbar || !hasHero ? "rgba(0, 0, 0, 0.96)" : isScrolled ? "rgba(0, 0, 0, 0.82)" : "transparent",
        backdropFilter: isModalNavbar || isScrolled || !hasHero ? "blur(20px) saturate(1.4)" : "none",
        WebkitBackdropFilter: isModalNavbar || isScrolled || !hasHero ? "blur(20px) saturate(1.4)" : "none",
        transition: "background 0.4s ease, backdrop-filter 0.4s ease",
      }}
    >
      {/* DESKTOP NAVBAR (> 768px) */}
      <div
        className="desktop-navbar-row"
        style={{
          padding: "10px 28px",
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

        {/* Center Nav Links */}
        <nav
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            zIndex: 10,
          }}
        >
          {navItems.map((item) => {
            const isActive =
              item.id === "home"
                ? activeNavTab === "home" && !searchQuery
                : activeNavTab === item.id;
            const isHovered = hoveredNav === item.id;

            return (
              <button
                key={item.id}
                onClick={item.onClick}
                onMouseEnter={() => setHoveredNav(item.id)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  position: "relative",
                  padding: "9px 22px",
                  borderRadius: "999px",
                  background: isHovered && !isActive ? "rgba(255, 255, 255, 0.06)" : "transparent",
                  color: isActive ? "#ffffff" : isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.8)",
                  fontSize: "16px",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  border: "none",
                  outline: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  userSelect: "none",
                }}
              >
                <span>{item.label}</span>
                <span
                  style={{
                    position: "absolute",
                    bottom: "2px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: isHovered ? "48px" : "0px",
                    height: "2.5px",
                    borderRadius: "3px",
                    backgroundColor: "#e50914",
                    boxShadow: isHovered ? "0 0 12px rgba(229, 9, 20, 0.7)" : "none",
                    opacity: isHovered ? 1 : 0,
                    transition: "width 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease",
                  }}
                />
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Search + Extension Selector + Settings + Close */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Desktop Search Bar */}
          <NavSearchBar
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            isGlobalSearch={isGlobalSearch}
            onToggleGlobalSearch={onToggleGlobalSearch}
            activeProviderName={activeProvider?.name}
          />

          {/* Active Extension Selector */}
          <ProviderDropdown
            providers={providers}
            activeProvider={activeProvider}
            onSelectProvider={onSelectProvider}
            onSearchReset={() => onSearchChange("")}
          />

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            title="Settings"
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "999px",
              background: "rgba(14, 14, 14, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              cursor: "pointer",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(24, 24, 24, 0.95)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.28)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(14, 14, 14, 0.85)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
            }}
          >
            <SettingsIcon size={17} />
          </button>

          {/* Modal Close / Back Button */}
          {onClose && (
            <button
              onClick={onClose}
              title="Close details"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                cursor: "pointer",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(229, 9, 20, 0.25)";
                e.currentTarget.style.borderColor = "rgba(229, 9, 20, 0.5)";
                e.currentTarget.style.color = "#ff4d4d";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
                e.currentTarget.style.color = "#ffffff";
              }}
            >
              <XIcon size={18} />
            </button>
          )}
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

            {onClose && (
              <button
                onClick={onClose}
                title="Close"
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
                <XIcon size={15} />
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
