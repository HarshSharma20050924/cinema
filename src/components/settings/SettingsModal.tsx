import React, { useState, useEffect } from "react";
import { XIcon, ServerIcon, CheckIcon, ArrowLeftIcon } from "../../icons";
import type { UserSettings, Provider, ExternalPlayerType } from "../../types";

interface SettingsModalProps {
  settings: UserSettings;
  availableProviders: Provider[];
  onSave: (settings: Partial<UserSettings>) => void;
  onToggleExtension: (providerValue: string) => void;
  onResetSetup: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  availableProviders,
  onSave,
  onToggleExtension,
  onResetSetup,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"player" | "extensions" | "about">("player");
  const [player, setPlayer] = useState<ExternalPlayerType>(settings.defaultPlayer || "web");
  const [scheme, setScheme] = useState(settings.customPlayerScheme || "vlc://");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSavePlayer = () => {
    onSave({
      defaultPlayer: player,
      customPlayerScheme: scheme,
    });
    onClose();
  };

  const handleSelectPlayer = (optId: ExternalPlayerType) => {
    setPlayer(optId);
    onSave({
      defaultPlayer: optId,
      customPlayerScheme: scheme,
    });
  };

  const handleCloseModal = () => {
    onSave({
      defaultPlayer: player,
      customPlayerScheme: scheme,
    });
    onClose();
  };

  const isAllSelected = availableProviders.length > 0 && settings.installedExtensions.length === availableProviders.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      onSave({ installedExtensions: [] });
    } else {
      const allValues = availableProviders.map((p) => p.value);
      onSave({ installedExtensions: allValues });
    }
  };

  const playerOptions: { id: ExternalPlayerType; title: string; desc: string }[] = [
    {
      id: "web",
      title: "Built-in Artplayer (Web)",
      desc: "Fast in-browser player with HLS support and Web Audio booster.",
    },
    {
      id: "vlc",
      title: "VLC Media Player",
      desc: "Direct stream handoff via vlc:// protocol.",
    },
    {
      id: "mpv",
      title: "MPV Player",
      desc: "High-performance minimal player via mpv:// protocol.",
    },
    {
      id: "mx",
      title: "MX Player (Mobile)",
      desc: "Android intent handoff for hardware-accelerated playback.",
    },
    {
      id: "custom",
      title: "Custom Player Scheme",
      desc: "Use your own custom protocol scheme (e.g. iina:// or nplayer-).",
    },
  ];

  // Sort providers so currently selected ones are on top
  const sortedProviders = [...availableProviders].sort((a, b) => {
    const aSel = settings.installedExtensions.includes(a.value);
    const bSel = settings.installedExtensions.includes(b.value);
    if (aSel && !bSel) return -1;
    if (!aSel && bSel) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "540px",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "24px",
          background: "rgba(10, 13, 20, 0.75)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header with Back and Close */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleCloseModal}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 16px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.08)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                border: "1px solid rgba(255, 255, 255, 0.12)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <ArrowLeftIcon size={14} />
              <span>Back</span>
            </button>
            <h2 style={{ fontSize: "19px", fontWeight: 800, margin: 0 }}>Settings</h2>
          </div>

          <button
            onClick={handleCloseModal}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255, 255, 255, 0.8)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Setting Navigation Tabs - Curvy smooth pills, no solid flat red */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "22px" }}>
          {[
            { id: "player", label: "Player" },
            { id: "extensions", label: `Sources (${settings.installedExtensions.length})` },
            { id: "about", label: "System" },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  flex: 1,
                  padding: "9px 14px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  background: isActive
                    ? "rgba(255, 255, 255, 0.14)"
                    : "rgba(255, 255, 255, 0.04)",
                  border: isActive
                    ? "1px solid rgba(255, 255, 255, 0.25)"
                    : "1px solid rgba(255, 255, 255, 0.06)",
                  color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.65)",
                  boxShadow: isActive ? "0 2px 10px rgba(0, 0, 0, 0.25)" : "none",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: VIDEO PLAYER */}
        {activeTab === "player" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {playerOptions.map((opt) => {
                const isSelected = player === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectPlayer(opt.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "13px 16px",
                      borderRadius: "14px",
                      background: isSelected ? "rgba(255, 255, 255, 0.09)" : "rgba(255, 255, 255, 0.03)",
                      border: isSelected
                        ? "1px solid rgba(255, 255, 255, 0.22)"
                        : "1px solid rgba(255, 255, 255, 0.06)",
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>{opt.title}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {opt.desc}
                      </div>
                    </div>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        border: `2px solid ${isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.25)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected && (
                        <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#ffffff" }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {player === "custom" && (
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Custom Scheme (e.g. iina:// or nplayer-)
                </label>
                <input
                  type="text"
                  value={scheme}
                  onChange={(e) => setScheme(e.target.value)}
                  placeholder="vlc://"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "#fff",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            )}

            <button
              onClick={handleSavePlayer}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #e50914 0%, #b20710 100%)",
                boxShadow: "0 4px 16px rgba(229, 9, 20, 0.35)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
                border: "none",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              Save Player Preferences
            </button>
          </div>
        )}

        {/* TAB 2: EXTENSIONS MANAGER - Smooth, Curvy list with pill badges */}
        {activeTab === "extensions" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.65)" }}>
                {settings.installedExtensions.length} of {availableProviders.length} active
              </span>
              <button
                onClick={handleToggleSelectAll}
                style={{
                  fontSize: "12px",
                  color: "#ffffff",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 14px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <CheckIcon size={13} />
                <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
              </button>
            </div>

            {/* List of Extensions (Sorted with active items on top) */}
            <div style={{ maxHeight: "310px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingRight: "2px" }}>
              {sortedProviders.map((p) => {
                const isInstalled = settings.installedExtensions.includes(p.value);
                return (
                  <div
                    key={p.value}
                    onClick={() => onToggleExtension(p.value)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "14px",
                      background: isInstalled ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${isInstalled ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.06)"}`,
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {p.icon ? (
                        <img
                          src={p.icon}
                          alt=""
                          style={{ width: "20px", height: "20px", borderRadius: "5px", objectFit: "contain" }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <ServerIcon size={18} color="var(--accent-cyan)" />
                      )}
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{p.name}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize" }}>
                          {p.type} • v{p.version}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "4px 12px",
                        borderRadius: "999px",
                        background: isInstalled ? "rgba(229, 9, 20, 0.18)" : "rgba(255, 255, 255, 0.06)",
                        color: isInstalled ? "#ff606b" : "rgba(255, 255, 255, 0.5)",
                        border: isInstalled ? "1px solid rgba(229, 9, 20, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.02em",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {isInstalled ? "Active" : "Enable"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ABOUT / SYSTEM (NO BRAND CHANGE OPTION) */}
        {activeTab === "about" && (
          <div>
            <div
              style={{
                padding: "16px",
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px", color: "#fff" }}>Cinema Core</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                Modern movies & TV series streaming platform.
              </div>
              <div style={{ marginTop: "10px", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)" }}>
                Active Sources: <strong>{settings.installedExtensions.length}</strong>
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "18px" }}>
              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ff6b75",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.09)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                >
                  Reset Preferences
                </button>
              ) : (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                    Are you sure you want to reset?
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                    This will reset your selected sources and setup options.
                  </div>
                  <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                    <button
                      onClick={() => {
                        setShowResetConfirm(false);
                        onResetSetup();
                      }}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: "999px",
                        background: "linear-gradient(135deg, #e50914 0%, #b20710 100%)",
                        boxShadow: "0 4px 14px rgba(229, 9, 20, 0.35)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Yes, Reset Everything
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "999px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
