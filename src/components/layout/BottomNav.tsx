import React from 'react';
import { HomeIcon, FilmIcon, TvIcon, SearchIcon, BookmarkIcon } from '../../icons';

export type BottomNavTab = 'home' | 'movies' | 'tv' | 'search' | 'mylist';

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
      label: 'TV',
      icon: (active) => <TvIcon size={20} color={active ? '#e50914' : 'currentColor'} />,
    },
    {
      id: 'search',
      label: 'Search',
      icon: (active) => <SearchIcon size={20} color={active ? '#e50914' : 'currentColor'} />,
    },
    {
      id: 'mylist',
      label: 'My List',
      icon: (active) => (
        <BookmarkIcon
          size={20}
          color={active ? '#e50914' : 'currentColor'}
          fill={active ? '#e50914' : 'none'}
        />
      ),
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
        width: '100%',
        maxWidth: '100vw',
        overflow: 'hidden',
        boxSizing: 'border-box',
        height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-around',
        borderTop: '1px solid rgba(255, 255, 255, 0.14)',
        background: 'rgba(10, 12, 16, 0.88)',
        backdropFilter: 'blur(30px) saturate(200%)',
        WebkitBackdropFilter: 'blur(30px) saturate(200%)',
        boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              padding: '4px 0',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
              color: isActive ? '#e50914' : 'rgba(255, 255, 255, 0.6)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              overflow: 'hidden',
            }}
          >
            {/* Active top subtle glowing indicator bar */}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  width: '20px',
                  height: '2px',
                  borderRadius: '0 0 2px 2px',
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
                fontSize: '10px',
                fontWeight: isActive ? 700 : 500,
                lineHeight: 1.1,
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                transition: 'color 0.2s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                padding: '0 2px',
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
