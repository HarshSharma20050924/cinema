import React from "react";

interface ShadedHeadingProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  tag?: "h1" | "h2" | "h3" | "span" | "div";
}

export const ShadedHeading: React.FC<ShadedHeadingProps> = ({
  text,
  className = "",
  style = {},
  tag: Tag = "h2",
}) => {
  if (!text) return null;

  return (
    <Tag
      className={className}
      style={{
        margin: 0,
        fontWeight: 800,
        letterSpacing: "-0.01em",
        display: "inline-block",
        whiteSpace: "nowrap",
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, #e50914 45%, #99000a 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        filter: "drop-shadow(0 2px 10px rgba(229, 9, 20, 0.45))",
        ...style,
      }}
    >
      {text}
    </Tag>
  );
};
