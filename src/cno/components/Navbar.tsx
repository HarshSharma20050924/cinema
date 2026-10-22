import React, { useState, useRef, useEffect } from "react";
import { Search, Bell, Settings, LogOut, User, Sliders } from "lucide-react";
import type { CnoNavTab } from "../types";

interface NavbarProps {
  activeTab: CnoNavTab;
  onTabChange: (tab: CnoNavTab) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onSwitchToClassic: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenSearch,
  onOpenSettings,
  onSwitchToClassic,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="cno-navbar-wrap">
      {/* Left: Brand Logo & Pill Nav */}
      <div className="cno-navbar-left">
        <div className="cno-logo" onClick={() => onTabChange("home")}>
          <div className="cno-logo-badge">C</div>
          <span className="cno-logo-text">
            Cno<span className="cno-logo-dot">.to</span>
          </span>
        </div>

        {/* Center Pill Navigation Container */}
        <nav className="cno-nav-pills">
          <button
            className={`cno-nav-pill-btn ${activeTab === "home" ? "active" : ""}`}
            onClick={() => onTabChange("home")}
          >
            Home
          </button>
          <button
            className={`cno-nav-pill-btn ${activeTab === "movies" ? "active" : ""}`}
            onClick={() => onTabChange("movies")}
          >
            Movies
          </button>
          <button
            className={`cno-nav-pill-btn ${activeTab === "shows" ? "active" : ""}`}
            onClick={() => onTabChange("shows")}
          >
            TV Shows
          </button>
          <button
            className={`cno-nav-pill-btn ${activeTab === "coming_soon" ? "active" : ""}`}
            onClick={() => onTabChange("coming_soon")}
          >
            Coming Soon
          </button>
          <button
            className={`cno-nav-pill-btn ${activeTab === "my_list" ? "active" : ""}`}
            onClick={() => onTabChange("my_list")}
          >
            My List
          </button>
        </nav>
      </div>

      {/* Right: Search, Notifications, Settings, Profile Avatar */}
      <div className="cno-navbar-right" ref={profileMenuRef}>
        <button
          className="cno-icon-btn"
          title="Search (Ctrl K)"
          onClick={onOpenSearch}
        >
          <Search size={19} />
        </button>

        <button className="cno-icon-btn" title="Notifications">
          <Bell size={19} />
        </button>

        <button className="cno-icon-btn" title="Settings" onClick={onOpenSettings}>
          <Settings size={19} />
        </button>

        {/* User Profile Avatar with dropdown */}
        <div style={{ position: "relative" }}>
          <button
            className="cno-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            title="Harsh (cinemaistherebtw@gmail.com)"
          >
            H
          </button>

          {profileOpen && (
            <div
              className="cno-popover-menu"
              style={{
                position: "absolute",
                top: "44px",
                right: "0",
                width: "240px",
              }}
            >
              <div className="cno-popover-header" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="cno-profile-btn" style={{ width: "32px", height: "32px", fontSize: "12px" }}>
                  H
                </div>
                <div>
                  <div className="cno-popover-title" style={{ fontSize: "14px" }}>Harsh</div>
                  <div className="cno-popover-subtitle" style={{ fontSize: "11px" }}>cinemaistherebtw@gmail.com</div>
                </div>
              </div>

              <div className="cno-popover-divider" />

              <div className="cno-popover-list">
                <button
                  className="cno-popover-item"
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenSettings();
                  }}
                >
                  <User size={15} />
                  Manage Profiles
                </button>
                <button
                  className="cno-popover-item"
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenSettings();
                  }}
                >
                  <Sliders size={15} />
                  Settings
                </button>
                <button
                  className="cno-popover-item"
                  onClick={() => {
                    setProfileOpen(false);
                    onSwitchToClassic();
                  }}
                  style={{ color: "#a855f7" }}
                >
                  <LogOut size={15} />
                  Switch to Classic UI
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
