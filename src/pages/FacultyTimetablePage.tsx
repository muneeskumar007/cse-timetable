import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { TimetableGrid } from '../components/timetable/TimetableGrid';
import { useUiStore } from '../stores/uiStore';
import { exportTimetableToPdf } from '../services/pdfService';
import { exportTimetableToExcel } from '../services/excelService';
import { User, Download, FileSpreadsheet, Calendar, BookOpen } from 'lucide-react';

export const FacultyTimetablePage: React.FC = () => {
  const { selectedFacultyCode, setSelectedFacultyCode, setPage } = useUiStore();

  const faculty = useLiveQuery(() => db.faculty.toArray(), []) || [];
  const activeFacultyCode = selectedFacultyCode || faculty[0]?.facultyCode || '';
  const currentFaculty = faculty.find(
    (f) => f.facultyCode.toUpperCase() === activeFacultyCode.toUpperCase()
  ) || faculty[0];

  const periods = useLiveQuery(() => db.periodConfigs.orderBy('periodNumber').toArray(), []) || [];
  const entries = useLiveQuery(() => db.timetableEntries.toArray(), []) || [];
  const settingsList = useLiveQuery(() => db.settings.toArray(), []) || [];

  const settings = settingsList[0] || {
    id: 'default',
    departmentName: 'Department of Computer Science and Engineering',
    collegeName: 'College of Engineering',
    academicYear: '2026-2027',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    periodsPerFullDay: 7,
    periodsOnSaturday: 4,
    lunchAfterPeriod: 4,
  };

  // Filter entries taught by this faculty member
  const facultyEntries = entries.filter(
    (e) => e.facultyCode && e.facultyCode.toUpperCase() === (currentFaculty?.facultyCode || '').toUpperCase()
  );

  const theoryCount = facultyEntries.filter((e) => e.entryType === 'theory').length;
  const labCount = facultyEntries.filter(
    (e) => e.entryType === 'practical_lab' || e.entryType === 'integrated_lab'
  ).length;
  const totalAssigned = theoryCount + labCount;
  const required = currentFaculty?.weeklyWorkload || 0;
  const diff = totalAssigned - required;

  const handleExportPdf = () => {
    if (!currentFaculty) return;
    exportTimetableToPdf(facultyEntries, {
      departmentName: settings.departmentName,
      title: `FACULTY TIMETABLE — ${currentFaculty.facultyName} (${currentFaculty.facultyCode})`,
      subtitle: `${currentFaculty.designation || 'Faculty'} | Workload: ${totalAssigned}/${required} periods`,
      periods,
      fileName: `Timetable_${currentFaculty.facultyCode}_${currentFaculty.facultyName.replace(/\s+/g, '_')}.pdf`,
      isFacultyTimetable: true,
    });
  };

  const handleExportExcel = () => {
    if (!currentFaculty) return;
    exportTimetableToExcel(facultyEntries, {
      departmentName: settings.departmentName,
      title: `FACULTY TIMETABLE — ${currentFaculty.facultyName} (${currentFaculty.facultyCode})`,
      periods,
      fileName: `Timetable_${currentFaculty.facultyCode}.xlsx`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Faculty Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Faculty Schedule Viewer</h1>
          <p className="text-xs text-slate-500">
            View unified teaching schedule across all academic years, sections, and laboratories
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={facultyEntries.length === 0}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={facultyEntries.length === 0}
            icon={<Download className="w-3.5 h-3.5 text-rose-600" />}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Faculty Selector Bar */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Select Faculty Member
              </label>
              <select
                value={currentFaculty?.facultyCode || ''}
                onChange={(e) => setSelectedFacultyCode(e.target.value)}
                className="mt-0.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {faculty.map((f) => (
                  <option key={f.id} value={f.facultyCode}>
                    {f.facultyCode} — {f.facultyName} ({f.designation || 'Faculty'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentFaculty && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Weekly Workload</span>
                <span className="text-sm font-bold text-slate-900">
                  {totalAssigned} / {required} Periods
                </span>
                <span className="text-[11px] text-slate-400 block">
                  ({theoryCount} theory + {labCount} lab)
                </span>
              </div>

              <div>
                {diff === 0 && <Badge variant="emerald" size="md">Balanced (0)</Badge>}
                {diff > 0 && <Badge variant="rose" size="md">Overloaded (+{diff})</Badge>}
                {diff < 0 && <Badge variant="amber" size="md">Underloaded ({diff})</Badge>}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Timetable Grid */}
      {entries.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Timetable Generated Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Generate a timetable from the Generator page or load demo data to view faculty schedules.
            </p>
            <Button size="sm" onClick={() => setPage('generator')} icon={<Calendar className="w-4 h-4" />}>
              Go to Generator
            </Button>
          </div>
        </Card>
      ) : (
        <TimetableGrid
          entries={facultyEntries}
          periods={periods}
          isFacultyView={true}
          lunchAfterPeriod={settings.lunchAfterPeriod}
        />
      )}
    </div>
  );
};
