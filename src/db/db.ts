import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { MediaAsset, Project, ProjectMeta, Settings } from '../types';

interface NexoDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-updated': number };
  };
  media: {
    key: string;
    value: { projectId: string; asset: MediaAsset };
    indexes: { 'by-project': string };
  };
  blobs: {
    key: string;
    value: { id: string; blob: Blob };
  };
  settings: {
    key: string;
    value: Settings;
  };
}

let dbPromise: Promise<IDBPDatabase<NexoDB>> | null = null;

function getDB(): Promise<IDBPDatabase<NexoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NexoDB>('nexo-editor', 1, {
      upgrade(db) {
        const projects = db.createObjectStore('projects', { keyPath: 'id' });
        projects.createIndex('by-updated', 'updatedAt');
        const media = db.createObjectStore('media', { keyPath: 'asset.id' });
        media.createIndex('by-project', 'projectId');
        db.createObjectStore('blobs', { keyPath: 'id' });
        db.createObjectStore('settings');
      },
    });
  }
  return dbPromise;
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  await db.put('projects', project);
}

export async function loadProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
  const mediaKeys = await db.getAllKeysFromIndex('media', 'by-project', id);
  const tx = db.transaction(['media', 'blobs'], 'readwrite');
  for (const key of mediaKeys) {
    await tx.objectStore('media').delete(key);
    await tx.objectStore('blobs').delete(key);
  }
  await tx.done;
}

export async function listProjectMeta(): Promise<ProjectMeta[]> {
  const db = await getDB();
  const all = await db.getAll('projects');
  return all
    .map((p) => ({
      id: p.id,
      name: p.name,
      width: p.width,
      height: p.height,
      fps: p.fps,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
      clipCount: p.clips.length,
      duration: p.duration,
      thumbnail: p.thumbnail,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveMedia(projectId: string, asset: MediaAsset, blob: Blob): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['media', 'blobs'], 'readwrite');
  await tx.objectStore('media').put({ projectId, asset });
  await tx.objectStore('blobs').put({ id: asset.id, blob });
  await tx.done;
}

export async function loadMediaForProject(projectId: string): Promise<MediaAsset[]> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('media', 'by-project', projectId);
  return rows.map((r) => r.asset);
}

export async function loadBlob(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  const row = await db.get('blobs', id);
  return row?.blob;
}

export async function deleteMedia(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['media', 'blobs'], 'readwrite');
  await tx.objectStore('media').delete(id);
  await tx.objectStore('blobs').delete(id);
  await tx.done;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  autosave: true,
  autosaveInterval: 15,
  snap: true,
  defaultResolution: '1080p',
  defaultFps: 30,
  showWaveforms: true,
};

export async function loadSettings(): Promise<Settings> {
  const db = await getDB();
  const s = await db.get('settings', 'app');
  return s ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings, 'app');
}

export { DEFAULT_SETTINGS };