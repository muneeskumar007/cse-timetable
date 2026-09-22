import { describe, it, expect } from 'vitest';
import { validateTimetable, canMoveOrSwap } from '../timetable/validator';
import type {
  TimetableEntry,
  SubjectAssignment,
  Lab,
  FixedSlot,
  DepartmentSettings,
  PeriodConfig,
} from '../types';

describe('Timetable Validator Engine', () => {
  const mockSettings: DepartmentSettings = {
    id: 'default',
    departmentName: 'CSE',
    collegeName: 'Engineering',
    academicYear: '2026-2027',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    periodsPerFullDay: 7,
    periodsOnSaturday: 4,
    lunchAfterPeriod: 4,
  };

  const mockPeriods: PeriodConfig[] = [
    { id: 'p1', periodNumber: 1, name: 'P1', startTime: '09:00', endTime: '09:55', isSaturdayPeriod: true },
    { id: 'p2', periodNumber: 2, name: 'P2', startTime: '09:55', endTime: '10:50', isSaturdayPeriod: true },
    { id: 'p3', periodNumber: 3, name: 'P3', startTime: '11:10', endTime: '12:05', isSaturdayPeriod: true },
    { id: 'p4', periodNumber: 4, name: 'P4', startTime: '12:05', endTime: '01:00', isSaturdayPeriod: true },
    { id: 'p5', periodNumber: 5, name: 'P5', startTime: '01:50', endTime: '02:40', isSaturdayPeriod: false },
    { id: 'p6', periodNumber: 6, name: 'P6', startTime: '02:40', endTime: '03:30', isSaturdayPeriod: false },
    { id: 'p7', periodNumber: 7, name: 'P7', startTime: '03:30', endTime: '04:20', isSaturdayPeriod: false },
  ];

  const mockFixedSlots: FixedSlot[] = [
    { id: 'fs1', day: 'Monday', periodNumber: 1, slotType: 'unit_test', description: 'Unit Test' },
    { id: 'fs2', day: 'Monday', periodNumber: 2, slotType: 'unit_test', description: 'Unit Test' },
    { id: 'fs3', day: 'Saturday', periodNumber: 1, slotType: 'unit_test', description: 'Unit Test' },
    { id: 'fs4', day: 'Saturday', periodNumber: 2, slotType: 'unit_test', description: 'Unit Test' },
  ];

  const mockAssignments: SubjectAssignment[] = [
    {
      id: 'a1',
      yearId: 'y2',
      sectionId: 's2a',
      sectionName: 'A',
      subjectCode: 'CS301',
      subjectName: 'Data Structures',
      facultyCode: 'FAC001',
      facultyName: 'Dr. Kumar',
      weeklyPeriods: 4,
    },
  ];

  const mockLabs: Lab[] = [
    {
      id: 'l1',
      labName: 'DS Lab',
      labType: 'practical',
      yearId: 'y2',
      sectionId: 's2a',
      sectionName: 'A',
      facultyCode: 'FAC001',
      facultyName: 'Dr. Kumar',
      roomId: 'rm_lab',
      roomNumber: 'CSE Lab 1',
      weeklyPeriods: 3,
    },
  ];

  it('detects faculty collision when same faculty is scheduled in two sections simultaneously', () => {
    const entries: TimetableEntry[] = [
      {
        id: 'e1',
        day: 'Tuesday',
        periodNumber: 3,
        yearId: 'y2',
        sectionId: 's2a',
        sectionName: 'A',
        subjectCode: 'CS301',
        subjectName: 'DS',
        facultyCode: 'FAC001',
        facultyName: 'Dr. Kumar',
        roomId: 'r201',
        roomNumber: '201',
        entryType: 'theory',
        isFixed: false,
      },
      {
        id: 'e2',
        day: 'Tuesday',
        periodNumber: 3,
        yearId: 'y2',
        sectionId: 's2b',
        sectionName: 'B',
        subjectCode: 'CS301',
        subjectName: 'DS',
        facultyCode: 'FAC001',
        facultyName: 'Dr. Kumar',
        roomId: 'r202',
        roomNumber: '202',
        entryType: 'theory',
        isFixed: false,
      },
    ];

    const result = validateTimetable(entries, {
      assignments: mockAssignments,
      labs: [],
      fixedSlots: mockFixedSlots,
      settings: mockSettings,
      periods: mockPeriods,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.type === 'FACULTY_CONFLICT')).toBe(true);
  });

  it('detects room collision when two classes book the same room at the same time', () => {
    const entries: TimetableEntry[] = [
      {
        id: 'e1',
        day: 'Wednesday',
        periodNumber: 2,
        yearId: 'y2',
        sectionId: 's2a',
        sectionName: 'A',
        subjectCode: 'CS301',
        subjectName: 'DS',
        facultyCode: 'FAC001',
        facultyName: 'Dr. Kumar',
        roomId: 'r201',
        roomNumber: '201',
        entryType: 'theory',
        isFixed: false,
      },
      {
        id: 'e2',
        day: 'Wednesday',
        periodNumber: 2,
        yearId: 'y2',
        sectionId: 's2b',
        sectionName: 'B',
        subjectCode: 'CS302',
        subjectName: 'DP',
        facultyCode: 'FAC002',
        facultyName: 'Ms. Priya',
        roomId: 'r201',
        roomNumber: '201',
        entryType: 'theory',
        isFixed: false,
      },
    ];

    const result = validateTimetable(entries, {
      assignments: mockAssignments,
      labs: [],
      fixedSlots: mockFixedSlots,
      settings: mockSettings,
      periods: mockPeriods,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.type === 'ROOM_CONFLICT')).toBe(true);
  });

  it('detects collision with protected Unit Test slots', () => {
    const entries: TimetableEntry[] = [
      {
        id: 'e1',
        day: 'Monday',
        periodNumber: 1, // Protected Monday Unit Test!
        yearId: 'y2',
        sectionId: 's2a',
        sectionName: 'A',
        subjectCode: 'CS301',
        subjectName: 'DS',
        facultyCode: 'FAC001',
        facultyName: 'Dr. Kumar',
        roomId: 'r201',
        roomNumber: '201',
        entryType: 'theory',
        isFixed: false,
      },
    ];

    const result = validateTimetable(entries, {
      assignments: mockAssignments,
      labs: [],
      fixedSlots: mockFixedSlots,
      settings: mockSettings,
      periods: mockPeriods,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.type === 'FIXED_SLOT')).toBe(true);
  });

  it('detects lab crossing lunch break', () => {
    // Lunch is after Period 4. A block spanning P4 and P5 crosses lunch!
    const entries: TimetableEntry[] = [
      {
        id: 'lp1',
        day: 'Tuesday',
        periodNumber: 4,
        yearId: 'y2',
        sectionId: 's2a',
        sectionName: 'A',
        subjectCode: 'DS LAB',
        subjectName: 'DS Lab',
        facultyCode: 'FAC001',
        facultyName: 'Dr. Kumar',
        roomId: 'rm_lab',
        roomNumber: 'CSE Lab 1',
        entryType: 'practical_lab',
        isFixed: false,
        labBlockId: 'block_1',
        labBlockPeriodIndex: 0,
      },
      {
        id: 'lp2',
        day: 'Tuesday',
        periodNumber: 5,
        yearId: 'y2',
        sectionId: 's2a',
        sectionName: 'A',
        subjectCode: 'DS LAB',
        subjectName: 'DS Lab',
        facultyCode: 'FAC001',
        facultyName: 'Dr. Kumar',
        roomId: 'rm_lab',
        roomNumber: 'CSE Lab 1',
        entryType: 'practical_lab',
        isFixed: false,
        labBlockId: 'block_1',
        labBlockPeriodIndex: 1,
      },
      {
        id: 'lp3',
        day: 'Tuesday',
        periodNumber: 6,
        yearId: 'y2',
        sectionId: 's2a',
        sectionName: 'A',
        subjectCode: 'DS LAB',
        subjectName: 'DS Lab',
        facultyCode: 'FAC001',
        facultyName: 'Dr. Kumar',
        roomId: 'rm_lab',
        roomNumber: 'CSE Lab 1',
        entryType: 'practical_lab',
        isFixed: false,
        labBlockId: 'block_1',
        labBlockPeriodIndex: 2,
      },
    ];

    const result = validateTimetable(entries, {
      assignments: mockAssignments,
      labs: mockLabs,
      fixedSlots: mockFixedSlots,
      settings: mockSettings,
      periods: mockPeriods,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.type === 'LUNCH_CROSSING')).toBe(true);
  });

  it('rejects illegal drag-and-drop moves via canMoveOrSwap', () => {
    const existingEntries: TimetableEntry[] = [
      {
        id: 'ex1',
        day: 'Wednesday',
        periodNumber: 3,
        yearId: 'y3',
        sectionId: 's3a',
        sectionName: 'A',
        subjectCode: 'CS501',
        subjectName: 'DBMS',
        facultyCode: 'FAC001', // Dr. Kumar
        facultyName: 'Dr. Kumar',
        roomId: 'r301',
        roomNumber: '301',
        entryType: 'theory',
        isFixed: false,
      },
    ];

    const sourceEntry: TimetableEntry = {
      id: 'move1',
      day: 'Thursday',
      periodNumber: 1,
      yearId: 'y2',
      sectionId: 's2a',
      sectionName: 'A',
      subjectCode: 'CS301',
      subjectName: 'Data Structures',
      facultyCode: 'FAC001', // Dr. Kumar
      facultyName: 'Dr. Kumar',
      roomId: 'r201',
      roomNumber: '201',
      entryType: 'theory',
      isFixed: false,
    };

    // Attempt to move Dr. Kumar's class into Wednesday Period 3 where Dr. Kumar is already teaching!
    const check = canMoveOrSwap(existingEntries, sourceEntry, 'Wednesday', 3, {
      assignments: mockAssignments,
      labs: [],
      fixedSlots: mockFixedSlots,
      settings: mockSettings,
      periods: mockPeriods,
    });

    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('Dr. Kumar');
  });
});
