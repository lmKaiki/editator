import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon } from './Icon';
import { Modal, Field, Toggle } from './ui';
import { RESOLUTIONS, FPS_OPTIONS, formatTime } from '../lib/utils';
import type { ProjectMeta } from '../types';

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const newProject = useStore((s) => s.newProject);
  const settings = useStore((s) => s.settings);
  const [name, setName] = useState('Meu projeto');
  const [res, setRes] = useState(settings.defaultResolution);
  const [fps, setFps] = useState(settings.defaultFps);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setCreating(true);
    const r = RESOLUTIONS[res];
    await newProject(name.trim() || 'Projeto sem título', r.width, r.height, fps);
  };

  return (
    <Modal title="Novo projeto" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={create} disabled={creating}>
          {creating ? <span className="spinner" /> : <Icon name="plus" size={16} />} Criar projeto
        </button>
      </>
    }>
      <Field label="Nome do projeto">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus
          onKeyDown={(e) => e.key === 'Enter' && create()} />
      </Field>
      <Field label="Resolução">
        <select className="select" value={res} onChange={(e) => setRes(e.target.value)}>
          {Object.entries(RESOLUTIONS).map(([k, v]) => (
            <option key={k} value={k}>{v.label} — {v.width}×{v.height}</option>
          ))}
        </select>
      </Field>
      <Field label="Taxa de quadros (FPS)">
        <div className="segmented">
          {FPS_OPTIONS.map((f) => (
            <button key={f} className={fps === f ? 'active' : ''} onClick={() => setFps(f)}>{f} fps</button>
          ))}
        </div>
      </Field>
      <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <Icon name="info" size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--info)' }} />
        Você poderá importar vídeos, imagens e áudios e editar tudo na linha do tempo. O projeto é salvo automaticamente no seu dispositivo.
      </div>
    </Modal>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  return (
    <Modal title="Configurações" onClose={onClose} width={480} footer={<button className="btn btn-primary" onClick={onClose}>Concluído</button>}>
      <div className="section-label">Aparência</div>
      <div className="settings-row">
        <div className="label"><b>Tema</b><small>Alternar entre escuro e claro</small></div>
        <div className="segmented" style={{ width: 160 }}>
          <button className={settings.theme === 'dark' ? 'active' : ''} onClick={() => update({ theme: 'dark' })}><Icon name="moon" size={14} /> Escuro</button>
          <button className={settings.theme === 'light' ? 'active' : ''} onClick={() => update({ theme: 'light' })}><Icon name="sun" size={14} /> Claro</button>
        </div>
      </div>
      <div className="section-label">Projeto</div>
      <div className="settings-row">
        <div className="label"><b>Resolução padrão</b><small>Para novos projetos</small></div>
        <select className="select" style={{ width: 170 }} value={settings.defaultResolution} onChange={(e) => update({ defaultResolution: e.target.value })}>
          {Object.entries(RESOLUTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div className="settings-row">
        <div className="label"><b>FPS padrão</b><small>Para novos projetos</small></div>
        <select className="select" style={{ width: 100 }} value={settings.defaultFps} onChange={(e) => update({ defaultFps: parseInt(e.target.value) })}>
          {FPS_OPTIONS.map((f) => <option key={f} value={f}>{f} fps</option>)}
        </select>
      </div>
      <div className="section-label">Salvamento</div>
      <div className="settings-row">
        <div className="label"><b>Salvamento automático</b><small>Salvar alterações periodicamente</small></div>
        <Toggle on={settings.autosave} onChange={(v) => update({ autosave: v })} />
      </div>
      <div className="settings-row">
        <div className="label"><b>Intervalo</b><small>Segundos entre salvamentos</small></div>
        <select className="select" style={{ width: 100 }} value={settings.autosaveInterval} onChange={(e) => update({ autosaveInterval: parseInt(e.target.value) })}>
          {[5, 10, 15, 30, 60].map((n) => <option key={n} value={n}>{n} s</option>)}
        </select>
      </div>
      <div className="section-label">Linha do tempo</div>
      <div className="settings-row">
        <div className="label"><b>Ajuste magnético</b><small>Clipes se alinham às bordas vizinhas</small></div>
        <Toggle on={settings.snap} onChange={(v) => update({ snap: v })} />
      </div>
      <div className="settings-row">
        <div className="label"><b>Formas de onda</b><small>Exibir ondas nos clipes de áudio</small></div>
        <Toggle on={settings.showWaveforms} onChange={(v) => update({ showWaveforms: v })} />
      </div>
    </Modal>
  );
}

function ProjectCard({ meta, onOpen }: { meta: ProjectMeta; onOpen: () => void }) {
  const [menu, setMenu] = useState(false);
  const renameProject = useStore((s) => s.renameProject);
  const removeProject = useStore((s) => s.removeProject);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [menu]);

  const rename = async () => {
    setMenu(false);
    const name = prompt('Novo nome do projeto:', meta.name);
    if (name && name.trim()) await renameProject(meta.id, name.trim());
  };
  const remove = async () => {
    setMenu(false);
    if (confirm(`Excluir o projeto "${meta.name}"? Esta ação não pode ser desfeita.`)) await removeProject(meta.id);
  };

  return (
    <div className="project-card" onClick={onOpen} ref={ref}>
      <div className="project-thumb">
        {meta.thumbnail ? <img src={meta.thumbnail} alt="" /> : <><div className="thumb-placeholder" /><Icon name="film" size={34} /></>}
        <div className="project-play"><span><Icon name="play" size={20} /></span></div>
      </div>
      <button className="project-menu-btn" onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}>
        <Icon name="more" size={16} />
      </button>
      {menu && (
        <div className="menu-pop" onClick={(e) => e.stopPropagation()}>
          <button onClick={onOpen}><Icon name="folder" size={15} /> Abrir</button>
          <button onClick={rename}><Icon name="edit" size={15} /> Renomear</button>
          <button className="danger" onClick={remove}><Icon name="trash" size={15} /> Excluir</button>
        </div>
      )}
      <div className="project-info">
        <div className="project-name">{meta.name}</div>
        <div className="project-meta">
          <span>{meta.width}×{meta.height}</span>
          <span>•</span>
          <span>{formatTime(meta.duration)}</span>
          <span>•</span>
          <span>{meta.clipCount} clipes</span>
        </div>
        <div className="project-meta" style={{ marginTop: 3 }}>
          <Icon name="clock" size={11} />
          <span>{new Date(meta.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const projectList = useStore((s) => s.projectList);
  const openProject = useStore((s) => s.openProject);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const importFiles = useStore((s) => s.importFiles);
  const [showNew, setShowNew] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [nav, setNav] = useState<'home' | 'recent'>('home');
  const fileRef = useRef<HTMLInputElement>(null);

  const totalClips = projectList.reduce((a, p) => a + p.clipCount, 0);
  const totalDuration = projectList.reduce((a, p) => a + p.duration, 0);

  return (
    <div className="home">
      <div className="home-aurora" />
      <nav className="home-nav">
        <div className="brand">
          <div className="brand-logo"><Icon name="film" size={20} color="#fff" /></div>
          <div>
            <div className="brand-name">NEXO <span>EDITOR</span></div>
            <div className="brand-sub">Video Studio</div>
          </div>
        </div>
        <button className={`nav-item ${nav === 'home' ? 'active' : ''}`} onClick={() => setNav('home')}>
          <Icon name="home" size={18} /><span>Início</span>
        </button>
        <button className={`nav-item ${nav === 'recent' ? 'active' : ''}`} onClick={() => setNav('recent')}>
          <Icon name="clock" size={18} /><span>Recentes</span>
        </button>
        <button className="nav-item" onClick={() => setShowNew(true)}>
          <Icon name="plus" size={18} /><span>Novo projeto</span>
        </button>
        <button className="nav-item" onClick={() => fileRef.current?.click()}>
          <Icon name="import" size={18} /><span>Importar vídeo</span>
        </button>
        <div className="nav-spacer" />
        <button className="nav-item" onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}>
          <Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} size={18} />
          <span>{settings.theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
        </button>
        <button className="nav-item" onClick={() => setShowSettings(true)}>
          <Icon name="settings" size={18} /><span>Configurações</span>
        </button>
      </nav>

      <main className="home-main">
        <div className="home-hero">
          <div>
            <h1>{nav === 'home' ? 'Bem-vindo de volta' : 'Projetos recentes'}</h1>
            <p>Crie, edite e exporte vídeos com qualidade profissional — direto no seu dispositivo.</p>
          </div>
          <div className="home-actions">
            <button className="btn btn-lg" onClick={() => fileRef.current?.click()}><Icon name="import" size={17} /> Importar mídia</button>
            <button className="btn btn-primary btn-lg" onClick={() => setShowNew(true)}><Icon name="plus" size={17} /> Novo projeto</button>
          </div>
        </div>

        {nav === 'home' && (
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon"><Icon name="folder" size={20} /></div>
              <div><div className="stat-value">{projectList.length}</div><div className="stat-label">Projetos</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(59,157,255,0.15)', color: 'var(--accent-2)' }}><Icon name="layers" size={20} /></div>
              <div><div className="stat-value">{totalClips}</div><div className="stat-label">Clipes editados</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--success)' }}><Icon name="clock" size={20} /></div>
              <div><div className="stat-value">{formatTime(totalDuration)}</div><div className="stat-label">Duração total</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--warning)' }}><Icon name="sparkles" size={20} /></div>
              <div><div className="stat-value">4K</div><div className="stat-label">Exportação máx.</div></div>
            </div>
          </div>
        )}

        <div className="section-label" style={{ fontSize: 12, marginBottom: 16 }}>
          <Icon name="grid" size={14} /> {nav === 'home' ? 'Seus projetos' : 'Todos os projetos'}
        </div>

        <div className="projects-grid">
          <button className="new-project-card" onClick={() => setShowNew(true)}>
            <span className="plus-circle"><Icon name="plus" size={24} /></span>
            <b>Criar novo projeto</b>
            <small className="muted" style={{ fontSize: 11 }}>Comece do zero</small>
          </button>
          {projectList.map((p) => (
            <ProjectCard key={p.id} meta={p} onOpen={() => openProject(p.id)} />
          ))}
        </div>

        {projectList.length === 0 && (
          <div style={{ marginTop: 30, padding: '28px', textAlign: 'center', color: 'var(--text-3)', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <Icon name="film" size={36} style={{ opacity: 0.4, marginBottom: 10 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Nenhum projeto ainda</p>
            <p style={{ fontSize: 12.5 }}>Crie seu primeiro projeto para começar a editar. Suas mídias e projetos ficam salvos com segurança neste dispositivo.</p>
          </div>
        )}
      </main>

      <input ref={fileRef} type="file" multiple accept="video/*,image/*,audio/*" style={{ display: 'none' }}
        onChange={async (e) => {
          if (e.target.files?.length) {
            const r = RESOLUTIONS[settings.defaultResolution];
            const { newProject } = useStore.getState();
            await newProject('Projeto importado', r.width, r.height, settings.defaultFps);
            await importFiles(e.target.files);
          }
          e.target.value = '';
        }} />

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}