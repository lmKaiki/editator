import type { Project } from '../types';
import { engine } from './render';

export interface ExportOptions {
  format: 'webm' | 'mp4';
  width: number;
  height: number;
  fps: number;
  quality: 'low' | 'medium' | 'high' | 'max';
  fileName: string;
}

export interface ExportHandle {
  cancel: () => void;
  done: Promise<{ blob: Blob; mime: string; ext: string }>;
}

const QUALITY_BITRATE: Record<ExportOptions['quality'], number> = {
  low: 2_500_000,
  medium: 6_000_000,
  high: 12_000_000,
  max: 24_000_000,
};

export function supportedFormats(): { format: 'webm' | 'mp4'; mime: string; label: string }[] {
  const out: { format: 'webm' | 'mp4'; mime: string; label: string }[] = [];
  const webmCandidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const mime of webmCandidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      out.push({ format: 'webm', mime, label: 'WebM (VP9/Opus)' });
      break;
    }
  }
  const mp4Candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ];
  for (const mime of mp4Candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      out.push({ format: 'mp4', mime, label: 'MP4 (H.264/AAC)' });
      break;
    }
  }
  return out;
}

function pickMime(format: 'webm' | 'mp4'): string {
  const found = supportedFormats().find((f) => f.format === format);
  return found?.mime ?? 'video/webm';
}

export function startExport(
  project: Project,
  options: ExportOptions,
  onProgress: (p: number) => void,
): ExportHandle {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const exportProject: Project = { ...project, width: options.width, height: options.height, fps: options.fps };

  let cancelled = false;
  let recorder: MediaRecorder | null = null;
  let raf = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const done = new Promise<{ blob: Blob; mime: string; ext: string }>((resolve, reject) => {
    (async () => {
      try {
        if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder não é suportado neste navegador');
        await engine.resumeAudio();
        engine.ensureGraph(exportProject);
        engine.attach(canvas);

        const fps = options.fps;
        const stream = (canvas as any).captureStream(fps) as MediaStream;
        const audioStream = engine.getAudioStream();
        if (audioStream) {
          for (const track of audioStream.getAudioTracks()) stream.addTrack(track);
        }
        const mime = pickMime(options.format);
        const videoBitrate = QUALITY_BITRATE[options.quality] * (options.width * options.height) / (1920 * 1080);
        recorder = new MediaRecorder(stream, {
          mimeType: mime,
          videoBitsPerSecond: Math.round(videoBitrate),
          audioBitsPerSecond: 192_000,
        });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          const ext = options.format === 'mp4' ? 'mp4' : 'webm';
          if (cancelled) { reject(new Error('cancelled')); return; }
          const blob = new Blob(chunks, { type: mime.split(';')[0] });
          resolve({ blob, mime: mime.split(';')[0], ext });
        };
        recorder.onerror = () => reject(new Error('Falha na gravação da exportação'));

        const duration = project.duration;
        recorder.start(200);
        const startTime = performance.now();
        let lastFrame = -1;
        let finished = false;

        const stopAll = () => {
          if (timer) { clearInterval(timer); timer = null; }
          cancelAnimationFrame(raf);
        };

        const tick = () => {
          if (cancelled || finished) return;
          const elapsed = (performance.now() - startTime) / 1000;
          const t = Math.min(elapsed, duration);
          const frame = Math.floor(t * fps);
          if (frame !== lastFrame) {
            engine.render(exportProject, t, true);
            lastFrame = frame;
            onProgress(Math.min(0.99, t / duration));
          }
          if (elapsed >= duration) {
            finished = true;
            engine.render(exportProject, duration, true);
            onProgress(1);
            stopAll();
            setTimeout(() => { if (recorder && recorder.state !== 'inactive') recorder.stop(); }, 150);
          }
        };

        const loop = () => {
          tick();
          if (!finished && !cancelled) raf = requestAnimationFrame(loop);
        };

        engine.render(exportProject, 0, true);
        // Timer garante progresso mesmo se o requestAnimationFrame estiver suspenso
        // (aba em segundo plano ou ambiente sem superfície de display).
        timer = setInterval(tick, Math.max(16, Math.round(1000 / fps)));
        raf = requestAnimationFrame(loop);
      } catch (e) {
        reject(e as Error);
      }
    })();
  });

  return {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (timer) { clearInterval(timer); timer = null; }
      if (recorder && recorder.state !== 'inactive') recorder.stop();
    },
    done,
  };
}

export async function saveBlob(blob: Blob, fileName: string): Promise<'saved' | 'downloaded'> {
  const anyWin = window as any;
  if (anyWin.showSaveFilePicker) {
    try {
      const ext = fileName.split('.').pop() ?? 'webm';
      const handle = await anyWin.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'Vídeo', accept: { [blob.type]: [`.${ext}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved';
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      // fallback para download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}