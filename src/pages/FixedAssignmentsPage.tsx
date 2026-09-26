import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { cloudService } from '../services/cloudService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { useUiStore } from '../stores/uiStore';
import {
  Pin,
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  FlaskConical,
  Library,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type {
  DayOfWeek,
  FixedAssignment,
  FixedAssignmentType,
  Lab,
  LabType,
} from '../types';
import { ALL_DAYS, FULL_DAYS } from '../types';

export const FixedAssignmentsPage: React.FC = () => {
  const { addToast } = useUiStore();
  const {
    fixedAssignments,
    years,
    sections,
    assignments,
    labs,
    faculty,
    rooms,
    fixedSlots,
    settings,
    periods,
  } = useData();

  const sortedYears = useMemo(
    () => [...years].sort((a, b) => a.orderIndex - b.orderIndex),
    [years]
  );

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<'all' | 'theory' | 'lab' | 'library'>('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<FixedAssignment | null>(null);

  // Form State
  const [assignmentType, setAssignmentType] = useState<FixedAssignmentType>('theory');
  const [yearId, setYearId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [labId, setLabId] = useState('');
  const [day, setDay] = useState<DayOfWeek>('Monday');
  const [startPeriod, setStartPeriod] = useState<number>(1);
  const [roomId, setRoomId] = useState('');

  // Delete State
  const [deletingAssignment, setDeletingAssignment] = useState<FixedAssignment | null>(null);

  // Filter sections based on year
  const availableSections = useMemo(() => {
    if (!yearId) return [];
    return sections.filter((s) => s.yearId === yearId);
  }, [sections, yearId]);

  // Filter subjects for the selected section
  const availableSubjects = useMemo(() => {
    if (!sectionId) return [];
    return assignments.filter((a) => a.sectionId === sectionId);
  }, [assignments, sectionId]);

  // Filter labs for the selected section
  const availableLabs = useMemo(() => {
    if (!sectionId) return [];
    return labs.filter((l) => l.sectionId === sectionId);
  }, [labs, sectionId]);

  // Open Add Modal
  const openAddModal = () => {
    setEditingAssignment(null);
    setAssignmentType('theory');
    const defaultYear = sortedYears[0]?.id || '';
    setYearId(defaultYear);
    const secs = sections.filter((s) => s.yearId === defaultYear);
    const defaultSecId = secs[0]?.id || '';
    setSectionId(defaultSecId);

    const subs = assignments.filter((a) => a.sectionId === defaultSecId);
    setSubjectId(subs[0]?.id || '');

    const lbs = labs.filter((l) => l.sectionId === defaultSecId);
    setLabId(lbs[0]?.id || '');

    setDay('Monday');
    setStartPeriod(1);
    setRoomId('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (fa: FixedAssignment) => {
    setEditingAssignment(fa);
    setAssignmentType(fa.assignmentType);
    setYearId(fa.yearId);
    setSectionId(fa.sectionId);

    if (fa.assignmentType === 'theory') {
      const match = assignments.find(
        (a) => a.sectionId === fa.sectionId && a.subjectCode === fa.subjectCode
      );
      setSubjectId(match?.id || '');
    } else if (fa.assignmentType === 'lab') {
      setLabId(fa.labId || '');
    }

    setDay(fa.day);
    setStartPeriod(fa.startPeriodNumber);
    setRoomId(fa.roomId || '');
    setIsModalOpen(true);
  };

  // Handlers for dynamic dropdown changes
  const handleYearChange = (newYearId: string) => {
    setYearId(newYearId);
    const secs = sections.filter((s) => s.yearId === newYearId);
    const firstSec = secs[0]?.id || '';
    setSectionId(firstSec);

    const subs = assignments.filter((a) => a.sectionId === firstSec);
    setSubjectId(subs[0]?.id || '');
    const lbs = labs.filter((l) => l.sectionId === firstSec);
    setLabId(lbs[0]?.id || '');
  };

  const handleSectionChange = (newSecId: string) => {
    setSectionId(newSecId);
    const subs = assignments.filter((a) => a.sectionId === newSecId);
    setSubjectId(subs[0]?.id || '');
    const lbs = labs.filter((l) => l.sectionId === newSecId);
    setLabId(lbs[0]?.id || '');
  };

  // Calculate period numbers based on assignment type
  const calculatePeriodNumbers = (
    type: FixedAssignmentType,
    startP: number,
    chosenLab?: Lab
  ): number[] => {
    if (type === 'theory' || type === 'library') {
      return [startP];
    }
    // Lab: Practical = 3 periods, Integrated = 2 periods
    const duration = chosenLab?.labType === 'practical' ? 3 : 2;
    return Array.from({ length: duration }, (_, i) => startP + i);
  };

  // Save Assignment
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) {
      addToast({ type: 'error', title: 'Invalid Section', message: 'Please select a valid section.' });
      return;
    }

    let calculatedPeriods: number[] = [];
    let chosenSubject: (typeof assignments)[0] | undefined;
    let chosenLab: Lab | undefined;

    if (assignmentType === 'theory') {
      chosenSubject = assignments.find((a) => a.id === subjectId);
      if (!chosenSubject) {
        addToast({ type: 'error', title: 'Subject Required', message: 'Please select a subject.' });
        return;
      }
      calculatedPeriods = [startPeriod];
    } else if (assignmentType === 'lab') {
      chosenLab = labs.find((l) => l.id === labId);
      if (!chosenLab) {
        addToast({ type: 'error', title: 'Lab Required', message: 'Please select a lab.' });
        return;
      }
      calculatedPeriods = calculatePeriodNumbers('lab', startPeriod, chosenLab);
    } else {
      calculatedPeriods = [startPeriod];
    }

    // Validation 1: Saturday practical lab restriction
    if (day === 'Saturday' && chosenLab?.labType === 'practical') {
      addToast({
        type: 'error',
        title: 'Saturday Restriction',
        message: 'Practical Labs (3 periods) cannot be scheduled on Saturday.',
      });
      return;
    }

    // Validation 2: Period bounds & lunch break check
    const maxPeriods =
      day === 'Saturday'
        ? settings.periodsOnSaturday || 4
        : settings.periodsPerFullDay || 7;
    const lunchAfter = settings.lunchAfterPeriod || 4;

    for (const p of calculatedPeriods) {
      if (p > maxPeriods) {
        addToast({
          type: 'error',
          title: 'Period Out of Bounds',
          message: `${day} only allows up to Period ${maxPeriods}. Period ${p} is out of bounds.`,
        });
        return;
      }
    }

    if (assignmentType === 'lab') {
      const hasPre = calculatedPeriods.some((p) => p <= lunchAfter);
      const hasPost = calculatedPeriods.some((p) => p > lunchAfter);
      if (hasPre && hasPost) {
        addToast({
          type: 'error',
          title: 'Lunch Break Conflict',
          message: `Lab block cannot cross the lunch break after Period ${lunchAfter}.`,
        });
        return;
      }
    }

    // Validation 3: Protected fixed slots (Unit Tests)
    for (const p of calculatedPeriods) {
      const fixedCol = fixedSlots.some((fs) => fs.day === day && fs.periodNumber === p);
      if (fixedCol) {
        addToast({
          type: 'error',
          title: 'Protected Slot Conflict',
          message: `${day} Period ${p} is a protected Unit Test / Assembly slot.`,
        });
        return;
      }
    }

    // Validation 4: Section clash with another active fixed assignment
    for (const fa of fixedAssignments) {
      if (!fa.active) continue;
      if (editingAssignment && fa.id === editingAssignment.id) continue;
      if (fa.day === day && fa.sectionId === sec.id) {
        const hasOverlap = fa.periodNumbers.some((p) => calculatedPeriods.includes(p));
        if (hasOverlap) {
          addToast({
            type: 'error',
            title: 'Section Slot Conflict',
            message: `Section ${sec.sectionName} already has a fixed assignment on ${day} for Period(s) ${fa.periodNumbers.join(', ')}.`,
          });
          return;
        }
      }
    }

    // Resolve room
    const targetRoom =
      rooms.find((r) => r.id === roomId) ||
      (chosenLab ? rooms.find((r) => r.id === chosenLab.roomId) : undefined) ||
      rooms.find((r) => r.id === sec.roomId) ||
      rooms[0];

    const newAssignment: FixedAssignment = {
      id: editingAssignment ? editingAssignment.id : `fa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      assignmentType,
      yearId,
      sectionId: sec.id,
      sectionName: sec.sectionName,
      subjectCode: chosenSubject?.subjectCode,
      subjectName: chosenSubject?.subjectName,
      labId: chosenLab?.id,
      labName: chosenLab?.labName,
      labType: chosenLab?.labType,
      facultyCode: chosenSubject?.facultyCode || chosenLab?.facultyCode,
      facultyName: chosenSubject?.facultyName || chosenLab?.facultyName,
      roomId: targetRoom?.id,
      roomNumber: targetRoom?.roomNumber || targetRoom?.roomName,
      day,
      startPeriodNumber: startPeriod,
      periodNumbers: calculatedPeriods,
      isFixed: true,
      active: editingAssignment ? editingAssignment.active : true,
    };

    try {
      if (editingAssignment) {
        await cloudService.fixedAssignments.update(editingAssignment.id, newAssignment);
        addToast({
          type: 'success',
          title: 'Assignment Updated',
          message: 'The fixed assignment has been updated successfully.',
        });
      } else {
        await cloudService.fixedAssignments.add(newAssignment);
        addToast({
          type: 'success',
          title: 'Fixed Assignment Saved',
          message: 'Slot has been reserved and locked for the generator.',
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Could not save fixed assignment.',
      });
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!deletingAssignment) return;
    try {
      await cloudService.fixedAssignments.delete(deletingAssignment.id);
      addToast({
        type: 'success',
        title: 'Assignment Deleted',
        message: 'Fixed assignment was removed.',
      });
      setDeletingAssignment(null);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err?.message || 'Could not delete fixed assignment.',
      });
    }
  };

  // Toggle Active
  const handleToggleActive = async (fa: FixedAssignment) => {
    try {
      await cloudService.fixedAssignments.toggleActive(fa.id, !fa.active);
      addToast({
        type: 'info',
        title: !fa.active ? 'Assignment Activated' : 'Assignment Disabled',
        message: !fa.active
          ? 'This fixed slot will be locked during timetable generation.'
          : 'This fixed slot is temporarily bypassed.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err?.message || 'Could not toggle assignment state.',
      });
    }
  };

  // Filtered List
  const filteredAssignments = useMemo(() => {
    return fixedAssignments.filter((fa) => {
      if (activeTab !== 'all' && fa.assignmentType !== activeTab) return false;
      if (selectedYearFilter !== 'all' && fa.yearId !== selectedYearFilter) return false;
      if (selectedSectionFilter !== 'all' && fa.sectionId !== selectedSectionFilter) return false;
      if (selectedDayFilter !== 'all' && fa.day !== selectedDayFilter) return false;
      return true;
    });
  }, [
    fixedAssignments,
    activeTab,
    selectedYearFilter,
    selectedSectionFilter,
    selectedDayFilter,
  ]);

  const counts = useMemo(
    () => ({
      all: fixedAssignments.length,
      theory: fixedAssignments.filter((a) => a.assignmentType === 'theory').length,
      lab: fixedAssignments.filter((a) => a.assignmentType === 'lab').length,
      library: fixedAssignments.filter((a) => a.assignmentType === 'library').length,
    }),
    [fixedAssignments]
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl border border-indigo-900/50 shadow-sm text-white">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              <Pin className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight">Fixed Slot Assignments</h2>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl">
            Lock critical Theory subjects, Lab blocks, or Library hours to exact days and periods.
            The generator automatically honors these locked slots and deducts them from remaining
            weekly subject requirements.
          </p>
        </div>
        <Button onClick={openAddModal} className="flex items-center gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" />
          <span>Add Fixed Assignment</span>
        </Button>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-sm font-medium">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
              {counts.all}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('theory')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'theory'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>Theory</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {counts.theory}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('lab')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'lab'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
            <span>Labs</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
              {counts.lab}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'library'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Library className="w-3.5 h-3.5 text-amber-500" />
            <span>Library</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {counts.library}
            </span>
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedYearFilter}
            onChange={(e) => {
              setSelectedYearFilter(e.target.value);
              setSelectedSectionFilter('all');
            }}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">All Academic Years</option>
            {sortedYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.yearName}
              </option>
            ))}
          </select>

          <select
            value={selectedSectionFilter}
            onChange={(e) => setSelectedSectionFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">All Sections</option>
            {sections
              .filter((s) => selectedYearFilter === 'all' || s.yearId === selectedYearFilter)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.sectionName}
                </option>
              ))}
          </select>

          <select
            value={selectedDayFilter}
            onChange={(e) => setSelectedDayFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">All Days</option>
            {ALL_DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignments List / Grid */}
      {filteredAssignments.length === 0 ? (
        <Card className="text-center py-16 px-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Pin className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">
            No Fixed Assignments Configured
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Lock in core theory subjects, lab slots, or library periods to ensure the timetable
            generator preserves them during automatic generation.
          </p>
          <Button onClick={openAddModal} variant="secondary">
            <Plus className="w-4 h-4 mr-2" />
            Add First Fixed Assignment
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAssignments.map((fa) => {
            const yr = sortedYears.find((y) => y.id === fa.yearId);
            const isLab = fa.assignmentType === 'lab';
            const isLib = fa.assignmentType === 'library';

            return (
              <Card
                key={fa.id}
                className={`relative transition-all border ${
                  fa.active ? 'border-slate-200/90 shadow-sm' : 'border-slate-200 bg-slate-50/70 opacity-75'
                }`}
              >
                {/* Header Badge & Active Toggle */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-lg ${
                        isLab
                          ? 'bg-purple-100 text-purple-700'
                          : isLib
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isLab ? (
                        <FlaskConical className="w-4 h-4" />
                      ) : isLib ? (
                        <Library className="w-4 h-4" />
                      ) : (
                        <BookOpen className="w-4 h-4" />
                      )}
                    </span>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {yr?.yearName || 'Year'} • Sec {fa.sectionName}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                        {fa.subjectName || fa.labName || 'Library Session'}
                      </h4>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleActive(fa)}
                    title={fa.active ? 'Click to disable' : 'Click to activate'}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {fa.active ? (
                      <ToggleRight className="w-6 h-6 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs text-slate-600 mb-4 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="font-semibold text-slate-800">{fa.day}</span>
                    <span className="text-slate-400">•</span>
                    <span>
                      {fa.periodNumbers.length === 1
                        ? `Period ${fa.periodNumbers[0]}`
                        : `Periods ${fa.periodNumbers.join(', ')}`}
                    </span>
                    {fa.periodNumbers.length > 1 && (
                      <Badge variant="neutral" size="sm">
                        {fa.periodNumbers.length} Consecutive
                      </Badge>
                    )}
                  </div>

                  {fa.facultyName && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{fa.facultyName}</span>
                      {fa.facultyCode && (
                        <span className="text-[10px] px-1 rounded bg-slate-200 text-slate-600 font-mono">
                          {fa.facultyCode}
                        </span>
                      )}
                    </div>
                  )}

                  {fa.roomNumber && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>Room {fa.roomNumber}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    {fa.active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Locked & Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Bypassed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(fa)}
                      className="p-1.5 text-slate-500 hover:text-slate-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingAssignment(fa)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAssignment ? 'Edit Fixed Assignment' : 'Add Fixed Assignment'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Assignment Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assignment Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAssignmentType('theory')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  assignmentType === 'theory'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Theory Subject</span>
              </button>
              <button
                type="button"
                onClick={() => setAssignmentType('lab')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  assignmentType === 'lab'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Lab Block</span>
              </button>
              <button
                type="button"
                onClick={() => setAssignmentType('library')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  assignmentType === 'library'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Library className="w-4 h-4" />
                <span>Library Period</span>
              </button>
            </div>
          </div>

          {/* Year & Section Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Year
              </label>
              <select
                value={yearId}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {sortedYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.yearName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
              <select
                value={sectionId}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {availableSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.sectionName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject / Lab Selector */}
          {assignmentType === 'theory' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Theory Subject
              </label>
              {availableSubjects.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  No subjects assigned to this section yet. Upload assignments in Subject Allotment.
                </p>
              ) : (
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {availableSubjects.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.subjectCode} - {a.subjectName} ({a.facultyName})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {assignmentType === 'lab' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lab Session</label>
              {availableLabs.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  No labs configured for this section. Add lab sessions in Lab Management.
                </p>
              ) : (
                <select
                  value={labId}
                  onChange={(e) => setLabId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {availableLabs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.labName} ({l.labType === 'practical' ? 'Practical - 3 periods' : 'Integrated - 2 periods'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Day & Period Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Day of Week</label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value as DayOfWeek)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {ALL_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {assignmentType === 'lab' ? 'Start Period' : 'Period Number'}
              </label>
              <select
                value={startPeriod}
                onChange={(e) => setStartPeriod(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.periodNumber}>
                    {p.name} ({p.startTime} - {p.endTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Room Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Room Allocation (Optional / Override)
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Default Classroom / Lab Room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} - {r.roomName} ({r.roomType})
                </option>
              ))}
            </select>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingAssignment ? 'Update Assignment' : 'Lock Assignment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deletingAssignment}
        onClose={() => setDeletingAssignment(null)}
        onConfirm={handleDelete}
        title="Delete Fixed Assignment"
        message={`Are you sure you want to remove the fixed assignment for ${
          deletingAssignment?.subjectName || deletingAssignment?.labName || 'Library'
        } on ${deletingAssignment?.day}? The slot will be unlocked for automatic scheduling.`}
        confirmLabel="Delete Fixed Slot"
        variant="danger"
      />
    </div>
  );
};
