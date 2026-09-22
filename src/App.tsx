import React, { useEffect, useState } from 'react';
import { initializeDatabase } from './db/seedData';
import { useUiStore } from './stores/uiStore';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { FacultyPage } from './pages/FacultyPage';
import { YearsPage } from './pages/YearsPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { RoomsPage } from './pages/RoomsPage';
import { LabsPage } from './pages/LabsPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { EditorPage } from './pages/EditorPage';
import { FacultyTimetablePage } from './pages/FacultyTimetablePage';
import { ExportsPage } from './pages/ExportsPage';
import { BackupPage } from './pages/BackupPage';
import { SettingsPage } from './pages/SettingsPage';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const { currentPage } = useUiStore();
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsDbReady(true))
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        setIsDbReady(true);
      });
  }, []);

  if (!isDbReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
          <p className="text-sm font-semibold tracking-wide text-slate-200">
            Initializing Local Database...
          </p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'faculty':
        return <FacultyPage />;
      case 'years':
        return <YearsPage />;
      case 'subjects':
        return <SubjectsPage />;
      case 'rooms':
        return <RoomsPage />;
      case 'labs':
        return <LabsPage />;
      case 'generator':
        return <GeneratorPage />;
      case 'editor':
        return <EditorPage />;
      case 'faculty_timetable':
        return <FacultyTimetablePage />;
      case 'exports':
        return <ExportsPage />;
      case 'backup':
        return <BackupPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return <AppLayout>{renderPage()}</AppLayout>;
};

export default App;
