import React, { useState, useEffect } from "react";
import type { MediaPost } from "../../types";
import {
  getCustomLists,
  addItemToCustomList,
  removeItemFromCustomList,
  createCustomList,
  type CustomList,
} from "../../utils/userListsService";

interface AddToListModalProps {
  post: MediaPost;
  isOpen: boolean;
  onClose: () => void;
}

export const AddToListModal: React.FC<AddToListModalProps> = ({ post, isOpen, onClose }) => {
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCustomLists(getCustomLists());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleFromList = (listId: string) => {
    const list = customLists.find((l) => l.id === listId);
    if (!list) return;
    const itemKey = String(post.id || post.tmdbId);
    const inList = list.items.some((it) => String(it.id || it.tmdbId) === itemKey);
    if (inList) {
      removeItemFromCustomList(listId, itemKey);
    } else {
      addItemToCustomList(listId, post);
    }
    setCustomLists(getCustomLists());
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const created = createCustomList(newListName.trim());
    addItemToCustomList(created.id, post);
    setNewListName("");
    setShowNewListModal(false);
    setCustomLists(getCustomLists());
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          border: "1px solid rgba(255, 255, 255, 0.22)",
          borderRadius: "22px",
          padding: "24px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.4)",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          userSelect: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>
              Add to List
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)" }}>
              {post.title}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.10)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Existing Lists */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
          {customLists.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(255, 255, 255, 0.5)", fontSize: "14px" }}>
              No custom lists yet. Create your first one below!
            </div>
          ) : (
            customLists.map((list) => {
              const inList = list.items.some(
                (it) => String(it.id || it.tmdbId) === String(post.id || post.tmdbId)
              );
              return (
                <div
                  key={list.id}
                  onClick={() => handleToggleFromList(list.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: inList ? "rgba(229, 9, 20, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    border: inList ? "1px solid rgba(229, 9, 20, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>{list.name}</div>
                      <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
                        {list.items.length} {list.items.length === 1 ? "title" : "titles"}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "6px",
                      border: inList ? "none" : "2px solid rgba(255, 255, 255, 0.3)",
                      background: inList ? "#e50914" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    {inList && "✓"}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create New List */}
        {!showNewListModal ? (
          <button
            onClick={() => setShowNewListModal(true)}
            style={{
              padding: "12px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px dashed rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>+</span> Create New List
          </button>
        ) : (
          <form onSubmit={handleCreateList} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name (e.g. Sci-Fi Favorites)"
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.10)",
                border: "1px solid rgba(255, 255, 255, 0.20)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!newListName.trim()}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                background: newListName.trim() ? "#e50914" : "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                cursor: newListName.trim() ? "pointer" : "not-allowed",
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewListModal(false);
                setNewListName("");
              }}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                background: "transparent",
                color: "rgba(255, 255, 255, 0.6)",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
