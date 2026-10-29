import React, { useState, useEffect } from "react";
import { ProfileAvatar } from "./ProfileAvatar";
import {
  getProfiles,
  getActiveProfile,
  setActiveProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  AVATAR_OPTIONS,
  type UserProfile,
} from "../../utils/profileService";

import { toast } from "../../utils/toastService";

interface ManageProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageProfilesModal: React.FC<ManageProfilesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>(() => getProfiles());
  const activeProfile = getActiveProfile();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Mode: "view" (Image 4 screen) | "edit" (Image 5 modal) | "add" (Add modal)
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

  // Edit / Add form states
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("moon");
  const [isKids, setIsKids] = useState(false);
  const [pin, setPin] = useState<string | undefined>(undefined);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinValue, setPinValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setProfiles(getProfiles());
      setMode("view");
      setSelectedProfile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const refresh = () => {
    setProfiles(getProfiles());
  };

  const handleOpenEdit = (p: UserProfile) => {
    setSelectedProfile(p);
    setName(p.name);
    setAvatar(p.avatar || "moon");
    setIsKids(Boolean(p.isKids));
    setPin(p.pin);
    setShowPinInput(false);
    setPinValue(p.pin || "");
    setConfirmDelete(false);
    setMode("edit");
  };

  const handleOpenAdd = () => {
    setSelectedProfile(null);
    setName("");
    setAvatar("star");
    setIsKids(false);
    setPin(undefined);
    setShowPinInput(false);
    setPinValue("");
    setConfirmDelete(false);
    setMode("add");
  };

  const handleSave = () => {
    const opt = AVATAR_OPTIONS.find((o) => o.icon === avatar || o.id === avatar) || AVATAR_OPTIONS[0];

    if (mode === "edit" && selectedProfile) {
      const updatedName = name.trim() || selectedProfile.name;
      updateProfile(selectedProfile.id, {
        name: updatedName,
        avatar,
        avatarColor: opt.gradient,
        isKids,
        pin: pin,
      });
      toast.success(`Profile "${updatedName}" updated!`);
    } else if (mode === "add") {
      if (!name.trim()) return;
      createProfile(name.trim(), avatar, opt.gradient, isKids);
      toast.success(`Profile "${name.trim()}" created!`);
    }

    refresh();
    setMode("view");
    setSelectedProfile(null);
    setConfirmDelete(false);
  };

  const handleDelete = () => {
    if (!selectedProfile) return;
    if (profiles.length <= 1) {
      toast.warning("You must have at least one profile.");
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const profileName = selectedProfile.name;
    deleteProfile(selectedProfile.id);
    refresh();
    setMode("view");
    setSelectedProfile(null);
    setConfirmDelete(false);
    toast.info(`Profile "${profileName}" deleted.`);
  };

  // 12 vector avatar icon options matching Image 5
  const displayAvatars = AVATAR_OPTIONS.slice(0, 12);
  const currentAvatarOption = AVATAR_OPTIONS.find((o) => o.icon === avatar || o.id === avatar) || AVATAR_OPTIONS[0];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100010,
        background: "rgba(5, 7, 11, 0.90)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "cinemaFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onClick={() => {
        if (mode === "view") onClose();
      }}
    >
      {/* ========================================================
          SCREEN 1: MANAGE PROFILES (Matching user Image 4)
         ======================================================== */}
      {mode === "view" && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "42px",
            width: "100%",
            maxWidth: "960px",
            animation: "cinemaMenuPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Header Title */}
          <h1
            style={{
              margin: 0,
              fontSize: "42px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.5px",
              textAlign: "center",
            }}
          >
            Manage Profiles
          </h1>

          {/* Profiles Horizontal Row */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "36px",
              width: "100%",
              padding: "10px 0",
            }}
          >
            {profiles.map((p) => {
              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenEdit(p)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                    transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {/* Orb with Pencil Overlay */}
                  <div
                    style={{
                      position: "relative",
                      width: "116px",
                      height: "116px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ProfileAvatar
                      avatarKey={p.avatar}
                      size={116}
                      gradient={p.avatarColor}
                      glow
                    />
                    {/* Pencil Edit Icon in center matching Image 4 */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        background: "rgba(0, 0, 0, 0.22)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "rgba(255, 255, 255, 0.18)",
                          backdropFilter: "blur(8px)",
                          WebkitBackdropFilter: "blur(8px)",
                          border: "1px solid rgba(255, 255, 255, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ffffff",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Profile Name & Dynamic Kids Badge */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        fontSize: "17px",
                        fontWeight: 600,
                        color: "#ffffff",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      {p.name}
                    </span>

                    {/* Dynamic Kids Badge - NOT hardcoded */}
                    {p.isKids && (
                      <span
                        style={{
                          background: "#eab308",
                          color: "#18181b",
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          letterSpacing: "0.2px",
                          lineHeight: "1.2",
                        }}
                      >
                        Kids
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Profile Orb matching Image 4 */}
            <div
              onClick={handleOpenAdd}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div
                style={{
                  width: "116px",
                  height: "116px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1.5px solid rgba(255, 255, 255, 0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  transition: "background 0.2s ease, border-color 0.2s ease",
                }}
              >
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>

              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.75)",
                  letterSpacing: "-0.2px",
                }}
              >
                Add Profile
              </span>
            </div>
          </div>

          {/* Bottom Done Pill Button */}
          <button
            onClick={onClose}
            style={{
              padding: "10px 48px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.22)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Done
          </button>
        </div>
      )}

      {/* ========================================================
          SCREEN 2: EDIT PROFILE / ADD PROFILE (Matching user Image 5)
         ======================================================== */}
      {(mode === "edit" || mode === "add") && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: "440px",
            background: "rgba(18, 22, 30, 0.96)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "26px",
            padding: "28px 24px 26px 24px",
            boxShadow: "0 30px 80px rgba(0, 0, 0, 0.9), 0 0 1px 1px rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            position: "relative",
            animation: "cinemaMenuPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Top-Right Close Button */}
          <button
            onClick={() => setMode("view")}
            style={{
              position: "absolute",
              top: "18px",
              right: "18px",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
          >
            ✕
          </button>

          {/* Top Center Big Avatar Orb */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <ProfileAvatar
              avatarKey={avatar}
              size={84}
              gradient={currentAvatarOption.gradient}
              glow
            />
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.3px",
              }}
            >
              {mode === "edit" ? "Edit Profile" : "Add New Profile"}
            </h2>
          </div>

          {/* Profile Name Input Box */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              borderRadius: "14px",
              padding: "8px 14px 10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <label
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.5)",
                letterSpacing: "0.2px",
              }}
            >
              Profile name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya"
              autoFocus
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 600,
                width: "100%",
                padding: 0,
              }}
            />
          </div>

          {/* 12 Avatar Icons in 2 rows of 6 - No Text Glitch! */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "12px 10px",
              justifyItems: "center",
              padding: "4px 0",
            }}
          >
            {displayAvatars.map((opt) => {
              const isSelected = avatar === opt.icon || avatar === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAvatar(opt.icon)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    cursor: "pointer",
                    position: "relative",
                    borderRadius: "50%",
                    outline: isSelected ? "3px solid #ffffff" : "none",
                    outlineOffset: "3px",
                    transform: isSelected ? "scale(1.06)" : "scale(1)",
                    transition: "transform 0.15s ease, outline 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.transform = "scale(1.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <ProfileAvatar
                    avatarKey={opt.icon}
                    size={42}
                    gradient={opt.gradient}
                    glow={isSelected}
                  />
                </button>
              );
            })}
          </div>

          {/* Kids Profile Row - Dynamic, NOT hardcoded */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 0",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>
                Kids profile
              </span>
              <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
                Only titles rated for children.
              </span>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={() => setIsKids((prev) => !prev)}
              style={{
                width: "48px",
                height: "26px",
                borderRadius: "9999px",
                background: isKids ? "#e50914" : "rgba(255, 255, 255, 0.22)",
                border: "none",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s ease",
                padding: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "3px",
                  left: isKids ? "25px" : "3px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.35)",
                  transition: "left 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            </button>
          </div>

          {/* Profile Lock Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 0",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>
                Profile lock
              </span>
              <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
                {pin ? "PIN protection is enabled." : "Require a 4-digit PIN to open it."}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowPinInput((prev) => !prev)}
              style={{
                padding: "6px 14px",
                borderRadius: "9999px",
                background: pin ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: pin ? "#4ade80" : "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
            >
              {pin ? "Edit PIN" : "Set PIN"}
            </button>
          </div>

          {/* Inline PIN Input (if toggled) */}
          {showPinInput && (
            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "12px",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <input
                type="password"
                maxLength={4}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                placeholder="4-digit PIN"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#ffffff",
                  fontSize: "14px",
                  letterSpacing: "4px",
                  width: "110px",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (pinValue.length === 4) {
                    setPin(pinValue);
                    setShowPinInput(false);
                  } else if (pinValue.length === 0) {
                    setPin(undefined);
                    setShowPinInput(false);
                  } else {
                    toast.error("PIN must be 4 digits");
                  }
                }}
                style={{
                  padding: "4px 10px",
                  borderRadius: "8px",
                  background: "#e50914",
                  border: "none",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Apply
              </button>
              {pin && (
                <button
                  type="button"
                  onClick={() => {
                    setPin(undefined);
                    setPinValue("");
                    setShowPinInput(false);
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          )}

          {/* Bottom Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "6px" }}>
            {/* White Solid Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim()}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "9999px",
                background: "#ffffff",
                border: "none",
                color: "#000000",
                fontSize: "14.5px",
                fontWeight: 700,
                cursor: name.trim() ? "pointer" : "not-allowed",
                opacity: name.trim() ? 1 : 0.6,
                transition: "opacity 0.2s ease, transform 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (name.trim()) e.currentTarget.style.transform = "scale(1.01)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {mode === "edit" ? "Save" : "Create Profile"}
            </button>

            {/* Delete or Cancel Button */}
            {mode === "edit" ? (
              <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                {confirmDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "9999px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.16)",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    flex: confirmDelete ? 1.4 : 1,
                    width: confirmDelete ? "auto" : "100%",
                    padding: "12px",
                    borderRadius: "9999px",
                    background: confirmDelete ? "#e50914" : "rgba(255, 255, 255, 0.08)",
                    border: confirmDelete ? "1px solid #e50914" : "1px solid rgba(255, 255, 255, 0.14)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: confirmDelete ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!confirmDelete) e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    if (!confirmDelete) e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  }}
                >
                  {confirmDelete ? "Confirm Delete?" : "Delete Profile"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMode("view")}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "9999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
