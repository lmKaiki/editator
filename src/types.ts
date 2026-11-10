// Tipos centrais do NEXO EDITOR

export type MediaType = 'video' | 'image' | 'audio';

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  duration: number; // segundos (imagens: padrão editável)
  width: number;
  height: number;
  size: number; // bytes
  mime: string;
  thumbnail: string; // dataURL
  waveform?: number[]; // picos normalizados 0..1
  createdAt: number;
}

export type TrackKind = 'video' | 'audio';

export interface Keyframe {
  t: number; // tempo relativo ao início do clipe (s)
  scale?: number;
  x?: number;
  y?: number;
  opacity?: number;
  rotation?: number;
}

export type TextAnimation = 'none' | 'fade' | 'slide-up' | 'slide-left' | 'typewriter' | 'pop' | 'zoom';

export interface TextStyle {
  content: string;
  fontFamily: string;
  fontSize: number; // relativo à altura do projeto (%)
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  outlineColor: string;
  outlineWidth: number;
  shadowColor: string;
  shadowBlur: number;
  bg: string; // fundo do texto ('' = nenhum)
  animationIn: TextAnimation;
  animationOut: TextAnimation;
  letterSpacing: number;
}

export interface ColorAdjust {
  brightness: number; // 1 = normal
  contrast: number; // 1 = normal
  saturation: number; // 1 = normal
  temperature: number; // -100..100
  tint: number; // -100..100
  hue: number; // -180..180 graus
  vignette: number; // 0..1
  blur: number; // px
}

export type TransitionType = 'none' | 'fade' | 'dissolve' | 'wipe' | 'slide' | 'zoom' | 'glitch';

export interface Clip {
  id: string;
  mediaId: string | null; // null para texto/cor
  trackId: string;
  kind: MediaType | 'text';
  name: string;
  start: number; // posição na timeline (s)
  duration: number; // duração na timeline (s)
  inPoint: number; // ponto de entrada na mídia (s)
  speed: number; // multiplicador de velocidade
  freeze: boolean; // congelar no inPoint
  // Transformação
  x: number; // deslocamento normalizado -1..1 (relativo à largura)
  y: number;
  scale: number; // 1 = ajustar
  rotation: number; // graus
  flipH: boolean;
  flipV: boolean;
  opacity: number; // 0..1
  cropTop: number; // 0..1
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  color: ColorAdjust;
  filter: string; // id de filtro predefinido
  // Áudio
  volume: number; // 0..2
  muted: boolean;
  fadeIn: number; // s
  fadeOut: number; // s
  denoise: boolean;
  // Texto
  text?: TextStyle;
  // Transições (aplicadas nas bordas do clipe)
  transitionIn: TransitionType;
  transitionOut: TransitionType;
  transitionDuration: number; // s
  keyframes: Keyframe[];
  color_fill?: string; // para clipes de cor sólida
}

export interface Track {
  id: string;
  name: string;
  kind: TrackKind;
  muted: boolean;
  hidden: boolean;
  locked: boolean;
  volume: number; // ganho da faixa 0..2
  height: number; // px na timeline
}

export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  background: string;
  tracks: Track[];
  clips: Clip[];
  duration: number; // calculado
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}

export interface ProjectMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  updatedAt: number;
  createdAt: number;
  clipCount: number;
  duration: number;
  thumbnail?: string;
}

export type ThemeMode = 'dark' | 'light';

export interface Settings {
  theme: ThemeMode;
  autosave: boolean;
  autosaveInterval: number; // segundos
  snap: boolean;
  defaultResolution: string;
  defaultFps: number;
  showWaveforms: boolean;
}

export interface HistoryEntry {
  tracks: Track[];
  clips: Clip[];
  label: string;
}