import React from 'react';
import { useUiStore, type AppPage } from '../../stores/uiStore';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  FlaskConical,
  Wand2,
  CalendarRange,
  UserCheck,
  FileSpreadsheet,
  Database,
  Settings,
} from 'lucide-react';

interface NavItem {
  id: AppPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { currentPage, setPage } = useUiStore();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'faculty', label: 'Faculty Master', icon: Users },
    { id: 'years', label: 'Academic Years', icon: GraduationCap },
    { id: 'subjects', label: 'Subject Allotment', icon: BookOpen },
    { id: 'rooms', label: 'Room Management', icon: Building2 },
    { id: 'labs', label: 'Lab Sessions', icon: FlaskConical },
    { id: 'generator', label: 'Generate Timetable', icon: Wand2 },
    { id: 'editor', label: 'Timetable Editor', icon: CalendarRange },
    { id: 'faculty_timetable', label: 'Faculty Timetable', icon: UserCheck },
    { id: 'exports', label: 'Excel / PDF Export', icon: FileSpreadsheet },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/20">
          CSE
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight tracking-tight">
            Smart Timetable
          </h1>
          <p className="text-xs text-indigo-400 font-medium">Computer Science Dept</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Core Management
        </div>

        {navItems.slice(0, 6).map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Timetable & Schedules
        </div>

        {navItems.slice(6, 10).map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          System & Data
        </div>

        {navItems.slice(10).map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Local-first status footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Local IndexedDB Ready</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Single Operator • Zero Cloud</p>
      </div>
    </aside>
  );
};
