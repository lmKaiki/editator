import type { Clip, ColorAdjust, Project, Track } from '../types';
import { FILTERS } from '../lib/utils';

interface ClipMedia {
  el: HTMLVideoElement | HTMLAudioElement;
  source?: MediaElementAudioSourceNode;
  clipGain?: GainNode;
  trackGain?: GainNode;
  highpass?: BiquadFilterNode;
  lowpass?: BiquadFilterNode;
  ready: boolean;
}

function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3); }
function easeIn(t: number): number { return t * t * t; }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function evalKeyframes(clip: Clip, rel: number) {
  const out = { scale: clip.scale, x: clip.x, y: clip.y, opacity: clip.opacity, rotation: clip.rotation };
  if (!clip.keyframes.length) return out;
  const kfs = [...clip.keyframes].sort((a, b) => a.t - b.t);
  const get = (key: 'scale' | 'x' | 'y' | 'opacity' | 'rotation', base: number) => {
    const points = kfs.filter((k) => k[key] !== undefined);
    if (!points.length) return base;
    if (rel <= points[0].t) return points[0][key] as number;
    if (rel >= points[points.length - 1].t) return points[points.length - 1][key] as number;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      if (rel >= a.t && rel <= b.t) {
        const t = (rel - a.t) / (b.t - a.t || 1);
        return lerp(a[key] as number, b[key] as number, t);
      }
    }
    return base;
  };
  out.scale = get('scale', clip.scale);
  out.x = get('x', clip.x);
  out.y = get('y', clip.y);
  out.opacity = get('opacity', clip.opacity);
  out.rotation = get('rotation', clip.rotation);
  return out;
}

function buildFilter(color: ColorAdjust, filterId: string): string {
  const preset = FILTERS.find((f) => f.id === filterId);
  const c = { ...color };
  if (preset) {
    for (const k of Object.keys(preset.adjust) as (keyof ColorAdjust)[]) {
      const v = preset.adjust[k];
      if (v !== undefined) (c as any)[k] = k === 'temperature' || k === 'tint' || k === 'hue' ? (c[k] + v) : c[k] * v;
    }
  }
  const parts = [
    `brightness(${c.brightness})`,
    `contrast(${c.contrast})`,
    `saturate(${c.saturation})`,
    `hue-rotate(${c.hue}deg)`,
  ];
  if (c.blur > 0) parts.push(`blur(${c.blur}px)`);
  if (preset?.css) parts.push(preset.css);
  return parts.join(' ');
}

export class RenderEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private media = new Map<string, ClipMedia>();
  private urls: Record<string, string> = {};
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private recordDest: MediaStreamAudioDestinationNode | null = null;
  private graphBuilt = false;
  private lastTime = -1;
  private playing = false;
  private needsRender = true;

  invalidate() { this.needsRender = true; }
  consumeRender(): boolean { const n = this.needsRender; this.needsRender = false; return n; }

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
  }

  setUrls(urls: Record<string, string>) { this.urls = urls; }

  private ensureAudio() {
    if (this.audioCtx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AC();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.connect(this.audioCtx.destination);
    this.recordDest = this.audioCtx.createMediaStreamDestination();
  }

  async resumeAudio() {
    this.ensureAudio();
    if (this.audioCtx?.state === 'suspended') {
      await Promise.race([
        this.audioCtx.resume().catch(() => {}),
        new Promise((r) => setTimeout(r, 300)),
      ]);
    }
  }

  setMonitorMuted(muted: boolean) {
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 1;
  }

  private getMedia(clip: Clip, project: Project): ClipMedia | null {
    if (clip.kind === 'text' || !clip.mediaId) return null;
    const url = this.urls[clip.mediaId];
    if (!url) return null;
    let m = this.media.get(clip.id);
    if (!m) {
      const el = clip.kind === 'audio' ? document.createElement('audio') : document.createElement('video');
      el.src = url;
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      (el as HTMLVideoElement).playsInline = true;
      el.muted = false;
      el.volume = 1;
      m = { el, ready: false };
      el.addEventListener('loadeddata', () => { if (m) m.ready = true; this.invalidate(); });
      el.addEventListener('seeked', () => this.invalidate());
      this.media.set(clip.id, m);
    }
    return m;
  }

  private buildGraphFor(clip: Clip, m: ClipMedia, track: Track | undefined) {
    if (!this.audioCtx || m.source) return;
    try {
      m.source = this.audioCtx.createMediaElementSource(m.el);
      m.clipGain = this.audioCtx.createGain();
      m.trackGain = this.audioCtx.createGain();
      m.highpass = this.audioCtx.createBiquadFilter();
      m.highpass.type = 'highpass';
      m.highpass.frequency.value = clip.denoise ? 90 : 20;
      m.lowpass = this.audioCtx.createBiquadFilter();
      m.lowpass.type = 'lowpass';
      m.lowpass.frequency.value = clip.denoise ? 11000 : 20000;
      m.source.connect(m.highpass);
      m.highpass.connect(m.lowpass);
      m.lowpass.connect(m.clipGain);
      m.clipGain.connect(m.trackGain);
      m.trackGain.connect(this.masterGain!);
      m.trackGain.connect(this.recordDest!);
      m.el.volume = 1;
    } catch {
      // elemento já roteado ou sem áudio
    }
  }

  ensureGraph(project: Project) {
    this.ensureAudio();
    for (const clip of project.clips) {
      if (clip.kind === 'text') continue;
      const m = this.getMedia(clip, project);
      if (m) this.buildGraphFor(clip, m, project.tracks.find((t) => t.id === clip.trackId));
    }
    this.graphBuilt = true;
  }

  getAudioStream(): MediaStream | null {
    return this.recordDest?.stream ?? null;
  }

  private syncPlayback(project: Project, time: number, playing: boolean) {
    const activeIds = new Set<string>();
    for (const clip of project.clips) {
      if (clip.kind === 'text' || !clip.mediaId) continue;
      const m = this.getMedia(clip, project);
      if (!m) continue;
      const track = project.tracks.find((t) => t.id === clip.trackId);
      const active = time >= clip.start && time < clip.start + clip.duration;
      if (active) activeIds.add(clip.id);
      const el = m.el;
      const rel = time - clip.start;
      let mediaTime = clip.freeze ? clip.inPoint : clip.inPoint + rel * clip.speed;
      const dur = (el as HTMLVideoElement).duration;
      if (isFinite(dur) && dur > 0) mediaTime = Math.min(mediaTime, dur - 0.03);
      mediaTime = Math.max(0, mediaTime);

      if (Number.isFinite(mediaTime) && Math.abs(el.currentTime - mediaTime) > (playing ? 0.28 : 0.001)) {
        try { el.currentTime = mediaTime; } catch { /* ainda carregando */ }
      }
      el.playbackRate = Math.max(0.0625, Math.min(16, clip.speed));

      // ganho de áudio
      const audible = active && playing && !clip.muted && !track?.muted;
      let vol = clip.volume * (track?.volume ?? 1);
      if (clip.fadeIn > 0 && rel < clip.fadeIn) vol *= Math.max(0, rel / clip.fadeIn);
      if (clip.fadeOut > 0 && rel > clip.duration - clip.fadeOut) vol *= Math.max(0, (clip.duration - rel) / clip.fadeOut);
      vol = audible ? Math.max(0, Math.min(2, vol)) : 0;

      if (this.graphBuilt && m.clipGain && m.trackGain) {
        m.clipGain.gain.value = vol;
        m.trackGain.gain.value = 1;
        if (m.highpass) m.highpass.frequency.value = clip.denoise ? 90 : 20;
        if (m.lowpass) m.lowpass.frequency.value = clip.denoise ? 11000 : 20000;
      } else {
        el.volume = Math.max(0, Math.min(1, vol));
      }

      if (playing && active && !clip.freeze) {
        if (el.paused) el.play().catch(() => {});
      } else {
        if (!el.paused) el.pause();
      }
    }
    // pausa elementos inativos
    for (const [id, m] of this.media) {
      if (!activeIds.has(id) && !m.el.paused) m.el.pause();
    }
  }

  cleanup(project: Project | null) {
    const validIds = new Set(project?.clips.map((c) => c.id) ?? []);
    for (const [id, m] of this.media) {
      if (!validIds.has(id)) {
        m.el.pause();
        m.el.removeAttribute('src');
        m.el.load();
        try { m.source?.disconnect(); m.clipGain?.disconnect(); m.trackGain?.disconnect(); } catch { /* noop */ }
        this.media.delete(id);
      }
    }
  }

  render(project: Project, time: number, playing: boolean) {
    if (!this.canvas || !this.ctx) return;
    const { width, height } = project;
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    const ctx = this.ctx;
    this.playing = playing;
    this.syncPlayback(project, time, playing);

    ctx.save();
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.fillStyle = project.background || '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // faixas de vídeo de baixo para topo (a ordem no array: topo primeiro)
    const videoTracks = [...project.tracks.filter((t) => t.kind === 'video')].reverse();
    for (const track of videoTracks) {
      if (track.hidden) continue;
      const clips = project.clips
        .filter((c) => c.trackId === track.id && time >= c.start && time < c.start + c.duration)
        .sort((a, b) => a.start - b.start);
      for (const clip of clips) this.drawClip(ctx, clip, project, time, track);
    }
    this.lastTime = time;
  }

  private drawClip(ctx: CanvasRenderingContext2D, clip: Clip, project: Project, time: number, track: Track) {
    const { width: W, height: H } = project;
    const rel = time - clip.start;
    const kf = evalKeyframes(clip, rel);
    let alpha = kf.opacity;

    // transições de entrada/saída
    const td = clip.transitionDuration;
    let transProgressIn = td > 0 ? Math.min(1, rel / td) : 1;
    let transProgressOut = td > 0 ? Math.min(1, (clip.duration - rel) / td) : 1;
    const applyTransition = (type: string, p: number, entering: boolean) => {
      if (type === 'fade' || type === 'dissolve') alpha *= p;
    };
    if (clip.transitionIn !== 'none' && rel < td) applyTransition(clip.transitionIn, transProgressIn, true);
    if (clip.transitionOut !== 'none' && rel > clip.duration - td) applyTransition(clip.transitionOut, transProgressOut, false);

    if (clip.kind === 'text') {
      this.drawText(ctx, clip, project, rel, alpha);
      return;
    }

    const m = this.getMedia(clip, project);
    const source: CanvasImageSource | null =
      clip.kind === 'image' && clip.mediaId ? this.getImage(clip.mediaId) :
      m && (m.el as HTMLVideoElement).readyState >= 2 ? (m.el as HTMLVideoElement) : null;

    if (clip.color_fill) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = clip.color_fill; ctx.fillRect(0, 0, W, H); ctx.restore();
      return;
    }
    if (!source) return;

    const sw = (source as any).videoWidth || (source as any).naturalWidth || (source as any).width || W;
    const sh = (source as any).videoHeight || (source as any).naturalHeight || (source as any).height || H;
    if (!sw || !sh) return;

    // crop
    const cx = clip.cropLeft * sw;
    const cy = clip.cropTop * sh;
    const cw = sw * (1 - clip.cropLeft - clip.cropRight);
    const ch = sh * (1 - clip.cropTop - clip.cropBottom);
    if (cw <= 0 || ch <= 0) return;

    const fit = Math.min(W / cw, H / ch);
    let dw = cw * fit * kf.scale;
    let dh = ch * fit * kf.scale;

    // transições geométricas
    let dx = (W - dw) / 2 + kf.x * W;
    let dy = (H - dh) / 2 + kf.y * H;
    const geoTrans = (type: string, p: number) => {
      if (type === 'slide') dx += (1 - p) * W;
      if (type === 'zoom') { const s = 0.6 + 0.4 * p; dw *= s; dh *= s; dx = (W - dw) / 2 + kf.x * W; dy = (H - dh) / 2 + kf.y * H; alpha *= p; }
      if (type === 'wipe') { ctx.beginPath(); ctx.rect(0, 0, W * p, H); ctx.clip(); }
      if (type === 'glitch' && p < 1) { dx += (Math.random() - 0.5) * 30 * (1 - p); }
    };

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    if (clip.transitionIn !== 'none' && rel < td) geoTrans(clip.transitionIn, easeOut(transProgressIn));
    if (clip.transitionOut !== 'none' && rel > clip.duration - td) geoTrans(clip.transitionOut, easeIn(transProgressOut));

    ctx.translate(dx + dw / 2, dy + dh / 2);
    ctx.rotate((kf.rotation * Math.PI) / 180);
    ctx.scale(clip.flipH ? -1 : 1, clip.flipV ? -1 : 1);
    ctx.filter = buildFilter(clip.color, clip.filter);
    ctx.drawImage(source, cx, cy, cw, ch, -dw / 2, -dh / 2, dw, dh);
    ctx.filter = 'none';

    // temperatura / tint como sobreposição
    const temp = clip.color.temperature;
    const tint = clip.color.tint;
    if (temp !== 0 || tint !== 0) {
      ctx.globalCompositeOperation = 'overlay';
      const r = temp > 0 ? 255 : tint < 0 ? 255 : 0;
      const g = tint > 0 ? 255 : tint < 0 ? 0 : Math.abs(temp) > 0 ? 140 : 0;
      const b = temp < 0 ? 255 : 0;
      ctx.globalAlpha = Math.min(0.45, (Math.abs(temp) + Math.abs(tint)) / 250);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
      ctx.globalCompositeOperation = 'source-over';
    }

    // vinheta
    if (clip.color.vignette > 0) {
      const grad = ctx.createRadialGradient(0, 0, Math.min(dw, dh) * 0.3, 0, 0, Math.max(dw, dh) * 0.72);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${clip.color.vignette})`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
    }
    ctx.restore();
  }

  private images = new Map<string, HTMLImageElement>();
  private getImage(mediaId: string): HTMLImageElement | null {
    let img = this.images.get(mediaId);
    if (!img) {
      const url = this.urls[mediaId];
      if (!url) return null;
      img = new Image();
      img.src = url;
      img.onload = () => this.invalidate();
      this.images.set(mediaId, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  private drawText(ctx: CanvasRenderingContext2D, clip: Clip, project: Project, rel: number, baseAlpha: number) {
    const t = clip.text;
    if (!t) return;
    const { width: W, height: H } = project;
    const kf = evalKeyframes(clip, rel);
    const fontPx = (t.fontSize / 100) * H;
    let alpha = baseAlpha;
    let offX = 0, offY = 0, scale = 1;
    let content = t.content;

    const animInDur = Math.min(0.8, clip.duration / 3);
    const animOutStart = clip.duration - animInDur;
    const animate = (type: string, p: number, entering: boolean) => {
      const e = entering ? easeOut(p) : easeIn(p);
      const inv = entering ? 1 - e : e;
      if (type === 'fade') alpha *= entering ? e : 1 - easeIn(1 - p);
      if (type === 'slide-up') offY += inv * H * 0.15 * (entering ? 1 : -1);
      if (type === 'slide-left') offX += inv * W * 0.2 * (entering ? 1 : -1);
      if (type === 'pop') scale *= entering ? 0.5 + 0.5 * e : 1 - 0.5 * (1 - p);
      if (type === 'zoom') scale *= entering ? 1.4 - 0.4 * e : 1 + 0.4 * (1 - p);
      if (type === 'typewriter' && entering) content = t.content.slice(0, Math.floor(t.content.length * p));
    };
    if (t.animationIn !== 'none' && rel < animInDur) animate(t.animationIn, rel / animInDur, true);
    if (t.animationOut !== 'none' && rel > animOutStart) animate(t.animationOut, (rel - animOutStart) / animInDur, false);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    const px = W / 2 + kf.x * W + offX;
    const py = H / 2 + kf.y * H + offY;
    ctx.translate(px, py);
    ctx.scale(kf.scale * scale, kf.scale * scale);
    ctx.rotate((kf.rotation * Math.PI) / 180);
    ctx.font = `${t.italic ? 'italic ' : ''}${t.bold ? '700' : '400'} ${fontPx}px "${t.fontFamily}", sans-serif`;
    ctx.textAlign = t.align;
    ctx.textBaseline = 'middle';
    (ctx as any).letterSpacing = `${t.letterSpacing}px`;

    const lines = content.split('\n');
    const lineH = fontPx * 1.25;
    const totalH = lines.length * lineH;
    const startY = -totalH / 2 + lineH / 2;

    if (t.bg) {
      let maxW = 0;
      for (const line of lines) maxW = Math.max(maxW, ctx.measureText(line).width);
      const padX = fontPx * 0.4, padY = fontPx * 0.25;
      let bx = -maxW / 2 - padX;
      if (t.align === 'left') bx = -padX;
      if (t.align === 'right') bx = -maxW - padX;
      ctx.fillStyle = t.bg;
      ctx.fillRect(bx, -totalH / 2 - padY, maxW + padX * 2, totalH + padY * 2);
    }
    if (t.shadowBlur > 0) {
      ctx.shadowColor = t.shadowColor;
      ctx.shadowBlur = t.shadowBlur;
      ctx.shadowOffsetX = t.shadowBlur * 0.2;
      ctx.shadowOffsetY = t.shadowBlur * 0.2;
    }
    lines.forEach((line, i) => {
      const y = startY + i * lineH;
      if (t.outlineWidth > 0) {
        ctx.lineWidth = t.outlineWidth;
        ctx.strokeStyle = t.outlineColor;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, 0, y);
      }
      ctx.fillStyle = t.color;
      ctx.fillText(line, 0, y);
    });
    ctx.restore();
  }

  dispose() {
    for (const [, m] of this.media) {
      m.el.pause();
      m.el.removeAttribute('src');
      m.el.load();
    }
    this.media.clear();
    this.images.clear();
    if (this.audioCtx) this.audioCtx.close();
    this.audioCtx = null;
    this.graphBuilt = false;
  }
}

export const engine = new RenderEngine();