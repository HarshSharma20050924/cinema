import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useSettings } from "../../hooks/useSettings";
import { clearWatchHistory } from "../../utils/userListsService";
import { clearAllContinueWatching } from "../../utils/continueWatchingService";
import {
  getProfiles,
  getActiveProfile,
  setActiveProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  getAccountEmail,
  setAccountEmail,
  signOutAccount,
  deleteAccount,
  AVATAR_OPTIONS,
  type UserProfile,
} from "../../utils/profileService";
import { showToast as triggerGlobalToast } from "../../utils/toastService";
import { DownloadPage } from "../download/DownloadPage";
import { ProfileAvatar } from "../auth/ProfileAvatar";

export interface SettingsPageProps {
  onClose: () => void;
  onOpenProfiles?: () => void;
  currentBackdrop?: string | null;
  backdropSlides?: any[];
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onClose,
  currentBackdrop,
  backdropSlides,
}) => {
  const { settings, updateSettings } = useSettings();
  const [activeCategory, setActiveCategory] = useState<
    "account" | "downloads" | "appearance" | "playback" | "servers" | "subtitles" | "ads" | "febbox"
  >("account");

  // Profile State from real persistent profileService
  const [profiles, setProfiles] = useState<UserProfile[]>(() => getProfiles());
  const [activeProfile, setActiveProfileState] = useState<UserProfile>(() => getActiveProfile());
  const [accountEmail, setAccountEmailState] = useState<string>(() => getAccountEmail());

  // Modals
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [newProfileName, setNewProfileName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [qualityDropdownOpen, setQualityDropdownOpen] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const refreshProfileData = () => {
    setProfiles(getProfiles());
    setActiveProfileState(getActiveProfile());
    setAccountEmailState(getAccountEmail());
  };

  useEffect(() => {
    refreshProfileData();
    const handleUpdate = () => refreshProfileData();
    window.addEventListener("cinema:profile_changed", handleUpdate);
    return () => window.removeEventListener("cinema:profile_changed", handleUpdate);
  }, []);

  // Instant ambient slideshow using backdrops from the active tab the user came from (Zero red effect, zero load lag)
  const slideUrls = React.useMemo(() => {
    const urls: string[] = [];
    if (currentBackdrop && typeof currentBackdrop === "string") {
      urls.push(currentBackdrop);
    }
    if (Array.isArray(backdropSlides)) {
      backdropSlides.forEach((s: any) => {
        const bg = s?.backdropUrl || s?.backdrop || s?.image;
        if (bg && typeof bg === "string" && !urls.includes(bg)) {
          urls.push(bg);
        }
      });
    }
    // Clean neutral cinematic fallbacks (never hardcoded red images)
    if (urls.length === 0) {
      urls.push(
        "https://image.tmdb.org/t/p/w1280/m4TUaeqAIf2m4Y49zB1AecQ2b19.jpg",
        "https://image.tmdb.org/t/p/w1280/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
        "https://image.tmdb.org/t/p/w1280/8YFL5QQVPy3AgrEQxNYVSgiPEbe.jpg"
      );
    }
    return urls;
  }, [currentBackdrop, backdropSlides]);

  const [activeBgIdx, setActiveBgIdx] = useState(0);

  useEffect(() => {
    if (slideUrls.length <= 1) return;
    const timer = setInterval(() => {
      setActiveBgIdx((prev) => (prev + 1) % slideUrls.length);
    }, 8500);
    return () => clearInterval(timer);
  }, [slideUrls.length]);

  // Tab measurement and GPU sliding red pill indicator matching Navbar exactly
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [indicator, setIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useLayoutEffect(() => {
    const el = tabRefs.current[activeCategory];
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
  }, [activeCategory]);

  const categories = [
    { id: "account", label: "Account" },
    { id: "downloads", label: "Downloads" },
    { id: "appearance", label: "Appearance" },
    { id: "playback", label: "Playback" },
    { id: "servers", label: "Servers" },
    { id: "subtitles", label: "Subtitles" },
    { id: "ads", label: "Ads" },
    { id: "febbox", label: "Febbox" },
  ];

  // Exact Navbar Glass Tokens
  const cardStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(32px) saturate(200%)",
    WebkitBackdropFilter: "blur(32px) saturate(200%)",
    border: "1px solid rgba(255, 255, 255, 0.20)",
    borderRadius: "24px",
    padding: "24px 28px",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.35)",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  };

  const pillButtonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 20px",
    borderRadius: "9999px",
    background: "rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.2)",
    color: "#ffffff",
    fontSize: "13.5px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
    whiteSpace: "nowrap",
  };

  const sectionLabelStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "12px",
    fontWeight: 800,
    color: "rgba(255, 255, 255, 0.55)",
    letterSpacing: "1.2px",
    textTransform: "uppercase",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#07090e",
        overflowY: "auto",
        overflowX: "hidden",
        paddingTop: "40px",
        paddingBottom: "100px",
        animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`
        .cinema-settings-pill-btn:hover {
          background: rgba(255, 255, 255, 0.18) !important;
          border-color: rgba(255, 255, 255, 0.28) !important;
          transform: translateY(-1px);
        }
        .cinema-settings-danger-btn:hover {
          background: rgba(239, 68, 68, 0.2) !important;
          border-color: rgba(239, 68, 68, 0.4) !important;
          transform: translateY(-1px);
        }
      `}</style>

      {/* Dynamic Instant Blurred Ambient Slideshow (Zero lag, uses current tab's active backdrops) */}
      {slideUrls.map((imgUrl, i) => (
        <div
          key={imgUrl}
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${imgUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
            filter: "blur(70px) brightness(0.38) saturate(140%)",
            transform: "scale(1.12)",
            opacity: activeBgIdx === i ? 1 : 0,
            transition: "opacity 1.6s cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: "none",
            zIndex: 0,
            willChange: "opacity",
          }}
        />
      ))}

      {/* Atmospheric depth overlay for high text contrast without muddy dark/red glow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(180deg, rgba(6, 8, 14, 0.38) 0%, rgba(6, 8, 14, 0.58) 50%, rgba(6, 8, 14, 0.80) 100%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            top: "28px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100010,
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(20, 24, 34, 0.85) 100%)",
            backdropFilter: "blur(28px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "9999px",
            padding: "10px 26px",
            color: "#ffffff",
            fontSize: "13.5px",
            fontWeight: 700,
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.75)",
            animation: "fadeIn 0.18s ease-out",
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Main Container */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "880px",
          margin: "0 auto",
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {/* Top Header: Back Button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onClose}
            className="cinema-settings-pill-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 22px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.10)",
              backdropFilter: "blur(28px) saturate(180%)",
              WebkitBackdropFilter: "blur(28px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.4)",
              color: "#ffffff",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        </div>

        {/* Floating Category Pills Navigation with Sliding Red Indicator (Exact Navbar Match) */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 8px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.10)",
              backdropFilter: "blur(28px) saturate(180%)",
              WebkitBackdropFilter: "blur(28px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.4)",
              overflowX: "auto",
              maxWidth: "100%",
            }}
          >
            {/* Sliding Red Active Pill */}
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

            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  ref={(el) => {
                    tabRefs.current[cat.id] = el;
                  }}
                  onClick={() => setActiveCategory(cat.id as any)}
                  style={{
                    position: "relative",
                    zIndex: 2,
                    padding: "8px 20px",
                    borderRadius: "9999px",
                    background: "transparent",
                    border: "none",
                    color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.78)",
                    fontSize: "13.5px",
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "color 0.2s ease",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================= */}
        {/* TAB 1: ACCOUNT (Matching Screenshots 4 & 5 exactly)           */}
        {/* ============================================================= */}
        {activeCategory === "account" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* 1. ACCOUNT Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={sectionLabelStyle}>Account</span>
              <div style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                    {/* User Avatar Vector Orb (No Emojis) */}
                    <ProfileAvatar
                      avatarKey={activeProfile.avatar}
                      size={56}
                      gradient={activeProfile.avatarColor}
                    />
                    <div>
                      <h4 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#fff" }}>
                        {activeProfile.name} {activeProfile.isKids && "(Kids)"}
                      </h4>
                      <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>{accountEmail}</span>
                    </div>
                  </div>

                  {/* Switch Profile & Manage Profiles Pills */}
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="cinema-settings-pill-btn"
                      onClick={() => setShowSwitchModal(true)}
                      style={pillButtonStyle}
                    >
                      Switch Profile
                    </button>
                    <button
                      className="cinema-settings-pill-btn"
                      onClick={() => setShowManageModal(true)}
                      style={pillButtonStyle}
                    >
                      Manage Profiles
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. PRIVACY Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={sectionLabelStyle}>Privacy</span>
              <div style={cardStyle}>
                {/* Watch history item */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>Watch history</h4>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>
                      Clears Continue Watching shelf and what you've finished.
                    </p>
                  </div>
                  <button
                    className="cinema-settings-pill-btn"
                    onClick={() => {
                      clearWatchHistory();
                      clearAllContinueWatching();
                      showToast("Watch history cleared successfully");
                    }}
                    style={pillButtonStyle}
                  >
                    Clear
                  </button>
                </div>

                <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "4px 0" }} />

                {/* Ratings & hidden titles item */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>Ratings & hidden titles</h4>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>
                      Resets what shapes your personalized recommendations.
                    </p>
                  </div>
                  <button
                    className="cinema-settings-pill-btn"
                    onClick={() => {
                      try {
                        localStorage.removeItem("cinema_user_ratings_v1");
                        localStorage.removeItem("cinema_hidden_titles");
                        window.dispatchEvent(new CustomEvent("cinema:ratings_updated"));
                        window.dispatchEvent(new CustomEvent("cinema:hidden_titles_updated"));
                        showToast("Ratings & hidden titles reset");
                      } catch (_) {}
                    }}
                    style={pillButtonStyle}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* 3. SIGN-IN & SECURITY Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={sectionLabelStyle}>Sign-In & Security</span>
              <div style={cardStyle}>
                {/* Email Item */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>Email</h4>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>{accountEmail}</p>
                  </div>
                  <button
                    className="cinema-settings-pill-btn"
                    onClick={() => {
                      setNewEmailInput(accountEmail);
                      setShowEmailModal(true);
                    }}
                    style={pillButtonStyle}
                  >
                    Change
                  </button>
                </div>

                <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "4px 0" }} />

                {/* Sign Out Item */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>Sign out</h4>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>
                      Your list and progress stays in your account.
                    </p>
                  </div>
                  <button
                    className="cinema-settings-danger-btn"
                    onClick={() => {
                      signOutAccount();
                      triggerGlobalToast("Signed out successfully", "info");
                    }}
                    style={{
                      ...pillButtonStyle,
                      color: "#ff4d4f",
                      border: "1px solid rgba(255, 77, 79, 0.28)",
                      background: "rgba(255, 77, 79, 0.08)",
                    }}
                  >
                    Sign Out
                  </button>
                </div>

                <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "4px 0" }} />

                {/* Delete Account Item */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#ff4d4f" }}>Delete Account</h4>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>
                      Permanently erase your account and profiles from Cloudflare database.
                    </p>
                  </div>
                  <button
                    className="cinema-settings-danger-btn"
                    onClick={() => setShowDeleteAccountModal(true)}
                    style={{
                      ...pillButtonStyle,
                      color: "#ff4d4f",
                      border: "1px solid rgba(255, 77, 79, 0.45)",
                      background: "rgba(255, 77, 79, 0.12)",
                    }}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB: DOWNLOADS                                                */}
        {/* ============================================================= */}
        {activeCategory === "downloads" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <DownloadPage onBack={() => setActiveCategory("account")} />
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: APPEARANCE                                             */}
        {/* ============================================================= */}
        {activeCategory === "appearance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <span style={sectionLabelStyle}>Appearance</span>
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>Theme</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>
                    Deep frosted glass with cinema red accent
                  </p>
                </div>
                <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#e50914" }}>Translucent Glass</span>
              </div>
              <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>Smooth UI Animations</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>
                    GPU-accelerated sliding indicators & spring lift
                  </p>
                </div>
                <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#22c55e" }}>Enabled</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: PLAYBACK                                               */}
        {/* ============================================================= */}
        {activeCategory === "playback" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <span style={sectionLabelStyle}>Playback</span>
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>Auto-Play Next Episode</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>
                    Automatically starts next episode when current ends
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoplayNext !== false}
                  onChange={(e) => updateSettings({ autoplayNext: e.target.checked })}
                  style={{ width: "20px", height: "20px", accentColor: "#e50914", cursor: "pointer" }}
                />
              </div>
              <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>Default Video Quality</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>
                    Preferred stream quality for playback
                  </p>
                </div>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setQualityDropdownOpen((prev) => !prev)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "9999px",
                      background: "rgba(255, 255, 255, 0.08)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
                  >
                    <span>
                      {settings.preferredQuality === "auto"
                        ? "Auto (Best)"
                        : settings.preferredQuality === "4k"
                        ? "4K Ultra HD"
                        : settings.preferredQuality === "720p"
                        ? "720p HD"
                        : "1080p Full HD"}
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: qualityDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {qualityDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        right: 0,
                        zIndex: 100,
                        minWidth: "160px",
                        background: "rgba(16, 20, 28, 0.96)",
                        backdropFilter: "blur(32px) saturate(180%)",
                        WebkitBackdropFilter: "blur(32px) saturate(180%)",
                        border: "1px solid rgba(255, 255, 255, 0.18)",
                        borderRadius: "16px",
                        padding: "6px",
                        boxShadow: "0 18px 45px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        animation: "cinemaMenuPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    >
                      {[
                        { value: "auto", label: "Auto (Best)" },
                        { value: "1080p", label: "1080p Full HD" },
                        { value: "720p", label: "720p HD" },
                        { value: "4k", label: "4K Ultra HD" },
                      ].map((opt) => {
                        const isSelected = (settings.preferredQuality || "1080p") === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              updateSettings({ preferredQuality: opt.value as any });
                              setQualityDropdownOpen(false);
                            }}
                            style={{
                              padding: "9px 14px",
                              borderRadius: "10px",
                              border: "none",
                              background: isSelected ? "#e50914" : "transparent",
                              color: "#ffffff",
                              fontSize: "13px",
                              fontWeight: isSelected ? 700 : 500,
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 4: SERVERS                                                */}
        {/* ============================================================= */}
        {activeCategory === "servers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <span style={sectionLabelStyle}>Servers</span>
            <div style={cardStyle}>
              <div>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>Streaming Provider Priority</h4>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>
                  Server fallback automatically selects fastest responding node
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {["Auto-Fastest Node (Global CDN)", "Ultra Low Latency HLS", "Direct Febbox Cloud"].map((srv, i) => (
                  <div
                    key={srv}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 18px",
                      borderRadius: "14px",
                      background: i === 0 ? "rgba(229, 9, 20, 0.12)" : "rgba(255, 255, 255, 0.04)",
                      border: i === 0 ? "1px solid rgba(229, 9, 20, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#fff" }}>{srv}</span>
                    <span style={{ fontSize: "12px", color: i === 0 ? "#22c55e" : "rgba(255, 255, 255, 0.5)", fontWeight: 700 }}>
                      {i === 0 ? "● Active" : "Standby"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 5: SUBTITLES                                              */}
        {/* ============================================================= */}
        {activeCategory === "subtitles" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <span style={sectionLabelStyle}>Subtitles</span>
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>Subtitles by Default</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>
                    Load English subtitles when media starts
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.subtitlesEnabled !== false}
                  onChange={(e) => updateSettings({ subtitlesEnabled: e.target.checked })}
                  style={{ width: "20px", height: "20px", accentColor: "#e50914", cursor: "pointer" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 6: ADS & FEBBOX                                           */}
        {/* ============================================================= */}
        {(activeCategory === "ads" || activeCategory === "febbox") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <span style={sectionLabelStyle}>{activeCategory}</span>
            <div style={cardStyle}>
              <div>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>Ad-Free High-Speed Playback</h4>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>
                  Native stream proxy eliminates third-party popups and interstitial ads.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: 800 }}>✓ ACTIVE & PROTECTED</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* MODAL 1: SWITCH PROFILE MODAL                                 */}
      {/* ============================================================= */}
      {showSwitchModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100020,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowSwitchModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              ...cardStyle,
              padding: "32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#fff" }}>Who's Watching?</h3>
              <button
                onClick={() => setShowSwitchModal(false)}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", padding: "20px 0" }}>
              {profiles.map((p) => {
                const isActive = p.id === activeProfile.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActiveProfile(p.id);
                      showToast(`Switched to ${p.name}`);
                      setShowSwitchModal(false);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      padding: "8px",
                      borderRadius: "16px",
                      transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "74px",
                        height: "74px",
                        borderRadius: "50%",
                        background: p.avatarColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "34px",
                        boxShadow: isActive ? "0 0 0 3px #e50914, 0 10px 30px rgba(229, 9, 20, 0.5)" : "0 8px 24px rgba(0, 0, 0, 0.6)",
                      }}
                    >
                      {p.avatar}
                      {isActive && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "-2px",
                            right: "-2px",
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: "#e50914",
                            color: "#fff",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "2px solid #07090e",
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: isActive ? 700 : 500, color: isActive ? "#fff" : "rgba(255, 255, 255, 0.75)" }}>
                      {p.name}
                    </span>
                  </div>
                );
              })}

              {/* Add Profile button */}
              <div
                onClick={() => {
                  setShowSwitchModal(false);
                  setShowAddProfileModal(true);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "16px",
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div
                  style={{
                    width: "74px",
                    height: "74px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1.5px dashed rgba(255, 255, 255, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    color: "rgba(255, 255, 255, 0.7)",
                  }}
                >
                  +
                </div>
                <span style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255, 255, 255, 0.7)" }}>Add Profile</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: MANAGE PROFILES MODAL                                */}
      {/* ============================================================= */}
      {showManageModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100020,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowManageModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              ...cardStyle,
              padding: "28px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#fff" }}>Manage Profiles</h3>
              <button
                onClick={() => setShowManageModal(false)}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
              {profiles.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "16px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: p.avatarColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                      }}
                    >
                      {p.avatar}
                    </div>
                    <div>
                      <h5 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>{p.name}</h5>
                      <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>{p.isKids ? "Kids Profile" : "Standard"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="cinema-settings-pill-btn"
                      onClick={() => {
                        setEditingProfile(p);
                        setNewProfileName(p.name);
                        const match = AVATAR_OPTIONS.find((a) => a.icon === p.avatar) || AVATAR_OPTIONS[0];
                        setSelectedAvatar(match);
                        setShowManageModal(false);
                      }}
                      style={pillButtonStyle}
                    >
                      Edit
                    </button>
                    {profiles.length > 1 && (
                      <button
                        className="cinema-settings-danger-btn"
                        onClick={() => {
                          if (confirm(`Delete profile "${p.name}"?`)) {
                            deleteProfile(p.id);
                            showToast(`Deleted ${p.name}`);
                          }
                        }}
                        style={{
                          ...pillButtonStyle,
                          color: "#ff4d4f",
                          border: "1px solid rgba(255, 77, 79, 0.28)",
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowManageModal(false);
                setShowAddProfileModal(true);
              }}
              style={{
                ...pillButtonStyle,
                width: "100%",
                padding: "12px",
                background: "rgba(255, 255, 255, 0.12)",
              }}
            >
              + Create New Profile
            </button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 3: EDIT PROFILE MODAL                                   */}
      {/* ============================================================= */}
      {editingProfile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100021,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setEditingProfile(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              ...cardStyle,
              padding: "28px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#fff" }}>Edit Profile</h3>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255, 255, 255, 0.6)" }}>PROFILE NAME</label>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "6px",
                  padding: "11px 16px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255, 255, 255, 0.6)" }}>CHOOSE AVATAR</label>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "10px" }}>
                {AVATAR_OPTIONS.map((opt) => (
                  <div
                    key={opt.icon}
                    onClick={() => setSelectedAvatar(opt)}
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: opt.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      cursor: "pointer",
                      boxShadow: selectedAvatar.icon === opt.icon ? "0 0 0 3px #ffffff, 0 6px 20px " + opt.glow : "none",
                      transform: selectedAvatar.icon === opt.icon ? "scale(1.1)" : "scale(1)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {opt.icon}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                className="cinema-settings-pill-btn"
                onClick={() => setEditingProfile(null)}
                style={pillButtonStyle}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newProfileName.trim()) {
                    updateProfile(editingProfile.id, {
                      name: newProfileName.trim(),
                      avatar: selectedAvatar.icon,
                      avatarColor: selectedAvatar.gradient,
                    });
                    showToast("Profile updated");
                    setEditingProfile(null);
                  }
                }}
                style={{
                  ...pillButtonStyle,
                  background: "#e50914",
                  border: "1px solid #e50914",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 4: ADD PROFILE MODAL                                    */}
      {/* ============================================================= */}
      {showAddProfileModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100021,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowAddProfileModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              ...cardStyle,
              padding: "28px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#fff" }}>Add New Profile</h3>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255, 255, 255, 0.6)" }}>NAME</label>
              <input
                type="text"
                placeholder="Enter name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  marginTop: "6px",
                  padding: "11px 16px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255, 255, 255, 0.6)" }}>AVATAR ICON</label>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "10px" }}>
                {AVATAR_OPTIONS.map((opt) => (
                  <div
                    key={opt.icon}
                    onClick={() => setSelectedAvatar(opt)}
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: opt.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      cursor: "pointer",
                      boxShadow: selectedAvatar.icon === opt.icon ? "0 0 0 3px #ffffff, 0 6px 20px " + opt.glow : "none",
                      transform: selectedAvatar.icon === opt.icon ? "scale(1.1)" : "scale(1)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {opt.icon}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                className="cinema-settings-pill-btn"
                onClick={() => setShowAddProfileModal(false)}
                style={pillButtonStyle}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newProfileName.trim()) {
                    createProfile(newProfileName.trim(), selectedAvatar.icon, selectedAvatar.gradient, false);
                    showToast(`Created profile ${newProfileName.trim()}`);
                    setNewProfileName("");
                    setShowAddProfileModal(false);
                  }
                }}
                disabled={!newProfileName.trim()}
                style={{
                  ...pillButtonStyle,
                  background: "#e50914",
                  border: "1px solid #e50914",
                  opacity: newProfileName.trim() ? 1 : 0.5,
                }}
              >
                Create Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 5: CHANGE EMAIL / SIGN IN MODAL                         */}
      {/* ============================================================= */}
      {showEmailModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100021,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowEmailModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "440px",
              ...cardStyle,
              padding: "28px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#fff" }}>Change Account Email</h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.55)" }}>
              All profiles under this account will be associated with this email.
            </p>
            <input
              type="email"
              value={newEmailInput}
              onChange={(e) => setNewEmailInput(e.target.value)}
              placeholder="name@example.com"
              autoFocus
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                className="cinema-settings-pill-btn"
                onClick={() => setShowEmailModal(false)}
                style={pillButtonStyle}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newEmailInput.trim()) {
                    setAccountEmail(newEmailInput.trim());
                    showToast("Account email updated");
                    setShowEmailModal(false);
                  }
                }}
                disabled={!newEmailInput.trim()}
                style={{
                  ...pillButtonStyle,
                  background: "#e50914",
                  border: "1px solid #e50914",
                  opacity: newEmailInput.trim() ? 1 : 0.5,
                }}
              >
                Save Email
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Account Glass Confirmation Modal */}
      {showDeleteAccountModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100020,
            background: "rgba(0, 0, 0, 0.78)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            animation: "cinemaFadeIn 0.2s ease",
          }}
          onClick={() => setShowDeleteAccountModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "rgba(18, 22, 30, 0.96)",
              backdropFilter: "blur(36px)",
              WebkitBackdropFilter: "blur(36px)",
              border: "1px solid rgba(255, 77, 79, 0.35)",
              borderRadius: "24px",
              padding: "28px",
              boxShadow: "0 28px 70px rgba(0, 0, 0, 0.85)",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ff4d4f",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "#fff" }}>
                Delete Account?
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: "13.5px", color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.5" }}>
              Are you sure? This will permanently erase your Cinema account, all profiles, synchronized watchlists, and likes from the Cloudflare database. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "6px" }}>
              <button
                className="cinema-settings-pill-btn"
                onClick={() => setShowDeleteAccountModal(false)}
                style={pillButtonStyle}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowDeleteAccountModal(false);
                  await deleteAccount();
                  onClose();
                }}
                style={{
                  ...pillButtonStyle,
                  background: "#e50914",
                  border: "1px solid #e50914",
                  color: "#ffffff",
                  fontWeight: 700,
                }}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
