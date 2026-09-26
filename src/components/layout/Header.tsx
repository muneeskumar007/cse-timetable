import React, { useState } from 'react';
import { useUiStore, type AppPage } from '../../stores/uiStore';
import { useTimetableStore } from '../../stores/timetableStore';
import { useData } from '../../context/DataContext';
import {
  Save,
  AlertCircle,
  Wand2,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  Globe,
  Radio,
} from 'lucide-react';
import { Button } from '../common/Button';

export const Header: React.FC = () => {
  const { currentPage, setPage, addToast } = useUiStore();
  const { hasUnsavedChanges, stagedEntries } = useTimetableStore();
  const { cloudStatus, metadata, versions, entries, publishTimetable, saveTimetable } = useData();
  const [isPublishing, setIsPublishing] = useState(false);

  const pageTitles: Record<AppPage, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Department overview, capacity, and readiness metrics' },
    faculty: { title: 'Global Faculty Master', subtitle: 'Departmental faculty profiles, weekly workload limits, and assignments' },
    years: { title: 'Academic Years & Sections', subtitle: 'Manage 2nd, 3rd, 4th years, sections A/B/C, and assigned rooms' },
    subjects: { title: 'Subject Allocations', subtitle: 'Upload and manage year-specific subject lists and faculty mappings' },
    rooms: { title: 'Room & Lab Management', subtitle: 'Classrooms and dedicated computer lab facilities' },
    labs: { title: 'Lab Sessions', subtitle: 'Configure Practical (3 periods) and Integrated (2 periods) weekly labs' },
    fixed_assignments: { title: 'Fixed Slot Assignments', subtitle: 'Lock specific Theory, Lab, or Library periods before generating' },
    generator: { title: 'Timetable Generator', subtitle: 'Constraint-satisfaction generation engine with automated conflict prevention' },
    editor: { title: 'Manual Timetable Editor', subtitle: 'Drag-and-drop schedule editing with real-time collision validation' },
    section_verification: { title: 'Timetable Verification', subtitle: 'Department & section completeness, lab continuity, and subject frequency audit' },
    faculty_timetable: { title: 'Faculty Timetable', subtitle: 'View cross-department teaching schedules by individual faculty member' },
    faculty_availability: { title: 'Faculty Free / Busy Availability', subtitle: 'Real-time faculty schedule inspector with substitute finder' },
    exports: { title: 'Export Timetable', subtitle: 'Generate formatted Excel workbooks and landscape PDF reports' },
    backup: { title: 'Backup & Restore', subtitle: 'Local JSON snapshot backups and project reset controls' },
    settings: { title: 'Timetable Settings', subtitle: 'Configure period timings, lunch break, and fixed Unit Test slots' },
  };

  const current = pageTitles[currentPage] || { title: 'Smart Timetable', subtitle: 'CSE Department' };

  const handleQuickSave = async () => {
    try {
      await saveTimetable(stagedEntries);
      addToast({
        type: 'success',
        title: 'Timetable Saved',
        message: 'All manual edits have been committed to the shared cloud database.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Could not save timetable.',
      });
    }
  };

  const handlePublish = async () => {
    if (entries.length === 0 && stagedEntries.length === 0) {
      addToast({
        type: 'error',
        title: 'Cannot Publish',
        message: 'No timetable entries exist to publish. Generate or edit a timetable first.',
      });
      return;
    }

    setIsPublishing(true);
    try {
      // Find latest version or save one
      let verId = metadata.currentPublishedVersionId || versions[0]?.id;
      if (!verId || hasUnsavedChanges) {
        const newVer = await saveTimetable(stagedEntries.length > 0 ? stagedEntries : entries);
        verId = newVer.id;
      }

      await publishTimetable(verId);
      addToast({
        type: 'success',
        title: 'Timetable Published Globally!',
        message: 'This timetable is now the official live schedule visible to all users visiting this app.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Publish Error',
        message: err?.message || 'Could not publish timetable.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const publishedVer = versions.find((v) => v.id === metadata.currentPublishedVersionId);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between flex-shrink-0">
      <div>
        <h2 className="text-lg font-bold text-slate-900 leading-tight">{current.title}</h2>
        <p className="text-xs text-slate-500">{current.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Cloud Status Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-slate-50 border-slate-200 text-slate-600">
          {cloudStatus === 'connected' && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">Cloud Connected</span>
            </>
          )}
          {cloudStatus === 'syncing' && (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              <span className="text-indigo-700 font-semibold">Syncing Cloud...</span>
            </>
          )}
          {cloudStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">Saved to Cloud</span>
            </>
          )}
          {cloudStatus === 'fallback' && (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-amber-800 font-semibold">Local / Demo Mode</span>
            </>
          )}
          {cloudStatus === 'offline' && (
            <>
              <CloudOff className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-rose-700 font-semibold">Offline</span>
            </>
          )}
        </div>

        {/* Published Status Pill */}
        {metadata.currentPublishedVersionId && (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span>Live: {publishedVer ? publishedVer.name : 'Published'}</span>
          </div>
        )}

        {/* Publish Action Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={handlePublish}
          isLoading={isPublishing}
          icon={<Globe className="w-3.5 h-3.5 text-emerald-600" />}
        >
          Publish
        </Button>

        {/* Unsaved Edits Badge */}
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
