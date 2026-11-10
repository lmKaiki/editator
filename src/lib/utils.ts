import type { Clip, ColorAdjust, Project, TextStyle, Track } from '../types';

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

export function formatTime(s: number, showFrames = false, fps = 30): string {
  if (!isFinite(s) || s < 0) s = 0;
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const base = h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  if (showFrames) {
    const f = Math.floor((s - total) * fps);
    return `${base}:${pad(f)}`;
  }
  return base;
}

export function formatTimecode(s: number, fps = 30): string {
  return formatTime(s, true, fps);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export const RESOLUTIONS: Record<string, { width: number; height: number; label: string }> = {
  '720p': { width: 1280, height: 720, label: 'HD 720p' },
  '1080p': { width: 1920, height: 1080, label: 'Full HD 1080p' },
  '1440p': { width: 2560, height: 1440, label: '2K 1440p' },
  '4k': { width: 3840, height: 2160, label: '4K UHD' },
  'vertical-1080': { width: 1080, height: 1920, label: 'Vertical 1080×1920' },
  'square-1080': { width: 1080, height: 1080, label: 'Quadrado 1080×1080' },
};

export const FPS_OPTIONS = [24, 30, 60];

export const defaultColor = (): ColorAdjust => ({
  brightness: 1,
  contrast: 1,
  saturation: 1,
  temperature: 0,
  tint: 0,
  hue: 0,
  vignette: 0,
  blur: 0,
});

export const defaultTextStyle = (): TextStyle => ({
  content: 'Seu texto aqui',
  fontFamily: 'Inter',
  fontSize: 8,
  color: '#ffffff',
  bold: true,
  italic: false,
  align: 'center',
  outlineColor: '#000000',
  outlineWidth: 0,
  shadowColor: '#000000',
  shadowBlur: 0,
  bg: '',
  animationIn: 'fade',
  animationOut: 'fade',
  letterSpacing: 0,
});

export interface FilterDef {
  id: string;
  name: string;
  adjust: Partial<ColorAdjust>;
  css?: string;
}

export const FILTERS: FilterDef[] = [
  { id: 'none', name: 'Original', adjust: {} },
  { id: 'vivid', name: 'Vívido', adjust: { saturation: 1.4, contrast: 1.12, brightness: 1.05 } },
  { id: 'warm', name: 'Quente', adjust: { temperature: 45, saturation: 1.1 } },
  { id: 'cold', name: 'Frio', adjust: { temperature: -45, tint: 8 } },
  { id: 'bw', name: 'Preto & Branco', adjust: { saturation: 0, contrast: 1.15 } },
  { id: 'sepia', name: 'Sépia', adjust: { saturation: 0.4, temperature: 55, brightness: 1.05 }, css: 'sepia(0.6)' },
  { id: 'vintage', name: 'Vintage', adjust: { saturation: 0.75, contrast: 0.92, temperature: 30, vignette: 0.35 } },
  { id: 'noir', name: 'Noir', adjust: { saturation: 0, contrast: 1.4, brightness: 0.95, vignette: 0.5 } },
  { id: 'dreamy', name: 'Sonhador', adjust: { brightness: 1.1, saturation: 1.15, blur: 1.2 }, css: 'brightness(1.05)' },
  { id: 'cyberpunk', name: 'Cyberpunk', adjust: { saturation: 1.5, contrast: 1.2, tint: 30, hue: -10 } },
  { id: 'sunset', name: 'Pôr do Sol', adjust: { temperature: 60, saturation: 1.25, tint: 15, vignette: 0.25 } },
  { id: 'arctic', name: 'Ártico', adjust: { temperature: -60, brightness: 1.08, saturation: 0.9 } },
  { id: 'fade', name: 'Desbotado', adjust: { contrast: 0.82, saturation: 0.8, brightness: 1.08 } },
  { id: 'sharp', name: 'Nítido', adjust: { contrast: 1.25, saturation: 1.1 } },
];

export const TRANSITIONS = [
  { id: 'none', name: 'Nenhuma' },
  { id: 'fade', name: 'Fade' },
  { id: 'dissolve', name: 'Dissolver' },
  { id: 'wipe', name: 'Cortina' },
  { id: 'slide', name: 'Deslizar' },
  { id: 'zoom', name: 'Zoom' },
  { id: 'glitch', name: 'Glitch' },
] as const;

export const EFFECTS = [
  { id: 'vignette', name: 'Vinheta', icon: 'vignette', desc: 'Escurece as bordas', apply: { vignette: 0.5 } },
  { id: 'blur', name: 'Desfoque', icon: 'blur', desc: 'Desfoca a imagem', apply: { blur: 4 } },
  { id: 'glow', name: 'Brilho', icon: 'glow', desc: 'Aumenta o brilho', apply: { brightness: 1.25, saturation: 1.1 } },
  { id: 'mono', name: 'Monocromático', icon: 'mono', desc: 'Remove as cores', apply: { saturation: 0 } },
  { id: 'invert-color', name: 'Cores Frias', icon: 'cold', desc: 'Temperatura fria', apply: { temperature: -50 } },
  { id: 'heat', name: 'Calor', icon:warmIcon(), desc: 'Temperatura quente', apply: { temperature: 55 } },
  { id: 'dramatic', name: 'Dramático', icon: 'contrast', desc: 'Alto contraste', apply: { contrast: 1.4, vignette: 0.4 } },
  { id: 'soft', name: 'Suave', icon: 'soft', desc: 'Suaviza a imagem', apply: { contrast: 0.85, blur: 0.8, brightness: 1.05 } },
];

function warmIcon() { return 'heat'; }

export const FONT_FAMILIES = [
  'Inter', 'Arial', 'Georgia', 'Times New Roman', 'Courier New',
  'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS', 'Palatino Linotype',
];

export const TEXT_ANIMATIONS = [
  { id: 'none', name: 'Nenhuma' },
  { id: 'fade', name: 'Esmaecer' },
  { id: 'slide-up', name: 'Subir' },
  { id: 'slide-left', name: 'Deslizar' },
  { id: 'typewriter', name: 'Máquina de escrever' },
  { id: 'pop', name: 'Surgir' },
  { id: 'zoom', name: 'Zoom' },
] as const;

export function makeTrack(kind: 'video' | 'audio', index: number): Track {
  return {
    id: uid(),
    name: kind === 'video' ? `V${index}` : `A${index}`,
    kind,
    muted: false,
    hidden: false,
    locked: false,
    volume: 1,
    height: kind === 'video' ? 68 : 52,
  };
}

export function makeClip(partial: Partial<Clip> & { trackId: string; kind: Clip['kind']; start: number; duration: number }): Clip {
  return {
    id: uid(),
    mediaId: null,
    name: 'Clipe',
    inPoint: 0,
    speed: 1,
    freeze: false,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    opacity: 1,
    cropTop: 0,
    cropBottom: 0,
    cropLeft: 0,
    cropRight: 0,
    color: defaultColor(),
    filter: 'none',
    volume: 1,
    muted: false,
    fadeIn: 0,
    fadeOut: 0,
    denoise: false,
    transitionIn: 'none',
    transitionOut: 'none',
    transitionDuration: 0.6,
    keyframes: [],
    ...partial,
  };
}

export function computeDuration(clips: Clip[]): number {
  let max = 0;
  for (const c of clips) max = Math.max(max, c.start + c.duration);
  return Math.max(max, 1);
}

export function createProject(name: string, width: number, height: number, fps: number): Project {
  const now = Date.now();
  return {
    id: uid(),
    name,
    width,
    height,
    fps,
    background: '#000000',
    tracks: [
      makeTrack('video', 2),
      makeTrack('video', 1),
      makeTrack('audio', 1),
      makeTrack('audio', 2),
    ],
    clips: [],
    duration: 10,
    createdAt: now,
    updatedAt: now,
  };
}