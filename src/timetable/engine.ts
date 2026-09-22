import type {
  AcademicYear,
  Section,
  Faculty,
  SubjectAssignment,
  Lab,
  Room,
  FixedSlot,
  DepartmentSettings,
  PeriodConfig,
  TimetableEntry,
  DayOfWeek,
} from '../types';
import { ALL_DAYS, FULL_DAYS } from '../types';
import { validateTimetable } from './validator';

export interface GenerationInput {
  years: AcademicYear[];
  sections: Section[];
  faculty: Faculty[];
  assignments: SubjectAssignment[];
  labs: Lab[];
  rooms: Room[];
  fixedSlots: FixedSlot[];
  settings: DepartmentSettings;
  periods: PeriodConfig[];
  onProgress?: (step: string, progress: number) => void;
}

export interface GenerationResult {
  success: boolean;
  entries: TimetableEntry[];
  diagnostics?: string[];
}

export function generateTimetable(input: GenerationInput): GenerationResult {
  const {
    sections,
    faculty,
    assignments,
    labs,
    rooms,
    fixedSlots,
    settings,
    periods,
    onProgress,
  } = input;

  onProgress?.('Preparing timetable structures...', 10);

  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const facultyMap = new Map(faculty.map((f) => [f.facultyCode.toUpperCase(), f]));

  // Find classroom for each section
  const sectionClassroomMap = new Map<string, Room>();
  for (const s of sections) {
    if (s.roomId && roomMap.has(s.roomId)) {
      sectionClassroomMap.set(s.id, roomMap.get(s.roomId)!);
    } else {
      // Fallback: assign any active classroom
      const defaultRoom = rooms.find((r) => r.roomType === 'classroom' && r.isActive) || rooms[0];
      sectionClassroomMap.set(s.id, defaultRoom);
    }
  }

  const entries: TimetableEntry[] = [];

  // Collision tracking structures
  // key: "DAY_PERIOD_ENTITYID"
  const occupiedFaculty = new Set<string>();
  const occupiedSection = new Set<string>();
  const occupiedRoom = new Set<string>();

  const markSlot = (day: DayOfWeek, p: number, facCode: string, secId: string, rmId: string) => {
    if (facCode) occupiedFaculty.add(`${day}_${p}_${facCode.toUpperCase()}`);
    if (secId) occupiedSection.add(`${day}_${p}_${secId}`);
    if (rmId) occupiedRoom.add(`${day}_${p}_${rmId}`);
  };

  const unmarkSlot = (day: DayOfWeek, p: number, facCode: string, secId: string, rmId: string) => {
    if (facCode) occupiedFaculty.delete(`${day}_${p}_${facCode.toUpperCase()}`);
    if (secId) occupiedSection.delete(`${day}_${p}_${secId}`);
    if (rmId) occupiedRoom.delete(`${day}_${p}_${rmId}`);
  };

  const isSlotAvailable = (day: DayOfWeek, p: number, facCode: string, secId: string, rmId: string): boolean => {
    if (facCode && occupiedFaculty.has(`${day}_${p}_${facCode.toUpperCase()}`)) return false;
    if (secId && occupiedSection.has(`${day}_${p}_${secId}`)) return false;
    if (rmId && occupiedRoom.has(`${day}_${p}_${rmId}`)) return false;
    return true;
  };

  // STEP 1: Fixed Unit Tests
  onProgress?.('Protecting Fixed Unit Test slots...', 20);
  for (const slot of fixedSlots) {
    for (const s of sections) {
      const entryId = `fixed_${slot.day}_p${slot.periodNumber}_${s.id}`;
      const entry: TimetableEntry = {
        id: entryId,
        day: slot.day,
        periodNumber: slot.periodNumber,
        yearId: s.yearId,
        sectionId: s.id,
        sectionName: s.sectionName,
        subjectCode: 'UT',
        subjectName: slot.description || 'Unit Test',
        facultyCode: 'TEST',
        facultyName: 'Department',
        roomId: s.roomId || '',
        roomNumber: s.roomNumber || '',
        entryType: 'unit_test',
        isFixed: true,
      };
      entries.push(entry);
      // Fixed unit test occupies the section
      occupiedSection.add(`${slot.day}_${slot.periodNumber}_${s.id}`);
    }
  }

  // STEP 2: Schedule Practical Labs (3 consecutive periods)
  onProgress?.('Scheduling Practical Labs (3 periods)...', 35);
  const practicalLabs = labs.filter((l) => l.labType === 'practical');

  // Candidate blocks for 3-period practical lab on full days:
  // Post-lunch block: P5, P6, P7 (valid Mon, Tue, Wed, Thu, Fri)
  // Morning block: P2, P3, P4 (valid Tue, Wed, Thu, Fri - NOT Mon because P2 is Unit Test)
  const practicalCandidateBlocks: { day: DayOfWeek; periods: number[] }[] = [
    { day: 'Monday', periods: [5, 6, 7] },
    { day: 'Tuesday', periods: [5, 6, 7] },
    { day: 'Tuesday', periods: [2, 3, 4] },
    { day: 'Wednesday', periods: [5, 6, 7] },
    { day: 'Wednesday', periods: [2, 3, 4] },
    { day: 'Thursday', periods: [5, 6, 7] },
    { day: 'Thursday', periods: [2, 3, 4] },
    { day: 'Friday', periods: [5, 6, 7] },
    { day: 'Friday', periods: [2, 3, 4] },
  ];

  // Try to place each practical lab
  for (const lab of practicalLabs) {
    let placed = false;
    const blockId = `block_${lab.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Shuffle/rotate candidate blocks to distribute evenly across days
    const candidates = [...practicalCandidateBlocks].sort(() => Math.random() - 0.5);

    for (const cand of candidates) {
      const allAvailable = cand.periods.every((p) =>
        isSlotAvailable(cand.day, p, lab.facultyCode, lab.sectionId, lab.roomId)
      );

      if (allAvailable) {
        // Place the 3 periods
        cand.periods.forEach((p, idx) => {
          const entry: TimetableEntry = {
            id: `lab_p_${lab.id}_${cand.day}_${p}`,
            day: cand.day,
            periodNumber: p,
            yearId: lab.yearId,
            sectionId: lab.sectionId,
            sectionName: lab.sectionName,
            subjectCode: lab.labName.substring(0, 8).toUpperCase(),
            subjectName: lab.labName,
            facultyCode: lab.facultyCode,
            facultyName: lab.facultyName,
            roomId: lab.roomId,
            roomNumber: lab.roomNumber,
            entryType: 'practical_lab',
            isFixed: false,
            labBlockId: blockId,
            labBlockPeriodIndex: idx,
            labType: 'practical',
          };
          entries.push(entry);
          markSlot(cand.day, p, lab.facultyCode, lab.sectionId, lab.roomId);
        });
        placed = true;
        break;
      }
    }

    if (!placed) {
      return {
        success: false,
        entries: [],
        diagnostics: [
          `Failed to place Practical Lab "${lab.labName}" for Section ${lab.sectionName}.`,
          `Faculty ${lab.facultyName} (${lab.facultyCode}) or Lab Room ${lab.roomNumber} has no 3-period continuous slot available without conflicts.`,
          'Recommendation: Adjust faculty allocation or verify that enough lab rooms are available for concurrent practical sessions.',
        ],
      };
    }
  }

  // STEP 3: Schedule Integrated Labs (2 consecutive periods)
  onProgress?.('Scheduling Integrated Labs (2 periods)...', 50);
  const integratedLabs = labs.filter((l) => l.labType === 'integrated');

  const integratedCandidateBlocks: { day: DayOfWeek; periods: number[] }[] = [
    { day: 'Monday', periods: [3, 4] },
    { day: 'Monday', periods: [5, 6] },
    { day: 'Monday', periods: [6, 7] },
    { day: 'Tuesday', periods: [3, 4] },
    { day: 'Tuesday', periods: [5, 6] },
    { day: 'Wednesday', periods: [3, 4] },
    { day: 'Wednesday', periods: [5, 6] },
    { day: 'Thursday', periods: [3, 4] },
    { day: 'Thursday', periods: [5, 6] },
    { day: 'Friday', periods: [3, 4] },
    { day: 'Friday', periods: [5, 6] },
    { day: 'Saturday', periods: [3, 4] },
  ];

  for (const lab of integratedLabs) {
    let placed = false;
    const blockId = `block_${lab.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const candidates = [...integratedCandidateBlocks].sort(() => Math.random() - 0.5);

    for (const cand of candidates) {
      const allAvailable = cand.periods.every((p) =>
        isSlotAvailable(cand.day, p, lab.facultyCode, lab.sectionId, lab.roomId)
      );

      if (allAvailable) {
        cand.periods.forEach((p, idx) => {
          const entry: TimetableEntry = {
            id: `lab_i_${lab.id}_${cand.day}_${p}`,
            day: cand.day,
            periodNumber: p,
            yearId: lab.yearId,
            sectionId: lab.sectionId,
            sectionName: lab.sectionName,
            subjectCode: lab.labName.substring(0, 8).toUpperCase(),
            subjectName: lab.labName,
            facultyCode: lab.facultyCode,
            facultyName: lab.facultyName,
            roomId: lab.roomId,
            roomNumber: lab.roomNumber,
            entryType: 'integrated_lab',
            isFixed: false,
            labBlockId: blockId,
            labBlockPeriodIndex: idx,
            labType: 'integrated',
          };
          entries.push(entry);
          markSlot(cand.day, p, lab.facultyCode, lab.sectionId, lab.roomId);
        });
        placed = true;
        break;
      }
    }

    if (!placed) {
      return {
        success: false,
        entries: [],
        diagnostics: [
          `Failed to place Integrated Lab "${lab.labName}" for Section ${lab.sectionName}.`,
          `No 2-period slot was available for Faculty ${lab.facultyName} (${lab.facultyCode}) in Lab Room ${lab.roomNumber}.`,
          'Recommendation: Check if another lab or unit test is occupying the room or faculty at candidate times.',
        ],
      };
    }
  }

  // STEP 4: Schedule Theory Classes
  onProgress?.('Scheduling Theory classes...', 70);

  // Flatten assignments into individual period tokens
  interface PeriodToken {
    assignment: SubjectAssignment;
    section: Section;
    classroom: Room;
    tokenIndex: number;
  }

  const allTokens: PeriodToken[] = [];
  for (const assignment of assignments) {
    const sec = sections.find((s) => s.id === assignment.sectionId);
    if (!sec) continue;
    const room = sectionClassroomMap.get(sec.id) || rooms[0];
    const count = Number(assignment.weeklyPeriods) || 0;
    for (let i = 0; i < count; i++) {
      allTokens.push({
        assignment,
        section: sec,
        classroom: room,
        tokenIndex: i,
      });
    }
  }

  // Sort tokens by MRV:
  // Faculty with highest departmental assignments first, then subjects with higher weeklyPeriods
  const facultyLoadMap = new Map<string, number>();
  for (const t of allTokens) {
    const code = t.assignment.facultyCode.toUpperCase();
    facultyLoadMap.set(code, (facultyLoadMap.get(code) || 0) + 1);
  }

  allTokens.sort((a, b) => {
    const loadA = facultyLoadMap.get(a.assignment.facultyCode.toUpperCase()) || 0;
    const loadB = facultyLoadMap.get(b.assignment.facultyCode.toUpperCase()) || 0;
    if (loadB !== loadA) return loadB - loadA;
    return b.assignment.weeklyPeriods - a.assignment.weeklyPeriods;
  });

  // Track daily subject placement per section to encourage even distribution
  const sectionDaySubjectCount = new Map<string, number>(); // "secId_day_subjectCode" -> count
  const facultyDayPeriodCount = new Map<string, number>(); // "facCode_day" -> count

  // Available slots pool across week
  const allSlots: { day: DayOfWeek; p: number }[] = [];
  const maxSaturday = settings.periodsOnSaturday || 4;
  const maxFullDay = settings.periodsPerFullDay || 7;

  for (const day of FULL_DAYS) {
    for (let p = 1; p <= maxFullDay; p++) {
      allSlots.push({ day, p });
    }
  }
  for (let p = 1; p <= maxSaturday; p++) {
    allSlots.push({ day: 'Saturday', p });
  }

  // Backtracking search for theory classes
  const assignedEntries: TimetableEntry[] = [];

  function solveTokens(tokenIdx: number): boolean {
    if (tokenIdx >= allTokens.length) {
      return true; // All tokens placed successfully!
    }

    const token = allTokens[tokenIdx];
    const { assignment, section, classroom } = token;
    const facCode = assignment.facultyCode.toUpperCase();

    // Filter available slots
    const candidateSlots: { day: DayOfWeek; p: number; score: number }[] = [];

    for (const slot of allSlots) {
      if (isSlotAvailable(slot.day, slot.p, facCode, section.id, classroom.id)) {
        // Soft scoring
        const daySubKey = `${section.id}_${slot.day}_${assignment.subjectCode}`;
        const existingOnDay = sectionDaySubjectCount.get(daySubKey) || 0;
        const facDayCount = facultyDayPeriodCount.get(`${facCode}_${slot.day}`) || 0;

        let score = 100;
        // Penalize repeating the same subject on the same day
        if (existingOnDay === 0) score += 50;
        else if (existingOnDay === 1) score -= 30;
        else score -= 100;

        // Penalize faculty overload on a single day (> 4 periods)
        if (facDayCount < 4) score += 20;
        else score -= 40;

        // Prefer earlier periods
        score += (8 - slot.p);

        candidateSlots.push({ day: slot.day, p: slot.p, score });
      }
    }

    // Sort candidates by score descending
    candidateSlots.sort((a, b) => b.score - a.score);

    for (const cand of candidateSlots) {
      // Place
      const entryId = `th_${assignment.id}_${token.tokenIndex}_${cand.day}_${cand.p}`;
      const entry: TimetableEntry = {
        id: entryId,
        day: cand.day,
        periodNumber: cand.p,
        yearId: section.yearId,
        sectionId: section.id,
        sectionName: section.sectionName,
        subjectCode: assignment.subjectCode,
        subjectName: assignment.subjectName,
        facultyCode: assignment.facultyCode,
        facultyName: assignment.facultyName,
        roomId: classroom.id,
        roomNumber: classroom.roomNumber,
        entryType: 'theory',
        isFixed: false,
      };

      assignedEntries.push(entry);
      markSlot(cand.day, cand.p, facCode, section.id, classroom.id);

      const daySubKey = `${section.id}_${cand.day}_${assignment.subjectCode}`;
      sectionDaySubjectCount.set(daySubKey, (sectionDaySubjectCount.get(daySubKey) || 0) + 1);
      const facDayKey = `${facCode}_${cand.day}`;
      facultyDayPeriodCount.set(facDayKey, (facultyDayPeriodCount.get(facDayKey) || 0) + 1);

      if (solveTokens(tokenIdx + 1)) {
        return true;
      }

      // Backtrack
      assignedEntries.pop();
      unmarkSlot(cand.day, cand.p, facCode, section.id, classroom.id);
      sectionDaySubjectCount.set(daySubKey, (sectionDaySubjectCount.get(daySubKey) || 1) - 1);
      facultyDayPeriodCount.set(facDayKey, (facultyDayPeriodCount.get(facDayKey) || 1) - 1);
    }

    return false;
  }

  const theorySuccess = solveTokens(0);
  if (!theorySuccess) {
    const unplacedIndex = assignedEntries.length;
    const problematicToken = allTokens[unplacedIndex] || allTokens[allTokens.length - 1];
    return {
      success: false,
      entries: [],
      diagnostics: [
        'Timetable cannot be generated.',
        `Could not schedule all theory periods for ${problematicToken.assignment.subjectCode} (${problematicToken.assignment.subjectName}) in Sec ${problematicToken.section.sectionName}.`,
        `Faculty ${problematicToken.assignment.facultyName} (${problematicToken.assignment.facultyCode}) or Classroom ${problematicToken.classroom.roomNumber} has insufficient remaining clash-free slots.`,
        `Assigned ${assignedEntries.length} out of ${allTokens.length} theory periods before hitting a constraint deadlock.`,
        'Recommendations: Check if this faculty is assigned to too many sections concurrently, or verify that enough classrooms are allocated.',
      ],
    };
  }

  // Combine fixed slots, labs, and theory
  entries.push(...assignedEntries);

  onProgress?.('Validating final timetable constraints...', 90);
  const valResult = validateTimetable(entries, {
    assignments,
    labs,
    fixedSlots,
    settings,
    periods,
  });

  if (!valResult.isValid) {
    return {
      success: false,
      entries: [],
      diagnostics: [
        'Timetable generation finished, but final validation identified constraint violations:',
        ...valResult.errors.map((e) => `• [${e.type}] ${e.message}`),
      ],
    };
  }

  onProgress?.('Timetable generation complete!', 100);
  return {
    success: true,
    entries,
  };
}
