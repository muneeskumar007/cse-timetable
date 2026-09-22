import React from 'react';
import { useUiStore, type AppPage } from '../../stores/uiStore';
import { useTimetableStore } from '../../stores/timetableStore';
import { Save, AlertCircle, Wand2 } from 'lucide-react';
import { Button } from '../common/Button';

export const Header: React.FC = () => {
  const { currentPage, setPage, addToast } = useUiStore();
  const { hasUnsavedChanges, saveCurrentTimetable } = useTimetableStore();

  const pageTitles: Record<AppPage, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Department overview, capacity, and readiness metrics' },
    faculty: { title: 'Global Faculty Master', subtitle: 'Departmental faculty profiles, weekly workload limits, and assignments' },
    years: { title: 'Academic Years & Sections', subtitle: 'Manage 2nd, 3rd, 4th years, sections A/B/C, and assigned rooms' },
    subjects: { title: 'Subject Allocations', subtitle: 'Upload and manage year-specific subject lists and faculty mappings' },
    rooms: { title: 'Room & Lab Management', subtitle: 'Classrooms and dedicated computer lab facilities' },
    labs: { title: 'Lab Sessions', subtitle: 'Configure Practical (3 periods) and Integrated (2 periods) weekly labs' },
    generator: { title: 'Timetable Generator', subtitle: 'Constraint-satisfaction generation engine with automated conflict prevention' },
    editor: { title: 'Manual Timetable Editor', subtitle: 'Drag-and-drop schedule editing with real-time collision validation' },
    faculty_timetable: { title: 'Faculty Timetable', subtitle: 'View cross-department teaching schedules by individual faculty member' },
    exports: { title: 'Export Timetable', subtitle: 'Generate formatted Excel workbooks and landscape PDF reports' },
    backup: { title: 'Backup & Restore', subtitle: 'Local JSON snapshot backups and project reset controls' },
    settings: { title: 'Timetable Settings', subtitle: 'Configure period timings, lunch break, and fixed Unit Test slots' },
  };

  const current = pageTitles[currentPage] || { title: 'Smart Timetable', subtitle: 'CSE Department' };

  const handleQuickSave = async () => {
    try {
      await saveCurrentTimetable();
      addToast({
        type: 'success',
        title: 'Timetable Saved',
        message: 'All manual edits have been committed as the current saved timetable.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Could not save timetable.',
      });
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between flex-shrink-0">
      <div>
        <h2 className="text-lg font-bold text-slate-900 leading-tight">{current.title}</h2>
        <p className="text-xs text-slate-500">{current.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-1.5 rounded-lg animate-pulse">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-semibold">Unsaved edits</span>
            <Button size="sm" variant="primary" onClick={handleQuickSave} icon={<Save className="w-3.5 h-3.5" />}>
              Save
            </Button>
          </div>
        )}

        {currentPage !== 'generator' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage('generator')}
            icon={<Wand2 className="w-3.5 h-3.5 text-indigo-600" />}
          >
            Generator
          </Button>
        )}
      </div>
    </header>
  );
};
