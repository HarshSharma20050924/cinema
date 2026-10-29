/**
 * Cinema Continue Watching Service
 * Automatically persists and tracks playback progress across movies and series episodes.
 * Saves exact currentTime, duration, progress percentage, and metadata to localStorage.
 */

export interface ContinueWatchingItem {
  id: string; // Unique identifier: post link or tmdbId or normalized title
  title: string;
  cleanTitle?: string;
  year?: string;
  poster?: string;
  backdrop?: string;
  currentTime: number;
  duration: number;
  progressPercent: number; // 0 to 100
  updatedAt: number;
  playbackUrl?: string;
  servers?: Array<{ server: string; link: string; quality?: string; type?: string }>;
  isSeries?: boolean;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  tmdbId?: number;
  post?: any;
}

const STORAGE_KEY = "cinema_continue_watching";
const EVENT_NAME = "cinema:continue_watching_updated";

export function getContinueWatchingList(): ContinueWatchingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: ContinueWatchingItem[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    // Filter out corrupted items, items with < 5s watched, or items > 95% watched (completed)
    const valid = list.filter((item) => {
      if (!item || !item.id || !item.title) return false;
      if (item.duration > 0 && item.currentTime >= item.duration - 45) return false; // Finished
      if (item.progressPercent >= 95) return false;
      if (item.currentTime < 4) return false; // Ignore accidental opens under 4s
      return true;
    });

    return valid.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch {
    return [];
  }
}

export function saveContinueWatching(
  data: Omit<ContinueWatchingItem, "updatedAt" | "progressPercent">
): void {
  if (typeof window === "undefined" || !data || !data.id || !data.title) return;

  const duration = data.duration || 0;
  const currentTime = data.currentTime || 0;

  // Ignore accidental clicks under 4 seconds
  if (currentTime < 4) return;

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  // If movie or episode is virtually finished (>95% or within 45s of end), remove it
  if (progressPercent >= 95 || (duration > 60 && currentTime >= duration - 45)) {
    removeContinueWatching(data.id);
    return;
  }

  try {
    const currentList = getContinueWatchingList();
    const existingIdx = currentList.findIndex(
      (item) =>
        item.id === data.id ||
        (data.tmdbId && item.tmdbId === data.tmdbId && item.season === data.season && item.episode === data.episode) ||
        (item.title.toLowerCase().trim() === data.title.toLowerCase().trim() &&
          item.season === data.season &&
          item.episode === data.episode)
    );

    const newItem: ContinueWatchingItem = {
      ...data,
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      progressPercent: Math.round(progressPercent),
      updatedAt: Date.now(),
    };

    if (existingIdx >= 0) {
      currentList[existingIdx] = newItem;
    } else {
      currentList.unshift(newItem);
    }

    // Keep top 30 in-progress titles
    const trimmed = currentList.slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: trimmed }));
  } catch (err) {
    console.warn("Failed to save continue watching:", err);
  }
}

export function removeContinueWatching(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const currentList = getContinueWatchingList();
    const filtered = currentList.filter(
      (item) => item.id !== id && item.title.toLowerCase().trim() !== id.toLowerCase().trim()
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: filtered }));
  } catch {}
}

export function clearAllContinueWatching(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: [] }));
  } catch {}
}

export function getContinueWatchingItem(idOrTitle: string): ContinueWatchingItem | null {
  if (typeof window === "undefined" || !idOrTitle) return null;
  const list = getContinueWatchingList();
  const clean = idOrTitle.toLowerCase().trim();
  return (
    list.find(
      (item) =>
        item.id.toLowerCase().trim() === clean ||
        item.title.toLowerCase().trim() === clean ||
        (item.cleanTitle && item.cleanTitle.toLowerCase().trim() === clean)
    ) || null
  );
}

export function formatTimeRemaining(currentTime: number, duration: number): string {
  if (!duration || duration <= currentTime) return "";
  const remainingSec = Math.floor(duration - currentTime);
  const hours = Math.floor(remainingSec / 3600);
  const minutes = Math.floor((remainingSec % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
}
