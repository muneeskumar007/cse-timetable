import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { useUiStore } from '../stores/uiStore';
import { useTimetableStore } from '../stores/timetableStore';
import { canMoveOrSwap } from '../timetable/validator';
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
  Save,
  RotateCcw,
  History,
  ShieldCheck,
  FlaskConical,
  GripVertical,
  User,
  MapPin,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  Library,
} from 'lucide-react';
import type { TimetableEntry, PeriodConfig, DayOfWeek, TimetableVersion } from '../types';
import { ALL_DAYS } from '../types';

interface CellProps {
  day: DayOfWeek;
  period: PeriodConfig;
  entry?: TimetableEntry;
  isSaturdayClosed: boolean;
  isLunchDivider?: boolean;
}

const DroppableCell: React.FC<CellProps> = ({ day, period, entry, isSaturdayClosed, isLunchDivider }) => {
  const cellId = `cell_${day}_${period.periodNumber}`;
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    disabled: isSaturdayClosed || isLunchDivider || entry?.entryType === 'unit_test' || entry?.isFixed,
    data: { day, periodNumber: period.periodNumber },
  });

  if (isSaturdayClosed) {
    return (
      <td className="p-2 border-r border-slate-200 bg-slate-100/50 text-slate-400 text-center text-xs select-none">
        —
      </td>
    );
  }

  return (
    <td
      ref={setNodeRef}
      className={`p-2 border-r border-slate-200 align-top transition-colors min-w-[135px] ${
        isOver ? 'bg-indigo-50/80 ring-2 ring-indigo-400 ring-inset' : 'bg-white'
      }`}
    >
      {entry ? (
        <DraggableEntry entry={entry} />
      ) : (
        <div className="h-16 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300 select-none">
          Drop here
        </div>
      )}
    </td>
  );
};

const DraggableEntry: React.FC<{ entry: TimetableEntry; isDraggingOverlay?: boolean }> = ({
  entry,
  isDraggingOverlay = false,
}) => {
  const isUnitTest = entry.entryType === 'unit_test';
  const isFixed = entry.isFixed || isUnitTest;
  const isLab = entry.entryType === 'practical_lab' || entry.entryType === 'integrated_lab';
  const isLib = entry.entryType === 'library';

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: entry.id,
    disabled: isFixed,
    data: { entry },
  });

  if (isUnitTest) {
    return (
      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 shadow-xs select-none">
        <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
          <span>UNIT TEST</span>
        </div>
        <span className="text-[10px] text-rose-500 block mt-0.5">Fixed (Locked)</span>
      </div>
    );
  }

  if (entry.isFixed) {
    return (
      <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-200 text-indigo-950 shadow-xs select-none">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-bold text-xs leading-tight line-clamp-1 text-indigo-900">
            {entry.subjectName}
          </span>
          <Lock className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
        </div>
        <div className="text-[10px] text-indigo-600 font-medium">
          {isLab ? 'Fixed Lab Block' : isLib ? 'Fixed Library Period' : 'Fixed Theory Assignment'}
        </div>
        {entry.facultyCode && (
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
            <User className="w-3 h-3 text-slate-400" />
            <span className="font-mono">{entry.facultyCode}</span>
          </div>
        )}
        {entry.roomNumber && (
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>Rm {entry.roomNumber}</span>
          </div>
        )}
      </div>
    );
  }

  if (isLab) {
    const isPractical = entry.entryType === 'practical_lab';
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`p-2 rounded-lg cursor-grab active:cursor-grabbing border shadow-xs transition-all select-none ${
          isPractical
            ? 'bg-purple-50 border-purple-300 text-purple-950 hover:border-purple-400'
            : 'bg-indigo-50 border-indigo-300 text-indigo-950 hover:border-indigo-400'
        } ${isDragging ? 'opacity-40 ring-2 ring-purple-400' : ''} ${isDraggingOverlay ? 'shadow-xl rotate-2 ring-2 ring-purple-600' : ''}`}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-bold text-xs leading-tight line-clamp-1">{entry.subjectName}</span>
          <GripVertical className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-700">
          <FlaskConical className="w-3 h-3 text-purple-500" />
          <span>{isPractical ? 'Practical (3 Pds)' : 'Integrated (2 Pds)'}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-1">
          <User className="w-3 h-3 text-slate-400" />
          <span className="font-mono">{entry.facultyCode}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-purple-800 font-medium">
          <MapPin className="w-3 h-3 text-purple-500" />
          <span>{entry.roomNumber}</span>
        </div>
      </div>
    );
  }

  if (isLib) {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 cursor-grab active:cursor-grabbing shadow-xs transition-all select-none hover:border-amber-400 hover:shadow-sm ${
          isDragging ? 'opacity-40 ring-2 ring-amber-400' : ''
        } ${isDraggingOverlay ? 'shadow-xl rotate-2 ring-2 ring-amber-600' : ''}`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-mono font-bold text-xs text-amber-800">LIB</span>
          <GripVertical className="w-3 h-3 text-amber-400 flex-shrink-0" />
        </div>
        <p className="font-semibold text-amber-900 text-[11px] leading-snug line-clamp-1 mt-0.5">
          Library Period
        </p>
        <div className="flex items-center gap-1 text-[10px] text-amber-700 mt-1">
          <Library className="w-3 h-3 text-amber-500" />
          <span>Self Study / Research</span>
        </div>
      </div>
    );
  }

  // Regular theory class
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-2 rounded-lg bg-white border border-slate-200/90 shadow-xs cursor-grab active:cursor-grabbing transition-all select-none hover:border-indigo-400 hover:shadow-sm ${
        isDragging ? 'opacity-40 ring-2 ring-indigo-400' : ''
      } ${isDraggingOverlay ? 'shadow-xl rotate-2 ring-2 ring-indigo-600' : ''}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono font-bold text-xs text-indigo-700">{entry.subjectCode}</span>
        <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
      </div>
      <p className="font-medium text-slate-800 text-[11px] leading-snug line-clamp-1 mt-0.5">
        {entry.subjectName}
      </p>
      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
        <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
        <span className="font-mono">{entry.facultyCode}</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-slate-500">
        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
        <span>Rm {entry.roomNumber}</span>
      </div>
    </div>
  );
};

export const EditorPage: React.FC = () => {
  const { selectedYearId, setSelectedYearId, selectedSectionId, setSelectedSectionId, addToast } =
    useUiStore();
  const {
    stagedEntries,
    setStagedEntries,
    loadSavedEntries,
    hasUnsavedChanges,
    saveCurrentTimetable,
    resetToGenerated,
    restoreVersion,
  } = useTimetableStore();

  const {
    years,
    sections: allSections,
    periods,
    entries: dbEntries,
    fixedSlots,
    fixedAssignments,
    assignments,
    labs,
    versions: rawVersions,
    settings,
  } = useData();

  const sortedYears = [...years].sort((a, b) => a.orderIndex - b.orderIndex);
  const activeYearId = selectedYearId || sortedYears[0]?.id;
  const currentYear = sortedYears.find((y) => y.id === activeYearId) || sortedYears[0];

  const sections = allSections.filter((s) => s.yearId === activeYearId);
  const activeSectionId = selectedSectionId || sections[0]?.id;
  const currentSection = sections.find((s) => s.id === activeSectionId) || sections[0];

  const versions = [...rawVersions].sort((a, b) => b.versionNumber - a.versionNumber);

  // Synchronize staged entries from db if empty
  useEffect(() => {
    if (stagedEntries.length === 0 && dbEntries.length > 0) {
      loadSavedEntries(dbEntries);
    }
  }, [dbEntries, stagedEntries.length, loadSavedEntries]);

  // Active drag state
  const [activeDragEntry, setActiveDragEntry] = useState<TimetableEntry | null>(null);

  // Dialog states
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // DND Sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    const entry = event.active.data.current?.entry as TimetableEntry | undefined;
    if (entry) {
      setActiveDragEntry(entry);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragEntry(null);

    if (!over) return;

    const sourceEntry = active.data.current?.entry as TimetableEntry | undefined;
    const overData = over.data.current as { day: DayOfWeek; periodNumber: number } | undefined;

    if (!sourceEntry || !overData) return;

    const targetDay = overData.day;
    const targetPeriod = overData.periodNumber;

    // If dropped on the same slot, do nothing
    if (sourceEntry.day === targetDay && sourceEntry.periodNumber === targetPeriod) {
      return;
    }

    // Validation context
    const validationContext = {
      assignments,
      labs,
      fixedSlots,
      fixedAssignments,
      settings,
      periods,
    };

    // Pre-validate move / swap
    const check = canMoveOrSwap(
      stagedEntries,
      sourceEntry,
      targetDay,
      targetPeriod,
      validationContext
    );

    if (!check.allowed) {
      addToast({
        type: 'error',
        title: 'Move Rejected',
        message: check.reason || 'Collision detected with another faculty or room.',
        duration: 5000,
      });
      return;
    }

    // Apply the valid move!
    const updated = [...stagedEntries];

    // Case 1: Lab block move
    if (
      (sourceEntry.entryType === 'practical_lab' || sourceEntry.entryType === 'integrated_lab') &&
      sourceEntry.labBlockId
    ) {
      const blockEntries = updated
        .filter((e) => e.labBlockId === sourceEntry.labBlockId)
        .sort((a, b) => (a.labBlockPeriodIndex || 0) - (b.labBlockPeriodIndex || 0));

      blockEntries.forEach((e, idx) => {
        const itemIdx = updated.findIndex((item) => item.id === e.id);
        if (itemIdx !== -1) {
          updated[itemIdx] = {
            ...updated[itemIdx],
            day: targetDay,
            periodNumber: targetPeriod + idx,
          };
        }
      });

      setStagedEntries(updated, true);
      addToast({
        type: 'success',
        title: 'Lab Block Moved',
        message: `${sourceEntry.subjectName} moved as an atomic block to ${targetDay} Periods ${targetPeriod}-${targetPeriod + blockEntries.length - 1}.`,
      });
      return;
    }

    // Case 2: Theory class move or swap
    const targetExistingIndex = updated.findIndex(
      (e) =>
        e.id !== sourceEntry.id &&
        e.day === targetDay &&
        e.periodNumber === targetPeriod &&
        e.sectionId === sourceEntry.sectionId
    );

    const sourceIndex = updated.findIndex((e) => e.id === sourceEntry.id);
    if (sourceIndex === -1) return;

    if (targetExistingIndex !== -1) {
      // SWAP within same section
      const targetExisting = updated[targetExistingIndex];
      updated[sourceIndex] = {
        ...sourceEntry,
        day: targetDay,
        periodNumber: targetPeriod,
      };
      updated[targetExistingIndex] = {
        ...targetExisting,
        day: sourceEntry.day,
        periodNumber: sourceEntry.periodNumber,
      };
      addToast({
        type: 'info',
        title: 'Classes Swapped',
        message: `Swapped ${sourceEntry.subjectCode} with ${targetExisting.subjectCode}.`,
      });
    } else {
      // MOVE to empty slot
      updated[sourceIndex] = {
        ...sourceEntry,
        day: targetDay,
        periodNumber: targetPeriod,
      };
      addToast({
        type: 'info',
        title: 'Class Rescheduled',
        message: `${sourceEntry.subjectCode} moved to ${targetDay} Period ${targetPeriod}.`,
      });
    }

    setStagedEntries(updated, true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveCurrentTimetable();
      addToast({
        type: 'success',
        title: 'Timetable Committed',
        message: 'Saved changes as Current Saved Timetable. A new version snapshot was recorded.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Save Error', message: err?.message || 'Could not save.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToGenerated = async () => {
    const success = await resetToGenerated();
    if (success) {
      addToast({
        type: 'info',
        title: 'Reset Complete',
        message: 'Restored original generated timetable. All manual edits discarded.',
      });
    } else {
      addToast({
        type: 'error',
        title: 'No Generated Timetable',
        message: 'No baseline generated timetable was found in database.',
      });
    }
    setIsResetDialogOpen(false);
  };

  const handleRestoreVersion = async (ver: TimetableVersion) => {
    await restoreVersion(ver);
    addToast({
      type: 'success',
      title: 'Version Restored',
      message: `Restored "${ver.name}" (${ver.timestamp}).`,
    });
    setIsHistoryModalOpen(false);
  };

  // Active entries filtered for currently selected Section
  const currentSectionEntries = stagedEntries.filter((e) => e.sectionId === currentSection?.id);

  const sortedPeriods = periods.slice().sort((a, b) => a.periodNumber - b.periodNumber);
  const lunchAfterPeriod = settings.lunchAfterPeriod || 4;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Interactive Timetable Editor</h1>
          <p className="text-xs text-slate-500">
            Drag and drop theory classes or atomic lab blocks with instant conflict prevention
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryModalOpen(true)}
            icon={<History className="w-3.5 h-3.5 text-indigo-600" />}
          >
            History ({versions.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResetDialogOpen(true)}
            icon={<RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
          >
            Reset to Generated
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            isLoading={isSaving}
            icon={<Save className="w-4 h-4" />}
          >
            Save Timetable
          </Button>
        </div>
      </div>

      {/* Year and Section Selector Toolbar */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Year Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Academic Year
              </label>
              <div className="flex items-center gap-1.5">
                {sortedYears.map((y) => (
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
              <div className="pl-4 border-l border-slate-200">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Section
                </label>
                <div className="flex items-center gap-1.5">
                  {sections
                    .filter((s) => s.yearId === currentYear.id)
                    .map((sec) => (
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

          {/* Current Section Info */}
          {currentSection && (
            <div className="text-right text-xs">
              <span className="font-semibold text-slate-800 block">
                {currentYear?.yearName} — Section {currentSection.sectionName}
              </span>
              <span className="text-slate-500">
                Classroom: <strong>Room {currentSection.roomNumber || 'Unassigned'}</strong>
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Editor Grid */}
      {stagedEntries.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Timetable Available to Edit</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Please generate a timetable first from the Generator page.
            </p>
          </div>
        </Card>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-semibold">
                  <th className="py-3 px-4 w-28 uppercase tracking-wider text-slate-300 border-r border-slate-800">
                    Day
                  </th>
                  {sortedPeriods.map((p) => {
                    const isAfterLunch = p.periodNumber === lunchAfterPeriod + 1;
                    return (
                      <React.Fragment key={p.id}>
                        {isAfterLunch && (
                          <th className="py-3 px-2 w-14 text-center bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider border-r border-slate-800">
                            Lunch
                          </th>
                        )}
                        <th className="py-3 px-3 text-center border-r border-slate-800">
                          <div className="font-bold text-xs">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                            {p.startTime} - {p.endTime}
                          </div>
                        </th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {ALL_DAYS.map((day) => {
                  const isSaturday = day === 'Saturday';

                  return (
                    <tr key={day}>
                      {/* Day Name */}
                      <td className="py-3 px-4 font-bold text-slate-900 bg-slate-50/80 border-r border-slate-200">
                        <span>{day}</span>
                        {isSaturday && (
                          <span className="block text-[10px] text-amber-600 font-normal mt-0.5">
                            Half Day
                          </span>
                        )}
                      </td>

                      {/* Periods */}
                      {sortedPeriods.map((p) => {
                        const isAfterLunch = p.periodNumber === lunchAfterPeriod + 1;
                        const isSaturdayClosed = isSaturday && p.periodNumber > 4;

                        const match = currentSectionEntries.find(
                          (e) => e.day === day && e.periodNumber === p.periodNumber
                        );

                        return (
                          <React.Fragment key={p.id}>
                            {/* Lunch column */}
                            {isAfterLunch && (
                              <td
                                className={`p-1 text-center border-r border-slate-200 select-none ${
                                  isSaturday
                                    ? 'bg-slate-50 text-slate-300'
                                    : 'bg-amber-50/70 text-amber-800 font-semibold'
                                }`}
                              >
                                {!isSaturday && (
                                  <div className="writing-mode-vertical text-[10px] uppercase tracking-widest py-2 select-none text-amber-700">
                                    LUNCH
                                  </div>
                                )}
                              </td>
                            )}

                            <DroppableCell
                              day={day}
                              period={p}
                              entry={match}
                              isSaturdayClosed={isSaturdayClosed}
                            />
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Drag Overlay Ghost */}
          <DragOverlay>
            {activeDragEntry ? (
              <div className="w-48 pointer-events-none">
                <DraggableEntry entry={activeDragEntry} isDraggingOverlay={true} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Reset Confirmation */}
      <ConfirmationDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetToGenerated}
        title="Reset to Generated Timetable?"
        message="Are you sure you want to reset all manual edits? This will restore the pristine baseline timetable generated by the solver."
        confirmLabel="Reset Timetable"
        variant="danger"
      />

      {/* Version History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIsHistoryModalOpen(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Timetable Version Snapshots</h3>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  Close
                </button>
              </div>

              {versions.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No snapshots stored yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {versions.map((v) => (
                    <div key={v.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{v.name}</span>
                          {v.isGenerated && <Badge variant="indigo">Solver Generated</Badge>}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{v.timestamp}</span>
                        <span className="text-[11px] text-slate-500">{v.entries.length} scheduled periods</span>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreVersion(v)}
                        icon={<RotateCcw className="w-3 h-3 text-indigo-600" />}
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
