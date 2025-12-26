import React from 'react';

interface DualSenseIconProps {
  className?: string;
  size?: number;
}

export function DualSenseIcon({ className = '', size = 24 }: DualSenseIconProps) {
  return (
    <svg 
      viewBox="0 0 64 64" 
      width={size} 
      height={size} 
      className={className}
      fill="currentColor"
    >
      {/* DualSense Controller Shape */}
      <path d="M32 8C24 8 18 12 14 18C10 24 8 32 8 38C8 44 10 48 14 50C18 52 22 52 26 50L28 48C30 46 31 46 32 46C33 46 34 46 36 48L38 50C42 52 46 52 50 50C54 48 56 44 56 38C56 32 54 24 50 18C46 12 40 8 32 8Z" />
      
      {/* Left Joystick */}
      <circle cx="22" cy="32" r="6" fill="currentColor" opacity="0.3" />
      <circle cx="22" cy="32" r="4" fill="currentColor" opacity="0.5" />
      
      {/* Right Joystick */}
      <circle cx="42" cy="38" r="6" fill="currentColor" opacity="0.3" />
      <circle cx="42" cy="38" r="4" fill="currentColor" opacity="0.5" />
      
      {/* D-Pad */}
      <rect x="18" y="22" width="4" height="8" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="16" y="24" width="8" height="4" rx="1" fill="currentColor" opacity="0.4" />
      
      {/* Face Buttons */}
      <circle cx="46" cy="26" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="42" cy="30" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="50" cy="30" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="46" cy="34" r="2" fill="currentColor" opacity="0.4" />
      
      {/* Touchpad */}
      <rect x="26" y="20" width="12" height="8" rx="2" fill="currentColor" opacity="0.25" />
      
      {/* Light bar glow effect */}
      <rect x="24" y="14" width="16" height="2" rx="1" fill="currentColor" opacity="0.8" />
    </svg>
  );
}
