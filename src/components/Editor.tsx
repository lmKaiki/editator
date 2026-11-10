import { useEffect, useState } from 'react';
import { useStore, type NexoState } from '../store';
import { Icon, type IconName } from './Icon';
import { Modal } from './ui';
import { LeftPanel } from './LeftPanel';
import { Preview } from './Preview';
import { Inspector } from './Inspector';
import { Timeline } from './Timeline';
import { ExportModal } from './ExportModal';
import { engine } from '../engine/render';

const ACTIVITY: { id: NexoState['activePanel']; icon: IconName; label: string }[] = [
  { id: 'media', icon: 'grid', label: 'Mídia' },
  { id: 'text', icon: 'type', label: 'Texto' },
  { id: 'filters', icon: 'filter', label: 'Filtros' },
  { id: 'effects', icon: 'sparkles', label: 'Efeitos' },
  { id: 'transitions', icon: 'transition', label: 'Transições' },
  { id: 'audio', icon: 'music', label: 'Áudio' },
];

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const rows = [
    ['Espaço', 'Reproduzir / pausar'],
    ['S', 'Dividir clipe no cursor'],
    ['Delete', 'Excluir clipe selecionado'],
    ['Ctrl + D', 'Duplicar clipe'],
    ['Ctrl + Z', 'Desfazer'],
    ['Ctrl + Y', 'Refazer'],
    ['Ctrl + S', 'Salvar projeto'],
    ['← / →', 'Avançar / retroceder um quadro'],
    ['Home / End', 'Ir para o início / fim'],
    ['Arrastar bordas', 'Aparar duração do clipe'],
  ];
  return (
    <Modal title="Atalhos de teclado" onClose={onClose} width={420} footer={<button className="btn btn-primary" onClick={onClose}>Entendi</button>}>
      {rows.map(([k, desc]) => (
        <div key={k} className="shortcut-row">
          <span style={{ color: 'var(--text-2)' }}>{desc}</span>
          <span className="kbd">{k}</span>
        </div>
      ))}
    </Modal>
  );
}

export function Editor() {
  const project = useStore((s) => s.project);
  const activePanel = useStore((s) => s.activePanel);
  const setActivePanel = useStore((s) => s.setActivePanel);
  const dirty = useStore((s) => s.dirty);
  const lastSaved = useStore((s) => s.lastSaved);
  const saveCurrent = useStore((s) => s.saveCurrent);
  const closeProject = useStore((s) => s.closeProject);
  const renameProject = useStore((s) => s.renameProject);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [showExport, setShowExport] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [title, setTitle] = useState(project?.name ?? '');

  useEffect(() => { setTitle(project?.name ?? ''); }, [project?.id, project?.name]);

  // Atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return;
      const s = useStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.code === 'Space') { e.preventDefault(); engine.resumeAudio(); s.togglePlay(); }
      else if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); }
      else if (ctrl && e.key.toLowerCase() === 'y') { e.preventDefault(); s.redo(); }
      else if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); s.saveCurrent(); }
      else if (ctrl && e.key.toLowerCase() === 'd') { e.preventDefault(); if (s.selectedClipId) s.duplicateClip(s.selectedClipId); }
      else if (e.key.toLowerCase() === 's' && !ctrl) { if (s.selectedClipId) s.splitClip(s.selectedClipId, s.currentTime); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (s.selectedClipId) { e.preventDefault(); s.deleteClip(s.selectedClipId); } }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); s.seek(s.currentTime - (e.shiftKey ? 1 : 1 / (s.project?.fps ?? 30))); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); s.seek(s.currentTime + (e.shiftKey ? 1 : 1 / (s.project?.fps ?? 30))); }
      else if (e.key === 'Home') { s.seek(0); }
      else if (e.key === 'End') { s.seek(s.project?.duration ?? 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Salvamento automático
  useEffect(() => {
    if (!settings.autosave) return;
    const id = setInterval(() => {
      const s = useStore.getState();
      if (s.dirty && s.project && !s.exporting) s.saveCurrent(true);
    }, settings.autosaveInterval * 1000);
    return () => clearInterval(id);
  }, [settings.autosave, settings.autosaveInterval]);

  useEffect(() => {
    const onUnload = () => { const s = useStore.getState(); if (s.dirty && s.project) s.saveCurrent(true); };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  if (!project) return null;

  const commitTitle = () => {
    if (title.trim() && title !== project.name) renameProject(project.id, title.trim());
    else setTitle(project.name);
  };

  return (
    <div className="editor">
      <div className="topbar">
        <button className="icon-btn" data-tip="Voltar aos projetos" onClick={closeProject}><Icon name="arrowLeft" size={18} /></button>
        <div className="brand-mini">
          <div className="brand-logo"><Icon name="film" size={15} color="#fff" /></div>
          <b>NEXO</b>
        </div>
        <div className="topbar-divider" />
        <input className="project-title-input" value={title} onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        <div className="save-status">
          <span className={`save-dot ${dirty ? 'dirty' : ''}`} />
          {dirty ? 'Alterações não salvas' : lastSaved ? 'Salvo' : 'Novo'}
        </div>
        <div className="spacer" />
        <button className="icon-btn" data-tip="Atalhos de teclado" onClick={() => setShowShortcuts(true)}><Icon name="info" size={17} /></button>
        <button className="icon-btn" data-tip={settings.theme === 'dark' ? 'Tema claro' : 'Tema escuro'} onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}>
          <Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} size={17} />
        </button>
        <div className="topbar-divider" />
        <button className="btn btn-sm" onClick={() => saveCurrent()}><Icon name="save" size={15} /> Salvar</button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowExport(true)}><Icon name="export" size={15} /> Exportar</button>
      </div>

      <div className="editor-body">
        <div className="activity-bar">
          {ACTIVITY.map((a) => (
            <button key={a.id} className={`activity-btn ${activePanel === a.id ? 'active' : ''}`} data-tip={a.label} onClick={() => setActivePanel(a.id)}>
              <Icon name={a.icon} size={20} />
            </button>
          ))}
        </div>
        <LeftPanel />
        <div className="center-col">
          <Preview />
        </div>
        <Inspector />
      </div>

      <Timeline />

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}