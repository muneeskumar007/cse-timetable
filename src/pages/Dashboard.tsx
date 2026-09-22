import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { TimetableGrid } from '../components/timetable/TimetableGrid';
import { useUiStore } from '../stores/uiStore';
import { checkGenerationReadiness } from '../timetable/readiness';
import { exportTimetableToPdf } from '../services/pdfService';
import { exportTimetableToExcel } from '../services/excelService';
import {
  GraduationCap,
  Users,
  BookOpen,
  Building2,
  FlaskConical,
  Wand2,
  CalendarRange,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    selectedYearId,
    setSelectedYearId,
    selectedSectionId,
    setSelectedSectionId,
    setPage,
  } = useUiStore();

  const years = useLiveQuery(() => db.academicYears.orderBy('orderIndex').toArray(), []) || [];
  const activeYearId = selectedYearId || years[0]?.id;
  const currentYear = years.find((y) => y.id === activeYearId) || years[0];

  const sections = useLiveQuery(
    () => (activeYearId ? db.sections.where('yearId').equals(activeYearId).toArray() : []),
    [activeYearId]
  ) || [];
  const activeSectionId = selectedSectionId || sections[0]?.id;
  const currentSection = sections.find((s) => s.id === activeSectionId) || sections[0];

  const faculty = useLiveQuery(() => db.faculty.toArray(), []) || [];
  const allSections = useLiveQuery(() => db.sections.toArray(), []) || [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) || [];
  const assignments = useLiveQuery(() => db.subjectAssignments.toArray(), []) || [];
  const labs = useLiveQuery(() => db.labs.toArray(), []) || [];
  const periods = useLiveQuery(() => db.periodConfigs.orderBy('periodNumber').toArray(), []) || [];
  const fixedSlots = useLiveQuery(() => db.fixedSlots.toArray(), []) || [];
  const entries = useLiveQuery(() => db.timetableEntries.toArray(), []) || [];
  const versions = useLiveQuery(() => db.timetableVersions.toArray(), []) || [];
  const settingsList = useLiveQuery(() => db.settings.toArray(), []) || [];

  const settings = settingsList[0] || {
    id: 'default',
    departmentName: 'Computer Science and Engineering',
    collegeName: 'Department of Computer Science and Engineering',
    academicYear: '2026-2027',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    periodsPerFullDay: 7,
    periodsOnSaturday: 4,
    lunchAfterPeriod: 4,
  };

  const readiness = checkGenerationReadiness({
    years,
    sections: allSections,
    faculty,
    assignments,
    labs,
    rooms,
    fixedSlots,
    settings,
  });

  const sectionEntries = entries.filter((e) => e.sectionId === currentSection?.id);

  const handleExportPdf = () => {
    if (!currentYear || !currentSection) return;
    exportTimetableToPdf(sectionEntries, {
      departmentName: settings.departmentName,
      title: `CLASS TIMETABLE — ${currentYear.yearName} (Section ${currentSection.sectionName})`,
      subtitle: `Classroom: Room ${currentSection.roomNumber || 'TBD'} | Academic Year: ${settings.academicYear}`,
      periods,
      fileName: `Timetable_${currentYear.yearName.replace(/\s+/g, '_')}_Sec_${currentSection.sectionName}.pdf`,
    });
  };

  const handleExportExcel = () => {
    if (!currentYear || !currentSection) return;
    exportTimetableToExcel(sectionEntries, {
      departmentName: settings.departmentName,
      title: `CLASS TIMETABLE — ${currentYear.yearName} Section ${currentSection.sectionName}`,
      periods,
      fileName: `Timetable_${currentYear.yearName.replace(/\s+/g, '_')}_Sec_${currentSection.sectionName}.xlsx`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider border border-indigo-400/30">
              Department of CSE
            </span>
            <span className="text-xs text-slate-400">• Academic Year {settings.academicYear}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">{settings.departmentName}</h1>
          <p className="text-slate-300 text-xs max-w-2xl mt-1.5 leading-relaxed">
            Local-first automated schedule orchestration. Guaranteed zero faculty collisions, strict 3-period continuous practical labs, protected unit test blocks, and instantaneous conflict-checked drag-and-drop editing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-800"
            size="sm"
            onClick={() => setPage('editor')}
            icon={<CalendarRange className="w-4 h-4 text-indigo-400" />}
          >
            Timetable Editor
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setPage('generator')}
            icon={<Wand2 className="w-4 h-4" />}
          >
            Generator Studio
          </Button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div
          onClick={() => setPage('years')}
          className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <GraduationCap className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-400 uppercase">Years</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{years.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">{allSections.length} Sections total</span>
        </div>

        <div
          onClick={() => setPage('faculty')}
          className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-400 uppercase">Faculty</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{faculty.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Global Master Roster</span>
        </div>

        <div
          onClick={() => setPage('subjects')}
          className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <BookOpen className="w-5 h-5 text-sky-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-400 uppercase">Allocations</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{assignments.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Across all sections</span>
        </div>

        <div
          onClick={() => setPage('rooms')}
          className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <Building2 className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-400 uppercase">Rooms</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{rooms.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Halls & Facilities</span>
        </div>

        <div
          onClick={() => setPage('labs')}
          className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <FlaskConical className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-400 uppercase">Labs</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{labs.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Practical & Integrated</span>
        </div>

        <div
          onClick={() => setPage('generator')}
          className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <Clock className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-400 uppercase">Schedule</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{entries.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Active scheduled slots</span>
        </div>
      </div>

      {/* Readiness & System Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          {readiness.isReady ? (
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Timetable Generation Status</span>
              <Badge variant={readiness.isReady ? 'emerald' : 'amber'}>
                {readiness.isReady ? 'Ready for Generator' : 'Action Required'}
              </Badge>
              {entries.length > 0 && <Badge variant="indigo">Live Timetable Active</Badge>}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {readiness.isReady
                ? 'All department prerequisites verified. Ready to compute clash-free schedules.'
                : 'Some prerequisites need attention before generating the department timetable.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!readiness.isReady && (
            <Button size="sm" variant="outline" onClick={() => setPage('generator')}>
              View Checklist
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            onClick={() => setPage('generator')}
            icon={<Wand2 className="w-3.5 h-3.5" />}
          >
            {entries.length > 0 ? 'Regenerate' : 'Generate Timetable'}
          </Button>
        </div>
      </div>

      {/* Class Timetable Grid Display Card */}
      <Card
        title={
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-900 text-base">Class Timetable View</span>
            {currentYear && currentSection && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {currentYear.yearName} — Section {currentSection.sectionName} (Room {currentSection.roomNumber || 'TBD'})
              </span>
            )}
          </div>
        }
        subtitle="Department lecture schedule by academic year and section"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={sectionEntries.length === 0}
              icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
            >
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={sectionEntries.length === 0}
              icon={<Download className="w-3.5 h-3.5 text-rose-600" />}
            >
              PDF
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setPage('editor')}
              icon={<CalendarRange className="w-3.5 h-3.5" />}
            >
              Edit Schedule
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Year and Section Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Year:</span>
              <div className="flex items-center gap-1">
                {years.map((y) => (
                  <button
                    key={y.id}
                    onClick={() => {
                      setSelectedYearId(y.id);
                      const s = allSections.filter((sec) => sec.yearId === y.id);
                      if (s[0]) setSelectedSectionId(s[0].id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      (currentYear?.id || '') === y.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {y.yearName}
                  </button>
                ))}
              </div>
            </div>

            {/* Section Selector */}
            {currentYear && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Section:</span>
                <div className="flex items-center gap-1">
                  {sections.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedSectionId(sec.id)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        (currentSection?.id || '') === sec.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {sec.sectionName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Grid View */}
          {entries.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">No Timetable Generated Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Click below to launch the constraint solver and generate the timetable for all sections.
              </p>
              <Button size="sm" onClick={() => setPage('generator')} icon={<Wand2 className="w-4 h-4" />}>
                Go to Timetable Generator
              </Button>
            </div>
          ) : (
            <TimetableGrid
              entries={sectionEntries}
              periods={periods}
              lunchAfterPeriod={settings.lunchAfterPeriod}
            />
          )}
        </div>
      </Card>
    </div>
  );
};
