import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { NewProjectWizard } from './components/NewProjectWizard';
import { Workspace } from './components/Workspace';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ToastContainer } from './components/ToastContainer';

export function App() {
  const { init, view } = useAppStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header />
      <div className="flex-1">
        {view === 'dashboard' && <Dashboard />}
        {view === 'wizard' && <NewProjectWizard />}
        {view === 'workspace' && <Workspace />}
      </div>
      <ApiKeyModal />
      <ToastContainer />
    </div>
  );
}

export default App;
