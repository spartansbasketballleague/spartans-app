import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'scores' | 'standings' | 'stats' | 'watch' | 'more' | 'star' | 'starFilled' | 'back' | 'arrow' | 'bell';

// Simple line icons drawn for this app (24px grid, square ends).
export function Icon({ name, size = 22, color = '#111' }: { name: IconName; size?: number; color?: string }) {
  const s = { stroke: color, strokeWidth: 2, fill: 'none' as const, strokeLinecap: 'square' as const, strokeLinejoin: 'miter' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'scores' && (
        <>
          <Rect x={3} y={5} width={18} height={16} {...s} />
          <Path d="M3 10h18M8 3v4M16 3v4" {...s} />
        </>
      )}
      {name === 'standings' && <Path d="M4 6h3M10 6h10M4 12h3M10 12h10M4 18h3M10 18h10" {...s} />}
      {name === 'stats' && <Path d="M5 20V12M12 20V5M19 20v-9M3 21h18" {...s} />}
      {name === 'watch' && (
        <>
          <Rect x={2.5} y={5} width={19} height={13} {...s} />
          <Path d="M10 9l5 2.5L10 14z" fill={color} stroke={color} strokeWidth={1} />
          <Path d="M8 21h8" {...s} />
        </>
      )}
      {name === 'more' && (
        <>
          <Circle cx={12} cy={8} r={4} {...s} />
          <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" {...s} />
        </>
      )}
      {(name === 'star' || name === 'starFilled') && (
        <Path
          d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.8l6-.7z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
          fill={name === 'starFilled' ? color : 'none'}
        />
      )}
      {name === 'back' && <Path d="M15 5l-7 7 7 7" {...s} />}
      {name === 'arrow' && <Path d="M7 17L17 7M9 7h8v8" {...s} />}
      {name === 'bell' && <Path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4" {...s} />}
    </Svg>
  );
}
