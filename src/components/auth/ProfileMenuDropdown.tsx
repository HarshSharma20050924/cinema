import React, { useRef, useEffect } from "react";
import { ProfileAvatar } from "./ProfileAvatar";
import {
  getActiveProfile,
  getAccountEmail,
  signOutAccount,
  type UserProfile,
} from "../../utils/profileService";

interface ProfileMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenManageProfiles: () => void;
  onOpenSettings: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

export const ProfileMenuDropdown: React.FC<ProfileMenuDropdownProps> = ({
  isOpen,
  onClose,
  onOpenManageProfiles,
  onOpenSettings,
}) => {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const activeProfile: UserProfile = getActiveProfile();
  const accountEmail = getAccountEmail();

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "11px 14px",
    borderRadius: "14px",
    background: "transparent",
    border: "none",
    color: "#ffffff",
    fontSize: "13.5px",
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.15s ease, transform 0.15s ease",
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: "calc(100% + 12px)",
        right: 0,
        width: "250px",
        background: "rgba(16, 20, 26, 0.96)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.16)",
        borderRadius: "22px",
        padding: "12px 10px",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.9), 0 0 1px 1px rgba(255, 255, 255, 0.08)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        animation: "cinemaMenuPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* User Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 12px 12px 12px",
        }}
      >
        <ProfileAvatar
          avatarKey={activeProfile.avatar}
          size={42}
          gradient={activeProfile.avatarColor}
        />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span
            style={{
              fontSize: "14.5px",
              fontWeight: 700,
              color: "#ffffff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {activeProfile.name}
          </span>
          <span
            style={{
              fontSize: "11.5px",
              color: "rgba(255, 255, 255, 0.55)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {accountEmail}
          </span>
        </div>
      </div>

      <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.12)", margin: "2px 6px" }} />

      {/* 1. Manage Profiles */}
      <button
        style={itemStyle}
        onClick={() => {
          onClose();
          onOpenManageProfiles();
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
          e.currentTarget.style.transform = "translateX(2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.transform = "translateX(0)";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>Manage Profiles</span>
      </button>

      {/* 2. Settings */}
      <button
        style={itemStyle}
        onClick={() => {
          onClose();
          onOpenSettings();
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
          e.currentTarget.style.transform = "translateX(2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.transform = "translateX(0)";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>Settings</span>
      </button>

      <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.12)", margin: "2px 6px" }} />

      {/* 3. Sign Out */}
      <button
        style={{ ...itemStyle, color: "#ff6b6b" }}
        onClick={() => {
          onClose();
          signOutAccount();
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
          e.currentTarget.style.transform = "translateX(2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.transform = "translateX(0)";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>Sign Out</span>
      </button>
    </div>
  );
};
