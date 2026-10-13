import type { Post, MediaDetails, StreamItem } from "../types";

const NAV_STATE_KEY = "cinema_nav_state_v2";

export interface NavigationState {
  activeProviderValue?: string;
  activeFilter?: string;
  searchQuery?: string;
  isGlobalSearch?: boolean;
  page?: number;
  selectedPost?: Post | null;
  details?: MediaDetails | null;
  streams?: StreamItem[];
  playbackUrl?: string | null;
  scrollY?: number;
  activeNavTab?: "home" | "movies" | "tv" | "categories";
  isBrowsingCategories?: boolean;
  viewAllCategory?: { filter: string; title: string } | null;
  selectedNicheId?: string | null;
}

export function loadNavigationState(): NavigationState | null {
  try {
    const raw = sessionStorage.getItem(NAV_STATE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Failed to load navigation state:", e);
  }
  return null;
}

export function saveNavigationState(updates: Partial<NavigationState>): void {
  try {
    const current = loadNavigationState() || {};
    const merged = { ...current, ...updates };
    sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn("Failed to save navigation state:", e);
  }
}

export function clearOverlayState(): void {
  try {
    const current = loadNavigationState() || {};
    delete current.selectedPost;
    delete current.details;
    delete current.streams;
    delete current.playbackUrl;
    sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(current));
  } catch (e) {
    // Ignore
  }
}
