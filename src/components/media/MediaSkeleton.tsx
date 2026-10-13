import React from 'react';

export const MediaSkeleton: React.FC<{ count?: number }> = ({ count = 12 }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: '20px',
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Poster Skeleton */}
          <div style={{ position: 'relative', width: '100%', paddingTop: '148%' }}>
            <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
          </div>
          {/* Title Skeleton */}
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton" style={{ height: '14px', width: '85%' }} />
            <div className="skeleton" style={{ height: '12px', width: '50%' }} />
          </div>
        </div>
      ))}
    </div>
  );
};
