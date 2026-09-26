import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import {
  verifySectionTimetable,
  verifyDepartmentTimetable,
} from '../services/verificationService';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FlaskConical,
  Library,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
  Printer,
} from 'lucide-react';
import type { DayOfWeek, TimetableEntry } from '../types';
import { ALL_DAYS } from '../types';

export const SectionVerificationPage: React.FC = () => {
  const {
    entries,
    versions,
    years,
    sections,
    assignments,
    labs,
    fixedSlots,
    fixedAssignments,
    settings,
    periods,
  } = useData();

  const sortedYears = useMemo(
    () => [...years].sort((a, b) => a.orderIndex - b.orderIndex),
    [years]
  );

  // Version selection
  const [selectedVersionId, setSelectedVersionId] = useState<string>('current');

  // Active entries based on selected version
  const activeEntries = useMemo<TimetableEntry[]>(() => {
    if (selectedVersionId === 'current') return entries;
    const v = versions.find((ver) => ver.id === selectedVersionId);
    return v ? v.entries : entries;
  }, [selectedVersionId, versions, entries]);

  // Selected Year & Section
  const [selectedYearId, setSelectedYearId] = useState<string>(sortedYears[0]?.id || '');
  const availableSections = useMemo(
    () => sections.filter((s) => s.yearId === selectedYearId),
    [sections, selectedYearId]
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    availableSections[0]?.id || ''
  );

  // Tab view: Single Section Audit vs. Department Summary
  const [viewMode, setViewMode] = useState<'section' | 'department'>('section');

  // Expanded subject rows in frequency table
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const toggleSubjectExpanded = (subCode: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subCode)) next.delete(subCode);
      else next.add(subCode);
      return next;
    });
  };

  // Run Department Verification
  const departmentSummary = useMemo(() => {
    return verifyDepartmentTimetable(
      activeEntries,
      years,
      sections,
      assignments,
      labs,
      fixedSlots,
      fixedAssignments,
      settings,
      periods
    );
  }, [
    activeEntries,
    years,
    sections,
    assignments,
    labs,
    fixedSlots,
    fixedAssignments,
    settings,
    periods,
  ]);

  // Run Current Section Verification
  const currentSection = sections.find((s) => s.id === selectedSectionId) || sections[0];
  const currentYear = years.find((y) => y.id === selectedYearId) || years[0];

  const sectionVerification = useMemo(() => {
    if (!currentSection || !currentYear) return null;
    return verifySectionTimetable(
      activeEntries,
      currentSection,
      currentYear,
      assignments,
      labs,
      fixedSlots,
      fixedAssignments,
      settings,
      periods
    );
  }, [
    activeEntries,
    currentSection,
    currentYear,
    assignments,
    labs,
    fixedSlots,
    fixedAssignments,
    settings,
    periods,
  ]);

  // Handle section click from Department summary table
  const handleSelectFromDepartment = (secId: string, yrId: string) => {
    setSelectedYearId(yrId);
    setSelectedSectionId(secId);
    setViewMode('section');
  };

  const handlePrint = () => {
    window.print();
  };

  const maxSaturdayPeriods = settings.periodsOnSaturday || 4;
  const maxFullDayPeriods = settings.periodsPerFullDay || 7;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl border border-indigo-900/50 shadow-sm text-white">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight">Timetable Verification & Audit</h2>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl">
            Audit weekly subject frequency, continuous 3-period/2-period lab blocks, mandatory
            library hours, and fixed lock integrity for every section.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Version Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 text-xs">
            <Layers className="w-4 h-4 text-indigo-400 ml-1" />
            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="bg-slate-900 text-white border border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="current">Current Timetable</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name || `Version ${v.versionNumber}`}
                </option>
              ))}
            </select>
          </div>

          <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Mode Navigation & Department Overview Counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          onClick={() => setViewMode('department')}
          className={`cursor-pointer transition-all p-4 border ${
            viewMode === 'department'
              ? 'border-indigo-600 bg-indigo-50/20 shadow-sm ring-1 ring-indigo-500'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Sections
            </span>
            <span className="p-1 rounded-lg bg-slate-100 text-slate-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {departmentSummary.totalSections}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Click for Department Overview</p>
        </Card>

        <Card
          onClick={() => setViewMode('department')}
          className="cursor-pointer transition-all p-4 border border-emerald-200 bg-emerald-50/20 hover:border-emerald-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Complete (100%)
            </span>
            <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            {departmentSummary.completeSections}
          </p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Zero conflicts or missing slots</p>
        </Card>

        <Card
          onClick={() => setViewMode('department')}
          className="cursor-pointer transition-all p-4 border border-amber-200 bg-amber-50/20 hover:border-amber-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Warnings
            </span>
            <span className="p-1 rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">
            {departmentSummary.warningSections}
          </p>
          <p className="text-[11px] text-amber-600 mt-0.5">Soft frequency variance</p>
        </Card>

        <Card
          onClick={() => setViewMode('department')}
          className="cursor-pointer transition-all p-4 border border-rose-200 bg-rose-50/20 hover:border-rose-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Errors / Issues
            </span>
            <span className="p-1 rounded-lg bg-rose-100 text-rose-700">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">
            {departmentSummary.errorSections}
          </p>
          <p className="text-[11px] text-rose-600 mt-0.5">Unassigned slots or broken labs</p>
        </Card>
      </div>

      {/* VIEW MODE 1: DEPARTMENT SUMMARY TABLE */}
      {viewMode === 'department' ? (
        <Card className="overflow-hidden border-slate-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div>
              <h3 className="text-base font-bold text-slate-900">Department Section Audit Summary</h3>
              <p className="text-xs text-slate-500">
                Detailed completeness and health status across all years and sections.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewMode('section')}
              className="text-xs"
            >
              Switch to Single Section Inspector
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Academic Year</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned Slots</th>
                  <th className="px-4 py-3">Unassigned</th>
                  <th className="px-4 py-3">Labs Status</th>
                  <th className="px-4 py-3">Library Period</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentSummary.sectionVerifications.map((sec) => (
                  <tr key={`${sec.yearId}_${sec.sectionId}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{sec.yearName}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">Section {sec.sectionName}</td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={
                          sec.status === 'complete'
                            ? 'success'
                            : sec.status === 'warning'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {sec.status === 'complete'
                          ? 'COMPLETE'
                          : sec.status === 'warning'
                          ? 'WARNING'
                          : 'ERROR'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {sec.assignedSlots} / {sec.totalAvailableSlots}
                    </td>
                    <td className="px-4 py-3.5">
                      {sec.unassignedSlots > 0 ? (
                        <span className="font-bold text-rose-600">{sec.unassignedSlots} empty</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {sec.labSummaries.every((l) => l.status === 'complete') ? (
                        <span className="text-emerald-600 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Complete
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center gap-1 font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          Incomplete
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {sec.librarySummary.status === 'complete' ? (
                        <span className="text-emerald-600 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {sec.librarySummary.assignedPeriods} Scheduled
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center gap-1 font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleSelectFromDepartment(sec.sectionId, sec.yearId)}
                        className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* VIEW MODE 2: SINGLE SECTION VERIFICATION INSPECTOR */
        <div className="space-y-6">
          {/* Section Selection Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Select Target Section:
              </span>
              <select
                value={selectedYearId}
                onChange={(e) => {
                  setSelectedYearId(e.target.value);
                  const firstSec = sections.find((s) => s.yearId === e.target.value);
                  if (firstSec) setSelectedSectionId(firstSec.id);
                }}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {sortedYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.yearName}
                  </option>
                ))}
              </select>

              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {availableSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.sectionName}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('department')}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              View All Sections Overview →
            </Button>
          </div>

          {/* Section Status & Diagnostics Alerts */}
          {sectionVerification && (
            <Card className="p-5 border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {sectionVerification.yearName} • Section {sectionVerification.sectionName} Audit Report
                    </h3>
                    <Badge
                      variant={
                        sectionVerification.status === 'complete'
                          ? 'success'
                          : sectionVerification.status === 'warning'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {sectionVerification.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sectionVerification.assignedSlots} Assigned Slots •{' '}
                    {sectionVerification.unassignedSlots} Unassigned Slots •{' '}
                    {sectionVerification.fixedSlotsCount} Locked/Fixed Slots
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {sectionVerification.errors.length === 0 ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      All Constraints Satisfied
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 font-semibold">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      {sectionVerification.errors.length} Issue(s) Detected
                    </span>
                  )}
                </div>
              </div>

              {/* Error Callouts */}
              {sectionVerification.errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1.5 text-xs text-rose-800">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Blocking Verification Errors:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {sectionVerification.errors.map((err, i) => (
                      <li key={i}>{err.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warning Callouts */}
              {sectionVerification.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5 text-xs text-amber-800">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Non-Blocking Warnings:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {sectionVerification.warnings.map((warn, i) => (
                      <li key={i}>{warn.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {/* Section Timetable Grid with Lock Badges */}
          <Card className="overflow-hidden border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Visual Schedule Grid ({currentYear?.yearName} - Sec {currentSection?.sectionName})
                </h4>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-indigo-600" />
                  <span>Fixed Slot</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" />
                  <span>Lab Block</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
                  <span>Library</span>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 border border-slate-200 w-24">Day</th>
                    {periods.map((p) => (
                      <th key={p.id} className="p-2.5 border border-slate-200 min-w-[110px]">
                        <div>{p.name}</div>
                        <div className="text-[9px] font-normal text-slate-400">{p.startTime}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_DAYS.map((d) => {
                    const isSat = d === 'Saturday';
                    const maxP = isSat ? maxSaturdayPeriods : maxFullDayPeriods;

                    return (
                      <tr key={d} className="hover:bg-slate-50/50">
                        <td className="p-2 font-bold text-slate-700 bg-slate-50 border border-slate-200 text-left pl-3">
                          {d}
                        </td>
                        {periods.map((p) => {
                          if (p.periodNumber > maxP) {
                            return (
                              <td
                                key={p.id}
                                className="p-2 border border-slate-200 bg-slate-100/60 text-slate-400 text-[10px] italic"
                              >
                                Off
                              </td>
                            );
                          }

                          // Check if slot has unit test / fixedSlot
                          const fixedSlot = fixedSlots.find(
                            (fs) => fs.day === d && fs.periodNumber === p.periodNumber
                          );

                          // Find entry for this section
                          const entry = activeEntries.find(
                            (e) =>
                              e.sectionId === selectedSectionId &&
                              e.day === d &&
                              e.periodNumber === p.periodNumber
                          );

                          if (fixedSlot && !entry) {
                            return (
                              <td
                                key={p.id}
                                className="p-2 border border-slate-200 bg-indigo-50/60 text-indigo-900 font-semibold"
                              >
                                <div className="text-[11px] flex items-center justify-center gap-1">
                                  <Lock className="w-3 h-3 text-indigo-600" />
                                  <span>{fixedSlot.description || 'Unit Test'}</span>
                                </div>
                              </td>
                            );
                          }

                          if (!entry) {
                            return (
                              <td
                                key={p.id}
                                className="p-2 border border-dashed border-rose-300 bg-rose-50/30 text-rose-500 font-semibold text-[10px]"
                              >
                                Empty Slot
                              </td>
                            );
                          }

                          const isLab =
                            entry.entryType === 'practical_lab' ||
                            entry.entryType === 'integrated_lab';
                          const isLib = entry.entryType === 'library';

                          return (
                            <td
                              key={p.id}
                              className={`p-2 border border-slate-200 transition-colors ${
                                isLab
                                  ? 'bg-purple-50/80 text-purple-900'
                                  : isLib
                                  ? 'bg-amber-50/80 text-amber-900'
                                  : entry.isFixed
                                  ? 'bg-indigo-50/70 text-indigo-900'
                                  : 'bg-white text-slate-800'
                              }`}
                            >
                              <div className="font-bold flex items-center justify-center gap-1">
                                {entry.isFixed && <Lock className="w-2.5 h-2.5 text-indigo-600" />}
                                <span>{entry.subjectCode}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 line-clamp-1">
                                {entry.facultyName}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                {entry.roomNumber || 'Room'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Feature 8: Subject Weekly Frequency Table */}
          {sectionVerification && (
            <Card className="overflow-hidden border-slate-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Subject Weekly Frequency Verification
                  </h4>
                </div>
                <span className="text-xs text-slate-500">
                  {sectionVerification.subjectSummaries.length} Theory Subjects
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-8"></th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Faculty</th>
                      <th className="px-4 py-3 text-center">Required</th>
                      <th className="px-4 py-3 text-center">Scheduled</th>
                      <th className="px-4 py-3 text-center">Difference</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sectionVerification.subjectSummaries.map((sub) => {
                      const isExpanded = expandedSubjects.has(sub.subjectCode);
                      return (
                        <React.Fragment key={sub.subjectCode}>
                          <tr
                            onClick={() => toggleSubjectExpanded(sub.subjectCode)}
                            className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 text-slate-400">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-900">{sub.subjectCode}</span>
                              <span className="text-slate-500 ml-2">{sub.subjectName}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{sub.facultyName}</td>
                            <td className="px-4 py-3 text-center font-semibold text-slate-700">
                              {sub.requiredPeriods}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-900">
                              {sub.assignedPeriods}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {sub.difference === 0 ? (
                                <span className="text-emerald-600 font-bold">0</span>
                              ) : sub.difference > 0 ? (
                                <span className="text-amber-600 font-bold">+{sub.difference}</span>
                              ) : (
                                <span className="text-rose-600 font-bold">{sub.difference}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge
                                variant={
                                  sub.status === 'complete'
                                    ? 'success'
                                    : sub.status === 'warning'
                                    ? 'warning'
                                    : 'danger'
                                }
                                size="sm"
                              >
                                {sub.status === 'complete'
                                  ? 'MATCH'
                                  : sub.status === 'warning'
                                  ? 'OVER-ALLOCATED'
                                  : 'UNDER-ALLOCATED'}
                              </Badge>
                            </td>
                          </tr>

                          {/* Expandable Period Instances */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80">
                              <td colSpan={7} className="px-8 py-3">
                                <div className="text-xs text-slate-600 mb-1.5 font-semibold">
                                  Scheduled Slots for {sub.subjectName}:
                                </div>
                                {sub.occurrences.length === 0 ? (
                                  <p className="text-slate-400 italic">No periods scheduled.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {sub.occurrences.map((s, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium"
                                      >
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span>
                                          {s.day} Period {s.periodNumber}
                                        </span>
                                        {s.isFixed && (
                                          <Lock className="w-2.5 h-2.5 text-indigo-600" />
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Feature 9: Lab & Library Completeness Cards */}
          {sectionVerification && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Lab Continuity Card */}
              <Card className="p-4 border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Lab Block Continuity & Completeness
                  </h4>
                </div>
                {sectionVerification.labSummaries.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No labs configured for this section.</p>
                ) : (
                  <div className="space-y-2.5">
                    {sectionVerification.labSummaries.map((lab) => (
                      <div
                        key={lab.labId || lab.labName}
                        className="p-3 rounded-xl bg-purple-50/40 border border-purple-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-purple-950">{lab.labName}</span>
                            <Badge variant="neutral" size="sm">
                              {lab.labType === 'practical' ? '3 Periods' : '2 Periods'}
                            </Badge>
                          </div>
                          <p className="text-slate-500 mt-0.5">
                            {lab.assignedPeriods} / {lab.requiredPeriods} periods scheduled • Room{' '}
                            {lab.roomNumber}
                          </p>
                        </div>
                        <Badge
                          variant={lab.status === 'complete' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {lab.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Library Requirement Card */}
              <Card className="p-4 border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Library className="w-4 h-4 text-amber-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Library Weekly Requirement Audit
                  </h4>
                </div>
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                    sectionVerification.librarySummary.status === 'complete'
                      ? 'bg-amber-50/40 border-amber-200/80'
                      : 'bg-rose-50/40 border-rose-200/80'
                  }`}
                >
                  <div>
                    <span className="font-bold text-slate-900 block mb-0.5">
                      Mandatory Library Session
                    </span>
                    <p className="text-slate-600">
                      Scheduled: {sectionVerification.librarySummary.assignedPeriods} period(s) / week (Min. 1)
                    </p>
                    {sectionVerification.librarySummary.occurrences.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        {sectionVerification.librarySummary.occurrences.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[11px] bg-white px-2 py-0.5 rounded border border-amber-200 font-medium text-amber-900"
                          >
                            <Clock className="w-3 h-3" />
                            {s.day} P{s.periodNumber}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={sectionVerification.librarySummary.status === 'complete' ? 'success' : 'danger'}
                    size="sm"
                  >
                    {sectionVerification.librarySummary.status === 'complete' ? 'SATISFIED' : 'MISSING'}
                  </Badge>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
