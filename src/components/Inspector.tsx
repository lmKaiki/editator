import { useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon, type IconName } from './Icon';
import { Slider, Toggle, ColorField, Field, EmptyState } from './ui';
import { FONT_FAMILIES, TEXT_ANIMATIONS, TRANSITIONS, defaultColor, formatTime } from '../lib/utils';
import type { Clip } from '../types';

type Tab = 'basico' | 'cor' | 'animacao' | 'texto' | 'audio';

const pct = (v: number) => `${Math.round(v * 100)}%`;

function useLiveEdit() {
  const beginChange = useStore((s) => s.beginChange);
  const active = useRef(false);
  return {
    start: (label: string) => { if (!active.current) { beginChange(label); active.current = true; } },
    end: () => { active.current = false; },
  };
}

function BasicTab({ clip }: { clip: Clip }) {
  const updateClip = useStore((s) => s.updateClip);
  const live = useLiveEdit();
  const set = (patch: Partial<Clip>) => updateClip(clip.id, patch, false);
  const slider = (label: string, key: keyof Clip, min: number, max: number, step: number, fmt?: (v: number) => string, unit?: string) => (
    <div onPointerDown={() => live.start(`Ajustar ${label}`)} onPointerUp={live.end}>
      <Slider label={label} value={clip[key] as number} min={min} max={max} step={step}
        onChange={(v) => set({ [key]: v } as Partial<Clip>)} format={fmt} unit={unit} />
    </div>
  );
  const isVisual = clip.kind !== 'audio';

  return (
    <>
      {isVisual && (
        <>
          <div className="section-label"><Icon name="crop" size={12} /> Transformação</div>
          {slider('Escala', 'scale', 0.1, 3, 0.01, pct)}
          {slider('Posição X', 'x', -1, 1, 0.01, pct)}
          {slider('Posição Y', 'y', -1, 1, 0.01, pct)}
          {slider('Rotação', 'rotation', -180, 180, 1, (v) => `${v.toFixed(0)}`, '°')}
          {slider('Opacidade', 'opacity', 0, 1, 0.01, pct)}
          <div className="btn-grid" style={{ marginTop: 4 }}>
            <button className={`tool-btn ${clip.flipH ? 'active' : ''}`} onClick={() => updateClip(clip.id, { flipH: !clip.flipH })}>
              <Icon name="flipH" size={18} /> Espelhar H
            </button>
            <button className={`tool-btn ${clip.flipV ? 'active' : ''}`} onClick={() => updateClip(clip.id, { flipV: !clip.flipV })}>
              <Icon name="flipV" size={18} /> Espelhar V
            </button>
          </div>
          <button className="btn btn-sm" style={{ width: '100%', marginBottom: 6 }} onClick={() => updateClip(clip.id, { x: 0, y: 0, scale: 1, rotation: 0, flipH: false, flipV: false, opacity: 1 })}>
            <Icon name="undo" size={14} /> Redefinir transformação
          </button>

          <div className="section-label"><Icon name="crop" size={12} /> Recorte</div>
          {slider('Topo', 'cropTop', 0, 0.45, 0.01, pct)}
          {slider('Base', 'cropBottom', 0, 0.45, 0.01, pct)}
          {slider('Esquerda', 'cropLeft', 0, 0.45, 0.01, pct)}
          {slider('Direita', 'cropRight', 0, 0.45, 0.01, pct)}
        </>
      )}

      <div className="section-label"><Icon name="speed" size={12} /> Velocidade</div>
      <div onPointerDown={() => live.start('Velocidade')} onPointerUp={live.end}>
        <Slider label="Velocidade" value={clip.speed} min={0.1} max={4} step={0.05} onChange={(v) => set({ speed: v })} format={(v) => `${v.toFixed(2)}×`} />
      </div>
      <div className="btn-grid three">
        {[0.5, 1, 2].map((s) => (
          <button key={s} className={`tool-btn ${Math.abs(clip.speed - s) < 0.01 ? 'active' : ''}`} onClick={() => updateClip(clip.id, { speed: s })}>
            <Icon name={s < 1 ? 'speed' : s > 1 ? 'speed' : 'play'} size={16} /> {s}×
          </button>
        ))}
      </div>
      {clip.kind === 'video' && (
        <button className={`tool-btn ${clip.freeze ? 'active' : ''}`} style={{ width: '100%', flexDirection: 'row', justifyContent: 'center' }} onClick={() => updateClip(clip.id, { freeze: !clip.freeze })}>
          <Icon name="freeze" size={16} /> {clip.freeze ? 'Descongelar quadro' : 'Congelar quadro'}
        </button>
      )}
      <div className="section-label"><Icon name="clock" size={12} /> Duração</div>
      <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
        <div style={{ flex: 1, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 7 }}>
          <div className="muted" style={{ fontSize: 10 }}>Início</div><b className="mono">{formatTime(clip.start)}</b>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 7 }}>
          <div className="muted" style={{ fontSize: 10 }}>Duração</div><b className="mono">{formatTime(clip.duration)}</b>
        </div>
      </div>
    </>
  );
}

function ColorTab({ clip }: { clip: Clip }) {
  const updateClipColor = useStore((s) => s.updateClipColor);
  const updateClip = useStore((s) => s.updateClip);
  const live = useLiveEdit();
  const c = clip.color;
  const set = (patch: Partial<Clip['color']>) => updateClipColor(clip.id, patch);
  const slider = (label: string, key: keyof Clip['color'], min: number, max: number, step: number, fmt?: (v: number) => string, unit?: string) => (
    <div onPointerDown={() => live.start(`Cor: ${label}`)} onPointerUp={live.end}>
      <Slider label={label} value={c[key]} min={min} max={max} step={step} onChange={(v) => set({ [key]: v })} format={fmt} unit={unit} />
    </div>
  );
  return (
    <>
      <div className="section-label"><Icon name="sliders" size={12} /> Ajustes básicos</div>
      {slider('Brilho', 'brightness', 0.2, 2, 0.01, pct)}
      {slider('Contraste', 'contrast', 0.2, 2, 0.01, pct)}
      {slider('Saturação', 'saturation', 0, 2.5, 0.01, pct)}
      <div className="section-label"><Icon name="color" size={12} /> Cor e temperatura</div>
      {slider('Temperatura', 'temperature', -100, 100, 1, (v) => v.toFixed(0))}
      {slider('Matiz (tint)', 'tint', -100, 100, 1, (v) => v.toFixed(0))}
      {slider('Tonalidade', 'hue', -180, 180, 1, (v) => v.toFixed(0), '°')}
      <div className="section-label"><Icon name="effects" size={12} /> Acabamento</div>
      {slider('Vinheta', 'vignette', 0, 1, 0.01, pct)}
      {slider('Desfoque', 'blur', 0, 20, 0.1, (v) => v.toFixed(1), 'px')}
      <button className="btn btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => { updateClip(clip.id, { color: defaultColor(), filter: 'none' }); }}>
        <Icon name="undo" size={14} /> Redefinir cor
      </button>
    </>
  );
}

function AnimationTab({ clip }: { clip: Clip }) {
  const updateClip = useStore((s) => s.updateClip);
  const currentTime = useStore((s) => s.currentTime);
  const beginChange = useStore((s) => s.beginChange);
  const rel = Math.max(0, currentTime - clip.start);

  const addKeyframe = () => {
    beginChange('Adicionar keyframe');
    const kf = { t: Math.min(rel, clip.duration), scale: clip.scale, x: clip.x, y: clip.y, opacity: clip.opacity, rotation: clip.rotation };
    const existing = clip.keyframes.filter((k) => Math.abs(k.t - kf.t) > 0.05);
    updateClip(clip.id, { keyframes: [...existing, kf].sort((a, b) => a.t - b.t) }, false);
  };
  const removeKeyframe = (t: number) => {
    beginChange('Remover keyframe');
    updateClip(clip.id, { keyframes: clip.keyframes.filter((k) => k.t !== t) }, false);
  };

  return (
    <>
      <div className="section-label"><Icon name="transition" size={12} /> Transições</div>
      <Field label="Entrada">
        <select className="select" value={clip.transitionIn} onChange={(e) => updateClip(clip.id, { transitionIn: e.target.value as Clip['transitionIn'] })}>
          {TRANSITIONS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Saída">
        <select className="select" value={clip.transitionOut} onChange={(e) => updateClip(clip.id, { transitionOut: e.target.value as Clip['transitionOut'] })}>
          {TRANSITIONS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Slider label="Duração" value={clip.transitionDuration} min={0.1} max={2} step={0.1} onChange={(v) => updateClip(clip.id, { transitionDuration: v }, false)} format={(v) => `${v.toFixed(1)}s`} />

      <div className="section-label"><Icon name="keyframe" size={12} /> Keyframes</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.5 }}>
        Posicione o cursor, ajuste escala/posição/opacidade na aba Básico e adicione um keyframe. Os valores são interpolados ao longo do clipe.
      </div>
      <button className="btn btn-primary btn-sm" style={{ width: '100%', marginBottom: 12 }} onClick={addKeyframe}>
        <Icon name="keyframe" size={14} /> Adicionar keyframe em {formatTime(rel)}
      </button>
      {clip.keyframes.length === 0 ? (
        <div className="muted" style={{ fontSize: 11.5, textAlign: 'center', padding: 12 }}>Nenhum keyframe</div>
      ) : clip.keyframes.map((k) => (
        <div key={k.t} className="row" style={{ padding: '7px 10px', background: 'var(--surface-2)', borderRadius: 7, marginBottom: 6 }}>
          <Icon name="keyframe" size={13} style={{ color: 'var(--accent)' }} />
          <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{formatTime(k.t)}</span>
          <span className="muted" style={{ fontSize: 10.5 }}>escala {pct(k.scale ?? 1)}</span>
          <span className="spacer" />
          <button className="icon-btn danger" style={{ width: 24, height: 24 }} onClick={() => removeKeyframe(k.t)}><Icon name="trash" size={13} /></button>
        </div>
      ))}
    </>
  );
}

function TextTab({ clip }: { clip: Clip }) {
  const updateClipText = useStore((s) => s.updateClipText);
  const t = clip.text!;
  const set = (patch: Partial<typeof t>) => updateClipText(clip.id, patch);
  return (
    <>
      <div className="section-label"><Icon name="type" size={12} /> Conteúdo</div>
      <textarea className="input" value={t.content} onChange={(e) => set({ content: e.target.value })} rows={3} />
      <div className="section-label"><Icon name="text" size={12} /> Fonte</div>
      <Field label="Família">
        <select className="select" value={t.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
          {FONT_FAMILIES.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
      </Field>
      <Slider label="Tamanho" value={t.fontSize} min={2} max={25} step={0.5} onChange={(v) => set({ fontSize: v })} format={(v) => `${v.toFixed(1)}%`} />
      <Slider label="Espaçamento" value={t.letterSpacing} min={-5} max={20} step={0.5} onChange={(v) => set({ letterSpacing: v })} format={(v) => v.toFixed(1)} />
      <div className="row" style={{ marginBottom: 12, gap: 6 }}>
        <button className={`icon-btn ${t.bold ? 'active' : ''}`} onClick={() => set({ bold: !t.bold })}><Icon name="bold" size={16} /></button>
        <button className={`icon-btn ${t.italic ? 'active' : ''}`} onClick={() => set({ italic: !t.italic })}><Icon name="italic" size={16} /></button>
        <span className="spacer" />
        {(['left', 'center', 'right'] as const).map((a) => (
          <button key={a} className={`icon-btn ${t.align === a ? 'active' : ''}`} onClick={() => set({ align: a })}>
            <Icon name={a === 'left' ? 'alignLeft' : a === 'center' ? 'alignCenter' : 'alignRight'} size={16} />
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1 }}>Cor do texto</span>
        <ColorField value={t.color} onChange={(v) => set({ color: v })} />
      </div>
      <div className="section-label"><Icon name="edit" size={12} /> Contorno e sombra</div>
      <div className="row" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1 }}>Contorno</span>
        <ColorField value={t.outlineColor} onChange={(v) => set({ outlineColor: v })} />
      </div>
      <Slider label="Espessura" value={t.outlineWidth} min={0} max={12} step={0.5} onChange={(v) => set({ outlineWidth: v })} format={(v) => v.toFixed(1)} />
      <div className="row" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1 }}>Sombra</span>
        <ColorField value={t.shadowColor} onChange={(v) => set({ shadowColor: v })} />
      </div>
      <Slider label="Desfoque" value={t.shadowBlur} min={0} max={30} step={1} onChange={(v) => set({ shadowBlur: v })} format={(v) => v.toFixed(0)} />
      <div className="row" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1 }}>Fundo</span>
        <ColorField value={t.bg || '#000000'} onChange={(v) => set({ bg: v })} />
        <button className="btn btn-sm" onClick={() => set({ bg: '' })}>Sem fundo</button>
      </div>
      <div className="section-label"><Icon name="sparkles" size={12} /> Animação</div>
      <Field label="Entrada">
        <select className="select" value={t.animationIn} onChange={(e) => set({ animationIn: e.target.value as typeof t.animationIn })}>
          {TEXT_ANIMATIONS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Saída">
        <select className="select" value={t.animationOut} onChange={(e) => set({ animationOut: e.target.value as typeof t.animationOut })}>
          {TEXT_ANIMATIONS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
    </>
  );
}

function AudioTab({ clip }: { clip: Clip }) {
  const updateClip = useStore((s) => s.updateClip);
  const separateAudio = useStore((s) => s.separateAudio);
  const live = useLiveEdit();
  const set = (patch: Partial<Clip>) => updateClip(clip.id, patch, false);
  return (
    <>
      <div className="section-label"><Icon name="volume" size={12} /> Volume</div>
      <div onPointerDown={() => live.start('Volume')} onPointerUp={live.end}>
        <Slider label="Volume" value={clip.volume} min={0} max={2} step={0.01} onChange={(v) => set({ volume: v })} format={pct} />
      </div>
      <div className="settings-row" style={{ paddingTop: 4 }}>
        <div className="label"><b>Silenciar clipe</b></div>
        <Toggle on={clip.muted} onChange={(v) => updateClip(clip.id, { muted: v })} />
      </div>
      <div className="section-label"><Icon name="wave" size={12} /> Fades</div>
      <div onPointerDown={() => live.start('Fade in')} onPointerUp={live.end}>
        <Slider label="Fade in" value={clip.fadeIn} min={0} max={Math.max(0.5, clip.duration / 2)} step={0.1} onChange={(v) => set({ fadeIn: v })} format={(v) => `${v.toFixed(1)}s`} />
      </div>
      <div onPointerDown={() => live.start('Fade out')} onPointerUp={live.end}>
        <Slider label="Fade out" value={clip.fadeOut} min={0} max={Math.max(0.5, clip.duration / 2)} step={0.1} onChange={(v) => set({ fadeOut: v })} format={(v) => `${v.toFixed(1)}s`} />
      </div>
      <div className="section-label"><Icon name="sliders" size={12} /> Limpeza</div>
      <div className="settings-row" style={{ paddingTop: 4 }}>
        <div className="label"><b>Reduzir ruído</b><small>Filtro passa-banda (rumble / chiado)</small></div>
        <Toggle on={clip.denoise} onChange={(v) => updateClip(clip.id, { denoise: v })} />
      </div>
      {clip.kind === 'video' && (
        <button className="btn btn-sm" style={{ width: '100%', marginTop: 12 }} onClick={() => separateAudio(clip.id)}>
          <Icon name="wave" size={14} /> Separar áudio do vídeo
        </button>
      )}
    </>
  );
}

export function Inspector() {
  const selectedClipId = useStore((s) => s.selectedClipId);
  const clips = useStore((s) => s.project?.clips);
  const clip = clips?.find((c) => c.id === selectedClipId);
  const [tab, setTab] = useState<Tab>('basico');

  if (!clip) {
    return (
      <div className="inspector">
        <div className="inspector-empty">
          <Icon name="sliders" size={34} style={{ opacity: 0.35 }} />
          <p style={{ fontWeight: 600, color: 'var(--text-2)' }}>Nenhum clipe selecionado</p>
          <p style={{ fontSize: 12 }}>Selecione um clipe na linha do tempo para editar suas propriedades.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: IconName; show: boolean }[] = [
    { id: 'basico', label: 'Básico', icon: 'sliders', show: true },
    { id: 'cor', label: 'Cor', icon: 'color', show: clip.kind !== 'audio' && clip.kind !== 'text' },
    { id: 'animacao', label: 'Animação', icon: 'keyframe', show: clip.kind !== 'audio' },
    { id: 'texto', label: 'Texto', icon: 'type', show: clip.kind === 'text' },
    { id: 'audio', label: 'Áudio', icon: 'volume', show: clip.kind === 'video' || clip.kind === 'audio' },
  ];
  const visible = tabs.filter((t) => t.show);
  const activeTab = visible.some((t) => t.id === tab) ? tab : 'basico';

  const kindIcon: IconName = clip.kind === 'video' ? 'video' : clip.kind === 'image' ? 'image' : clip.kind === 'audio' ? 'audio' : 'type';
  const kindColor = clip.kind === 'audio' ? 'var(--success)' : clip.kind === 'text' ? '#c084fc' : clip.kind === 'image' ? 'var(--accent-2)' : 'var(--accent)';

  return (
    <div className="inspector">
      <div className="clip-header">
        <span className="clip-header-icon" style={{ background: `color-mix(in srgb, ${kindColor} 18%, transparent)`, color: kindColor }}>
          <Icon name={kindIcon} size={18} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="clip-header-name">{clip.name}</div>
          <div className="clip-header-sub">{clip.kind === 'text' ? 'Texto' : clip.kind === 'audio' ? 'Áudio' : clip.kind === 'image' ? 'Imagem' : 'Vídeo'} • {formatTime(clip.duration)}</div>
        </div>
      </div>
      <div className="inspector-tabs">
        {visible.map((t) => (
          <button key={t.id} className={`inspector-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="inspector-content">
        {activeTab === 'basico' && <BasicTab clip={clip} />}
        {activeTab === 'cor' && <ColorTab clip={clip} />}
        {activeTab === 'animacao' && <AnimationTab clip={clip} />}
        {activeTab === 'texto' && clip.text && <TextTab clip={clip} />}
        {activeTab === 'audio' && <AudioTab clip={clip} />}
      </div>
    </div>
  );
}