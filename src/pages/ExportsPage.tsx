import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { exportTimetableToPdf } from '../services/pdfService';
import { exportTimetableToExcel } from '../services/excelService';
import { useUiStore } from '../stores/uiStore';
import {
  FileSpreadsheet,
  Download,
  FileText,
  Printer,
  CheckCircle2,
  Calendar,
  Layers,
  User,
} from 'lucide-react';

export const ExportsPage: React.FC = () => {
  const { addToast } = useUiStore();

  const years = useLiveQuery(() => db.academicYears.orderBy('orderIndex').toArray(), []) || [];
  const sections = useLiveQuery(() => db.sections.toArray(), []) || [];
  const faculty = useLiveQuery(() => db.faculty.toArray(), []) || [];
  const entries = useLiveQuery(() => db.timetableEntries.toArray(), []) || [];
  const periods = useLiveQuery(() => db.periodConfigs.orderBy('periodNumber').toArray(), []) || [];
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

  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedFacultyCode, setSelectedFacultyCode] = useState<string>('');

  // Initial defaults
  React.useEffect(() => {
    if (years[0] && !selectedYearId) setSelectedYearId(years[0].id);
    if (faculty[0] && !selectedFacultyCode) setSelectedFacultyCode(faculty[0].facultyCode);
  }, [years, faculty, selectedYearId, selectedFacultyCode]);

  React.useEffect(() => {
    const yearSections = sections.filter((s) => s.yearId === selectedYearId);
    if (yearSections[0]) setSelectedSectionId(yearSections[0].id);
  }, [selectedYearId, sections]);

  // Export handlers
  const handleExportSection = (format: 'pdf' | 'excel') => {
    const year = years.find((y) => y.id === selectedYearId);
    const sec = sections.find((s) => s.id === selectedSectionId);
    if (!year || !sec) return;

    const filtered = entries.filter((e) => e.sectionId === sec.id);

    if (format === 'pdf') {
      exportTimetableToPdf(filtered, {
        departmentName: settings.departmentName,
        title: `CLASS TIMETABLE — ${year.yearName} (Section ${sec.sectionName})`,
        subtitle: `Room: ${sec.roomNumber || 'TBD'} | Academic Year: ${settings.academicYear}`,
        periods,
        fileName: `Timetable_${year.yearName.replace(/\s+/g, '_')}_Sec_${sec.sectionName}.pdf`,
      });
    } else {
      exportTimetableToExcel(filtered, {
        departmentName: settings.departmentName,
        title: `CLASS TIMETABLE — ${year.yearName} Section ${sec.sectionName}`,
        periods,
        fileName: `Timetable_${year.yearName.replace(/\s+/g, '_')}_Sec_${sec.sectionName}.xlsx`,
      });
    }

    addToast({
      type: 'success',
      title: `Exported ${format.toUpperCase()}`,
      message: `${year.yearName} Sec ${sec.sectionName} timetable exported.`,
    });
  };

  const handleExportFaculty = (format: 'pdf' | 'excel') => {
    const fac = faculty.find((f) => f.facultyCode.toUpperCase() === selectedFacultyCode.toUpperCase());
    if (!fac) return;

    const filtered = entries.filter(
      (e) => e.facultyCode && e.facultyCode.toUpperCase() === fac.facultyCode.toUpperCase()
    );

    if (format === 'pdf') {
      exportTimetableToPdf(filtered, {
        departmentName: settings.departmentName,
        title: `FACULTY TIMETABLE — ${fac.facultyName} (${fac.facultyCode})`,
        subtitle: `${fac.designation || 'Faculty'} | Total Load: ${fac.weeklyWorkload} periods`,
        periods,
        fileName: `Timetable_${fac.facultyCode}_${fac.facultyName.replace(/\s+/g, '_')}.pdf`,
        isFacultyTimetable: true,
      });
    } else {
      exportTimetableToExcel(filtered, {
        departmentName: settings.departmentName,
        title: `FACULTY TIMETABLE — ${fac.facultyName} (${fac.facultyCode})`,
        periods,
        fileName: `Timetable_${fac.facultyCode}.xlsx`,
      });
    }

    addToast({
      type: 'success',
      title: `Exported ${format.toUpperCase()}`,
      message: `Schedule for ${fac.facultyName} exported.`,
    });
  };

  const handleBulkExportClasses = (format: 'pdf' | 'excel') => {
    // Generates export for each section
    for (const year of years) {
      const yearSecs = sections.filter((s) => s.yearId === year.id);
      for (const sec of yearSecs) {
        const filtered = entries.filter((e) => e.sectionId === sec.id);
        if (format === 'pdf') {
          exportTimetableToPdf(filtered, {
            departmentName: settings.departmentName,
            title: `CLASS TIMETABLE — ${year.yearName} (Section ${sec.sectionName})`,
            subtitle: `Room: ${sec.roomNumber || 'TBD'} | Academic Year: ${settings.academicYear}`,
            periods,
            fileName: `Timetable_${year.yearName.replace(/\s+/g, '_')}_Sec_${sec.sectionName}.pdf`,
          });
        } else {
          exportTimetableToExcel(filtered, {
            departmentName: settings.departmentName,
            title: `CLASS TIMETABLE — ${year.yearName} Section ${sec.sectionName}`,
            periods,
            fileName: `Timetable_${year.yearName.replace(/\s+/g, '_')}_Sec_${sec.sectionName}.xlsx`,
          });
        }
      }
    }

    addToast({
      type: 'success',
      title: 'Bulk Export Triggered',
      message: `Exported all ${sections.length} section timetables.`,
    });
  };

  const handleBulkExportFaculty = (format: 'pdf' | 'excel') => {
    for (const fac of faculty) {
      const filtered = entries.filter(
        (e) => e.facultyCode && e.facultyCode.toUpperCase() === fac.facultyCode.toUpperCase()
      );
      if (filtered.length === 0) continue;

      if (format === 'pdf') {
        exportTimetableToPdf(filtered, {
          departmentName: settings.departmentName,
          title: `FACULTY TIMETABLE — ${fac.facultyName} (${fac.facultyCode})`,
          subtitle: `${fac.designation || 'Faculty'}`,
          periods,
          fileName: `Timetable_${fac.facultyCode}.pdf`,
          isFacultyTimetable: true,
        });
      } else {
        exportTimetableToExcel(filtered, {
          departmentName: settings.departmentName,
          title: `FACULTY TIMETABLE — ${fac.facultyName} (${fac.facultyCode})`,
          periods,
          fileName: `Timetable_${fac.facultyCode}.xlsx`,
        });
      }
    }

    addToast({
      type: 'success',
      title: 'Bulk Faculty Export Triggered',
      message: `Exported timetables for active teaching faculty.`,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Official Timetable Exports</h1>
        <p className="text-xs text-slate-500">
          Generate publication-ready PDF documents and formatted Excel workbooks from the Current Saved Timetable
        </p>
      </div>

      {entries.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Notice:</strong> No current saved timetable found. Please generate or restore a timetable before exporting documents.
          </span>
        </div>
      )}

      {/* Grid of Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section Timetable Export Card */}
        <Card title="Class Timetable Export" subtitle="Individual academic section schedule">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Academic Year
                </label>
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.yearName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Section
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {sections
                    .filter((s) => s.yearId === selectedYearId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.sectionName} (Rm {s.roomNumber || 'TBD'})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleExportSection('excel')}
                disabled={entries.length === 0}
                icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              >
                Excel (.xlsx)
              </Button>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => handleExportSection('pdf')}
                disabled={entries.length === 0}
                icon={<Download className="w-4 h-4" />}
              >
                PDF (.pdf)
              </Button>
            </div>
          </div>
        </Card>

        {/* Faculty Timetable Export Card */}
        <Card title="Faculty Timetable Export" subtitle="Cross-department faculty individual schedule">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Faculty Member
              </label>
              <select
                value={selectedFacultyCode}
                onChange={(e) => setSelectedFacultyCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {faculty.map((f) => (
                  <option key={f.id} value={f.facultyCode}>
                    {f.facultyCode} — {f.facultyName} ({f.weeklyWorkload} periods)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleExportFaculty('excel')}
                disabled={entries.length === 0}
                icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              >
                Excel (.xlsx)
              </Button>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => handleExportFaculty('pdf')}
                disabled={entries.length === 0}
                icon={<Download className="w-4 h-4" />}
              >
                PDF (.pdf)
              </Button>
            </div>
          </div>
        </Card>

        {/* Bulk Classes Export Card */}
        <Card title="Bulk Section Exports" subtitle="Download timetables for all sections simultaneously">
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Generates individual formatted files for every registered section across 2nd, 3rd, and 4th Years ({sections.length} sections total).
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleBulkExportClasses('excel')}
                disabled={entries.length === 0}
                icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              >
                All Sections (Excel)
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleBulkExportClasses('pdf')}
                disabled={entries.length === 0}
                icon={<Printer className="w-4 h-4 text-indigo-600" />}
              >
                All Sections (PDF)
              </Button>
            </div>
          </div>
        </Card>

        {/* Bulk Faculty Export Card */}
        <Card title="Bulk Faculty Exports" subtitle="Download timetables for all teaching staff">
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Generates unified individual schedules for all {faculty.length} active department faculty members.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleBulkExportFaculty('excel')}
                disabled={entries.length === 0}
                icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              >
                All Faculty (Excel)
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleBulkExportFaculty('pdf')}
                disabled={entries.length === 0}
                icon={<Printer className="w-4 h-4 text-indigo-600" />}
              >
                All Faculty (PDF)
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
