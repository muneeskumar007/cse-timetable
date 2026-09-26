import React from 'react';
import { DataProvider, useData } from './context/DataContext';
import { useUiStore } from './stores/uiStore';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { FacultyPage } from './pages/FacultyPage';
import { YearsPage } from './pages/YearsPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { RoomsPage } from './pages/RoomsPage';
import { LabsPage } from './pages/LabsPage';
import { FixedAssignmentsPage } from './pages/FixedAssignmentsPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { EditorPage } from './pages/EditorPage';
import { SectionVerificationPage } from './pages/SectionVerificationPage';
import { FacultyTimetablePage } from './pages/FacultyTimetablePage';
import { FacultyAvailabilityPage } from './pages/FacultyAvailabilityPage';
import { ExportsPage } from './pages/ExportsPage';
import { BackupPage } from './pages/BackupPage';
import { SettingsPage } from './pages/SettingsPage';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentPage } = useUiStore();
  const { isCloudReady } = useData();

  if (!isCloudReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
          <p className="text-sm font-semibold tracking-wide text-slate-200">
            Connecting to Cloud Database...
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
      case 'fixed_assignments':
        return <FixedAssignmentsPage />;
      case 'generator':
        return <GeneratorPage />;
      case 'editor':
        return <EditorPage />;
      case 'section_verification':
        return <SectionVerificationPage />;
      case 'faculty_timetable':
        return <FacultyTimetablePage />;
      case 'faculty_availability':
        return <FacultyAvailabilityPage />;
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

export const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;
