import React from 'react';
import { HomeIcon, FilmIcon, TvIcon, CategoryIcon, ServerIcon } from '../../icons';

export type BottomNavTab = 'home' | 'movies' | 'tv' | 'categories' | 'extensions';

interface BottomNavProps {
  activeTab: BottomNavTab | string;
  onTabChange: (tab: BottomNavTab) => void;
  onOpenSettings?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenSettings,
}) => {
  const tabs: Array<{
    id: BottomNavTab;
    label: string;
    icon: (isActive: boolean) => React.ReactNode;
  }> = [
    {
      id: 'home',
      label: 'Home',
      icon: (active) => <HomeIcon size={20} color={active ? '#e50914' : 'currentColor'} />,
    },
    {
      id: 'movies',
      label: 'Movies',
      icon: (active) => <FilmIcon size={20} color={active ? '#e50914' : 'currentColor'} />,
    },
    {
      id: 'tv',
      label: 'TV Shows',
      icon: (active) => <TvIcon size={20} color={active ? '#e50914' : 'currentColor'} />,
    },
    {
      id: 'categories',
      label: 'Category',
      icon: (active) => <CategoryIcon size={20} color={active ? '#e50914' : 'currentColor'} />,
    },
    {
      id: 'extensions',
      label: 'Extensions',
      icon: (active) => <ServerIcon size={20} color={active ? '#e50914' : 'currentColor'} />,
    },
  ];

  return (
    <nav
      className="glass-panel mobile-only"
      aria-label="Mobile Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-around',
        borderTop: '1px solid rgba(255, 255, 255, 0.09)',
        background: 'linear-gradient(180deg, rgba(14, 14, 18, 0.92) 0%, rgba(6, 6, 8, 0.98) 100%)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.6)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '6px 0',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
              color: isActive ? '#e50914' : 'rgba(255, 255, 255, 0.6)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Active top subtle glowing indicator bar */}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  width: '24px',
                  height: '2.5px',
                  borderRadius: '0 0 3px 3px',
                  background: 'linear-gradient(90deg, #e50914 0%, #ff4d4d 100%)',
                  boxShadow: '0 1px 8px rgba(229, 9, 20, 0.8)',
                }}
              />
            )}

            <div
              style={{
                transform: isActive ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {tab.icon(isActive)}
            </div>

            <span
              style={{
                fontSize: '10.5px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: isActive ? '0.1px' : '0px',
                lineHeight: 1.1,
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                transition: 'color 0.2s ease',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
