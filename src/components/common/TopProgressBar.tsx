import React, { useEffect, useState, useRef } from "react";

interface TopProgressBarProps {
  isLoading: boolean;
}

/**
 * GitHub / YouTube-style top progress bar.
 * Moves once across from left to right smoothly, finishes at 100%, and fades out.
 * Does NOT loop repeatedly.
 */
export const TopProgressBar: React.FC<TopProgressBarProps> = ({ isLoading }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Clear all existing timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (isLoading) {
      setVisible(true);
      setOpacity(1);
      setProgress((prev) => (prev > 0 && prev < 90 ? prev : 18));

      // Realistic progressive creeping (like GitHub Turbo / NProgress)
      const t1 = setTimeout(() => setProgress(42), 220);
      const t2 = setTimeout(() => setProgress(68), 650);
      const t3 = setTimeout(() => setProgress(84), 1400);
      const t4 = setTimeout(() => setProgress(92), 2800);
      timersRef.current = [t1, t2, t3, t4];
    } else {
      // Completed: rapidly finish to 100%, fade out, then reset
      setProgress(100);
      const tFade = setTimeout(() => {
        setOpacity(0);
      }, 240);
      const tHide = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 550);
      timersRef.current = [tFade, tHide];
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "2.5px",
        zIndex: 99999,
        pointerEvents: "none",
        opacity,
        transition: "opacity 0.28s ease",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #b91c1c 0%, #e50914 70%, #ff4d5a 95%, #ffffff 100%)",
          boxShadow: "0 0 12px rgba(229, 9, 20, 0.9), 0 0 6px rgba(255, 255, 255, 0.7)",
          transition:
            progress === 100
              ? "width 0.2s ease-out"
              : "width 0.38s cubic-bezier(0.12, 0.6, 0.15, 1)",
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
};
