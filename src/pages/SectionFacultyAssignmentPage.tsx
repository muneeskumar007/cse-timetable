import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { cloudService } from '../services/cloudService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { useUiStore } from '../stores/uiStore';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Save,
  RotateCcw,
  GripVertical,
  Trash2,
  Plus,
  ArrowRight,
  ShieldCheck,
  Check,
  GraduationCap,
} from 'lucide-react';
import type { Subject, SubjectAssignment } from '../types';

interface DraggableSubjectItemProps {
  subject: Subject;
  isAssigned: boolean;
  onAdd: (subject: Subject) => void;
}

const DraggableSubjectItem: React.FC<DraggableSubjectItemProps> = ({
  subject,
  isAssigned,
  onAdd,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `subject-${subject.id}`,
    data: { subject },
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-3 rounded-xl border transition-all select-none ${
        isDragging
          ? 'opacity-40 border-indigo-400 bg-indigo-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1 -ml-1 rounded"
            title="Drag to assign to section"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {subject.subjectCode}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {subject.weeklyPeriods} periods/wk
              </span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900 mt-1 leading-snug">
              {subject.subjectName}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAdd(subject)}
          title="Add to current section"
          className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
            isAssigned
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
          }`}
        >
          {isAssigned ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Added</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export const SectionFacultyAssignmentPage: React.FC = () => {
  const { selectedYearId, setSelectedYearId, addToast, setPage } = useUiStore();
  const {
    years,
    sections: allSections,
    subjects: allSubjects,
    assignments: allAssignments,
    faculty,
  } = useData();

  const sortedYears = useMemo(
    () => [...years].sort((a, b) => a.orderIndex - b.orderIndex),
    [years]
  );
  const activeYearId = selectedYearId || sortedYears[0]?.id;
  const currentYear = sortedYears.find((y) => y.id === activeYearId) || sortedYears[0];

  const currentYearSections = useMemo(
    () => allSections.filter((s) => s.yearId === activeYearId),
    [allSections, activeYearId]
  );

  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  // Synchronize default selected section when year changes
  useEffect(() => {
    if (currentYearSections.length > 0) {
      if (!currentYearSections.some((s) => s.id === selectedSectionId)) {
        setSelectedSectionId(currentYearSections[0].id);
      }
    } else {
      setSelectedSectionId('');
    }
  }, [currentYearSections, selectedSectionId]);

  const currentSection = useMemo(
    () => currentYearSections.find((s) => s.id === selectedSectionId) || currentYearSections[0],
    [currentYearSections, selectedSectionId]
  );

  // Curriculum subjects for current year
  const yearSubjects = useMemo(
    () => allSubjects.filter((s) => s.yearId === activeYearId),
    [allSubjects, activeYearId]
  );

  // Active faculty list
  const activeFaculty = useMemo(
    () => faculty.filter((f) => f.isActive !== false),
    [faculty]
  );

  // Local state for assignments of current section
  const [localAssignments, setLocalAssignments] = useState<SubjectAssignment[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [activeDraggingSubject, setActiveDraggingSubject] = useState<Subject | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load section assignments from database into local state
  useEffect(() => {
    if (!currentSection || !currentYear) {
      setLocalAssignments([]);
      setIsDirty(false);
      return;
    }

    const existing = allAssignments.filter(
      (a) => a.yearId === currentYear.id && a.sectionId === currentSection.id
    );

    setLocalAssignments(existing);
    setIsDirty(false);
  }, [allAssignments, currentYear, currentSection]);

  // Drag and drop sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  // Droppable container for right panel
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: 'section-assignment-dropzone',
  });

  const handleDragStart = (e: DragStartEvent) => {
    const sub = e.active.data.current?.subject as Subject | undefined;
    if (sub) {
      setActiveDraggingSubject(sub);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { over, active } = e;
    setActiveDraggingSubject(null);

    if (over && over.id === 'section-assignment-dropzone') {
      const sub = active.data.current?.subject as Subject | undefined;
      if (sub && currentSection && currentYear) {
        addSubjectToSection(sub);
      }
    }
  };

  const addSubjectToSection = (sub: Subject) => {
    if (!currentSection || !currentYear) return;

    // Check if subject already exists in section assignments
    const alreadyExists = localAssignments.some(
      (a) => a.subjectCode.toUpperCase() === sub.subjectCode.toUpperCase()
    );

    if (alreadyExists) {
      addToast({
        type: 'info',
        title: 'Already Added',
        message: `${sub.subjectCode} is already mapped in Section ${currentSection.sectionName}. You can select or update its faculty below.`,
      });
      return;
    }

    // Add subject without auto-assigning random faculty
    const newAssignment: SubjectAssignment = {
      id: `sa_${currentSection.id}_${sub.subjectCode}_${Date.now()}`,
      yearId: currentYear.id,
      sectionId: currentSection.id,
      sectionName: currentSection.sectionName,
      subjectCode: sub.subjectCode,
      subjectName: sub.subjectName,
      facultyCode: '',
      facultyName: '',
      weeklyPeriods: sub.weeklyPeriods || 4,
    };

    setLocalAssignments((prev) => [...prev, newAssignment]);
    setIsDirty(true);
    addToast({
      type: 'success',
      title: 'Subject Added',
      message: `${sub.subjectCode} (${sub.subjectName}) added to Section ${currentSection.sectionName}. Please select a faculty member.`,
    });
  };

  const handleAddAllYearSubjects = () => {
    if (!currentSection || !currentYear || yearSubjects.length === 0) return;

    const existingCodes = new Set(localAssignments.map((a) => a.subjectCode.toUpperCase()));
    const missingSubjects = yearSubjects.filter(
      (s) => !existingCodes.has(s.subjectCode.toUpperCase())
    );

    if (missingSubjects.length === 0) {
      addToast({
        type: 'info',
        title: 'All Subjects Present',
        message: `All curriculum subjects for ${currentYear.yearName} are already added to Section ${currentSection.sectionName}.`,
      });
      return;
    }

    const addedList: SubjectAssignment[] = missingSubjects.map((sub) => ({
      id: `sa_${currentSection.id}_${sub.subjectCode}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      yearId: currentYear.id,
      sectionId: currentSection.id,
      sectionName: currentSection.sectionName,
      subjectCode: sub.subjectCode,
      subjectName: sub.subjectName,
      facultyCode: '',
      facultyName: '',
      weeklyPeriods: sub.weeklyPeriods || 4,
    }));

    setLocalAssignments((prev) => [...prev, ...addedList]);
    setIsDirty(true);
    addToast({
      type: 'success',
      title: 'Subjects Added',
      message: `Added ${missingSubjects.length} subjects to Section ${currentSection.sectionName}. Please select faculty for each.`,
    });
  };

  const handleFacultyChange = (subjectCode: string, facultyCode: string) => {
    const selectedFac = activeFaculty.find((f) => f.facultyCode === facultyCode);
    setLocalAssignments((prev) =>
      prev.map((a) => {
        if (a.subjectCode.toUpperCase() === subjectCode.toUpperCase()) {
          return {
            ...a,
            facultyCode: facultyCode || '',
            facultyName: selectedFac ? selectedFac.facultyName : '',
          };
        }
        return a;
      })
    );
    setIsDirty(true);
  };

  const handleRemoveAssignment = (subjectCode: string) => {
    setLocalAssignments((prev) =>
      prev.filter((a) => a.subjectCode.toUpperCase() !== subjectCode.toUpperCase())
    );
    setIsDirty(true);
  };

  const handleSaveAssignments = async () => {
    if (!currentYear || !currentSection) return;
    setIsSaving(true);

    try {
      await cloudService.assignments.saveForSection(
        currentYear.id,
        currentSection.id,
        localAssignments
      );

      setIsDirty(false);
      addToast({
        type: 'success',
        title: 'Assignments Saved',
        message: `Successfully saved faculty assignments for Section ${currentSection.sectionName} to Cloud Firestore.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Failed to save assignments.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAssignments = () => {
    if (!currentSection || !currentYear) return;
    const existing = allAssignments.filter(
      (a) => a.yearId === currentYear.id && a.sectionId === currentSection.id
    );
    setLocalAssignments(existing);
    setIsDirty(false);
    addToast({
      type: 'info',
      title: 'Changes Discarded',
      message: 'Reset assignments to last saved database state.',
    });
  };

  // Completeness Metrics for current section
  const completenessSummary = useMemo(() => {
    const totalYearSubjects = yearSubjects.length;

    // Assigned means: subject exists in localAssignments AND facultyCode is non-empty
    const assignedCount = localAssignments.filter((a) => !!a.facultyCode.trim()).length;
    const missingCount = Math.max(0, totalYearSubjects - assignedCount);
    const isComplete = totalYearSubjects > 0 && assignedCount === totalYearSubjects;

    return {
      totalYearSubjects,
      assignedCount,
      missingCount,
      isComplete,
      percentage:
        totalYearSubjects > 0 ? Math.round((assignedCount / totalYearSubjects) * 100) : 0,
    };
  }, [yearSubjects, localAssignments]);

  // Filtered available subjects for left panel
  const filteredAvailableSubjects = useMemo(() => {
    return yearSubjects.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        s.subjectCode.toLowerCase().includes(q) ||
        s.subjectName.toLowerCase().includes(q)
      );
    });
  }, [yearSubjects, searchQuery]);

  // Filtered section assignments for right panel
  const filteredSectionAssignments = useMemo(() => {
    return localAssignments.filter((a) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        a.subjectCode.toLowerCase().includes(q) ||
        a.subjectName.toLowerCase().includes(q) ||
        a.facultyName.toLowerCase().includes(q) ||
        a.facultyCode.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const hasFaculty = !!a.facultyCode.trim();
      if (statusFilter === 'assigned') return hasFaculty;
      if (statusFilter === 'unassigned') return !hasFaculty;
      return true;
    });
  }, [localAssignments, searchQuery, statusFilter]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Year Selector Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {sortedYears.map((year) => {
              const isSelected = (currentYear?.id || '') === year.id;
              return (
                <button
                  key={year.id}
                  onClick={() => {
                    if (isDirty) {
                      if (
                        !window.confirm(
                          'You have unsaved changes in the current section. Switching years will discard them. Proceed?'
                        )
                      ) {
                        return;
                      }
                    }
                    setSelectedYearId(year.id);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {year.yearName}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage('subjects')}
              icon={<BookOpen className="w-4 h-4" />}
            >
              Manage Curriculum Master
            </Button>
          </div>
        </div>

        {currentYear && (
          <>
            {/* Header and Section Selector */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>
                    {currentYear.yearName} — Section Faculty Assignment
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign faculty to each subject independently for each section. Faculty assignments are isolated per section.
                </p>
              </div>

              {/* Section Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl">
                {currentYearSections.map((sec) => {
                  const isSelected = (currentSection?.id || '') === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        if (isDirty) {
                          if (
                            !window.confirm(
                              'You have unsaved changes. Switching sections will discard them. Continue?'
                            )
                          ) {
                            return;
                          }
                        }
                        setSelectedSectionId(sec.id);
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      Section {sec.sectionName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assignment Completeness Summary Card */}
            <Card className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/30 border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Target Section
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      {currentYear.yearName} — Section {currentSection?.sectionName}
                    </span>
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Curriculum
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {completenessSummary.totalYearSubjects} Subjects
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Assigned
                      </span>
                      <span className="text-sm font-bold text-emerald-700">
                        {completenessSummary.assignedCount}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Missing
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          completenessSummary.missingCount > 0
                            ? 'text-rose-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {completenessSummary.missingCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Completeness
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {completenessSummary.percentage}% Completed
                    </span>
                  </div>

                  {completenessSummary.isComplete ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ready for Generation</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Faculty Incomplete</span>
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* Filter and Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by code, subject name, or faculty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      statusFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('assigned')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      statusFilter === 'assigned'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Assigned
                  </button>
                  <button
                    onClick={() => setStatusFilter('unassigned')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      statusFilter === 'unassigned'
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Unassigned
                  </button>
                </div>
              </div>

              {/* Save / Reset Actions */}
              <div className="flex items-center gap-2">
                {isDirty && (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg animate-pulse">
                    ● Unsaved Changes
                  </span>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetAssignments}
                  disabled={!isDirty || isSaving}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Discard
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveAssignments}
                  disabled={!isDirty}
                  isLoading={isSaving}
                  icon={<Save className="w-4 h-4" />}
                >
                  Save Section {currentSection?.sectionName} Assignments
                </Button>
              </div>
            </div>

            {/* Split Screen Panel: Left = Available Subjects, Right = Section Assignments */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Panel: Available Subjects for Academic Year */}
              <div className="lg:col-span-5 space-y-3">
                <Card className="p-4 border-slate-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        <span>Available Curriculum Subjects</span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Drag or click &apos;Add&apos; to assign to Section {currentSection?.sectionName}
                      </p>
                    </div>
                    <Badge variant="neutral">
                      {filteredAvailableSubjects.length} of {yearSubjects.length}
                    </Badge>
                  </div>

                  {filteredAvailableSubjects.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No subjects found in curriculum.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setPage('subjects')}
                      >
                        Upload or Add Subjects
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                      {filteredAvailableSubjects.map((sub) => {
                        const isAssigned = localAssignments.some(
                          (a) => a.subjectCode.toUpperCase() === sub.subjectCode.toUpperCase()
                        );
                        return (
                          <DraggableSubjectItem
                            key={sub.id}
                            subject={sub}
                            isAssigned={isAssigned}
                            onAdd={addSubjectToSection}
                          />
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {/* Right Panel: Section Assignments List & Drop Zone */}
              <div className="lg:col-span-7 space-y-3">
                <div
                  ref={setDropRef}
                  className={`rounded-2xl transition-all ${
                    isOver
                      ? 'ring-2 ring-indigo-500 ring-offset-2 bg-indigo-50/40'
                      : ''
                  }`}
                >
                  <Card className="p-4 border-slate-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3 flex-wrap gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span>
                            Section {currentSection?.sectionName} Faculty Mappings
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Configure specific faculty for each subject in this section
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddAllYearSubjects}
                          icon={<Plus className="w-3.5 h-3.5" />}
                        >
                          Add All Year Subjects
                        </Button>
                      </div>
                    </div>

                    {/* Section Assignment Rows */}
                    {filteredSectionAssignments.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6">
                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h4 className="text-sm font-semibold text-slate-700">
                          No Subjects Assigned to Section {currentSection?.sectionName}
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                          Drag subjects from the left panel, or click the button below to populate all {currentYear.yearName} subjects into this section.
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleAddAllYearSubjects}
                          icon={<Plus className="w-3.5 h-3.5" />}
                        >
                          Add All {currentYear.yearName} Subjects
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {filteredSectionAssignments.map((a) => {
                          const hasFaculty = !!a.facultyCode.trim();
                          return (
                            <div
                              key={a.id}
                              className={`p-3.5 rounded-xl border transition-all ${
                                hasFaculty
                                  ? 'border-slate-200 bg-white hover:border-slate-300'
                                  : 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                      {a.subjectCode}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500">
                                      {a.weeklyPeriods} periods/wk
                                    </span>

                                    {hasFaculty ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>Assigned</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        <span>Faculty Missing</span>
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                                    {a.subjectName}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <div className="flex-1 sm:w-64">
                                    <select
                                      value={a.facultyCode}
                                      onChange={(e) =>
                                        handleFacultyChange(a.subjectCode, e.target.value)
                                      }
                                      className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium ${
                                        hasFaculty
                                          ? 'border-slate-300 bg-white text-slate-800'
                                          : 'border-amber-300 bg-amber-50/70 text-amber-900'
                                      }`}
                                    >
                                      <option value="">-- Select Faculty --</option>
                                      {activeFaculty.map((f) => (
                                        <option key={f.id} value={f.facultyCode}>
                                          {f.facultyCode} — {f.facultyName} (
                                          {f.designation || 'Faculty'})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAssignment(a.subjectCode)}
                                    title="Remove assignment from this section"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drag Overlay preview */}
      <DragOverlay>
        {activeDraggingSubject ? (
          <div className="p-3 rounded-xl border border-indigo-400 bg-white shadow-xl max-w-xs">
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              {activeDraggingSubject.subjectCode}
            </span>
            <h4 className="text-xs font-semibold text-slate-900 mt-1">
              {activeDraggingSubject.subjectName}
            </h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
