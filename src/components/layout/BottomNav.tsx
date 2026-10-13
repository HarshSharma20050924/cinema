import React from 'react';
import { FilmIcon, SearchIcon, ServerIcon, SettingsIcon } from '../../icons';

interface BottomNavProps {
  activeTab: 'home' | 'search' | 'extensions' | 'settings';
  onTabChange: (tab: 'home' | 'search' | 'extensions' | 'settings') => void;
  onOpenSettings: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenSettings,
}) => {
  return (
    <nav
      className="glass-panel mobile-only"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(0, 0, 0, 0.98)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <button
        onClick={() => onTabChange('home')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          color: activeTab === 'home' ? '#e50914' : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <FilmIcon size={20} />
        <span>Home</span>
      </button>

      <button
        onClick={() => onTabChange('search')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          color: activeTab === 'search' ? '#e50914' : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <SearchIcon size={20} />
        <span>Search</span>
      </button>

      <button
        onClick={() => onTabChange('extensions')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          color: activeTab === 'extensions' ? '#e50914' : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <ServerIcon size={20} />
        <span>Sources</span>
      </button>

      <button
        onClick={onOpenSettings}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          color: activeTab === 'settings' ? '#e50914' : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <SettingsIcon size={20} />
        <span>Settings</span>
      </button>
    </nav>
  );
};
