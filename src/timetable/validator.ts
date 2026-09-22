import type {
  TimetableEntry,
  SubjectAssignment,
  Lab,
  FixedSlot,
  DepartmentSettings,
  PeriodConfig,
  DayOfWeek,
  ValidationResult,
  ValidationError,
} from '../types';

export interface ValidationContext {
  assignments: SubjectAssignment[];
  labs: Lab[];
  fixedSlots: FixedSlot[];
  settings: DepartmentSettings;
  periods: PeriodConfig[];
}

export function validateTimetable(
  entries: TimetableEntry[],
  context: ValidationContext
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const { assignments, labs, fixedSlots, settings, periods } = context;
  const maxSaturdayPeriods = settings.periodsOnSaturday || 4;
  const lunchAfterPeriod = settings.lunchAfterPeriod || 4;

  // 1. Check Fixed Slots
  for (const slot of fixedSlots) {
    const conflicts = entries.filter(
      (e) => e.day === slot.day && e.periodNumber === slot.periodNumber && e.entryType !== 'unit_test'
    );
    for (const c of conflicts) {
      errors.push({
        type: 'FIXED_SLOT',
        severity: 'error',
        day: slot.day,
        periodNumber: slot.periodNumber,
        sectionId: c.sectionId,
        sectionName: c.sectionName,
        facultyCode: c.facultyCode,
        message: `${slot.day} Period ${slot.periodNumber} is a protected ${slot.description}. Normal class "${c.subjectName}" cannot be scheduled here.`,
      });
    }
  }

  // 2. Check Saturday Restrictions
  const saturdayEntries = entries.filter((e) => e.day === 'Saturday');
  for (const e of saturdayEntries) {
    if (e.periodNumber > maxSaturdayPeriods) {
      errors.push({
        type: 'SATURDAY_RESTRICTION',
        severity: 'error',
        day: 'Saturday',
        periodNumber: e.periodNumber,
        message: `Saturday only has ${maxSaturdayPeriods} periods. Period ${e.periodNumber} is not allowed.`,
      });
    }
    if (e.entryType === 'practical_lab') {
      errors.push({
        type: 'SATURDAY_RESTRICTION',
        severity: 'error',
        day: 'Saturday',
        periodNumber: e.periodNumber,
        message: 'Practical Lab (3 consecutive periods) cannot be scheduled on Saturday.',
      });
    }
  }

  // Map for simultaneous collision detection: (day + '_' + periodNumber)
  const facultySlots = new Map<string, TimetableEntry[]>();
  const sectionSlots = new Map<string, TimetableEntry[]>();
  const roomSlots = new Map<string, TimetableEntry[]>();

  for (const entry of entries) {
    if (entry.entryType === 'unit_test') continue; // Unit tests are department-wide

    const timeKey = `${entry.day}_${entry.periodNumber}`;

    // Faculty conflict
    if (entry.facultyCode) {
      const facKey = `${timeKey}_${entry.facultyCode.toUpperCase()}`;
      const facList = facultySlots.get(facKey) || [];
      facList.push(entry);
      facultySlots.set(facKey, facList);
    }

    // Section conflict
    if (entry.sectionId) {
      const secKey = `${timeKey}_${entry.sectionId}`;
      const secList = sectionSlots.get(secKey) || [];
      secList.push(entry);
      sectionSlots.set(secKey, secList);
    }

    // Room conflict
    if (entry.roomId) {
      const rmKey = `${timeKey}_${entry.roomId}`;
      const rmList = roomSlots.get(rmKey) || [];
      rmList.push(entry);
      roomSlots.set(rmKey, rmList);
    }
  }

  // Faculty conflicts
  for (const [key, list] of facultySlots.entries()) {
    if (list.length > 1) {
      const first = list[0];
      const sections = list.map((e) => `${e.sectionName ? `Sec ${e.sectionName}` : ''} (${e.subjectCode})`).join(' and ');
      errors.push({
        type: 'FACULTY_CONFLICT',
        severity: 'error',
        day: first.day,
        periodNumber: first.periodNumber,
        facultyCode: first.facultyCode,
        facultyName: first.facultyName,
        message: `Faculty ${first.facultyName} (${first.facultyCode}) is double-booked on ${first.day} Period ${first.periodNumber} for ${sections}.`,
      });
    }
  }

  // Section conflicts
  for (const [key, list] of sectionSlots.entries()) {
    if (list.length > 1) {
      const first = list[0];
      const subjects = list.map((e) => e.subjectCode).join(' and ');
      errors.push({
        type: 'SECTION_CONFLICT',
        severity: 'error',
        day: first.day,
        periodNumber: first.periodNumber,
        sectionId: first.sectionId,
        sectionName: first.sectionName,
        message: `Section ${first.sectionName} has multiple classes scheduled at the same time on ${first.day} Period ${first.periodNumber} (${subjects}).`,
      });
    }
  }

  // Room conflicts
  for (const [key, list] of roomSlots.entries()) {
    if (list.length > 1) {
      const first = list[0];
      const classes = list.map((e) => `${e.subjectCode} (Sec ${e.sectionName})`).join(' and ');
      errors.push({
        type: 'ROOM_CONFLICT',
        severity: 'error',
        day: first.day,
        periodNumber: first.periodNumber,
        roomId: first.roomId,
        roomNumber: first.roomNumber,
        message: `Room ${first.roomNumber} is double-booked on ${first.day} Period ${first.periodNumber} by ${classes}.`,
      });
    }
  }

  // 3. Lab Blocks Verification (Continuity, Duration, Lunch Crossing)
  const labBlocks = new Map<string, TimetableEntry[]>();
  for (const entry of entries) {
    if ((entry.entryType === 'practical_lab' || entry.entryType === 'integrated_lab') && entry.labBlockId) {
      const list = labBlocks.get(entry.labBlockId) || [];
      list.push(entry);
      labBlocks.set(entry.labBlockId, list);
    }
  }

  for (const [blockId, blockEntries] of labBlocks.entries()) {
    const first = blockEntries[0];
    const isPractical = first.entryType === 'practical_lab';
    const expectedDuration = isPractical ? 3 : 2;

    // Check duration
    if (blockEntries.length !== expectedDuration) {
      errors.push({
        type: 'LAB_CONTINUITY',
        severity: 'error',
        day: first.day,
        sectionId: first.sectionId,
        message: `${isPractical ? 'Practical' : 'Integrated'} Lab block for ${first.subjectName} (Sec ${first.sectionName}) has ${blockEntries.length} periods, but must be exactly ${expectedDuration}.`,
      });
    }

    // Check same day
    const allSameDay = blockEntries.every((e) => e.day === first.day);
    if (!allSameDay) {
      errors.push({
        type: 'LAB_CONTINUITY',
        severity: 'error',
        sectionId: first.sectionId,
        message: `Lab block for ${first.subjectName} is split across multiple days.`,
      });
    }

    // Check consecutive periods
    const periodNums = blockEntries.map((e) => e.periodNumber).sort((a, b) => a - b);
    let isConsecutive = true;
    for (let i = 0; i < periodNums.length - 1; i++) {
      if (periodNums[i + 1] !== periodNums[i] + 1) {
        isConsecutive = false;
        break;
      }
    }
    if (!isConsecutive) {
      errors.push({
        type: 'LAB_CONTINUITY',
        severity: 'error',
        day: first.day,
        sectionId: first.sectionId,
        message: `Lab block for ${first.subjectName} (Sec ${first.sectionName}) on ${first.day} is not consecutive: periods ${periodNums.join(', ')}.`,
      });
    }

    // Check lunch crossing: lunch is after lunchAfterPeriod (e.g. 4)
    // A block cannot contain periods both <= lunchAfterPeriod and > lunchAfterPeriod
    const hasPreLunch = periodNums.some((p) => p <= lunchAfterPeriod);
    const hasPostLunch = periodNums.some((p) => p > lunchAfterPeriod);
    if (hasPreLunch && hasPostLunch) {
      errors.push({
        type: 'LUNCH_CROSSING',
        severity: 'error',
        day: first.day,
        sectionId: first.sectionId,
        message: `Lab block for ${first.subjectName} on ${first.day} spans periods ${periodNums.join(', ')}, crossing lunch break after Period ${lunchAfterPeriod}.`,
      });
    }
  }

  // 4. Lab Frequency Check (Each configured lab must be scheduled exactly once per week)
  for (const lab of labs) {
    const matchedEntries = entries.filter(
      (e) =>
        (e.entryType === 'practical_lab' || e.entryType === 'integrated_lab') &&
        e.sectionId === lab.sectionId &&
        e.subjectName.toLowerCase() === lab.labName.toLowerCase()
    );

    const distinctBlocks = new Set(matchedEntries.map((e) => e.labBlockId || `${e.day}_${e.periodNumber}`));
    if (distinctBlocks.size === 0) {
      errors.push({
        type: 'LAB_FREQUENCY',
        severity: 'error',
        sectionId: lab.sectionId,
        message: `Lab "${lab.labName}" for Section ${lab.sectionName} is not scheduled.`,
      });
    } else if (distinctBlocks.size > 1) {
      errors.push({
        type: 'LAB_FREQUENCY',
        severity: 'error',
        sectionId: lab.sectionId,
        message: `Lab "${lab.labName}" for Section ${lab.sectionName} is scheduled ${distinctBlocks.size} times (must be exactly once per week).`,
      });
    }
  }

  // 5. Subject Weekly Periods Exact Match
  for (const assignment of assignments) {
    const scheduledTheoryPeriods = entries.filter(
      (e) =>
        e.entryType === 'theory' &&
        e.sectionId === assignment.sectionId &&
        e.subjectCode.toUpperCase() === assignment.subjectCode.toUpperCase()
    ).length;

    const required = assignment.weeklyPeriods;
    if (scheduledTheoryPeriods !== required) {
      errors.push({
        type: 'WEEKLY_PERIODS',
        severity: 'error',
        sectionId: assignment.sectionId,
        sectionName: assignment.sectionName,
        subjectCode: assignment.subjectCode,
        message: `Subject ${assignment.subjectCode} (${assignment.subjectName}) for Sec ${assignment.sectionName} requires exactly ${required} periods/week, but has ${scheduledTheoryPeriods} scheduled.`,
      });
    }
  }

  // 6. Soft constraints / warnings: check if any subject is repeated > 2 times on the same day for a section
  const sectionDaySubjects = new Map<string, number>();
  for (const e of entries) {
    if (e.entryType === 'theory') {
      const key = `${e.sectionId}_${e.day}_${e.subjectCode}`;
      const count = (sectionDaySubjects.get(key) || 0) + 1;
      sectionDaySubjects.set(key, count);
      if (count > 2) {
        warnings.push({
          type: 'WEEKLY_PERIODS',
          severity: 'warning',
          day: e.day,
          sectionId: e.sectionId,
          sectionName: e.sectionName,
          subjectCode: e.subjectCode,
          message: `Subject ${e.subjectCode} is scheduled ${count} times on ${e.day} for Section ${e.sectionName}.`,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Fast validator for drag-and-drop actions.
 * Checks whether moving or swapping an entry (or lab block) to target (day, periodNumber) is legal.
 */
export function canMoveOrSwap(
  allEntries: TimetableEntry[],
  sourceEntry: TimetableEntry,
  targetDay: DayOfWeek,
  targetPeriodNumber: number,
  context: ValidationContext
): { allowed: boolean; reason?: string } {
  const { fixedSlots, settings } = context;
  const maxSaturdayPeriods = settings.periodsOnSaturday || 4;
  const lunchAfterPeriod = settings.lunchAfterPeriod || 4;

  // Protected unit test slots
  const isTargetFixed = fixedSlots.some((s) => s.day === targetDay && s.periodNumber === targetPeriodNumber);
  if (isTargetFixed) {
    return { allowed: false, reason: `${targetDay} Period ${targetPeriodNumber} is a protected Unit Test slot.` };
  }

  // Saturday limit
  if (targetDay === 'Saturday' && targetPeriodNumber > maxSaturdayPeriods) {
    return { allowed: false, reason: `Saturday only has ${maxSaturdayPeriods} periods.` };
  }

  // Check if source is a lab block
  const isLab = sourceEntry.entryType === 'practical_lab' || sourceEntry.entryType === 'integrated_lab';
  if (isLab && sourceEntry.labBlockId) {
    const blockEntries = allEntries
      .filter((e) => e.labBlockId === sourceEntry.labBlockId)
      .sort((a, b) => (a.labBlockPeriodIndex || 0) - (b.labBlockPeriodIndex || 0));

    const blockDuration = blockEntries.length;

    // Practical lab on Saturday is forbidden
    if (targetDay === 'Saturday' && sourceEntry.entryType === 'practical_lab') {
      return { allowed: false, reason: 'Practical Lab (3 periods) cannot be scheduled on Saturday.' };
    }

    // Check if entire block fits within the day's period count
    const maxPeriod = targetDay === 'Saturday' ? maxSaturdayPeriods : settings.periodsPerFullDay || 7;
    if (targetPeriodNumber + blockDuration - 1 > maxPeriod) {
      return {
        allowed: false,
        reason: `Lab block requires ${blockDuration} consecutive periods, which exceeds the day limit (up to Period ${maxPeriod}).`,
      };
    }

    // Check lunch crossing
    const targetPeriods = Array.from({ length: blockDuration }, (_, i) => targetPeriodNumber + i);
    const crossesLunch = targetPeriods.some((p) => p <= lunchAfterPeriod) && targetPeriods.some((p) => p > lunchAfterPeriod);
    if (crossesLunch) {
      return { allowed: false, reason: `Lab block cannot cross the lunch break after Period ${lunchAfterPeriod}.` };
    }

    // Check if any target period hits a fixed slot
    for (const p of targetPeriods) {
      if (fixedSlots.some((s) => s.day === targetDay && s.periodNumber === p)) {
        return { allowed: false, reason: `Lab block collides with a protected slot at Period ${p}.` };
      }
    }

    // Check faculty and room collisions for each period in the block (excluding self)
    const selfIds = new Set(blockEntries.map((e) => e.id));
    for (const p of targetPeriods) {
      const collision = allEntries.find(
        (e) => !selfIds.has(e.id) && e.day === targetDay && e.periodNumber === p && e.entryType !== 'unit_test' &&
          (e.facultyCode.toUpperCase() === sourceEntry.facultyCode.toUpperCase() ||
            e.sectionId === sourceEntry.sectionId ||
            e.roomId === sourceEntry.roomId)
      );

      if (collision) {
        if (collision.facultyCode.toUpperCase() === sourceEntry.facultyCode.toUpperCase()) {
          return { allowed: false, reason: `Faculty ${sourceEntry.facultyName} is already teaching Sec ${collision.sectionName} (${collision.subjectCode}) on ${targetDay} Period ${p}.` };
        }
        if (collision.sectionId === sourceEntry.sectionId) {
          return { allowed: false, reason: `Section ${sourceEntry.sectionName} already has ${collision.subjectCode} scheduled on ${targetDay} Period ${p}.` };
        }
        if (collision.roomId === sourceEntry.roomId) {
          return { allowed: false, reason: `Room ${sourceEntry.roomNumber} is occupied by Sec ${collision.sectionName} on ${targetDay} Period ${p}.` };
        }
      }
    }

    return { allowed: true };
  }

  // Single theory period move/swap
  // Target cannot collide with other faculty, section, or room unless it's a swap with the same section
  const collision = allEntries.find(
    (e) => e.id !== sourceEntry.id && e.day === targetDay && e.periodNumber === targetPeriodNumber && e.entryType !== 'unit_test'
  );

  if (collision) {
    // If collision belongs to the same section, this is a swap
    if (collision.sectionId === sourceEntry.sectionId) {
      // If the colliding item is a lab, we cannot swap a single theory into part of a lab block!
      if (collision.entryType === 'practical_lab' || collision.entryType === 'integrated_lab') {
        return { allowed: false, reason: 'Cannot swap a theory period into the middle of a continuous lab block. Move the lab block first.' };
      }

      // Check if swapping would cause faculty collision at source slot or target slot
      const sourceSlotFacultyConflict = allEntries.some(
        (e) => e.id !== collision.id && e.id !== sourceEntry.id &&
          e.day === sourceEntry.day && e.periodNumber === sourceEntry.periodNumber &&
          e.facultyCode.toUpperCase() === collision.facultyCode.toUpperCase()
      );
      if (sourceSlotFacultyConflict) {
        return { allowed: false, reason: `Cannot swap: Faculty ${collision.facultyName} has another class on ${sourceEntry.day} Period ${sourceEntry.periodNumber}.` };
      }

      const targetSlotFacultyConflict = allEntries.some(
        (e) => e.id !== sourceEntry.id && e.id !== collision.id &&
          e.day === targetDay && e.periodNumber === targetPeriodNumber &&
          e.facultyCode.toUpperCase() === sourceEntry.facultyCode.toUpperCase()
      );
      if (targetSlotFacultyConflict) {
        return { allowed: false, reason: `Cannot swap: Faculty ${sourceEntry.facultyName} has another class on ${targetDay} Period ${targetPeriodNumber}.` };
      }

      return { allowed: true };
    }

    // Different section collision on room or faculty
    if (collision.facultyCode.toUpperCase() === sourceEntry.facultyCode.toUpperCase()) {
      return { allowed: false, reason: `Faculty ${sourceEntry.facultyName} is already teaching Sec ${collision.sectionName} at ${targetDay} Period ${targetPeriodNumber}.` };
    }
    if (collision.roomId === sourceEntry.roomId) {
      return { allowed: false, reason: `Room ${sourceEntry.roomNumber} is occupied by Sec ${collision.sectionName} at ${targetDay} Period ${targetPeriodNumber}.` };
    }
  }

  // Also check if source faculty has a class in another section at target time
  const externalFacConflict = allEntries.some(
    (e) => e.id !== sourceEntry.id && e.day === targetDay && e.periodNumber === targetPeriodNumber &&
      e.facultyCode.toUpperCase() === sourceEntry.facultyCode.toUpperCase()
  );
  if (externalFacConflict) {
    return { allowed: false, reason: `Faculty ${sourceEntry.facultyName} is already teaching another section on ${targetDay} Period ${targetPeriodNumber}.` };
  }

  return { allowed: true };
}
