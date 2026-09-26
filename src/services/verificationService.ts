import type {
  AcademicYear,
  DayOfWeek,
  DepartmentSettings,
  DepartmentVerificationSummary,
  Faculty,
  FacultyFreeBusySlot,
  FacultySlotAvailability,
  FixedAssignment,
  FixedSlot,
  Lab,
  LabFrequencySummary,
  LibraryFrequencySummary,
  PeriodConfig,
  Room,
  Section,
  SectionVerification,
  SubjectAssignment,
  SubjectFrequencySummary,
  TimetableEntry,
  ValidationError,
  VerificationStatus,
  WorkloadStatus,
} from '../types';

/**
 * Calculates Faculty Free vs Busy availability for a specific Day and Period.
 */
export function calculateFacultyAvailability(
  entries: TimetableEntry[],
  facultyList: Faculty[],
  day: DayOfWeek,
  periodNumber: number,
  periodConfigs: PeriodConfig[] = []
): FacultySlotAvailability {
  // Pre-calculate weekly teaching workload for all faculty from entries
  const workloadMap = new Map<string, number>();
  for (const entry of entries) {
    if (entry.facultyCode) {
      const codes = entry.facultyCode.split(',').map((c) => c.trim().toUpperCase());
      for (const code of codes) {
        workloadMap.set(code, (workloadMap.get(code) || 0) + 1);
      }
    }
  }

  // Pre-filter entries for target slot
  const slotEntries = entries.filter(
    (e) => e.day === day && e.periodNumber === periodNumber
  );

  const freeFaculty: FacultyFreeBusySlot[] = [];
  const busyFaculty: FacultyFreeBusySlot[] = [];

  for (const f of facultyList.filter((fac) => fac.isActive !== false)) {
    const codeKey = (f.facultyCode || '').trim().toUpperCase();
    const assignedLoad = workloadMap.get(codeKey) || 0;
    const requiredLoad = f.weeklyWorkload || 18;
    const remainingLoad = requiredLoad - assignedLoad;

    let status: WorkloadStatus = 'balanced';
    if (assignedLoad < requiredLoad) status = 'underloaded';
    else if (assignedLoad > requiredLoad) status = 'overloaded';

    const workloadInfo = {
      required: requiredLoad,
      assigned: assignedLoad,
      remaining: remainingLoad,
      status,
    };

    // Check if faculty is occupied in this slot
    const assignedEntry = slotEntries.find((e) => {
      if (!e.facultyCode) return false;
      const codes = e.facultyCode.split(',').map((c) => c.trim().toUpperCase());
      return codes.includes(codeKey);
    });

    if (assignedEntry) {
      busyFaculty.push({
        faculty: f,
        isFree: false,
        assignedEntry,
        workload: workloadInfo,
      });
    } else {
      freeFaculty.push({
        faculty: f,
        isFree: true,
        workload: workloadInfo,
      });
    }
  }

  const periodConfig = periodConfigs.find((p) => p.periodNumber === periodNumber);

  return {
    day,
    periodNumber,
    periodConfig,
    freeFaculty,
    busyFaculty,
  };
}

/**
 * Verifies a single section's timetable completeness, subject frequency,
 * lab continuity, library requirements, and unassigned slots.
 */
export function verifySectionTimetable(
  entries: TimetableEntry[],
  section: Section,
  year: AcademicYear,
  assignments: SubjectAssignment[],
  labs: Lab[],
  fixedSlots: FixedSlot[],
  fixedAssignments: FixedAssignment[],
  settings: DepartmentSettings,
  periods: PeriodConfig[]
): SectionVerification {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const sectionEntries = entries.filter(
    (e) => e.sectionId === section.id && e.yearId === year.id
  );

  // 1. Calculate available slots and unassigned slots
  let totalAvailableSlots = 0;
  const unassignedPeriodsList: { day: DayOfWeek; periodNumber: number }[] = [];

  const workingDays = settings.workingDays || [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  for (const day of workingDays) {
    const maxPeriod =
      day === 'Saturday'
        ? settings.periodsOnSaturday || 4
        : settings.periodsPerFullDay || 7;

    for (let p = 1; p <= maxPeriod; p++) {
      totalAvailableSlots++;

      const isFixedSlot = fixedSlots.some(
        (fs) => fs.day === day && fs.periodNumber === p
      );
      const hasEntry = sectionEntries.some(
        (e) => e.day === day && e.periodNumber === p
      );

      if (!isFixedSlot && !hasEntry) {
        unassignedPeriodsList.push({ day, periodNumber: p });
      }
    }
  }

  const unassignedSlots = unassignedPeriodsList.length;

  // 2. Subject Frequency Verification
  const sectionAssignments = assignments.filter(
    (a) => a.sectionId === section.id && a.yearId === year.id
  );

  let theorySlotsCount = 0;
  const subjectSummaries: SubjectFrequencySummary[] = sectionAssignments.map((assignment) => {
    const matchingEntries = sectionEntries.filter(
      (e) =>
        e.entryType === 'theory' &&
        (e.subjectCode.toUpperCase() === assignment.subjectCode.toUpperCase() ||
          e.subjectName.toLowerCase() === assignment.subjectName.toLowerCase())
    );

    const assignedPeriods = matchingEntries.length;
    theorySlotsCount += assignedPeriods;
    const requiredPeriods = assignment.weeklyPeriods || 0;
    const difference = assignedPeriods - requiredPeriods;

    let status: VerificationStatus = 'complete';
    if (difference < 0) {
      status = 'error';
      errors.push({
        type: 'WEEKLY_PERIODS',
        severity: 'error',
        sectionId: section.id,
        sectionName: section.sectionName,
        subjectCode: assignment.subjectCode,
        message: `Subject ${assignment.subjectCode} (${assignment.subjectName}) requires ${requiredPeriods} periods, but only ${assignedPeriods} scheduled.`,
      });
    } else if (difference > 0) {
      status = 'warning';
      warnings.push({
        type: 'WEEKLY_PERIODS',
        severity: 'warning',
        sectionId: section.id,
        sectionName: section.sectionName,
        subjectCode: assignment.subjectCode,
        message: `Subject ${assignment.subjectCode} is over-assigned by ${difference} period(s).`,
      });
    }

    const occurrences = matchingEntries.map((e) => ({
      day: e.day,
      periodNumber: e.periodNumber,
      roomNumber: e.roomNumber || '',
      isFixed: !!e.isFixed,
    }));

    return {
      subjectCode: assignment.subjectCode,
      subjectName: assignment.subjectName,
      facultyCode: assignment.facultyCode,
      facultyName: assignment.facultyName,
      requiredPeriods,
      assignedPeriods,
      difference,
      occurrences,
      status,
    };
  });

  // 3. Lab Continuity Verification
  const sectionLabs = labs.filter(
    (l) => l.sectionId === section.id && l.yearId === year.id
  );

  let labSlotsCount = 0;
  const labSummaries: LabFrequencySummary[] = sectionLabs.map((lab) => {
    const matchingEntries = sectionEntries.filter((e) => {
      const isLab = e.entryType === 'practical_lab' || e.entryType === 'integrated_lab';
      return (
        isLab &&
        (e.subjectCode === lab.id ||
          e.subjectName.toLowerCase() === lab.labName.toLowerCase() ||
          e.subjectName.toLowerCase().includes(lab.labName.toLowerCase()))
      );
    });

    const assignedPeriods = matchingEntries.length;
    labSlotsCount += assignedPeriods;
    const requiredPeriods = lab.weeklyPeriods || (lab.labType === 'practical' ? 3 : 2);

    // Group into blocks
    const dayGroups = new Map<string, TimetableEntry[]>();
    for (const e of matchingEntries) {
      const list = dayGroups.get(e.day) || [];
      list.push(e);
      dayGroups.set(e.day, list);
    }

    const occurrences: {
      day: DayOfWeek;
      periodNumbers: number[];
      roomNumber: string;
      isFixed: boolean;
    }[] = [];

    let isContinuous = true;
    for (const [d, bEntries] of dayGroups.entries()) {
      const sorted = bEntries.map((e) => e.periodNumber).sort((a, b) => a - b);
      occurrences.push({
        day: d as DayOfWeek,
        periodNumbers: sorted,
        roomNumber: bEntries[0]?.roomNumber || lab.roomNumber,
        isFixed: bEntries.some((e) => e.isFixed),
      });

      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) {
          isContinuous = false;
        }
      }
    }

    let status: VerificationStatus = 'complete';
    if (assignedPeriods === 0) {
      status = 'error';
      errors.push({
        type: 'LAB_FREQUENCY',
        severity: 'error',
        sectionId: section.id,
        sectionName: section.sectionName,
        message: `Lab "${lab.labName}" is completely missing.`,
      });
    } else if (assignedPeriods !== requiredPeriods || !isContinuous) {
      status = 'error';
      errors.push({
        type: 'LAB_CONTINUITY',
        severity: 'error',
        sectionId: section.id,
        sectionName: section.sectionName,
        message: `Lab "${lab.labName}" has ${assignedPeriods}/${requiredPeriods} periods scheduled and continuous = ${isContinuous}.`,
      });
    }

    return {
      labId: lab.id,
      labName: lab.labName,
      labType: lab.labType,
      facultyCode: lab.facultyCode,
      facultyName: lab.facultyName,
      roomNumber: lab.roomNumber,
      requiredBlocks: 1,
      assignedBlocks: occurrences.length,
      requiredPeriods,
      assignedPeriods,
      occurrences,
      status,
    };
  });

  // 4. Library Requirement Verification
  const libraryEntries = sectionEntries.filter((e) => e.entryType === 'library');
  const librarySlotsCount = libraryEntries.length;
  const librarySatisfied = librarySlotsCount >= 1;

  let libraryStatus: VerificationStatus = 'complete';
  if (!librarySatisfied) {
    libraryStatus = 'error';
    errors.push({
      type: 'LIBRARY_REQUIREMENT',
      severity: 'error',
      sectionId: section.id,
      sectionName: section.sectionName,
      message: `Section ${section.sectionName} does not have any scheduled Library period (minimum 1 required).`,
    });
  }

  const librarySummary: LibraryFrequencySummary = {
    requiredPeriods: 1,
    assignedPeriods: librarySlotsCount,
    occurrences: libraryEntries.map((e) => ({
      day: e.day,
      periodNumber: e.periodNumber,
      roomNumber: e.roomNumber || '',
      facultyCode: e.facultyCode,
      facultyName: e.facultyName,
      isFixed: !!e.isFixed,
    })),
    status: libraryStatus,
  };

  // 5. Fixed Slots & Assignments Counts
  const sectionActiveFixed = fixedAssignments.filter(
    (fa) => fa.active && fa.sectionId === section.id && fa.yearId === year.id
  );
  const unitTestSlotsCount = sectionEntries.filter((e) => e.entryType === 'unit_test').length;
  const fixedSlotsCount = sectionActiveFixed.length + fixedSlots.length;

  let overallStatus: VerificationStatus = 'complete';
  if (errors.length > 0) overallStatus = 'error';
  else if (warnings.length > 0) overallStatus = 'warning';

  return {
    yearId: year.id,
    yearName: year.yearName,
    sectionId: section.id,
    sectionName: section.sectionName,
    totalAvailableSlots,
    assignedSlots: sectionEntries.length,
    unassignedSlots,
    unassignedPeriodsList,
    fixedSlotsCount,
    unitTestSlotsCount,
    labSlotsCount,
    librarySlotsCount,
    theorySlotsCount,
    subjectSummaries,
    labSummaries,
    librarySummary,
    fixedAssignments: sectionActiveFixed,
    errors,
    warnings,
    status: overallStatus,
    isComplete: overallStatus === 'complete',
  };
}

/**
 * Runs department-wide verification across all years and sections.
 */
export function verifyDepartmentTimetable(
  entries: TimetableEntry[],
  years: AcademicYear[],
  sections: Section[],
  assignments: SubjectAssignment[],
  labs: Lab[],
  fixedSlots: FixedSlot[],
  fixedAssignments: FixedAssignment[],
  settings: DepartmentSettings,
  periods: PeriodConfig[]
): DepartmentVerificationSummary {
  const sectionVerifications: SectionVerification[] = [];

  for (const year of years) {
    const yearSections = sections.filter((s) => s.yearId === year.id);
    for (const section of yearSections) {
      const result = verifySectionTimetable(
        entries,
        section,
        year,
        assignments,
        labs,
        fixedSlots,
        fixedAssignments,
        settings,
        periods
      );
      sectionVerifications.push(result);
    }
  }

  const completeSections = sectionVerifications.filter((s) => s.status === 'complete').length;
  const warningSections = sectionVerifications.filter((s) => s.status === 'warning').length;
  const errorSections = sectionVerifications.filter((s) => s.status === 'error').length;

  return {
    totalSections: sectionVerifications.length,
    completeSections,
    warningSections,
    errorSections,
    sectionVerifications,
  };
}
