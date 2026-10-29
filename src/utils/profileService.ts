/**
 * Profile & Authentication Service
 * Connected to Cloudflare D1 Database (cinema_db) with full session persistence.
 * Pure vector icons & glossy 3D gradient orbs. Strictly NO Emojis.
 * NO HARDCODED PROFILES: everything dynamically loads from database per user account.
 */
import { getBackendUrl } from "../api/client";
import { showToast } from "./toastService";

export interface AvatarOption {
  id: string;
  label: string;
  icon: string;
  gradient: string;
  glow: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: "star",
    label: "Starlight",
    icon: "star",
    gradient: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
    glow: "rgba(56, 189, 248, 0.45)",
  },
  {
    id: "planet",
    label: "Saturn",
    icon: "planet",
    gradient: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)",
    glow: "rgba(251, 146, 60, 0.45)",
  },
  {
    id: "wave",
    label: "Ocean Wave",
    icon: "wave",
    gradient: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
    glow: "rgba(37, 99, 235, 0.45)",
  },
  {
    id: "heart",
    label: "Rose Heart",
    icon: "heart",
    gradient: "linear-gradient(135deg, #f472b6 0%, #db2777 100%)",
    glow: "rgba(244, 114, 182, 0.45)",
  },
  {
    id: "leaf",
    label: "Emerald Leaf",
    icon: "leaf",
    gradient: "linear-gradient(135deg, #4ade80 0%, #16a34a 100%)",
    glow: "rgba(74, 222, 128, 0.45)",
  },
  {
    id: "flame",
    label: "Coral Flame",
    icon: "flame",
    gradient: "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)",
    glow: "rgba(251, 113, 133, 0.45)",
  },
  {
    id: "moon",
    label: "Crescent Moon",
    icon: "moon",
    gradient: "linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)",
    glow: "rgba(129, 140, 248, 0.45)",
  },
  {
    id: "crown",
    label: "Golden Crown",
    icon: "crown",
    gradient: "linear-gradient(135deg, #fde047 0%, #ca8a04 100%)",
    glow: "rgba(253, 224, 71, 0.45)",
  },
  {
    id: "diamond",
    label: "Ice Diamond",
    icon: "diamond",
    gradient: "linear-gradient(135deg, #bae6fd 0%, #38bdf8 100%)",
    glow: "rgba(186, 230, 253, 0.45)",
  },
  {
    id: "bolt",
    label: "Cosmic Bolt",
    icon: "bolt",
    gradient: "linear-gradient(135deg, #c084fc 0%, #9333ea 100%)",
    glow: "rgba(192, 132, 252, 0.45)",
  },
  {
    id: "satellite",
    label: "Voyager",
    icon: "satellite",
    gradient: "linear-gradient(135deg, #67e8f9 0%, #06b6d4 100%)",
    glow: "rgba(103, 232, 249, 0.45)",
  },
  {
    id: "spiral",
    label: "Nebula Spiral",
    icon: "spiral",
    gradient: "linear-gradient(135deg, #f472b6 0%, #a855f7 100%)",
    glow: "rgba(244, 114, 182, 0.45)",
  },
  // Legacy mappings
  {
    id: "film",
    label: "Cinema Reel",
    icon: "film",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    glow: "rgba(59, 130, 246, 0.45)",
  },
  {
    id: "rocket",
    label: "Rocket",
    icon: "satellite",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    glow: "rgba(139, 92, 246, 0.45)",
  },
  {
    id: "sparkles",
    label: "Sparkles",
    icon: "star",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)",
    glow: "rgba(6, 182, 212, 0.45)",
  },
  {
    id: "shield",
    label: "Shield",
    icon: "diamond",
    gradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
    glow: "rgba(99, 102, 241, 0.45)",
  },
];

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarColor: string;
  isKids: boolean;
  pin?: string;
  createdAt: number;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
}

const AUTH_TOKEN_KEY = "cinema_auth_token_v3";
const PROFILES_KEY = "cinema_user_profiles_v3";
const ACTIVE_PROFILE_KEY = "cinema_active_profile_id_v3";
const USER_ACCOUNT_KEY = "cinema_user_account_v3";
const PERSONALIZATION_KEY = "cinema_user_personalization_genres_v3";

export const DEFAULT_GENRES = [
  "Action",
  "Sci-Fi",
  "Crime",
  "Thriller",
  "Drama",
  "Animation",
];

function notifyProfileChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cinema:profile_changed"));
  }
}

function notifyPersonalizationUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cinema:personalization_updated"));
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function isUserSignedIn(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(getAuthToken());
}

export function getUserAccount(): UserAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAccountEmail(): string {
  const account = getUserAccount();
  return account?.email || "Guest";
}

export function setAccountEmail(email: string): void {
  const account = getUserAccount();
  if (account) {
    account.email = email;
    localStorage.setItem(USER_ACCOUNT_KEY, JSON.stringify(account));
    notifyProfileChanged();
  }
}

export function getProfiles(): UserProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export function getActiveProfile(): UserProfile {
  const profiles = getProfiles();
  if (profiles.length > 0) {
    try {
      const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (activeId) {
        const found = profiles.find((p) => p.id === activeId);
        if (found) return found;
      }
    } catch {}
    return profiles[0];
  }

  // Guest fallback if not signed in yet
  return {
    id: "guest",
    name: "Guest",
    email: "guest@cinema.tv",
    avatar: "moon",
    avatarColor: "linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)",
    isKids: false,
    createdAt: Date.now(),
  };
}

export function setActiveProfile(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  notifyProfileChanged();
}

/**
 * Validates the session with Cloudflare D1 / server on app load
 */
export async function initAuthSession(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  const base = getBackendUrl();
  try {
    const res = await fetch(`${base}/api/auth/session`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }
      if (data.authenticated && data.user) {
        localStorage.setItem(USER_ACCOUNT_KEY, JSON.stringify(data.user));
        if (Array.isArray(data.profiles)) {
          localStorage.setItem(PROFILES_KEY, JSON.stringify(data.profiles));
          if (data.activeProfile?.id) {
            localStorage.setItem(ACTIVE_PROFILE_KEY, data.activeProfile.id);
          }
        }
        notifyProfileChanged();
        return true;
      }
    }
  } catch (err) {
    console.warn("Failed to validate session with database:", err);
  }

  return false;
}

let lastAuthError: string | null = null;
export function getLastAuthError(): string | null {
  return lastAuthError;
}

export async function registerAccount(email: string, password: string, name: string): Promise<boolean> {
  lastAuthError = null;
  const base = getBackendUrl();
  try {
    const res = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || "Invalid response from server" };
    }

    if (!res.ok) {
      lastAuthError = data.error || "Failed to create account";
      showToast(lastAuthError, "error");
      return false;
    }

    if (data.token) {
      setAuthToken(data.token);
      localStorage.setItem(USER_ACCOUNT_KEY, JSON.stringify(data.user));
      localStorage.setItem(PROFILES_KEY, JSON.stringify(data.profiles));
      if (data.activeProfile?.id) {
        localStorage.setItem(ACTIVE_PROFILE_KEY, data.activeProfile.id);
      }
      notifyProfileChanged();
      showToast(`Welcome to Cinema, ${name}!`, "success");
      return true;
    }
  } catch (err: any) {
    lastAuthError = err.message || "Network error registering account";
    showToast(lastAuthError, "error");
  }
  return false;
}

/**
 * Sign in account with Cloudflare D1 database
 */
export async function signInAccountWithPassword(email: string, password: string): Promise<boolean> {
  const base = getBackendUrl();
  try {
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || "Invalid response from server" };
    }

    if (!res.ok) {
      showToast(data.error || "Incorrect email or password", "error");
      return false;
    }

    if (data.token) {
      setAuthToken(data.token);
      localStorage.setItem(USER_ACCOUNT_KEY, JSON.stringify(data.user));
      localStorage.setItem(PROFILES_KEY, JSON.stringify(data.profiles));
      if (data.activeProfile?.id) {
        localStorage.setItem(ACTIVE_PROFILE_KEY, data.activeProfile.id);
      }
      notifyProfileChanged();
      showToast(`Welcome back, ${data.user.name}!`, "success");
      return true;
    }
  } catch (err: any) {
    showToast(err.message || "Network error signing in", "error");
  }
  return false;
}

/**
 * Sign out from account and database
 */
export async function signOutAccount(): Promise<void> {
  const token = getAuthToken();
  const base = getBackendUrl();
  if (token) {
    try {
      await fetch(`${base}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }

  setAuthToken(null);
  localStorage.removeItem(USER_ACCOUNT_KEY);
  localStorage.removeItem(PROFILES_KEY);
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
  notifyProfileChanged();
  showToast("Signed out successfully", "info");
}

/**
 * Permanently delete account and all data from Cloudflare D1 database
 */
export async function deleteAccount(): Promise<boolean> {
  const token = getAuthToken();
  const base = getBackendUrl();
  if (!token) return false;

  try {
    const res = await fetch(`${base}/api/auth/delete-account`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setAuthToken(null);
      localStorage.removeItem(USER_ACCOUNT_KEY);
      localStorage.removeItem(PROFILES_KEY);
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
      localStorage.removeItem(PERSONALIZATION_KEY);
      localStorage.removeItem("cinema_saved_watchlist");
      localStorage.removeItem("cinema_user_ratings");
      localStorage.removeItem("cinema_custom_lists");
      notifyProfileChanged();
      showToast("Your Cinema account has been permanently deleted.", "info");
      return true;
    }
  } catch (err: any) {
    showToast(err.message || "Failed to delete account", "error");
  }
  return false;
}

/**
 * Create profile in Cloudflare D1 database
 */
export async function createProfile(
  name: string,
  avatar?: string,
  avatarColor?: string,
  isKids: boolean = false,
  pin?: string
): Promise<UserProfile | null> {
  const token = getAuthToken();
  const base = getBackendUrl();
  const opt = AVATAR_OPTIONS.find((o) => o.icon === avatar || o.id === avatar) || AVATAR_OPTIONS[0];

  if (token) {
    try {
      const res = await fetch(`${base}/api/profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim() || "New Profile",
          avatar: avatar || opt.icon,
          avatarColor: avatarColor || opt.gradient,
          isKids,
          pin,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || "Invalid response from server" };
      }
      if (res.ok && data.profile) {
        const currentProfiles = getProfiles();
        const updated = [...currentProfiles, data.profile];
        localStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
        setActiveProfile(data.profile.id);
        showToast(`Profile "${data.profile.name}" created!`, "success");
        return data.profile;
      } else {
        showToast(data.error || "Failed to create profile", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to create profile", "error");
    }
  }

  // Local fallback
  const user = getUserAccount();
  const newProfile: UserProfile = {
    id: `prof_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || "New Profile",
    email: user?.email || "guest@cinema.tv",
    avatar: avatar || opt.icon,
    avatarColor: avatarColor || opt.gradient,
    isKids,
    pin,
    createdAt: Date.now(),
  };

  const current = getProfiles();
  const updated = [...current, newProfile];
  localStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
  setActiveProfile(newProfile.id);
  showToast(`Profile "${newProfile.name}" created!`, "success");
  return newProfile;
}

/**
 * Update profile in Cloudflare D1 database
 */
export async function updateProfile(id: string, updates: Partial<UserProfile>): Promise<void> {
  const token = getAuthToken();
  const base = getBackendUrl();

  if (token) {
    try {
      await fetch(`${base}/api/profiles/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
    } catch {}
  }

  const profiles = getProfiles();
  const index = profiles.findIndex((p) => p.id === id);
  if (index !== -1) {
    profiles[index] = { ...profiles[index], ...updates };
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    notifyProfileChanged();
    showToast("Profile updated successfully", "success");
  }
}

/**
 * Delete profile from Cloudflare D1 database
 */
export async function deleteProfile(id: string): Promise<boolean> {
  const profiles = getProfiles();
  if (profiles.length <= 1) {
    showToast("You must have at least one profile.", "error");
    return false;
  }

  const token = getAuthToken();
  const base = getBackendUrl();

  if (token) {
    try {
      await fetch(`${base}/api/profiles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }

  const filtered = profiles.filter((p) => p.id !== id);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(filtered));
  const active = getActiveProfile();
  if (active.id === id) {
    setActiveProfile(filtered[0].id);
  } else {
    notifyProfileChanged();
  }
  showToast("Profile deleted", "info");
  return true;
}

/**
 * User Interests / Personalization
 */
export function getUserPersonalizationGenres(): string[] {
  if (typeof window === "undefined") return DEFAULT_GENRES;
  try {
    const raw = localStorage.getItem(PERSONALIZATION_KEY);
    if (!raw) return DEFAULT_GENRES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GENRES;
  } catch {
    return DEFAULT_GENRES;
  }
}

export async function setUserPersonalizationGenres(genres: string[]): Promise<void> {
  if (typeof window === "undefined") return;
  const clean = Array.from(new Set(genres)).slice(0, 8);
  localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(clean));
  notifyPersonalizationUpdated();

  // Sync to database
  const token = getAuthToken();
  const base = getBackendUrl();
  const profile = getActiveProfile();
  if (token && profile?.id) {
    try {
      await fetch(`${base}/api/user-data/interests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profileId: profile.id, genres: clean }),
      });
    } catch {}
  }
  showToast("Interests updated", "success");
}

export const getProfilePersonalization = getUserPersonalizationGenres;
export const setProfilePersonalization = setUserPersonalizationGenres;
