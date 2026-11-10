import type { MediaAsset, MediaType } from '../types';
import { uid } from './utils';

function detectType(file: File): MediaType | null {
  const t = file.type;
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('audio/')) return 'audio';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'].includes(ext)) return 'video';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  return null;
}

function loadImageMeta(url: string): Promise<{ width: number; height: number; thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(320 / img.width, 180 / img.height, 1);
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ width: img.width, height: img.height, thumbnail: canvas.toDataURL('image/jpeg', 0.7) });
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = url;
  });
}

function loadVideoMeta(url: string): Promise<{ width: number; height: number; duration: number; thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = url;
    const cleanup = () => { video.removeAttribute('src'); video.load(); };
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      const seekTo = Math.min(0.5, duration / 2);
      video.currentTime = isFinite(seekTo) ? seekTo : 0;
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(320 / width, 180 / height, 1);
          canvas.width = Math.max(1, Math.round(width * scale));
          canvas.height = Math.max(1, Math.round(height * scale));
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
          cleanup();
          resolve({ width, height, duration: isFinite(duration) ? duration : 0, thumbnail });
        } catch (e) {
          cleanup();
          resolve({ width, height, duration: isFinite(duration) ? duration : 0, thumbnail: '' });
        }
      };
    };
    video.onerror = () => { cleanup(); reject(new Error('Formato de vídeo não suportado pelo navegador')); };
    setTimeout(() => { if (video.readyState === 0) { cleanup(); reject(new Error('Tempo esgotado ao ler o vídeo')); } }, 15000);
  });
}

async function loadAudioMeta(url: string, blob: Blob): Promise<{ duration: number; waveform: number[] }> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const duration = audioBuffer.duration;
    const raw = audioBuffer.getChannelData(0);
    const samples = 400;
    const block = Math.floor(raw.length / samples) || 1;
    const waveform: number[] = [];
    let peak = 0.0001;
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < block; j++) {
        const v = Math.abs(raw[i * block + j] || 0);
        sum += v;
      }
      const avg = sum / block;
      waveform.push(avg);
      peak = Math.max(peak, avg);
    }
    const normalized = waveform.map((v) => Math.min(1, v / peak));
    return { duration, waveform: normalized };
  } finally {
    ctx.close();
  }
}

export interface ImportResult {
  asset: MediaAsset;
  blob: Blob;
  url: string;
}

export async function importFile(file: File): Promise<ImportResult> {
  const type = detectType(file);
  if (!type) throw new Error(`Tipo de arquivo não suportado: ${file.name}`);
  const blob = file.slice(0, file.size, file.type || 'application/octet-stream');
  const url = URL.createObjectURL(blob);
  const base: MediaAsset = {
    id: uid(),
    name: file.name,
    type,
    duration: 5,
    width: 0,
    height: 0,
    size: file.size,
    mime: file.type,
    thumbnail: '',
    createdAt: Date.now(),
  };
  try {
    if (type === 'image') {
      const meta = await loadImageMeta(url);
      Object.assign(base, meta, { duration: 5 });
    } else if (type === 'video') {
      const meta = await loadVideoMeta(url);
      Object.assign(base, meta);
    } else {
      const meta = await loadAudioMeta(url, blob);
      base.duration = meta.duration;
      base.waveform = meta.waveform;
      base.thumbnail = '';
    }
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  return { asset: base, blob, url };
}