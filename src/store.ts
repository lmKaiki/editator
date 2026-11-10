import { create } from 'zustand';
import type { Clip, MediaAsset, Project, ProjectMeta, Settings, Track } from './types';
import {
  computeDuration, createProject, defaultTextStyle, makeClip, makeTrack, uid, clamp,
} from './lib/utils';
import * as db from './db/db';
import { importFile } from './lib/mediaImport';

interface HistorySnapshot { tracks: Track[]; clips: Clip[]; label: string }

export interface NexoState {
  view: 'home' | 'editor';
  project: Project | null;
  media: MediaAsset[];
  mediaUrls: Record<string, string>;
  selectedClipId: string | null;
  selectedTrackId: string | null;
  currentTime: number;
  isPlaying: boolean;
  zoom: number; // pixels por segundo
  settings: Settings;
  projectList: ProjectMeta[];
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  importing: boolean;
  toast: { id: string; message: string; type: 'info' | 'error' | 'success' } | null;
  dirty: boolean;
  lastSaved: number | null;
  activePanel: 'media' | 'text' | 'effects' | 'transitions' | 'audio' | 'filters';
  exporting: boolean;

  // ciclo de vida
  init: () => Promise<void>;
  refreshProjectList: () => Promise<void>;
  newProject: (name: string, width: number, height: number, fps: number) => Promise<void>;
  openProject: (id: string) => Promise<void>;
  closeProject: () => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  saveCurrent: (silent?: boolean) => Promise<void>;
  updateProjectSettings: (patch: Partial<Pick<Project, 'name' | 'width' | 'height' | 'fps' | 'background'>>) => void;

  // mídia
  importFiles: (files: FileList | File[]) => Promise<void>;
  removeMedia: (id: string) => void;
  getMediaUrl: (id: string) => string | undefined;

  // clipes
  addClipFromMedia: (mediaId: string, trackId?: string, start?: number) => void;
  addTextClip: (trackId?: string, start?: number) => void;
  updateClip: (id: string, patch: Partial<Clip>, record?: boolean) => void;
  updateClipColor: (id: string, patch: Partial<Clip['color']>) => void;
  updateClipText: (id: string, patch: Partial<NonNullable<Clip['text']>>) => void;
  splitClip: (id: string, atTime: number) => void;
  deleteClip: (id: string) => void;
  duplicateClip: (id: string) => void;
  moveClip: (id: string, trackId: string, start: number, record?: boolean) => void;
  trimClip: (id: string, edge: 'left' | 'right', delta: number, record?: boolean) => void;
  mergeClips: (ids: string[]) => void;
  separateAudio: (id: string) => void;
  selectClip: (id: string | null) => void;
  selectTrack: (id: string | null) => void;
  rippleDelete: (id: string) => void;

  // faixas
  addTrack: (kind: 'video' | 'audio') => void;
  updateTrack: (id: string, patch: Partial<Track>) => void;
  removeTrack: (id: string) => void;

  // reprodução
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (t: number) => void;
  setCurrentTime: (t: number) => void;
  setZoom: (z: number) => void;

  // histórico
  undo: () => void;
  redo: () => void;
  beginChange: (label: string) => void;

  // config
  updateSettings: (patch: Partial<Settings>) => void;
  setActivePanel: (p: NexoState['activePanel']) => void;
  showToast: (message: string, type?: 'info' | 'error' | 'success') => void;
}

function snapshot(s: NexoState, label: string): HistorySnapshot {
  return {
    tracks: JSON.parse(JSON.stringify(s.project?.tracks ?? [])),
    clips: JSON.parse(JSON.stringify(s.project?.clips ?? [])),
    label,
  };
}

export const useStore = create<NexoState>((set, get) => {
  const record = (label: string) => {
    const s = get();
    if (!s.project) return;
    const past = [...s.past, snapshot(s, label)].slice(-80);
    set({ past, future: [], dirty: true });
  };

  const commitProject = (patch: Partial<Project>) => {
    const s = get();
    if (!s.project) return;
    const clips = patch.clips ?? s.project.clips;
    const project = { ...s.project, ...patch, duration: computeDuration(clips), updatedAt: Date.now() };
    set({ project, dirty: true });
  };

  return {
    view: 'home',
    project: null,
    media: [],
    mediaUrls: {},
    selectedClipId: null,
    selectedTrackId: null,
    currentTime: 0,
    isPlaying: false,
    zoom: 80,
    settings: db.DEFAULT_SETTINGS,
    projectList: [],
    past: [],
    future: [],
    importing: false,
    toast: null,
    dirty: false,
    lastSaved: null,
    activePanel: 'media',
    exporting: false,

    init: async () => {
      const settings = await db.loadSettings();
      const projectList = await db.listProjectMeta();
      set({ settings, projectList });
      document.documentElement.dataset.theme = settings.theme;
    },

    refreshProjectList: async () => {
      set({ projectList: await db.listProjectMeta() });
    },

    newProject: async (name, width, height, fps) => {
      const project = createProject(name || 'Projeto sem título', width, height, fps);
      await db.saveProject(project);
      set({
        project, media: [], mediaUrls: {}, view: 'editor',
        selectedClipId: null, currentTime: 0, isPlaying: false,
        past: [], future: [], dirty: false, lastSaved: Date.now(),
      });
      await get().refreshProjectList();
    },

    openProject: async (id) => {
      const project = await db.loadProject(id);
      if (!project) { get().showToast('Projeto não encontrado', 'error'); return; }
      const media = await db.loadMediaForProject(id);
      const mediaUrls: Record<string, string> = {};
      for (const m of media) {
        const blob = await db.loadBlob(m.id);
        if (blob) mediaUrls[m.id] = URL.createObjectURL(blob);
      }
      set({
        project, media, mediaUrls, view: 'editor',
        selectedClipId: null, currentTime: 0, isPlaying: false,
        past: [], future: [], dirty: false, lastSaved: project.updatedAt,
      });
    },

    closeProject: async () => {
      if (get().dirty) await get().saveCurrent(true);
      const urls = get().mediaUrls;
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
      set({ view: 'home', project: null, media: [], mediaUrls: {}, isPlaying: false, selectedClipId: null });
      await get().refreshProjectList();
    },

    renameProject: async (id, name) => {
      const p = await db.loadProject(id);
      if (p) { p.name = name; p.updatedAt = Date.now(); await db.saveProject(p); }
      const cur = get().project;
      if (cur && cur.id === id) set({ project: { ...cur, name } });
      await get().refreshProjectList();
    },

    removeProject: async (id) => {
      await db.deleteProject(id);
      await get().refreshProjectList();
      get().showToast('Projeto excluído', 'success');
    },

    saveCurrent: async (silent) => {
      const s = get();
      if (!s.project) return;
      const project = { ...s.project, updatedAt: Date.now() };
      await db.saveProject(project);
      set({ project, dirty: false, lastSaved: Date.now() });
      await get().refreshProjectList();
      if (!silent) get().showToast('Projeto salvo', 'success');
    },

    updateProjectSettings: (patch) => {
      record('Configurações do projeto');
      commitProject(patch);
    },

    importFiles: async (files) => {
      const s = get();
      if (!s.project) return;
      set({ importing: true });
      const arr = Array.from(files);
      let ok = 0;
      for (const file of arr) {
        try {
          const { asset, blob, url } = await importFile(file);
          await db.saveMedia(s.project.id, asset, blob);
          set((st) => ({
            media: [...st.media, asset],
            mediaUrls: { ...st.mediaUrls, [asset.id]: url },
          }));
          ok++;
        } catch (e) {
          get().showToast(`Erro em "${file.name}": ${(e as Error).message}`, 'error');
        }
      }
      set({ importing: false });
      if (ok > 0) get().showToast(`${ok} mídia(s) importada(s)`, 'success');
    },

    removeMedia: (id) => {
      const s = get();
      if (!s.project) return;
      record('Remover mídia');
      const url = s.mediaUrls[id];
      if (url) URL.revokeObjectURL(url);
      const mediaUrls = { ...s.mediaUrls };
      delete mediaUrls[id];
      const clips = s.project.clips.filter((c) => c.mediaId !== id);
      set({ media: s.media.filter((m) => m.id !== id), mediaUrls });
      commitProject({ clips });
      db.deleteMedia(id);
    },

    getMediaUrl: (id) => get().mediaUrls[id],

    addClipFromMedia: (mediaId, trackId, start) => {
      const s = get();
      if (!s.project) return;
      const asset = s.media.find((m) => m.id === mediaId);
      if (!asset) return;
      record('Adicionar clipe');
      const kind = asset.type;
      let track = trackId ? s.project.tracks.find((t) => t.id === trackId) : undefined;
      if (!track) {
        const wantKind = kind === 'audio' ? 'audio' : 'video';
        track = s.project.tracks.find((t) => t.kind === wantKind && !t.locked);
      }
      if (!track) { get().showToast('Nenhuma faixa disponível', 'error'); return; }
      const pos = start ?? get().currentTime;
      const clip = makeClip({
        trackId: track.id, kind, mediaId, start: pos,
        duration: asset.duration || 5, name: asset.name,
      });
      commitProject({ clips: [...s.project.clips, clip] });
      set({ selectedClipId: clip.id });
    },

    addTextClip: (trackId, start) => {
      const s = get();
      if (!s.project) return;
      record('Adicionar texto');
      const track = trackId ? s.project.tracks.find((t) => t.id === trackId) : s.project.tracks.find((t) => t.kind === 'video');
      if (!track) return;
      const clip = makeClip({
        trackId: track.id, kind: 'text', mediaId: null,
        start: start ?? get().currentTime, duration: 4, name: 'Texto',
        text: defaultTextStyle(),
      });
      commitProject({ clips: [...s.project.clips, clip] });
      set({ selectedClipId: clip.id, activePanel: 'text' });
    },

    updateClip: (id, patch, doRecord = true) => {
      const s = get();
      if (!s.project) return;
      if (doRecord) record('Editar clipe');
      const clips = s.project.clips.map((c) => (c.id === id ? { ...c, ...patch } : c));
      commitProject({ clips });
    },

    updateClipColor: (id, patch) => {
      const s = get();
      if (!s.project) return;
      record('Correção de cor');
      const clips = s.project.clips.map((c) => (c.id === id ? { ...c, color: { ...c.color, ...patch } } : c));
      commitProject({ clips });
    },

    updateClipText: (id, patch) => {
      const s = get();
      if (!s.project) return;
      record('Editar texto');
      const clips = s.project.clips.map((c) => (c.id === id && c.text ? { ...c, text: { ...c.text, ...patch } } : c));
      commitProject({ clips });
    },

    splitClip: (id, atTime) => {
      const s = get();
      if (!s.project) return;
      const clip = s.project.clips.find((c) => c.id === id);
      if (!clip) return;
      const rel = atTime - clip.start;
      if (rel <= 0.05 || rel >= clip.duration - 0.05) { get().showToast('Posicione o cursor dentro do clipe para dividir', 'info'); return; }
      record('Dividir clipe');
      const left: Clip = { ...clip, duration: rel };
      const right: Clip = {
        ...clip, id: uid(), start: atTime, duration: clip.duration - rel,
        inPoint: clip.inPoint + rel * clip.speed,
        fadeIn: 0,
      };
      left.fadeOut = 0;
      const clips = s.project.clips.flatMap((c) => (c.id === id ? [left, right] : [c]));
      commitProject({ clips });
      set({ selectedClipId: right.id });
    },

    deleteClip: (id) => {
      const s = get();
      if (!s.project) return;
      record('Excluir clipe');
      commitProject({ clips: s.project.clips.filter((c) => c.id !== id) });
      set({ selectedClipId: null });
    },

    rippleDelete: (id) => {
      const s = get();
      if (!s.project) return;
      const clip = s.project.clips.find((c) => c.id === id);
      if (!clip) return;
      record('Excluir e agrupar');
      const gap = clip.duration;
      const clips = s.project.clips
        .filter((c) => c.id !== id)
        .map((c) => (c.trackId === clip.trackId && c.start >= clip.start + clip.duration - 0.001 ? { ...c, start: c.start - gap } : c));
      commitProject({ clips });
      set({ selectedClipId: null });
    },

    duplicateClip: (id) => {
      const s = get();
      if (!s.project) return;
      const clip = s.project.clips.find((c) => c.id === id);
      if (!clip) return;
      record('Duplicar clipe');
      const copy: Clip = { ...JSON.parse(JSON.stringify(clip)), id: uid(), start: clip.start + clip.duration };
      commitProject({ clips: [...s.project.clips, copy] });
      set({ selectedClipId: copy.id });
    },

    moveClip: (id, trackId, start, doRecord = true) => {
      const s = get();
      if (!s.project) return;
      if (doRecord) record('Mover clipe');
      const clips = s.project.clips.map((c) => (c.id === id ? { ...c, trackId, start: Math.max(0, start) } : c));
      commitProject({ clips });
    },

    trimClip: (id, edge, delta, doRecord = true) => {
      const s = get();
      if (!s.project) return;
      const clip = s.project.clips.find((c) => c.id === id);
      if (!clip) return;
      if (doRecord) record('Aparar clipe');
      const asset = clip.mediaId ? s.media.find((m) => m.id === clip.mediaId) : undefined;
      let { start, duration, inPoint } = clip;
      if (edge === 'left') {
        const maxShift = duration - 0.1;
        const shift = clamp(delta, -inPoint / (clip.speed || 1), maxShift);
        start += shift;
        duration -= shift;
        inPoint += shift * clip.speed;
      } else {
        let newDur = Math.max(0.1, duration + delta);
        if (asset && (clip.kind === 'video' || clip.kind === 'audio') && !clip.freeze) {
          const maxDur = (asset.duration - inPoint) / clip.speed;
          newDur = Math.min(newDur, maxDur);
        }
        duration = newDur;
      }
      const clips = s.project.clips.map((c) => (c.id === id ? { ...c, start: Math.max(0, start), duration, inPoint: Math.max(0, inPoint) } : c));
      commitProject({ clips });
    },

    mergeClips: (ids) => {
      const s = get();
      if (!s.project || ids.length < 2) return;
      const selected = s.project.clips.filter((c) => ids.includes(c.id)).sort((a, b) => a.start - b.start);
      if (selected.length < 2) return;
      const sameTrack = selected.every((c) => c.trackId === selected[0].trackId);
      const sameMedia = selected.every((c) => c.mediaId === selected[0].mediaId && c.mediaId !== null);
      if (!sameTrack || !sameMedia) { get().showToast('Só é possível juntar clipes adjacentes da mesma mídia e faixa', 'info'); return; }
      record('Juntar clipes');
      const first = selected[0];
      const last = selected[selected.length - 1];
      const merged: Clip = { ...first, duration: last.start + last.duration - first.start };
      const clips = s.project.clips.filter((c) => !ids.includes(c.id) || c.id === first.id).map((c) => (c.id === first.id ? merged : c));
      commitProject({ clips });
      set({ selectedClipId: merged.id });
    },

    separateAudio: (id) => {
      const s = get();
      if (!s.project) return;
      const clip = s.project.clips.find((c) => c.id === id);
      if (!clip || clip.kind !== 'video' || !clip.mediaId) { get().showToast('Selecione um clipe de vídeo', 'info'); return; }
      record('Separar áudio');
      const existing = s.project.tracks.find((t) => t.kind === 'audio');
      const audioTrack = existing ?? makeTrack('audio', 1);
      const tracks = existing ? s.project.tracks : [...s.project.tracks, audioTrack];
      const audioClip = makeClip({
        trackId: audioTrack.id, kind: 'audio', mediaId: clip.mediaId,
        start: clip.start, duration: clip.duration, inPoint: clip.inPoint,
        speed: clip.speed, name: `${clip.name} (áudio)`, volume: clip.volume,
      });
      const clips = s.project.clips.map((c) => (c.id === id ? { ...c, muted: true } : c));
      commitProject({ tracks, clips: [...clips, audioClip] });
      get().showToast('Áudio separado para faixa de áudio', 'success');
    },

    selectClip: (id) => set({ selectedClipId: id }),
    selectTrack: (id) => set({ selectedTrackId: id }),

    addTrack: (kind) => {
      const s = get();
      if (!s.project) return;
      record('Adicionar faixa');
      const count = s.project.tracks.filter((t) => t.kind === kind).length + 1;
      const track = makeTrack(kind, count);
      const tracks = kind === 'video' ? [track, ...s.project.tracks] : [...s.project.tracks, track];
      commitProject({ tracks });
    },

    updateTrack: (id, patch) => {
      const s = get();
      if (!s.project) return;
      const tracks = s.project.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t));
      commitProject({ tracks });
    },

    removeTrack: (id) => {
      const s = get();
      if (!s.project) return;
      record('Remover faixa');
      const tracks = s.project.tracks.filter((t) => t.id !== id);
      const clips = s.project.clips.filter((c) => c.trackId !== id);
      commitProject({ tracks, clips });
    },

    play: () => {
      const s = get();
      if (!s.project) return;
      if (s.currentTime >= s.project.duration - 0.05) set({ currentTime: 0 });
      set({ isPlaying: true });
    },
    pause: () => set({ isPlaying: false }),
    togglePlay: () => (get().isPlaying ? get().pause() : get().play()),
    seek: (t) => {
      const s = get();
      const max = s.project?.duration ?? 0;
      set({ currentTime: clamp(t, 0, max) });
    },
    setCurrentTime: (t) => set({ currentTime: t }),
    setZoom: (z) => set({ zoom: clamp(z, 12, 600) }),

    undo: () => {
      const s = get();
      if (!s.project || s.past.length === 0) return;
      const prev = s.past[s.past.length - 1];
      const future = [snapshot(s, prev.label), ...s.future].slice(0, 80);
      const project = { ...s.project, tracks: prev.tracks, clips: prev.clips, duration: computeDuration(prev.clips), updatedAt: Date.now() };
      set({ project, past: s.past.slice(0, -1), future, dirty: true, selectedClipId: null });
    },

    redo: () => {
      const s = get();
      if (!s.project || s.future.length === 0) return;
      const next = s.future[0];
      const past = [...s.past, snapshot(s, next.label)].slice(-80);
      const project = { ...s.project, tracks: next.tracks, clips: next.clips, duration: computeDuration(next.clips), updatedAt: Date.now() };
      set({ project, past, future: s.future.slice(1), dirty: true, selectedClipId: null });
    },

    beginChange: (label) => record(label),

    updateSettings: (patch) => {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      document.documentElement.dataset.theme = settings.theme;
      db.saveSettings(settings);
    },

    setActivePanel: (p) => set({ activePanel: p }),

    showToast: (message, type = 'info') => {
      const id = uid();
      set({ toast: { id, message, type } });
      setTimeout(() => {
        if (get().toast?.id === id) set({ toast: null });
      }, 3600);
    },
  };
});