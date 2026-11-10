import { useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon } from './Icon';
import { Modal, Field } from './ui';
import { RESOLUTIONS, FPS_OPTIONS, formatBytes } from '../lib/utils';
import { startExport, supportedFormats, saveBlob, type ExportHandle, type ExportOptions } from '../engine/export';
import { engine } from '../engine/render';

export function ExportModal({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)!;
  const showToast = useStore((s) => s.showToast);
  const formats = useMemo(() => supportedFormats(), []);
  const [format, setFormat] = useState<'webm' | 'mp4'>(formats.some((f) => f.format === 'mp4') ? 'mp4' : 'webm');
  const [res, setRes] = useState('1080p');
  const [fps, setFps] = useState(project.fps);
  const [quality, setQuality] = useState<ExportOptions['quality']>('high');
  const [fileName, setFileName] = useState(project.name.replace(/[^\w\s-]/g, '').trim() || 'nexo-video');
  const [phase, setPhase] = useState<'idle' | 'exporting' | 'saving' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [resultSize, setResultSize] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const handleRef = useRef<ExportHandle | null>(null);

  const r = RESOLUTIONS[res];

  const begin = async () => {
    setPhase('exporting');
    setProgress(0);
    useStore.getState().pause();
    useStore.setState({ exporting: true });
    const options: ExportOptions = { format, width: r.width, height: r.height, fps, quality, fileName: `${fileName}.${format}` };
    const handle = startExport(project, options, setProgress);
    handleRef.current = handle;
    try {
      const { blob, ext } = await handle.done;
      useStore.setState({ exporting: false });
      setPhase('saving');
      setResultSize(blob.size);
      const saved = await saveBlob(blob, `${fileName}.${ext}`);
      setPhase('done');
      showToast(saved === 'saved' ? 'Vídeo exportado e salvo' : 'Vídeo exportado (download iniciado)', 'success');
    } catch (e) {
      useStore.setState({ exporting: false });
      if ((e as Error).message === 'cancelled' || (e as Error).name === 'AbortError') {
        setPhase('idle');
        showToast('Exportação cancelada', 'info');
      } else {
        setPhase('error');
        setErrorMsg((e as Error).message);
      }
    }
  };

  const cancel = () => {
    handleRef.current?.cancel();
    useStore.setState({ exporting: false });
    setPhase('idle');
  };

  const close = () => {
    if (phase === 'exporting') handleRef.current?.cancel();
    useStore.setState({ exporting: false });
    onClose();
  };

  return (
    <Modal title="Exportar vídeo" onClose={close} width={480} footer={
      phase === 'idle' ? (
        <>
          <button className="btn" onClick={close}>Cancelar</button>
          <button className="btn btn-primary" onClick={begin}><Icon name="export" size={16} /> Exportar</button>
        </>
      ) : phase === 'exporting' ? (
        <button className="btn btn-danger" onClick={cancel}><Icon name="close" size={16} /> Cancelar exportação</button>
      ) : phase === 'done' ? (
        <button className="btn btn-primary" onClick={close}>Concluído</button>
      ) : phase === 'error' ? (
        <>
          <button className="btn" onClick={close}>Fechar</button>
          <button className="btn btn-primary" onClick={() => setPhase('idle')}>Tentar novamente</button>
        </>
      ) : undefined
    }>
      {phase === 'idle' && (
        <>
          <div className="export-summary">
            <div className="icon-wrap"><Icon name="film" size={22} /></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{project.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{r.width}×{r.height} • {fps} fps • {project.clips.length} clipes</div>
            </div>
          </div>
          <Field label="Formato">
            <div className="segmented">
              <button className={format === 'mp4' ? 'active' : ''} disabled={!formats.some((f) => f.format === 'mp4')} onClick={() => setFormat('mp4')}>MP4 (H.264)</button>
              <button className={format === 'webm' ? 'active' : ''} onClick={() => setFormat('webm')}>WebM (VP9)</button>
            </div>
            {!formats.some((f) => f.format === 'mp4') && <small className="muted" style={{ fontSize: 10.5 }}>MP4 não suportado neste navegador — use WebM.</small>}
          </Field>
          <Field label="Resolução">
            <select className="select" value={res} onChange={(e) => setRes(e.target.value)}>
              {['720p', '1080p', '1440p', '4k'].map((k) => <option key={k} value={k}>{RESOLUTIONS[k].label} — {RESOLUTIONS[k].width}×{RESOLUTIONS[k].height}</option>)}
            </select>
          </Field>
          <Field label="Taxa de quadros">
            <div className="segmented">
              {FPS_OPTIONS.map((f) => <button key={f} className={fps === f ? 'active' : ''} onClick={() => setFps(f)}>{f} fps</button>)}
            </div>
          </Field>
          <Field label="Qualidade">
            <select className="select" value={quality} onChange={(e) => setQuality(e.target.value as ExportOptions['quality'])}>
              <option value="low">Baixa (arquivo menor)</option>
              <option value="medium">Média</option>
              <option value="high">Alta (recomendado)</option>
              <option value="max">Máxima</option>
            </select>
          </Field>
          <Field label="Nome do arquivo">
            <input className="input" value={fileName} onChange={(e) => setFileName(e.target.value)} />
          </Field>
          <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4 }}>
            <Icon name="info" size={14} style={{ flexShrink: 0, marginTop: 1, color: 'var(--info)' }} />
            A exportação renderiza em tempo real com áudio. Ao concluir, escolha a pasta de destino na janela do sistema (ou o arquivo será baixado).
          </div>
        </>
      )}

      {(phase === 'exporting' || phase === 'saving') && (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div className="export-progress-pct">{Math.round(progress * 100)}%</div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress * 100}%` }} /></div>
          <p className="muted" style={{ fontSize: 12.5 }}>
            {phase === 'saving' ? 'Salvando arquivo…' : 'Renderizando vídeo e mixando áudio…'}
          </p>
          <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>Mantenha esta janela aberta até concluir.</p>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Icon name="check" size={32} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Exportação concluída!</div>
          <p className="muted" style={{ fontSize: 12.5 }}>{fileName}.{format} • {formatBytes(resultSize)}</p>
        </div>
      )}

      {phase === 'error' && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(248,113,113,0.15)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Icon name="warning" size={30} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Falha na exportação</div>
          <p className="muted" style={{ fontSize: 12.5 }}>{errorMsg}</p>
        </div>
      )}
    </Modal>
  );
}