import { useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon } from './Icon';
import { formatTime, clamp } from '../lib/utils';
import type { Clip, Track } from '../types';

const HEAD_W = 150;

function Waveform({ clip }: { clip: Clip }) {
  const media = useStore((s) => s.media);
  const show = useStore((s) => s.settings.showWaveforms);
  const asset = media.find((m) => m.id === clip.mediaId);
  if (!show || !asset?.waveform) return null;
  const wf = asset.waveform;
  const startFrac = asset.duration ? clip.inPoint / asset.duration : 0;
  const endFrac = asset.duration ? Math.min(1, (clip.inPoint + clip.duration * clip.speed) / asset.duration) : 1;
  const from = Math.floor(startFrac * wf.length);
  const to = Math.max(from + 1, Math.floor(endFrac * wf.length));
  const slice = wf.slice(from, to);
  const bars = slice.length > 120 ? slice.filter((_, i) => i % Math.ceil(slice.length / 120) === 0) : slice;
  return (
    <div className="clip-waveform">
      {bars.map((v, i) => <div key={i} className="bar" style={{ height: `${Math.max(4, v * 100)}%` }} />)}
    </div>
  );
}

function ClipView({ clip, zoom, laneRef }: { clip: Clip; zoom: number; laneRef: React.RefObject<HTMLDivElement> }) {
  const selectedClipId = useStore((s) => s.selectedClipId);
  const selectClip = useStore((s) => s.selectClip);
  const moveClip = useStore((s) => s.moveClip);
  const trimClip = useStore((s) => s.trimClip);
  const beginChange = useStore((s) => s.beginChange);
  const media = useStore((s) => s.media);
  const selected = selectedClipId === clip.id;
  const asset = media.find((m) => m.id === clip.mediaId);
  const drag = useRef<{ mode: 'move' | 'left' | 'right'; x0: number; start0: number; dur0: number; in0: number; track0: string; moved: boolean } | null>(null);

  const snap = (start: number, dur: number, selfId: string): number => {
    const s = useStore.getState();
    if (!s.settings.snap) return start;
    const thr = 8 / zoom;
    const points = [0, s.currentTime];
    for (const c of s.project!.clips) {
      if (c.id === selfId) continue;
      points.push(c.start, c.start + c.duration);
    }
    let best = start;
    let bestD = thr;
    for (const p of points) {
      if (Math.abs(start - p) < bestD) { best = p; bestD = Math.abs(start - p); }
      if (Math.abs(start + dur - p) < bestD) { best = p - dur; bestD = Math.abs(start + dur - p); }
    }
    return Math.max(0, best);
  };

  const onPointerDown = (e: React.PointerEvent, mode: 'move' | 'left' | 'right') => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const s = useStore.getState();
    const track = s.project?.tracks.find((t) => t.id === clip.trackId);
    if (track?.locked) return;
    selectClip(clip.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, x0: e.clientX, start0: clip.start, dur0: clip.duration, in0: clip.inPoint, track0: clip.trackId, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x0) / zoom;
    if (Math.abs(e.clientX - d.x0) > 3 && !d.moved) { d.moved = true; beginChange(d.mode === 'move' ? 'Mover clipe' : 'Aparar clipe'); }
    if (!d.moved) return;
    if (d.mode === 'move') {
      let newStart = snap(d.start0 + dx, d.dur0, clip.id);
      // faixa alvo
      let targetTrack = d.track0;
      const lanes = document.querySelectorAll<HTMLElement>('[data-lane-id]');
      lanes.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (e.clientY >= r.top && e.clientY <= r.bottom) {
          const kind = el.dataset.laneKind;
          const clipKind = clip.kind === 'audio' ? 'audio' : 'video';
          if (kind === clipKind) targetTrack = el.dataset.laneId!;
        }
      });
      moveClip(clip.id, targetTrack, newStart, false);
    } else if (d.mode === 'left') {
      trimClip(clip.id, 'left', dx, false);
    } else {
      trimClip(clip.id, 'right', dx, false);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (drag.current) {
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
      drag.current = null;
    }
  };

  const kindClass = clip.kind === 'video' ? 'clip-video' : clip.kind === 'image' ? 'clip-image' : clip.kind === 'audio' ? 'clip-audio' : 'clip-text';
  const width = Math.max(8, clip.duration * zoom);
  const thumbCount = Math.max(1, Math.ceil(width / 64));

  return (
    <div
      className={`clip ${kindClass} ${selected ? 'selected' : ''}`}
      style={{ left: clip.start * zoom, width, height: 'calc(100% - 8px)' }}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={() => { const s = useStore.getState(); s.seek(clip.start); }}
    >
      {(clip.kind === 'video' || clip.kind === 'image') && asset?.thumbnail && (
        <div className="clip-thumbs">
          {Array.from({ length: thumbCount }).map((_, i) => <img key={i} src={asset.thumbnail} style={{ width: 64 }} alt="" />)}
        </div>
      )}
      {clip.kind === 'audio' && <Waveform clip={clip} />}
      <div className="clip-label">
        <Icon name={clip.kind === 'video' ? 'video' : clip.kind === 'image' ? 'image' : clip.kind === 'audio' ? 'music' : 'type'} size={11} />
        {clip.kind === 'text' ? clip.text?.content?.slice(0, 24) || 'Texto' : clip.name}
      </div>
      {clip.fadeIn > 0 && <div className="clip-fade in" style={{ width: clip.fadeIn * zoom }} />}
      {clip.fadeOut > 0 && <div className="clip-fade out" style={{ width: clip.fadeOut * zoom }} />}
      <div className="clip-handle left" onPointerDown={(e) => onPointerDown(e, 'left')} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
      <div className="clip-handle right" onPointerDown={(e) => onPointerDown(e, 'right')} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
    </div>
  );
}

function TrackRow({ track, zoom, contentWidth }: { track: Track; zoom: number; contentWidth: number }) {
  const clips = useStore((s) => s.project?.clips.filter((c) => c.trackId === track.id));
  const updateTrack = useStore((s) => s.updateTrack);
  const removeTrack = useStore((s) => s.removeTrack);
  const addClipFromMedia = useStore((s) => s.addClipFromMedia);
  const laneRef = useRef<HTMLDivElement>(null);
  const [dropX, setDropX] = useState<number | null>(null);

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('text/nexo-media')) {
      const clipKind = track.kind;
      e.preventDefault();
      const rect = laneRef.current!.getBoundingClientRect();
      setDropX(e.clientX - rect.left);
    }
  };
  const onDrop = (e: React.DragEvent) => {
    const mediaId = e.dataTransfer.getData('text/nexo-media');
    if (!mediaId) return;
    e.preventDefault();
    const asset = useStore.getState().media.find((m) => m.id === mediaId);
    const wantKind = asset?.type === 'audio' ? 'audio' : 'video';
    if (wantKind !== track.kind) { useStore.getState().showToast(`Solte mídias de ${track.kind === 'audio' ? 'áudio' : 'vídeo/imagem'} nesta faixa`, 'info'); setDropX(null); return; }
    const rect = laneRef.current!.getBoundingClientRect();
    const start = Math.max(0, (e.clientX - rect.left) / zoom);
    addClipFromMedia(mediaId, track.id, start);
    setDropX(null);
  };

  return (
    <div className={`track-row ${track.locked ? 'locked' : ''} ${track.hidden ? 'hidden-track' : ''}`} style={{ height: track.height }}>
      <div className="track-head">
        <div className="track-head-name">
          <span className="kind-dot" style={{ background: track.kind === 'video' ? 'var(--accent)' : 'var(--success)' }} />
          {track.name}
        </div>
        {track.kind === 'video' && (
          <button className="icon-btn" data-tip={track.hidden ? 'Mostrar faixa' : 'Ocultar faixa'} onClick={() => updateTrack(track.id, { hidden: !track.hidden })}>
            <Icon name={track.hidden ? 'eyeOff' : 'eye'} size={14} />
          </button>
        )}
        <button className="icon-btn" data-tip={track.muted ? 'Ativar som' : 'Silenciar'} onClick={() => updateTrack(track.id, { muted: !track.muted })}>
          <Icon name={track.muted ? 'volumeMute' : 'volume'} size={14} />
        </button>
        <button className="icon-btn" data-tip={track.locked ? 'Destravar' : 'Travar'} onClick={() => updateTrack(track.id, { locked: !track.locked })}>
          <Icon name={track.locked ? 'lock' : 'unlock'} size={14} />
        </button>
      </div>
      <div
        ref={laneRef}
        className={`track-lane ${track.kind === 'video' ? 'video-lane' : ''}`}
        data-lane-id={track.id}
        data-lane-kind={track.kind}
        style={{ width: contentWidth }}
        onDragOver={onDragOver}
        onDragLeave={() => setDropX(null)}
        onDrop={onDrop}
        onMouseDown={(e) => { if (e.target === e.currentTarget) useStore.getState().selectClip(null); }}
      >
        {clips?.map((c) => <ClipView key={c.id} clip={c} zoom={zoom} laneRef={laneRef} />)}
        {dropX !== null && <div className="drop-indicator" style={{ left: dropX }} />}
      </div>
    </div>
  );
}

export function Timeline() {
  const project = useStore((s) => s.project);
  const zoom = useStore((s) => s.zoom);
  const setZoom = useStore((s) => s.setZoom);
  const currentTime = useStore((s) => s.currentTime);
  const seek = useStore((s) => s.seek);
  const selectedClipId = useStore((s) => s.selectedClipId);
  const splitClip = useStore((s) => s.splitClip);
  const deleteClip = useStore((s) => s.deleteClip);
  const duplicateClip = useStore((s) => s.duplicateClip);
  const mergeClips = useStore((s) => s.mergeClips);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const past = useStore((s) => s.past.length);
  const future = useStore((s) => s.future.length);
  const snap = useStore((s) => s.settings.snap);
  const updateSettings = useStore((s) => s.updateSettings);
  const addTrack = useStore((s) => s.addTrack);
  const rulerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!project) return null;
  const contentWidth = Math.max(project.duration * zoom + 300, 900);
  const innerWidth = HEAD_W + contentWidth;

  // ticks da régua
  const targetTickPx = 90;
  const rawStep = targetTickPx / zoom;
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  const step = steps.find((s) => s >= rawStep) ?? 300;
  const ticks: number[] = [];
  for (let t = 0; t <= project.duration + step; t += step) ticks.push(parseFloat(t.toFixed(3)));

  const seekFromEvent = (clientX: number) => {
    const rect = rulerRef.current!.getBoundingClientRect();
    seek(clamp((clientX - rect.left) / zoom, 0, project.duration));
  };
  const onRulerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    seekFromEvent(e.clientX);
  };
  const onRulerMove = (e: React.PointerEvent) => { if (e.buttons === 1) seekFromEvent(e.clientX); };

  const selected = project.clips.find((c) => c.id === selectedClipId);
  const mergeNext = () => {
    if (!selected) return;
    const sameTrack = project.clips.filter((c) => c.trackId === selected.trackId && c.id !== selected.id && c.start >= selected.start).sort((a, b) => a.start - b.start);
    const next = sameTrack[0];
    if (next) mergeClips([selected.id, next.id]);
  };

  return (
    <div className="timeline">
      <div className="timeline-toolbar">
        <div className="group">
          <button className="icon-btn" data-tip="Desfazer (Ctrl+Z)" disabled={past === 0} onClick={undo}><Icon name="undo" size={17} /></button>
          <button className="icon-btn" data-tip="Refazer (Ctrl+Y)" disabled={future === 0} onClick={redo}><Icon name="redo" size={17} /></button>
        </div>
        <div className="group">
          <button className="icon-btn" data-tip="Dividir no cursor (S)" disabled={!selectedClipId} onClick={() => selectedClipId && splitClip(selectedClipId, currentTime)}><Icon name="scissors" size={17} /></button>
          <button className="icon-btn" data-tip="Duplicar (Ctrl+D)" disabled={!selectedClipId} onClick={() => selectedClipId && duplicateClip(selectedClipId)}><Icon name="duplicate" size={17} /></button>
          <button className="icon-btn" data-tip="Juntar com próximo" disabled={!selectedClipId} onClick={mergeNext}><Icon name="transition" size={17} /></button>
          <button className="icon-btn danger" data-tip="Excluir (Delete)" disabled={!selectedClipId} onClick={() => selectedClipId && deleteClip(selectedClipId)}><Icon name="trash" size={17} /></button>
        </div>
        <div className="group">
          <button className={`icon-btn ${snap ? 'active' : ''}`} data-tip="Ajuste magnético" onClick={() => updateSettings({ snap: !snap })}><Icon name="magnet" size={17} /></button>
          <button className="icon-btn" data-tip="Nova faixa de vídeo" onClick={() => addTrack('video')}><Icon name="video" size={16} /></button>
          <button className="icon-btn" data-tip="Nova faixa de áudio" onClick={() => addTrack('audio')}><Icon name="music" size={16} /></button>
        </div>
        <div className="zoom-control">
          <button className="icon-btn" data-tip="Reduzir zoom" onClick={() => setZoom(zoom * 0.75)}><Icon name="zoomOut" size={16} /></button>
          <input type="range" min={12} max={400} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
          <button className="icon-btn" data-tip="Aumentar zoom" onClick={() => setZoom(zoom * 1.33)}><Icon name="zoomIn" size={16} /></button>
          <span className="muted mono" style={{ fontSize: 11, width: 42 }}>{Math.round(zoom)}px/s</span>
        </div>
      </div>

      <div className="timeline-scroll" ref={scrollRef}>
        <div className="timeline-inner" style={{ width: innerWidth }}>
          <div className="timeline-ruler" ref={rulerRef} style={{ width: contentWidth }}
            onPointerDown={onRulerDown} onPointerMove={onRulerMove}>
            {ticks.map((t) => (
              <div key={t} className="ruler-tick" style={{ left: t * zoom }}>{formatTime(t)}</div>
            ))}
          </div>
          <div className="timeline-tracks">
            {project.tracks.map((track) => (
              <TrackRow key={track.id} track={track} zoom={zoom} contentWidth={contentWidth} />
            ))}
          </div>
          <div className="playhead" style={{ left: HEAD_W + currentTime * zoom }} />
        </div>
      </div>
    </div>
  );
}