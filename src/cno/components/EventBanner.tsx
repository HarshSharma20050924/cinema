import React from "react";
import { ArrowRight } from "lucide-react";

interface EventBannerProps {
  subtitle: string;
  title: string;
  description: string;
  buttonText: string;
  backgroundImage: string;
  onExplore: () => void;
}

export const EventBanner: React.FC<EventBannerProps> = ({
  subtitle,
  title,
  description,
  buttonText,
  backgroundImage,
  onExplore,
}) => {
  return (
    <div
      className="cno-event-banner"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="cno-event-overlay" />
      <div className="cno-event-content">
        <span className="cno-event-subtitle">{subtitle}</span>
        <h2 className="cno-event-title">{title}</h2>
        <p className="cno-event-desc">{description}</p>
        <button className="cno-event-btn" onClick={onExplore}>
          <span>{buttonText}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
