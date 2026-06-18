'use client';

import React from 'react';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  className?: string;
  title?: string;
}

const SIZE_MAP = {
  sm: { width: 28, height: 28, fontSize: '10px' },
  md: { width: 36, height: 36, fontSize: '13px' },
  lg: { width: 48, height: 48, fontSize: '16px' },
};

const AVATAR_COLORS = [
  '#0B1F3A', '#C9952A', '#3B82F6', '#16A34A', '#DC2626',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  const idx = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

export default function Avatar({ name, avatarUrl, size = 'md', style, className, title }: AvatarProps) {
  const { width, height, fontSize } = SIZE_MAP[size];

  const base: React.CSSProperties = {
    width,
    height,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize,
    color: '#fff',
    background: getAvatarColor(name),
    ...style,
  };

  if (avatarUrl) {
    return (
      <div style={base} className={className} title={title || name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  return (
    <div style={base} className={className} title={title || name}>
      {getInitials(name)}
    </div>
  );
}
