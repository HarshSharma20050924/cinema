import React, { useState, useEffect } from "react";
import { useSettings } from "../../hooks/useSettings";
import { clearWatchHistory } from "../../utils/userListsService";
import { clearAllContinueWatching } from "../../utils/continueWatchingService";

export interface SettingsPageProps {
  onClose: () => void;
  onOpenProfiles?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onClose,
  onOpenProfiles,
}) => {
  const { settings, updateSettings } = useSettings();
  const [activeCategory, setActiveCategory] = useState<
    "account" | "appearance" | "playback" | "servers" | "subtitles" | "ads" | "febbox"
  >("account");

  // Dynamic ambient sliding background
  const ambientImages = [
    "https://image.tmdb.org/t/p/original/sHI9xlFRWCJ38AIIfOqnGjuEvXz.jpg",
    "https://image.tmdb.org/t/p/original/m4TUaeqAIf2m4Y49zB1AecQ2b19.jpg",
    "https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
  ];
  const [activeBgIdx, setActiveBgIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBgIdx((prev) => (prev + 1) % ambientImages.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [ambientImages.length]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#07090e",
        overflowY: "auto",
        overflowX: "hidden",
        paddingTop: "70px",
        paddingBottom: "100px",
        animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* Dynamic Ambient Blurred Sliding Backdrop (Screenshot 12)       */}
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
            filter: "blur(65px) brightness(0.28) saturate(180%)",
            transform: "scale(1.1)",
            opacity: activeBgIdx === i ? 1 : 0,
            transition: "opacity 2.5s cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      ))}

      {/* Main Settings Wrapper */}
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
        {/* Top Header: Back Button & Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 20px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              color: "#ffffff",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            ← Back
          </button>

          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
            ⚙ Settings
          </h1>

          <div style={{ width: "80px" }} />
        </div>

        {/* Category Pills Navigation (Screenshot 12) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflowX: "auto",
            padding: "6px 8px",
            borderRadius: "999px",
            background: "rgba(14, 16, 22, 0.65)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          {[
            { id: "account", label: "Account" },
            { id: "appearance", label: "Appearance" },
            { id: "playback", label: "Playback" },
            { id: "servers", label: "Servers" },
            { id: "subtitles", label: "Subtitles" },
            { id: "ads", label: "Ads" },
            { id: "febbox", label: "Febbox" },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "999px",
                  background: isActive ? "#e50914" : "transparent",
                  border: isActive ? "1px solid #e50914" : "none",
                  color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.75)",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: isActive ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Category 1: Account (Screenshots 8, 9, 12)                     */}
        {/* ------------------------------------------------------------- */}
        {(activeCategory === "account" || activeCategory === "appearance") && (
          <div style={settingsCardStyle}>
            <h3 style={sectionHeadingStyle}>Account</h3>
            {/* User Profile Card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Avatar Moon Icon */}
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    boxShadow: "0 4px 16px rgba(99, 102, 241, 0.4)",
                  }}
                >
                  🌙
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff" }}>Harsh</h4>
                  <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)" }}>cinemaisherebtw@gmail.com</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={onOpenProfiles}
                  style={pillSubButtonStyle}
                >
                  Switch Profile
                </button>
                <button
                  onClick={onOpenProfiles}
                  style={pillSubButtonStyle}
                >
                  Manage Profiles
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Category 2: Playback Settings (Screenshot 8 & 12)             */}
        {/* ------------------------------------------------------------- */}
        {(activeCategory === "playback" || activeCategory === "appearance") && (
          <div style={settingsCardStyle}>
            <h3 style={sectionHeadingStyle}>Playback</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Autoplay previews */}
              <div style={toggleRowStyle}>
                <div>
                  <h5 style={toggleTitleStyle}>Autoplay previews</h5>
                  <p style={toggleDescStyle}>Play trailers quietly on title pages, banners, and covers.</p>
                </div>
                <ToggleSwitch checked={true} onChange={() => {}} />
              </div>

              {/* Start previews muted */}
              <div style={toggleRowStyle}>
                <div>
                  <h5 style={toggleTitleStyle}>Start previews muted</h5>
                  <p style={toggleDescStyle}>Keep volume muted when hovering or previewing.</p>
                </div>
                <ToggleSwitch checked={true} onChange={() => {}} />
              </div>

              {/* Autoplay next episode */}
              <div style={toggleRowStyle}>
                <div>
                  <h5 style={toggleTitleStyle}>Autoplay next episode</h5>
                  <p style={toggleDescStyle}>Start the next episode when credits roll.</p>
                </div>
                <ToggleSwitch checked={true} onChange={() => {}} />
              </div>

              {/* Crop black bars */}
              <div style={toggleRowStyle}>
                <div>
                  <h5 style={toggleTitleStyle}>Crop black bars (Zoom to Fill)</h5>
                  <p style={toggleDescStyle}>Cut away the black bars that come inside video to fill wide screen.</p>
                </div>
                <ToggleSwitch
                  checked={settings.defaultPlayer === "fill"}
                  onChange={() => {}}
                />
              </div>

              {/* Ambient mode */}
              <div style={toggleRowStyle}>
                <div>
                  <h5 style={toggleTitleStyle}>Ambient mode</h5>
                  <p style={toggleDescStyle}>Soft light in picture colors fills black bars around video.</p>
                </div>
                <ToggleSwitch checked={false} onChange={() => {}} />
              </div>

              {/* Subtitles default */}
              <div style={toggleRowStyle}>
                <div>
                  <h5 style={toggleTitleStyle}>Subtitles</h5>
                  <p style={toggleDescStyle}>Turn on automatically when available.</p>
                </div>
                <select
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    color: "#fff",
                    borderRadius: "999px",
                    padding: "6px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="off">Off</option>
                  <option value="en">English (US)</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Category 3: Privacy & Watch History (Screenshot 9)            */}
        {/* ------------------------------------------------------------- */}
        <div style={settingsCardStyle}>
          <h3 style={sectionHeadingStyle}>Privacy</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={toggleRowStyle}>
              <div>
                <h5 style={toggleTitleStyle}>Watch history</h5>
                <p style={toggleDescStyle}>Clears Continue Watching shelf and what you've finished.</p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm("Clear all Continue Watching and history?")) {
                    clearWatchHistory();
                    clearAllContinueWatching();
                    alert("History cleared!");
                  }
                }}
                style={pillSubButtonStyle}
              >
                Clear
              </button>
            </div>

            <div style={toggleRowStyle}>
              <div>
                <h5 style={toggleTitleStyle}>Ratings & hidden titles</h5>
                <p style={toggleDescStyle}>Resets what shapes your personalized recommendations.</p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm("Reset all ratings?")) {
                    localStorage.removeItem("cinema_user_ratings");
                    alert("Ratings reset!");
                  }
                }}
                style={pillSubButtonStyle}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Category 4: Security & Sign Out (Screenshot 9)                */}
        {/* ------------------------------------------------------------- */}
        <div style={settingsCardStyle}>
          <h3 style={sectionHeadingStyle}>Sign-in & Security</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={toggleRowStyle}>
              <div>
                <h5 style={toggleTitleStyle}>Email</h5>
                <p style={toggleDescStyle}>cinemaisherebtw@gmail.com</p>
              </div>
              <button style={pillSubButtonStyle}>Change</button>
            </div>

            <div style={toggleRowStyle}>
              <div>
                <h5 style={toggleTitleStyle}>Sign out</h5>
                <p style={toggleDescStyle}>Your list and progress stays in your account.</p>
              </div>
              <button
                onClick={() => {
                  alert("Signed out!");
                  onClose();
                }}
                style={{ ...pillSubButtonStyle, color: "#e50914", borderColor: "rgba(229, 9, 20, 0.4)" }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toggle switch component matching Screenshot 8
const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({
  checked,
  onChange,
}) => {
  const [isOn, setIsOn] = useState(checked);
  return (
    <div
      onClick={() => {
        setIsOn(!isOn);
        onChange();
      }}
      style={{
        width: "44px",
        height: "26px",
        borderRadius: "999px",
        background: isOn ? "#22c55e" : "rgba(255, 255, 255, 0.22)",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s ease",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "#ffffff",
          position: "absolute",
          top: "3px",
          left: isOn ? "21px" : "3px",
          transition: "left 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.4)",
        }}
      />
    </div>
  );
};

const settingsCardStyle: React.CSSProperties = {
  background: "rgba(14, 16, 22, 0.78)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "20px",
  padding: "24px 28px",
  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const sectionHeadingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "1px",
  color: "rgba(255, 255, 255, 0.45)",
  textTransform: "uppercase",
};

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "6px 0",
};

const toggleTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "14.5px",
  fontWeight: 600,
  color: "#ffffff",
};

const toggleDescStyle: React.CSSProperties = {
  margin: "3px 0 0",
  fontSize: "12.5px",
  color: "rgba(255, 255, 255, 0.5)",
};

const pillSubButtonStyle: React.CSSProperties = {
  padding: "6px 16px",
  borderRadius: "999px",
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
};
