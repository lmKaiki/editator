import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { engine } from '../engine/render';
import { Icon } from './Icon';
import { formatTimecode } from '../lib/utils';

function TimeDisplay() {
  const currentTime = useStore((s) => s.currentTime);
  const project = useStore((s) => s.project);
  if (!project) return null;
  return (
    <div className="transport-time mono">
      <b>{formatTimecode(currentTime, project.fps)}</b>
      <span className="muted"> / {formatTimecode(project.duration, project.fps)}</span>
    </div>
  );
}

export function Preview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const project = useStore((s) => s.project);
  const mediaUrls = useStore((s) => s.mediaUrls);
  const isPlaying = useStore((s) => s.isPlaying);
  const togglePlay = useStore((s) => s.togglePlay);
  const seek = useStore((s) => s.seek);
  const hasClips = (project?.clips.length ?? 0) > 0;

  useEffect(() => {
    engine.setUrls(mediaUrls);
    engine.invalidate();
  }, [mediaUrls]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    engine.attach(canvas);
    let raf = 0;
    let last = performance.now();
    let lastTick = performance.now();
    let lastProject: unknown = null;
    let lastTime = -1;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      lastTick = now;
      const s = useStore.getState();
      if (s.project && !s.exporting) {
        const mediaDirty = engine.consumeRender();
        if (s.isPlaying) {
          let t = s.currentTime + dt;
          if (t >= s.project.duration) {
            t = s.project.duration;
            s.pause();
          }
          s.setCurrentTime(t);
          engine.render(s.project, t, true);
          lastProject = s.project;
          lastTime = t;
        } else if (s.project !== lastProject || s.currentTime !== lastTime || mediaDirty) {
          engine.render(s.project, s.currentTime, false);
          lastProject = s.project;
          lastTime = s.currentTime;
        }
        engine.cleanup(s.project);
      }
    };

    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // Rede de segurança: mantém o preview vivo se o RAF for suspenso.
    const safety = setInterval(() => {
      if (performance.now() - lastTick > 200) tick();
    }, 250);
    return () => { cancelAnimationFrame(raf); clearInterval(safety); };
  }, []);

  const step = (dir: number) => {
    const s = useStore.getState();
    if (!s.project) return;
    seek(s.currentTime + dir / s.project.fps);
  };

  return (
    <div className="preview-area">
      <div className="preview-canvas-wrap">
        <canvas ref={canvasRef} className="preview-canvas" width={project?.width ?? 1920} height={project?.height ?? 1080} />
        {!hasClips && (
          <div className="preview-empty">
            <div className="big-icon"><Icon name="video" size={32} /></div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Sua pré-visualização aparecerá aqui</p>
              <p style={{ fontSize: 12 }}>Importe uma mídia e arraste para a linha do tempo</p>
            </div>
          </div>
        )}
      </div>
      <div className="transport">
        <TimeDisplay />
        <div className="spacer" />
        <button className="icon-btn" data-tip="Quadro anterior (←)" onClick={() => step(-1)}><Icon name="skipBack" size={18} /></button>
        <button className="play-btn" data-tip={isPlaying ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'} onClick={() => { engine.resumeAudio(); togglePlay(); }}>
          <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
        </button>
        <button className="icon-btn" data-tip="Próximo quadro (→)" onClick={() => step(1)}><Icon name="skipForward" size={18} /></button>
        <div className="spacer" />
        <button className="icon-btn" data-tip="Início (Home)" onClick={() => seek(0)}><Icon name="undo" size={17} /></button>
        <button className="icon-btn" data-tip="Fim (End)" onClick={() => project && seek(project.duration)}><Icon name="redo" size={17} /></button>
      </div>
    </div>
  );
}