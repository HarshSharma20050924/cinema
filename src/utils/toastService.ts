/**
 * Global Glass Toast Service
 * Dispatches custom events for floating frosted glass notifications.
 * Supports standard toasts (success, error, info) and Telegram-style Undo toasts.
 */

export interface ToastItem {
  id: string;
  message: string;
  type?: "success" | "error" | "info" | "undo";
  durationMs?: number;
  onUndo?: () => void;
  undoSecondsLeft?: number;
}

const TOAST_EVENT = "cinema:show_toast";
const TOAST_DISMISS_EVENT = "cinema:dismiss_toast";

export function showToast(message: string, type: "success" | "error" | "info" = "success", durationMs = 3500): void {
  if (typeof window === "undefined") return;
  const item: ToastItem = {
    id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    message,
    type,
    durationMs,
  };
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: item }));
}

export function showUndoToast(message: string, onUndo: () => void, durationSec = 5): void {
  if (typeof window === "undefined") return;
  const item: ToastItem = {
    id: `undo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    message,
    type: "undo",
    durationMs: durationSec * 1000,
    onUndo,
    undoSecondsLeft: durationSec,
  };
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: item }));
}

export function subscribeToast(callback: (item: ToastItem) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<ToastItem>).detail;
    if (detail) callback(detail);
  };
  window.addEventListener(TOAST_EVENT, handler);
  return () => window.removeEventListener(TOAST_EVENT, handler);
}

export const toast = {
  success: (message: string, durationMs = 3500) => showToast(message, "success", durationMs),
  error: (message: string, durationMs = 4000) => showToast(message, "error", durationMs),
  info: (message: string, durationMs = 3500) => showToast(message, "info", durationMs),
  warning: (message: string, durationMs = 3800) => showToast(message, "error", durationMs),
  undo: (message: string, onUndo: () => void, durationSec = 5) => showUndoToast(message, onUndo, durationSec),
};
