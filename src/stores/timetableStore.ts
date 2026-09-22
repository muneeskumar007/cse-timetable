import { create } from 'zustand';
import { db } from '../db/database';
import type { TimetableEntry, TimetableVersion } from '../types';

interface TimetableStoreState {
  isGenerating: boolean;
  generationStep: string;
  generationProgress: number;
  diagnostics: string[];
  stagedEntries: TimetableEntry[];
  hasUnsavedChanges: boolean;

  setGenerating: (isGenerating: boolean, step?: string, progress?: number) => void;
  setDiagnostics: (diagnostics: string[]) => void;
  setStagedEntries: (entries: TimetableEntry[], markUnsaved?: boolean) => void;
  loadSavedEntries: (entries: TimetableEntry[]) => void;
  saveCurrentTimetable: () => Promise<void>;
  resetToGenerated: () => Promise<boolean>;
  restoreVersion: (version: TimetableVersion) => Promise<void>;
}

export const useTimetableStore = create<TimetableStoreState>((set, get) => ({
  isGenerating: false,
  generationStep: '',
  generationProgress: 0,
  diagnostics: [],
  stagedEntries: [],
  hasUnsavedChanges: false,

  setGenerating: (isGenerating, step = '', progress = 0) =>
    set({ isGenerating, generationStep: step, generationProgress: progress }),

  setDiagnostics: (diagnostics) => set({ diagnostics }),

  setStagedEntries: (entries, markUnsaved = true) =>
    set({ stagedEntries: entries, hasUnsavedChanges: markUnsaved }),

  loadSavedEntries: (entries) =>
    set({ stagedEntries: entries, hasUnsavedChanges: false }),

  saveCurrentTimetable: async () => {
    const entries = get().stagedEntries;
    if (entries.length === 0) return;

    await db.transaction('rw', [db.timetableEntries, db.timetableVersions], async () => {
      await db.timetableEntries.clear();
      await db.timetableEntries.bulkAdd(entries);

      // Create snapshot version
      const currentVersionCount = await db.timetableVersions.count();
      const newVersion: TimetableVersion = {
        id: `ver_${Date.now()}`,
        versionNumber: currentVersionCount + 1,
        name: `Version ${currentVersionCount + 1}`,
        timestamp: new Date().toLocaleString(),
        isCurrent: true,
        isGenerated: false,
        entries: [...entries],
      };
      await db.timetableVersions.add(newVersion);
    });

    set({ hasUnsavedChanges: false });
  },

  resetToGenerated: async () => {
    const generated = await db.generatedTimetableEntries.toArray();
    if (generated.length === 0) return false;

    await db.transaction('rw', [db.timetableEntries], async () => {
      await db.timetableEntries.clear();
      await db.timetableEntries.bulkAdd(generated);
    });

    set({ stagedEntries: generated, hasUnsavedChanges: false });
    return true;
  },

  restoreVersion: async (version: TimetableVersion) => {
    await db.transaction('rw', [db.timetableEntries], async () => {
      await db.timetableEntries.clear();
      await db.timetableEntries.bulkAdd(version.entries);
    });

    set({ stagedEntries: version.entries, hasUnsavedChanges: false });
  },
}));
