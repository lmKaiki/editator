import { useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon, type IconName } from './Icon';
import { EmptyState } from './ui';
import { FILTERS, TRANSITIONS, EFFECTS, defaultTextStyle, formatTime } from '../lib/utils';
import type { Clip } from '../types';

const PANEL_TITLES: Record<string, string> = {
  media: 'Biblioteca de mídia',
  text: 'Textos e títulos',
  effects: 'Efeitos',
  transitions: 'Transições',
  filters: 'Filtros',
  audio: 'Áudio',
};

function MediaPanel() {
  const media = useStore((s) => s.media);
  const importFiles = useStore((s) => s.importFiles);
  const importing = useStore((s) => s.importing);
  const removeMedia = useStore((s) => s.removeMedia);
  const addClipFromMedia = useStore((s) => s.addClipFromMedia);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <>
      <div
        className={`import-zone ${drag ? 'dragover' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) importFiles(e.dataTransfer.files); }}
      >
        {importing ? <span className="spinner" /> : <Icon name="import" size={26} />}
        <b>{importing ? 'Importando…' : 'Importar mídia'}</b>
        <small>Arraste ou clique • vídeo, imagem, áudio</small>
      </div>
      <input ref={fileRef} type="file" multiple accept="video/*,image/*,audio/*" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.length) importFiles(e.target.files); e.target.value = ''; }} />

      {media.length === 0 ? (
        <EmptyState icon={<Icon name="grid" size={30} />} title="Nenhuma mídia importada" hint="Importe vídeos, imagens ou músicas para começar." />
      ) : (
        <div className="media-grid">
          {media.map((m) => (
            <div key={m.id} className="media-item" draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/nexo-media', m.id); e.dataTransfer.effectAllowed = 'copy'; }}>
              <div className="media-thumb">
                {m.type === 'audio' ? (
                  <div className="audio-thumb"><Icon name="music" size={24} /></div>
                ) : m.thumbnail ? <img src={m.thumbnail} alt="" /> : <Icon name="image" size={22} />}
                <span className="media-type-badge">
                  <Icon name={m.type === 'video' ? 'video' : m.type === 'image' ? 'image' : 'audio'} size={10} />
                  {m.type === 'video' ? 'Vídeo' : m.type === 'image' ? 'Imagem' : 'Áudio'}
                </span>
                {m.type !== 'image' && <span className="media-duration mono">{formatTime(m.duration)}</span>}
                <button className="media-add-btn" data-tip="Adicionar à timeline" onClick={(e) => { e.stopPropagation(); addClipFromMedia(m.id); }}>
                  <Icon name="plus" size={22} />
                </button>
              </div>
              <button className="media-remove" onClick={(e) => { e.stopPropagation(); removeMedia(m.id); }}><Icon name="close" size={12} /></button>
              <div className="media-name" title={m.name}>{m.name}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TextPanel() {
  const addTextClip = useStore((s) => s.addTextClip);
  const updateClipText = useStore((s) => s.updateClipText);
  const selectedClipId = useStore((s) => s.selectedClipId);

  const presets: { name: string; desc: string; icon: IconName; style: Partial<ReturnType<typeof defaultTextStyle>> }[] = [
    { name: 'Texto padrão', desc: 'Texto simples editável', icon: 'type', style: {} },
    { name: 'Título grande', desc: 'Impactante, centralizado', icon: 'text', style: { fontSize: 14, bold: true, content: 'TÍTULO', animationIn: 'pop' } },
    { name: 'Legenda', desc: 'Parte inferior, com fundo', icon: 'alignCenter', style: { fontSize: 5, content: 'Sua legenda aqui', bg: '#000000aa', animationIn: 'fade', bold: false } },
    { name: 'Título animado', desc: 'Entrada deslizante', icon: 'sparkles', style: { fontSize: 11, content: 'Seu título', animationIn: 'slide-up', animationOut: 'fade', color: '#7c5cff' } },
    { name: 'Máquina de escrever', desc: ' Revela letra a letra', icon: 'edit', style: { fontSize: 6, content: 'Digitando...', animationIn: 'typewriter', bold: false, fontFamily: 'Courier New' } },
    { name: 'Contorno neon', desc: 'Texto com contorno', icon: 'bold', style: { fontSize: 12, content: 'NEON', color: '#ffffff', outlineColor: '#3b9dff', outlineWidth: 4, animationIn: 'zoom' } },
  ];

  const add = (style: Partial<ReturnType<typeof defaultTextStyle>>) => {
    addTextClip();
    const id = useStore.getState().selectedClipId;
    if (id) updateClipText(id, style);
  };

  return (
    <>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 12 }}>
        Clique para adicionar ao projeto. {selectedClipId ? 'Edite o clipe selecionado no painel direito.' : ''}
      </div>
      {presets.map((p) => (
        <button key={p.name} className="lib-item" onClick={() => add(p.style)}>
          <span className="lib-icon"><Icon name={p.icon} size={18} /></span>
          <span className="lib-item-text"><b>{p.name}</b><small>{p.desc}</small></span>
          <Icon name="plus" size={15} style={{ marginLeft: 'auto', color: 'var(--text-3)' }} />
        </button>
      ))}
    </>
  );
}

function EffectsPanel() {
  const selectedClipId = useStore((s) => s.selectedClipId);
  const updateClipColor = useStore((s) => s.updateClipColor);
  const showToast = useStore((s) => s.showToast);
  const apply = (patch: Partial<import('../types').ColorAdjust>) => {
    if (!selectedClipId) { showToast('Selecione um clipe na timeline para aplicar o efeito', 'info'); return; }
    updateClipColor(selectedClipId, patch);
    showToast('Efeito aplicado', 'success');
  };
  return (
    <>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 12 }}>Selecione um clipe e clique num efeito para aplicá-lo.</div>
      {EFFECTS.map((e) => (
        <button key={e.id} className="lib-item" onClick={() => apply(e.apply)}>
          <span className="lib-icon"><Icon name="sparkles" size={18} /></span>
          <span className="lib-item-text"><b>{e.name}</b><small>{e.desc}</small></span>
        </button>
      ))}
    </>
  );
}

function TransitionsPanel() {
  const selectedClipId = useStore((s) => s.selectedClipId);
  const updateClip = useStore((s) => s.updateClip);
  const showToast = useStore((s) => s.showToast);
  const apply = (id: string, edge: 'in' | 'out') => {
    if (!selectedClipId) { showToast('Selecione um clipe para aplicar a transição', 'info'); return; }
    updateClip(selectedClipId, edge === 'in' ? { transitionIn: id as Clip['transitionIn'] } : { transitionOut: id as Clip['transitionOut'] });
    showToast(`Transição de ${edge === 'in' ? 'entrada' : 'saída'} aplicada`, 'success');
  };
  return (
    <>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 12 }}>Aplique transições de entrada e saída ao clipe selecionado.</div>
      {TRANSITIONS.filter((t) => t.id !== 'none').map((t) => (
        <div key={t.id} className="lib-item" style={{ cursor: 'default' }}>
          <span className="lib-icon"><Icon name="transition" size={18} /></span>
          <span className="lib-item-text" style={{ flex: 1 }}><b>{t.name}</b></span>
          <button className="btn btn-sm" onClick={() => apply(t.id, 'in')}>Entrada</button>
          <button className="btn btn-sm" onClick={() => apply(t.id, 'out')}>Saída</button>
        </div>
      ))}
    </>
  );
}

function FiltersPanel() {
  const selectedClipId = useStore((s) => s.selectedClipId);
  const clips = useStore((s) => s.project?.clips);
  const updateClip = useStore((s) => s.updateClip);
  const showToast = useStore((s) => s.showToast);
  const current = clips?.find((c) => c.id === selectedClipId)?.filter;
  const apply = (id: string) => {
    if (!selectedClipId) { showToast('Selecione um clipe para aplicar o filtro', 'info'); return; }
    updateClip(selectedClipId, { filter: id });
  };
  const filterCss = (id: string) => {
    const f = FILTERS.find((x) => x.id === id);
    if (!f) return '';
    const a = f.adjust;
    return `brightness(${a.brightness ?? 1}) contrast(${a.contrast ?? 1}) saturate(${a.saturation ?? 1}) ${f.css ?? ''}`;
  };
  return (
    <>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 12 }}>Filtros de cor com um clique. Selecione um clipe primeiro.</div>
      <div className="filter-grid">
        {FILTERS.map((f) => (
          <button key={f.id} className={`filter-card ${current === f.id ? 'active' : ''}`} onClick={() => apply(f.id)}>
            <div className="filter-preview" style={{ filter: filterCss(f.id) }} />
            <div className="filter-name">{f.name}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function AudioPanel() {
  const importFiles = useStore((s) => s.importFiles);
  const separateAudio = useStore((s) => s.separateAudio);
  const addTrack = useStore((s) => s.addTrack);
  const selectedClipId = useStore((s) => s.selectedClipId);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className="lib-item" onClick={() => fileRef.current?.click()}>
        <span className="lib-icon" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--success)' }}><Icon name="music" size={18} /></span>
        <span className="lib-item-text"><b>Importar música / som</b><small>MP3, WAV, OGG, M4A…</small></span>
      </button>
      <button className="lib-item" onClick={() => selectedClipId && separateAudio(selectedClipId)}>
        <span className="lib-icon" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--success)' }}><Icon name="wave" size={18} /></span>
        <span className="lib-item-text"><b>Separar áudio do vídeo</b><small>Extrai para uma faixa de áudio</small></span>
      </button>
      <button className="lib-item" onClick={() => addTrack('audio')}>
        <span className="lib-icon" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--success)' }}><Icon name="plus" size={18} /></span>
        <span className="lib-item-text"><b>Nova faixa de áudio</b><small>Adiciona uma faixa vazia</small></span>
      </button>
      <input ref={fileRef} type="file" multiple accept="audio/*" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.length) importFiles(e.target.files); e.target.value = ''; }} />
      <div className="divider" />
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.6 }}>
        Selecione um clipe de áudio ou vídeo para ajustar volume, fades e redução de ruído no painel direito.
      </div>
    </>
  );
}

export function LeftPanel() {
  const activePanel = useStore((s) => s.activePanel);
  return (
    <div className="left-panel">
      <div className="left-panel-header">
        <span className="left-panel-title">{PANEL_TITLES[activePanel]}</span>
      </div>
      <div className="left-panel-content">
        {activePanel === 'media' && <MediaPanel />}
        {activePanel === 'text' && <TextPanel />}
        {activePanel === 'effects' && <EffectsPanel />}
        {activePanel === 'transitions' && <TransitionsPanel />}
        {activePanel === 'filters' && <FiltersPanel />}
        {activePanel === 'audio' && <AudioPanel />}
      </div>
    </div>
  );
}