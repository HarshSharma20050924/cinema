/**
 * Profile & Authentication Service
 * Fully functional, local-first profile management with localStorage persistence.
 * Dispatches 'cinema:profile_changed' on any update.
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string; // emoji or icon key
  avatarColor: string; // gradient background
  isKids: boolean;
  createdAt: number;
}

export const AVATAR_OPTIONS = [
  { icon: "🌙", label: "Moon", gradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", glow: "rgba(99, 102, 241, 0.4)" },
  { icon: "✨", label: "Sparkles", gradient: "linear-gradient(135deg, #e50914 0%, #b81d24 100%)", glow: "rgba(229, 9, 20, 0.4)" },
  { icon: "⭐", label: "Star", gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", glow: "rgba(245, 158, 11, 0.4)" },
  { icon: "🔥", label: "Flame", gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", glow: "rgba(239, 68, 68, 0.4)" },
  { icon: "🎬", label: "Cinema", gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", glow: "rgba(59, 130, 246, 0.4)" },
  { icon: "🚀", label: "Rocket", gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", glow: "rgba(139, 92, 246, 0.4)" },
  { icon: "🐱", label: "Cat", gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)", glow: "rgba(16, 185, 129, 0.4)" },
  { icon: "👑", label: "Crown", gradient: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)", glow: "rgba(236, 72, 153, 0.4)" },
];

const PROFILES_KEY = "cinema_user_profiles_v1";
const ACTIVE_PROFILE_KEY = "cinema_active_profile_id_v1";
const ACCOUNT_EMAIL_KEY = "cinema_account_email_v1";

const DEFAULT_EMAIL = "cinemaisherebtw@gmail.com";

const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: "prof_default",
    name: "Harsh",
    email: DEFAULT_EMAIL,
    avatar: "🌙",
    avatarColor: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
    isKids: false,
    createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
  },
  {
    id: "prof_kids",
    name: "Kids",
    email: DEFAULT_EMAIL,
    avatar: "⭐",
    avatarColor: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    isKids: true,
    createdAt: Date.now() - 180 * 24 * 60 * 60 * 1000,
  },
];

function notifyProfileChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cinema:profile_changed"));
  }
}

export function getAccountEmail(): string {
  if (typeof window === "undefined") return DEFAULT_EMAIL;
  try {
    return localStorage.getItem(ACCOUNT_EMAIL_KEY) || DEFAULT_EMAIL;
  } catch {
    return DEFAULT_EMAIL;
  }
}

export function setAccountEmail(email: string): void {
  if (typeof window === "undefined") return;
  try {
    const clean = email.trim();
    if (!clean) return;
    localStorage.setItem(ACCOUNT_EMAIL_KEY, clean);
    // Also update all profiles email
    const profiles = getProfiles();
    const updated = profiles.map((p) => ({ ...p, email: clean }));
    localStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
    notifyProfileChanged();
  } catch (err) {
    console.error("Failed to set account email:", err);
  }
}

export function getProfiles(): UserProfile[] {
  if (typeof window === "undefined") return DEFAULT_PROFILES;
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_PROFILES;
  } catch {
    return DEFAULT_PROFILES;
  }
}

export function getActiveProfile(): UserProfile {
  const profiles = getProfiles();
  if (typeof window === "undefined") return profiles[0] || DEFAULT_PROFILES[0];
  try {
    const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (activeId) {
      const match = profiles.find((p) => p.id === activeId);
      if (match) return match;
    }
  } catch {}
  return profiles[0] || DEFAULT_PROFILES[0];
}

export function setActiveProfile(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    notifyProfileChanged();
  } catch (err) {
    console.error("Failed to set active profile:", err);
  }
}

export function createProfile(name: string, avatar?: string, avatarColor?: string, isKids?: boolean): UserProfile {
  const profiles = getProfiles();
  const email = getAccountEmail();
  const option = AVATAR_OPTIONS.find((o) => o.icon === avatar) || AVATAR_OPTIONS[0];

  const newProfile: UserProfile = {
    id: `prof_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || "New Profile",
    email,
    avatar: avatar || option.icon,
    avatarColor: avatarColor || option.gradient,
    isKids: Boolean(isKids),
    createdAt: Date.now(),
  };

  const updated = [...profiles, newProfile];
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
    setActiveProfile(newProfile.id);
  } catch (err) {
    console.error("Failed to create profile:", err);
  }
  return newProfile;
}

export function updateProfile(id: string, updates: Partial<UserProfile>): void {
  const profiles = getProfiles();
  const index = profiles.findIndex((p) => p.id === id);
  if (index === -1) return;

  profiles[index] = { ...profiles[index], ...updates };
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    notifyProfileChanged();
  } catch (err) {
    console.error("Failed to update profile:", err);
  }
}

export function deleteProfile(id: string): void {
  const profiles = getProfiles();
  if (profiles.length <= 1) {
    alert("Cannot delete the only profile. Please create another profile first.");
    return;
  }
  const filtered = profiles.filter((p) => p.id !== id);
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(filtered));
    const active = getActiveProfile();
    if (active.id === id) {
      setActiveProfile(filtered[0].id);
    } else {
      notifyProfileChanged();
    }
  } catch (err) {
    console.error("Failed to delete profile:", err);
  }
}

export function signOutAccount(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    // Reset to guest session
    const guestProfile: UserProfile = {
      id: "prof_guest",
      name: "Guest",
      email: "guest@cinema.local",
      avatar: "🎬",
      avatarColor: "linear-gradient(135deg, #475569 0%, #1e293b 100%)",
      isKids: false,
      createdAt: Date.now(),
    };
    localStorage.setItem(PROFILES_KEY, JSON.stringify([guestProfile]));
    localStorage.setItem(ACCOUNT_EMAIL_KEY, "guest@cinema.local");
    localStorage.setItem(ACTIVE_PROFILE_KEY, guestProfile.id);
    notifyProfileChanged();
  } catch (err) {
    console.error("Failed to sign out:", err);
  }
}

export function signInAccount(email: string, name?: string): void {
  if (typeof window === "undefined") return;
  try {
    const cleanEmail = email.trim();
    const cleanName = name?.trim() || cleanEmail.split("@")[0] || "User";
    const profile: UserProfile = {
      id: `prof_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      avatar: "🌙",
      avatarColor: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
      isKids: false,
      createdAt: Date.now(),
    };
    localStorage.setItem(ACCOUNT_EMAIL_KEY, cleanEmail);
    localStorage.setItem(PROFILES_KEY, JSON.stringify([profile, DEFAULT_PROFILES[1]]));
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
    notifyProfileChanged();
  } catch (err) {
    console.error("Failed to sign in:", err);
  }
}
