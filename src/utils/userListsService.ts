/**
 * Cinema User Lists & Watchlist Service
 * Manages custom user lists (e.g., "Harsh", "Favorites"), Saved Watchlist items,
 * ratings (thumbs up/down/heart), and watch history with localStorage persistence.
 */
import type { MediaPost } from "../types";

export interface CustomList {
  id: string;
  name: string;
  updatedAt: number;
  items: MediaPost[];
}

export type UserRatingType = "like" | "dislike" | "favorite" | null;

export interface RatedItem {
  id: string;
  post: MediaPost;
  rating: UserRatingType;
  updatedAt: number;
}

export interface HistoryItem {
  id: string;
  post: MediaPost;
  watchedAt: number;
  title: string;
}

const STORAGE_KEY_LISTS = "cinema_custom_lists";
const STORAGE_KEY_SAVED = "cinema_saved_watchlist";
const STORAGE_KEY_RATINGS = "cinema_user_ratings";
const STORAGE_KEY_HISTORY = "cinema_watch_history";

const EVENT_LISTS_UPDATED = "cinema:custom_lists_updated";
const EVENT_SAVED_UPDATED = "cinema:saved_updated";
const EVENT_RATINGS_UPDATED = "cinema:ratings_updated";
const EVENT_HISTORY_UPDATED = "cinema:history_updated";

// -------------------------------------------------------------
// 1. Custom User Lists (e.g. "Harsh", "Hello", etc.)
// -------------------------------------------------------------
export function getCustomLists(): CustomList[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LISTS);
    if (!raw) {
      // Initialize with default list "Harsh" matching user screenshot
      const defaultLists: CustomList[] = [
        {
          id: "list_default_harsh",
          name: "Harsh",
          updatedAt: Date.now(),
          items: [],
        },
      ];
      localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(defaultLists));
      return defaultLists;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createCustomList(name: string): CustomList {
  const cleanName = name.trim();
  const lists = getCustomLists();
  const newList: CustomList = {
    id: `list_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName || "New List",
    updatedAt: Date.now(),
    items: [],
  };
  lists.push(newList);
  try {
    localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(lists));
    window.dispatchEvent(new CustomEvent(EVENT_LISTS_UPDATED, { detail: lists }));
  } catch (_) {}
  return newList;
}

export function deleteCustomList(listId: string): void {
  const lists = getCustomLists().filter((l) => l.id !== listId);
  try {
    localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(lists));
    window.dispatchEvent(new CustomEvent(EVENT_LISTS_UPDATED, { detail: lists }));
  } catch (_) {}
}

export function renameCustomList(listId: string, newName: string): void {
  const lists = getCustomLists();
  const target = lists.find((l) => l.id === listId);
  if (target) {
    target.name = newName.trim();
    target.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(lists));
      window.dispatchEvent(new CustomEvent(EVENT_LISTS_UPDATED, { detail: lists }));
    } catch (_) {}
  }
}

export function addItemToCustomList(listId: string, post: MediaPost): void {
  const lists = getCustomLists();
  const target = lists.find((l) => l.id === listId);
  if (target) {
    const exists = target.items.some((item) => String(item.id) === String(post.id) || (post.tmdbId && item.tmdbId === post.tmdbId));
    if (!exists) {
      target.items.unshift(post);
      target.updatedAt = Date.now();
      try {
        localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(lists));
        window.dispatchEvent(new CustomEvent(EVENT_LISTS_UPDATED, { detail: lists }));
      } catch (_) {}
    }
  }
}

export function removeItemFromCustomList(listId: string, postId: string | number): void {
  const lists = getCustomLists();
  const target = lists.find((l) => l.id === listId);
  if (target) {
    target.items = target.items.filter((item) => String(item.id) !== String(postId) && item.tmdbId !== Number(postId));
    target.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(lists));
      window.dispatchEvent(new CustomEvent(EVENT_LISTS_UPDATED, { detail: lists }));
    } catch (_) {}
  }
}

// -------------------------------------------------------------
// 2. Saved Items (My List / Watchlist)
// -------------------------------------------------------------
export function getSavedItems(): MediaPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isItemSaved(idOrTmdb: string | number | undefined): boolean {
  if (!idOrTmdb) return false;
  const items = getSavedItems();
  const str = String(idOrTmdb);
  return items.some((i) => String(i.id) === str || String(i.tmdbId) === str || i.link === str);
}

export function toggleSavedItem(post: MediaPost): boolean {
  if (!post) return false;
  const items = getSavedItems();
  const idx = items.findIndex((i) => String(i.id) === String(post.id) || (post.tmdbId && i.tmdbId === post.tmdbId));

  let nowSaved = false;
  if (idx >= 0) {
    items.splice(idx, 1);
    nowSaved = false;
  } else {
    items.unshift(post);
    nowSaved = true;
  }

  try {
    localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT_SAVED_UPDATED, { detail: items }));
  } catch (_) {}
  return nowSaved;
}

// -------------------------------------------------------------
// 3. Ratings (Dislike / Like / Heart Favorite)
// -------------------------------------------------------------
export function getUserRatings(): Record<string, RatedItem> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RATINGS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getUserRatingForItem(idOrTmdb: string | number | undefined): UserRatingType {
  if (!idOrTmdb) return null;
  const ratings = getUserRatings();
  const record = ratings[String(idOrTmdb)];
  return record ? record.rating : null;
}

export function setUserRatingForItem(post: MediaPost, rating: UserRatingType): void {
  if (!post) return;
  const key = String(post.id || post.tmdbId || post.title);
  const ratings = getUserRatings();

  if (rating === null || ratings[key]?.rating === rating) {
    delete ratings[key];
  } else {
    ratings[key] = {
      id: key,
      post,
      rating,
      updatedAt: Date.now(),
    };
  }

  try {
    localStorage.setItem(STORAGE_KEY_RATINGS, JSON.stringify(ratings));
    window.dispatchEvent(new CustomEvent(EVENT_RATINGS_UPDATED, { detail: ratings }));
  } catch (_) {}
}

// -------------------------------------------------------------
// 4. Watch History
// -------------------------------------------------------------
export function getWatchHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToWatchHistory(post: MediaPost): void {
  if (!post) return;
  const history = getWatchHistory();
  const key = String(post.id || post.tmdbId || post.title);
  const filtered = history.filter((h) => h.id !== key);
  filtered.unshift({
    id: key,
    post,
    watchedAt: Date.now(),
    title: post.title || "Movie",
  });
  const trimmed = filtered.slice(0, 100);
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent(EVENT_HISTORY_UPDATED, { detail: trimmed }));
  } catch (_) {}
}

export function clearWatchHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    window.dispatchEvent(new CustomEvent(EVENT_HISTORY_UPDATED, { detail: [] }));
  } catch (_) {}
}
