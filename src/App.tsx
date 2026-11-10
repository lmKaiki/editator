import { useEffect } from 'react';
import { useStore } from './store';
import { Icon } from './components/Icon';
import { HomePage } from './components/HomePage';
import { Editor } from './components/Editor';

export function App() {
  const view = useStore((s) => s.view);
  const init = useStore((s) => s.init);
  const toast = useStore((s) => s.toast);

  useEffect(() => { init(); }, [init]);

  return (
    <div className="app">
      {view === 'home' ? <HomePage /> : <Editor />}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <Icon name={toast.type === 'success' ? 'check' : toast.type === 'error' ? 'warning' : 'info'} size={17} />
          {toast.message}
        </div>
      )}
    </div>
  );
}