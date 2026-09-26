import { create } from 'zustand';
import { cloudService } from '../services/cloudService';
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
  saveCurrentTimetable: () => Promise<TimetableVersion | null>;
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
    if (entries.length === 0) return null;

    const count = await db.timetableVersions.count();
    const newVersion = await cloudService.timetable.saveCurrent(entries, count);

    set({ hasUnsavedChanges: false });
    return newVersion;
  },

  resetToGenerated: async () => {
    const generated = await cloudService.timetable.resetToGenerated();
    if (!generated || generated.length === 0) return false;

    set({ stagedEntries: generated, hasUnsavedChanges: false });
    return true;
  },

  restoreVersion: async (version: TimetableVersion) => {
    await cloudService.timetable.restoreVersion(version);
    set({ stagedEntries: version.entries, hasUnsavedChanges: false });
  },
}));
