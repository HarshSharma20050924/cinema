import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { RENDER_CLUSTER } from "../../api/client";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPreference: string;
  onPlayerPreferenceChange: (player: string) => void;
  onShowToast: (msg: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  playerPreference,
  onPlayerPreferenceChange,
  onShowToast,
}) => {
  const [autoplayPreviews, setAutoplayPreviews] = useState(true);
  const [previewsMuted, setPreviewsMuted] = useState(true);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [skipIntros, setSkipIntros] = useState(false);
  const [ambientMode, setAmbientMode] = useState(false);
  const [cropBlackBars, setCropBlackBars] = useState(true);
  const [hideSpoilers, setHideSpoilers] = useState(false);
  const [subtitles, setSubtitles] = useState("Off");
  const [dataSaver, setDataSaver] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="cno-spotlight-backdrop" onClick={onClose}>
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "rgba(18, 22, 28, 0.96)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.9)",
          overflow: "hidden",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: "700" }}>Settings</h2>
          <button
            className="cno-icon-btn"
            style={{ width: "32px", height: "32px", background: "rgba(255, 255, 255, 0.08)" }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* ACCOUNT */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
              Account
            </div>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "14px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="cno-profile-btn" style={{ width: "40px", height: "40px", fontSize: "15px" }}>
                  H
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "600" }}>Harsh</div>
                  <div style={{ fontSize: "12px", color: "#8e95a5" }}>cinemaistherebtw@gmail.com</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="cno-nav-pill-btn"
                  style={{ background: "rgba(255, 255, 255, 0.08)", fontSize: "12.5px" }}
                  onClick={() => onShowToast("Profile switcher")}
                >
                  Switch Profile
                </button>
                <button
                  className="cno-nav-pill-btn"
                  style={{ background: "rgba(255, 255, 255, 0.08)", fontSize: "12.5px" }}
                  onClick={() => onShowToast("Manage profiles")}
                >
                  Manage Profiles
                </button>
              </div>
            </div>
          </div>

          {/* PLAYBACK */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
              Playback
            </div>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "14px",
                padding: "8px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* Autoplay previews */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px" }}>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "600" }}>Autoplay previews</div>
                  <div style={{ fontSize: "11px", color: "#8e95a5", maxWidth: "340px" }}>
                    Play trailers quietly on title pages, banners, covers you rest on.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoplayPreviews}
                  onChange={(e) => setAutoplayPreviews(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#22c55e" }}
                />
              </div>

              {/* Start previews muted */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: "13.5px", fontWeight: "600" }}>Start previews muted</div>
                <input
                  type="checkbox"
                  checked={previewsMuted}
                  onChange={(e) => setPreviewsMuted(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#22c55e" }}
                />
              </div>

              {/* Autoplay next episode */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: "13.5px", fontWeight: "600" }}>Autoplay next episode</div>
                <input
                  type="checkbox"
                  checked={autoplayNext}
                  onChange={(e) => setAutoplayNext(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#22c55e" }}
                />
              </div>

              {/* Skip intros and recaps */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: "13.5px", fontWeight: "600" }}>Skip intros and recaps</div>
                <input
                  type="checkbox"
                  checked={skipIntros}
                  onChange={(e) => setSkipIntros(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#22c55e" }}
                />
              </div>

              {/* Ambient mode */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "600" }}>Ambient mode</div>
                  <div style={{ fontSize: "11px", color: "#8e95a5" }}>
                    Soft light in the picture's colors fills the black bars.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={ambientMode}
                  onChange={(e) => setAmbientMode(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#22c55e" }}
                />
              </div>

              {/* Crop black bars */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: "13.5px", fontWeight: "600" }}>Crop black bars</div>
                <input
                  type="checkbox"
                  checked={cropBlackBars}
                  onChange={(e) => setCropBlackBars(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#22c55e" }}
                />
              </div>

              {/* Subtitles */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px" }}>
                <div style={{ fontSize: "13.5px", fontWeight: "600" }}>Subtitles</div>
                <select
                  value={subtitles}
                  onChange={(e) => setSubtitles(e.target.value)}
                  style={{
                    background: "#1e2430",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "4px 10px",
                    fontSize: "12px",
                  }}
                >
                  <option value="Off">Off</option>
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </div>
            </div>
          </div>

          {/* PLAYER PREFERENCE (Cinema Engine Integration) */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
              Player Engine
            </div>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "14px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {[
                { id: "web", name: "Web Player (Built-in Artplayer + Multi-Server Auto-Fallback)" },
                { id: "vlc", name: "VLC Media Player (External App)" },
                { id: "mx", name: "MX Player (External App)" },
                { id: "mpv", name: "MPV Player (External App)" },
              ].map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: playerPreference === p.id ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  }}
                  onClick={() => {
                    onPlayerPreferenceChange(p.id);
                    onShowToast(`Player set to ${p.name.split(" ")[0]}`);
                  }}
                >
                  <span style={{ fontSize: "13px", color: playerPreference === p.id ? "#ffffff" : "#94a3b8" }}>
                    {p.name}
                  </span>
                  {playerPreference === p.id && <Check size={16} color="#22c55e" />}
                </div>
              ))}
            </div>
          </div>

          {/* 5-NODE DISTRIBUTED CLUSTER STATUS */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
              Distributed Render Cluster (5 Nodes)
            </div>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "14px",
                padding: "12px 16px",
                fontSize: "12px",
                color: "#94a3b8",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {RENDER_CLUSTER.map((node, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Node {i + 1}: {node.replace("https://", "")}</span>
                  <span style={{ color: "#22c55e", fontWeight: "600" }}>Active</span>
                </div>
              ))}
            </div>
          </div>

          {/* KEYBOARD SHORTCUTS BUTTON */}
          <div>
            <button
              className="cno-nav-pill-btn"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                width: "100%",
                padding: "10px",
                textAlign: "center",
              }}
              onClick={() => setShowShortcuts(!showShortcuts)}
            >
              {showShortcuts ? "Hide Keyboard Shortcuts" : "View Keyboard Shortcuts (Press ?)"}
            </button>

            {showShortcuts && (
              <div
                style={{
                  marginTop: "12px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  padding: "14px",
                  fontSize: "12px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ color: "#718096", marginBottom: "6px" }}>ANYWHERE</div>
                  <div><span className="cno-key-badge">/</span> or <span className="cno-key-badge">Ctrl K</span> Search</div>
                  <div style={{ marginTop: "4px" }}><span className="cno-key-badge">Esc</span> Close dialog</div>
                </div>
                <div>
                  <div style={{ color: "#718096", marginBottom: "6px" }}>WATCHING</div>
                  <div><span className="cno-key-badge">Space</span> Play/Pause</div>
                  <div style={{ marginTop: "4px" }}><span className="cno-key-badge">F</span> Fullscreen</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
