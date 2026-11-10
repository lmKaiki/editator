import React from 'react';

export type IconName =
  | 'home' | 'folder' | 'plus' | 'import' | 'settings' | 'video' | 'image' | 'audio'
  | 'text' | 'effects' | 'transition' | 'filter' | 'play' | 'pause' | 'skipBack' | 'skipForward'
  | 'split' | 'trash' | 'undo' | 'redo' | 'save' | 'export' | 'close' | 'chevronRight' | 'chevronDown'
  | 'sun' | 'moon' | 'zoomIn' | 'zoomOut' | 'volume' | 'volumeMute' | 'eye' | 'eyeOff' | 'lock' | 'unlock'
  | 'duplicate' | 'scissors' | 'magnet' | 'search' | 'more' | 'edit' | 'check' | 'warning' | 'info'
  | 'crop' | 'rotate' | 'flipH' | 'flipV' | 'speed' | 'freeze' | 'keyframe' | 'color' | 'sparkles'
  | 'grid' | 'layers' | 'music' | 'mic' | 'download' | 'arrowLeft' | 'fullscreen' | 'stop' | 'wave'
  | 'sliders' | 'type' | 'alignLeft' | 'alignCenter' | 'alignRight' | 'bold' | 'italic' | 'clock' | 'film';

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  import: <><path d="M12 3v12" /><path d="m8 11 4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 7 2.6h.1A1.6 1.6 0 0 0 9 1.1V1a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 15 2.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.1a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.4 1z" /></>,
  video: <><rect x="2" y="5" width="14" height="14" rx="2" /><path d="m16 10 6-3v10l-6-3" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
  audio: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  text: <><path d="M4 7V5h16v2" /><path d="M12 5v14" /><path d="M9 19h6" /></>,
  effects: <><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15v4" /><path d="M17 17h4" /></>,
  transition: <><rect x="3" y="5" width="7" height="14" rx="1" /><rect x="14" y="5" width="7" height="14" rx="1" /><path d="M10 12h4" /></>,
  filter: <><circle cx="9" cy="9" r="6" /><circle cx="15" cy="15" r="6" /></>,
  play: <path d="M6 4.5v15l13-7.5z" />,
  pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
  skipBack: <><path d="M19 5v14l-9-7z" /><path d="M6 5v14" /></>,
  skipForward: <><path d="M5 5v14l9-7z" /><path d="M18 5v14" /></>,
  stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
  split: <><path d="M12 3v18" /><path d="m8 7-4 5 4 5" /><path d="m16 7 4 5-4 5" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" /><path d="M10 11v6M14 11v6" /></>,
  undo: <><path d="M9 7 4 12l5 5" /><path d="M4 12h11a5 5 0 0 1 0 10h-1" /></>,
  redo: <><path d="m15 7 5 5-5 5" /><path d="M20 12H9a5 5 0 0 0 0 10h1" /></>,
  save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></>,
  export: <><path d="M12 15V3" /><path d="m8 7 4-4 4 4" /><path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" /></>,
  download: <><path d="M12 3v12" /><path d="m8 11 4 4 4-4" /><path d="M4 21h16" /></>,
  close: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  arrowLeft: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  zoomIn: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6M8 11h6" /></>,
  zoomOut: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /><path d="M8 11h6" /></>,
  volume: <><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /></>,
  volumeMute: <><path d="M11 5 6 9H2v6h4l5 4z" /><path d="m22 9-6 6M16 9l6 6" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 7 10 7a13 13 0 0 1-2.2 3M6.6 6.6A13 13 0 0 0 2 11s3.5 7 10 7a10 10 0 0 0 4.4-1" /><path d="m2 2 20 20" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  unlock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></>,
  duplicate: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  scissors: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" /></>,
  magnet: <><path d="M6 3v8a6 6 0 0 0 12 0V3" /><path d="M6 7h4M14 7h4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  more: <><circle cx="12" cy="5" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="19" r="1.4" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  check: <path d="m5 12 5 5L20 7" />,
  warning: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>,
  crop: <><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></>,
  rotate: <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v5h-5" /></>,
  flipH: <><path d="M12 3v18" /><path d="M8 8 4 12l4 4z" /><path d="m16 8 4 4-4 4z" /></>,
  flipV: <><path d="M3 12h18" /><path d="M8 8 12 4l4 4z" /><path d="m8 16 4 4 4-4z" /></>,
  speed: <><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /><path d="m13.4 10.6 4-4" /><path d="M4 18a9 9 0 1 1 16 0" /></>,
  freeze: <><path d="M12 2v20M4 6l16 12M20 6 4 18" /><path d="M12 2l-2 3h4zM12 22l-2-3h4z" /></>,
  keyframe: <path d="m12 3 7 9-7 9-7-9z" />,
  color: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18" /><circle cx="12" cy="12" r="2.5" /></>,
  sparkles: <><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  layers: <><path d="m12 2 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
  music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5" /></>,
  fullscreen: <><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></>,
  wave: <><path d="M2 12h2l2-6 3 14 3-18 3 14 2-4h5" /></>,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M1 14h6M9 8h6M17 16h6" /></>,
  type: <><path d="M4 7V5h16v2M12 5v14M9 19h6" /></>,
  alignLeft: <><path d="M3 6h18M3 12h12M3 18h15" /></>,
  alignCenter: <><path d="M3 6h18M6 12h12M5 18h14" /></>,
  alignRight: <><path d="M3 6h18M9 12h12M6 18h15" /></>,
  bold: <><path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" /></>,
  italic: <><path d="M19 4h-9M14 20H5M15 4 9 20" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  film: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" /></>,
};

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 18, filled, ...rest }: IconProps) {
  const solid = filled || name === 'play' || name === 'pause' || name === 'stop' || name === 'keyframe' || name === 'sparkles';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={solid ? 'currentColor' : 'none'}
      stroke={solid ? 'none' : 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}