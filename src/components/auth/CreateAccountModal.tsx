import React, { useState } from "react";
import { registerAccount, getActiveProfile, getLastAuthError, type UserProfile } from "../../utils/profileService";

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignIn: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  onOpenSignIn,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);

    const success = await registerAccount(email.trim(), password, name.trim());
    setLoading(false);

    if (success) {
      const active = getActiveProfile();
      onClose();
      onSuccess(active);
    } else {
      setError(getLastAuthError() || "Failed to create account. Please check your details.");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100010,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "cinemaFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes cinemaDotPulse {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1.15);
            opacity: 1;
          }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "linear-gradient(145deg, rgba(255, 255, 255, 0.12) 0%, rgba(20, 24, 34, 0.78) 100%)",
          backdropFilter: "blur(36px) saturate(200%)",
          WebkitBackdropFilter: "blur(36px) saturate(200%)",
          border: "1px solid rgba(255, 255, 255, 0.22)",
          borderRadius: "26px",
          padding: "32px 30px",
          boxShadow: "0 28px 70px rgba(0, 0, 0, 0.65), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.4)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          position: "relative",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            border: "none",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
        >
          ✕
        </button>

        {/* Brand & Heading */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", textAlign: "center" }}>
          <img
            src="/logo.png"
            alt="Cinema"
            style={{ width: "46px", height: "46px", borderRadius: "12px", objectFit: "cover" }}
          />
          <h2 style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.3px" }}>
            Create your Cinema Account
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.65)" }}>
            Sign up to like movies and personalize your experience
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#ff6b6b",
              fontSize: "12.5px",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "rgba(255, 255, 255, 0.7)", marginBottom: "5px" }}>
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Harsh"
              autoFocus
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "rgba(255, 255, 255, 0.7)", marginBottom: "5px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="harsh@example.com"
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "rgba(255, 255, 255, 0.7)", marginBottom: "5px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Choose a secure password"
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              height: "46px",
              borderRadius: "9999px",
              background: "#e50914",
              border: "1px solid #e50914",
              color: "#ffffff",
              fontSize: "14.5px",
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 6px 20px rgba(229, 9, 20, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.18s ease, filter 0.18s ease",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.filter = "brightness(1.08)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.filter = "brightness(1)";
            }}
          >
            {loading ? (
              /* Three dots pulsating loading animation */
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    animation: "cinemaDotPulse 1.2s infinite ease-in-out",
                    animationDelay: "0s",
                  }}
                />
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    animation: "cinemaDotPulse 1.2s infinite ease-in-out",
                    animationDelay: "0.2s",
                  }}
                />
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    animation: "cinemaDotPulse 1.2s infinite ease-in-out",
                    animationDelay: "0.4s",
                  }}
                />
              </div>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Link to sign in */}
        <div style={{ textAlign: "center", fontSize: "13px", color: "rgba(255, 255, 255, 0.65)" }}>
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSignIn();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
