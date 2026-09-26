import { describe, it, expect } from 'vitest';
import { generateTimetable } from '../timetable/engine';
import { canMoveOrSwap } from '../timetable/validator';
import {
  DEFAULT_SETTINGS,
  DEFAULT_PERIODS,
  DEFAULT_FIXED_SLOTS,
  DEFAULT_ROOMS,
  INITIAL_YEARS,
} from '../db/seedData';
import {
  DEMO_FACULTY,
  DEMO_SUBJECT_ASSIGNMENTS,
  DEMO_LABS,
} from '../db/demoData';
import type { FixedAssignment, TimetableEntry } from '../types';

describe('Fixed Assignments and Lock Protection', () => {
  const allSections = INITIAL_YEARS.flatMap((y) => y.sections);
  const allYears = INITIAL_YEARS.map((y) => y.year);
  const targetSection = allSections[0]; // 2nd Year Section A

  it('honors fixed theory assignment and decrements remaining tokens', () => {
    // Pick first subject assignment for target section
    const targetAssignment = DEMO_SUBJECT_ASSIGNMENTS.find(
      (a) => a.sectionId === targetSection.id
    )!;

    const fixedTheory: FixedAssignment = {
      id: 'fix_th_1',
      assignmentType: 'theory',
      yearId: targetSection.yearId,
      sectionId: targetSection.id,
      sectionName: targetSection.sectionName,
      subjectCode: targetAssignment.subjectCode,
      subjectName: targetAssignment.subjectName,
      facultyCode: targetAssignment.facultyCode,
      facultyName: targetAssignment.facultyName,
      day: 'Tuesday',
      startPeriodNumber: 3,
      periodNumbers: [3],
      isFixed: true,
      active: true,
    };

    const result = generateTimetable({
      years: allYears,
      sections: allSections,
      faculty: DEMO_FACULTY,
      assignments: DEMO_SUBJECT_ASSIGNMENTS,
      labs: DEMO_LABS,
      rooms: DEFAULT_ROOMS,
      fixedSlots: DEFAULT_FIXED_SLOTS,
      fixedAssignments: [fixedTheory],
      settings: DEFAULT_SETTINGS,
      periods: DEFAULT_PERIODS,
    });

    expect(result.success).toBe(true);

    // Verify locked slot is in place
    const lockedEntry = result.entries.find(
      (e) =>
        e.sectionId === targetSection.id &&
        e.day === 'Tuesday' &&
        e.periodNumber === 3
    );
    expect(lockedEntry).toBeDefined();
    expect(lockedEntry?.isFixed).toBe(true);
    expect(lockedEntry?.subjectCode).toBe(targetAssignment.subjectCode);

    // Verify total count for this subject is exactly assignment.weeklyPeriods (no duplicates)
    const totalSubjectEntries = result.entries.filter(
      (e) =>
        e.sectionId === targetSection.id &&
        e.subjectCode === targetAssignment.subjectCode &&
        e.entryType === 'theory'
    );
    expect(totalSubjectEntries.length).toBe(targetAssignment.weeklyPeriods);
  });

  it('honors fixed practical lab and avoids rescheduling it', () => {
    const targetLab = DEMO_LABS.find(
      (l) => l.sectionId === targetSection.id && l.labType === 'practical'
    )!;

    const fixedLab: FixedAssignment = {
      id: 'fix_lab_1',
      assignmentType: 'lab',
      yearId: targetSection.yearId,
      sectionId: targetSection.id,
      sectionName: targetSection.sectionName,
      labId: targetLab.id,
      labName: targetLab.labName,
      labType: 'practical',
      facultyCode: targetLab.facultyCode,
      facultyName: targetLab.facultyName,
      roomId: targetLab.roomId,
      roomNumber: targetLab.roomNumber,
      day: 'Thursday',
      startPeriodNumber: 5,
      periodNumbers: [5, 6, 7],
      isFixed: true,
      active: true,
    };

    const result = generateTimetable({
      years: allYears,
      sections: allSections,
      faculty: DEMO_FACULTY,
      assignments: DEMO_SUBJECT_ASSIGNMENTS,
      labs: DEMO_LABS,
      rooms: DEFAULT_ROOMS,
      fixedSlots: DEFAULT_FIXED_SLOTS,
      fixedAssignments: [fixedLab],
      settings: DEFAULT_SETTINGS,
      periods: DEFAULT_PERIODS,
    });

    expect(result.success).toBe(true);

    // Verify lab is locked on Thursday Periods 5, 6, 7
    const labEntries = result.entries.filter(
      (e) =>
        e.sectionId === targetSection.id &&
        e.day === 'Thursday' &&
        [5, 6, 7].includes(e.periodNumber) &&
        e.entryType === 'practical_lab'
    );
    expect(labEntries.length).toBe(3);
    expect(labEntries.every((e) => e.isFixed)).toBe(true);

    // Verify this lab is not placed again on any other day
    const allInstancesOfLab = result.entries.filter(
      (e) =>
        e.sectionId === targetSection.id &&
        (e.entryType === 'practical_lab' || e.entryType === 'integrated_lab') &&
        (e.subjectName.toLowerCase() === targetLab.labName.toLowerCase() ||
          e.subjectCode.toUpperCase() === targetLab.labName.substring(0, 8).toUpperCase())
    );
    expect(allInstancesOfLab.length).toBe(3);
  });

  it('schedules library period and honors fixed library assignment', () => {
    const fixedLib: FixedAssignment = {
      id: 'fix_lib_1',
      assignmentType: 'library',
      yearId: targetSection.yearId,
      sectionId: targetSection.id,
      sectionName: targetSection.sectionName,
      day: 'Wednesday',
      startPeriodNumber: 4,
      periodNumbers: [4],
      isFixed: true,
      active: true,
    };

    const result = generateTimetable({
      years: allYears,
      sections: allSections,
      faculty: DEMO_FACULTY,
      assignments: DEMO_SUBJECT_ASSIGNMENTS,
      labs: DEMO_LABS,
      rooms: DEFAULT_ROOMS,
      fixedSlots: DEFAULT_FIXED_SLOTS,
      fixedAssignments: [fixedLib],
      settings: DEFAULT_SETTINGS,
      periods: DEFAULT_PERIODS,
    });

    expect(result.success).toBe(true);

    // Verify locked library on Wednesday Period 4
    const libEntry = result.entries.find(
      (e) =>
        e.sectionId === targetSection.id &&
        e.day === 'Wednesday' &&
        e.periodNumber === 4 &&
        e.entryType === 'library'
    );
    expect(libEntry).toBeDefined();
    expect(libEntry?.isFixed).toBe(true);

    // Verify EVERY section has at least 1 library period scheduled
    for (const sec of allSections) {
      const secLib = result.entries.filter(
        (e) => e.sectionId === sec.id && e.entryType === 'library'
      );
      expect(secLib.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('fails gracefully when fixed assignment collides with unit test slot', () => {
    // Attempt to fix theory on Monday Period 1 (Protected Unit Test)
    const collidingFixed: FixedAssignment = {
      id: 'fix_collide_1',
      assignmentType: 'theory',
      yearId: targetSection.yearId,
      sectionId: targetSection.id,
      sectionName: targetSection.sectionName,
      subjectCode: 'CS201',
      subjectName: 'Data Structures',
      facultyCode: 'FAC001',
      facultyName: 'Dr. Ramesh Kumar',
      day: 'Monday',
      startPeriodNumber: 1,
      periodNumbers: [1],
      isFixed: true,
      active: true,
    };

    const result = generateTimetable({
      years: allYears,
      sections: allSections,
      faculty: DEMO_FACULTY,
      assignments: DEMO_SUBJECT_ASSIGNMENTS,
      labs: DEMO_LABS,
      rooms: DEFAULT_ROOMS,
      fixedSlots: DEFAULT_FIXED_SLOTS,
      fixedAssignments: [collidingFixed],
      settings: DEFAULT_SETTINGS,
      periods: DEFAULT_PERIODS,
    });

    expect(result.success).toBe(false);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.some((d) => d.includes('collision') || d.includes('occupied'))).toBe(true);
  });

  it('prevents moving or displacing locked entries via canMoveOrSwap', () => {
    const fixedEntry: TimetableEntry = {
      id: 'locked_entry_1',
      day: 'Tuesday',
      periodNumber: 3,
      yearId: targetSection.yearId,
      sectionId: targetSection.id,
      sectionName: targetSection.sectionName,
      subjectCode: 'CS201',
      subjectName: 'Data Structures',
      facultyCode: 'FAC001',
      facultyName: 'Dr. Ramesh Kumar',
      roomId: 'room_201',
      roomNumber: '201',
      entryType: 'theory',
      isFixed: true,
    };

    const targetSlotEntry: TimetableEntry = {
      id: 'regular_entry_2',
      day: 'Tuesday',
      periodNumber: 4,
      yearId: targetSection.yearId,
      sectionId: targetSection.id,
      sectionName: targetSection.sectionName,
      subjectCode: 'CS202',
      subjectName: 'Discrete Mathematics',
      facultyCode: 'FAC002',
      facultyName: 'Dr. Priya Sharma',
      roomId: 'room_201',
      roomNumber: '201',
      entryType: 'theory',
      isFixed: false,
    };

    const context = {
      assignments: DEMO_SUBJECT_ASSIGNMENTS,
      labs: DEMO_LABS,
      fixedSlots: DEFAULT_FIXED_SLOTS,
      settings: DEFAULT_SETTINGS,
      periods: DEFAULT_PERIODS,
    };

    // Test 1: Moving a fixed entry should be rejected
    const checkMoveFixed = canMoveOrSwap(
      [fixedEntry, targetSlotEntry],
      fixedEntry,
      'Wednesday',
      5,
      context
    );
    expect(checkMoveFixed.allowed).toBe(false);
    expect(checkMoveFixed.reason).toContain('Fixed Assignment');

    // Test 2: Moving another entry into a slot occupied by a fixed entry should be rejected
    const checkDisplaceFixed = canMoveOrSwap(
      [fixedEntry, targetSlotEntry],
      targetSlotEntry,
      'Tuesday',
      3,
      context
    );
    expect(checkDisplaceFixed.allowed).toBe(false);
    expect(checkDisplaceFixed.reason).toContain('Fixed Assignment');
  });
});
