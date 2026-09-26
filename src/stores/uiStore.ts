import { create } from 'zustand';

export type AppPage =
  | 'dashboard'
  | 'faculty'
  | 'years'
  | 'subjects'
  | 'rooms'
  | 'labs'
  | 'fixed_assignments'
  | 'generator'
  | 'editor'
  | 'section_verification'
  | 'faculty_timetable'
  | 'faculty_availability'
  | 'exports'
  | 'backup'
  | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface UiStoreState {
  currentPage: AppPage;
  selectedYearId: string;
  selectedSectionId: string;
  selectedFacultyCode: string;
  toasts: ToastMessage[];
  setPage: (page: AppPage) => void;
  setSelectedYearId: (yearId: string) => void;
  setSelectedSectionId: (sectionId: string) => void;
  setSelectedFacultyCode: (code: string) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  currentPage: 'dashboard',
  selectedYearId: 'year_2',
  selectedSectionId: 'sec_2a',
  selectedFacultyCode: '',
  toasts: [],

  setPage: (page) => set({ currentPage: page }),
  setSelectedYearId: (yearId) => set({ selectedYearId: yearId }),
  setSelectedSectionId: (sectionId) => set({ selectedSectionId: sectionId }),
  setSelectedFacultyCode: (code) => set({ selectedFacultyCode: code }),

  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const duration = toast.duration ?? 4000;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },

  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
