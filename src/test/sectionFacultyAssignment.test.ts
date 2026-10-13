import { describe, it, expect } from 'vitest';
import { checkGenerationReadiness } from '../timetable/readiness';
import { generateTimetable } from '../timetable/engine';
import type {
  AcademicYear,
  Section,
  Faculty,
  Subject,
  SubjectAssignment,
  DepartmentSettings,
  PeriodConfig,
  Room,
} from '../types';

describe('Section-Wise Faculty Assignment & Generator Integration', () => {
  const years: AcademicYear[] = [
    { id: 'year_2', yearName: '2nd Year', orderIndex: 1 },
  ];

  const sections: Section[] = [
    { id: 'sec_2a', yearId: 'year_2', sectionName: 'A', roomId: 'r1', roomNumber: '201' },
    { id: 'sec_2b', yearId: 'year_2', sectionName: 'B', roomId: 'r2', roomNumber: '202' },
  ];

  const rooms: Room[] = [
    { id: 'r1', roomNumber: '201', roomName: 'Classroom 201', roomType: 'classroom', isActive: true },
    { id: 'r2', roomNumber: '202', roomName: 'Classroom 202', roomType: 'classroom', isActive: true },
  ];

  const faculty: Faculty[] = [
    { id: 'f1', facultyCode: 'FAC001', facultyName: 'Dr. R. Kumar', weeklyWorkload: 18, isActive: true },
    { id: 'f2', facultyCode: 'FAC002', facultyName: 'Ms. S. Priya', weeklyWorkload: 18, isActive: true },
    { id: 'f3', facultyCode: 'FAC003', facultyName: 'Mr. M. Arun', weeklyWorkload: 18, isActive: true },
  ];

  // Curriculum defined ONCE at academic year level
  const subjects: Subject[] = [
    { id: 'sub_1', yearId: 'year_2', subjectCode: 'CS301', subjectName: 'Data Structures', weeklyPeriods: 4 },
    { id: 'sub_2', yearId: 'year_2', subjectCode: 'CS302', subjectName: 'Digital Principles', weeklyPeriods: 4 },
  ];

  const settings: DepartmentSettings = {
    id: 'default',
    departmentName: 'Computer Science and Engineering',
    collegeName: 'College of Engineering',
    academicYear: '2026-2027',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    periodsPerFullDay: 7,
    periodsOnSaturday: 4,
    lunchAfterPeriod: 4,
  };

  const periods: PeriodConfig[] = [
    { id: 'p1', periodNumber: 1, name: 'Period 1', startTime: '09:00 AM', endTime: '09:55 AM', isSaturdayPeriod: true },
    { id: 'p2', periodNumber: 2, name: 'Period 2', startTime: '09:55 AM', endTime: '10:50 AM', isSaturdayPeriod: true },
    { id: 'p3', periodNumber: 3, name: 'Period 3', startTime: '11:05 AM', endTime: '12:00 PM', isSaturdayPeriod: true },
    { id: 'p4', periodNumber: 4, name: 'Period 4', startTime: '12:00 PM', endTime: '12:55 PM', isSaturdayPeriod: true },
    { id: 'p5', periodNumber: 5, name: 'Period 5', startTime: '01:45 PM', endTime: '02:40 PM', isSaturdayPeriod: false },
    { id: 'p6', periodNumber: 6, name: 'Period 6', startTime: '02:40 PM', endTime: '03:35 PM', isSaturdayPeriod: false },
    { id: 'p7', periodNumber: 7, name: 'Period 7', startTime: '03:35 PM', endTime: '04:30 PM', isSaturdayPeriod: false },
  ];

  it('fails readiness check when a section is missing faculty for a year subject', () => {
    // Section A has both subjects assigned
    // Section B is missing CS301 faculty
    const assignments: SubjectAssignment[] = [
      {
        id: 'sa_1',
        yearId: 'year_2',
        sectionId: 'sec_2a',
        sectionName: 'A',
        subjectCode: 'CS301',
        subjectName: 'Data Structures',
        facultyCode: 'FAC001',
        facultyName: 'Dr. R. Kumar',
        weeklyPeriods: 4,
      },
      {
        id: 'sa_2',
        yearId: 'year_2',
        sectionId: 'sec_2a',
        sectionName: 'A',
        subjectCode: 'CS302',
        subjectName: 'Digital Principles',
        facultyCode: 'FAC002',
        facultyName: 'Ms. S. Priya',
        weeklyPeriods: 4,
      },
      {
        id: 'sa_3',
        yearId: 'year_2',
        sectionId: 'sec_2b',
        sectionName: 'B',
        subjectCode: 'CS302',
        subjectName: 'Digital Principles',
        facultyCode: 'FAC003',
        facultyName: 'Mr. M. Arun',
        weeklyPeriods: 4,
      },
      // Note: CS301 is missing for Section B!
    ];

    const report = checkGenerationReadiness({
      years,
      sections,
      faculty,
      subjects,
      assignments,
      labs: [],
      rooms,
      fixedSlots: [],
      settings,
    });

    expect(report.canGenerate).toBe(false);
    const facultyCompletenessCheck = report.checks.find(
      (c) => c.id === 'missing_section_faculty'
    );
    expect(facultyCompletenessCheck).toBeDefined();
    expect(facultyCompletenessCheck?.status).toBe('fail');
    expect(facultyCompletenessCheck?.message).toContain(
      'Section B has no faculty assigned for Data Structures (CS301)'
    );
  });

  it('generator halts with clear error if section has missing faculty', () => {
    const assignments: SubjectAssignment[] = [
      {
        id: 'sa_1',
        yearId: 'year_2',
        sectionId: 'sec_2a',
        sectionName: 'A',
        subjectCode: 'CS301',
        subjectName: 'Data Structures',
        facultyCode: 'FAC001',
        facultyName: 'Dr. R. Kumar',
        weeklyPeriods: 4,
      },
      {
        id: 'sa_2',
        yearId: 'year_2',
        sectionId: 'sec_2a',
        sectionName: 'A',
        subjectCode: 'CS302',
        subjectName: 'Digital Principles',
        facultyCode: 'FAC002',
        facultyName: 'Ms. S. Priya',
        weeklyPeriods: 4,
      },
      {
        id: 'sa_3',
        yearId: 'year_2',
        sectionId: 'sec_2b',
        sectionName: 'B',
        subjectCode: 'CS301',
        subjectName: 'Data Structures',
        facultyCode: '', // Faculty not assigned!
        facultyName: '',
        weeklyPeriods: 4,
      },
    ];

    const result = generateTimetable({
      years,
      sections,
      faculty,
      subjects,
      assignments,
      labs: [],
      rooms,
      fixedSlots: [],
      settings,
      periods,
    });

    expect(result.success).toBe(false);
    expect(result.entries.length).toBe(0);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics![0]).toContain(
      'Section B has no faculty assigned for Data Structures (CS301)'
    );
  });

  it('generates timetable with independent section-specific faculty and no faculty collisions', () => {
    // CS301 taught by FAC001 in Section A, but taught by FAC003 in Section B
    // CS302 taught by FAC002 in both Section A and Section B
    const assignments: SubjectAssignment[] = [
      {
        id: 'sa_1',
        yearId: 'year_2',
        sectionId: 'sec_2a',
        sectionName: 'A',
        subjectCode: 'CS301',
        subjectName: 'Data Structures',
        facultyCode: 'FAC001',
        facultyName: 'Dr. R. Kumar',
        weeklyPeriods: 4,
      },
      {
        id: 'sa_2',
        yearId: 'year_2',
        sectionId: 'sec_2a',
        sectionName: 'A',
        subjectCode: 'CS302',
        subjectName: 'Digital Principles',
        facultyCode: 'FAC002',
        facultyName: 'Ms. S. Priya',
        weeklyPeriods: 4,
      },
      {
        id: 'sa_3',
        yearId: 'year_2',
        sectionId: 'sec_2b',
        sectionName: 'B',
        subjectCode: 'CS301',
        subjectName: 'Data Structures',
        facultyCode: 'FAC003',
        facultyName: 'Mr. M. Arun',
        weeklyPeriods: 4,
      },
      {
        id: 'sa_4',
        yearId: 'year_2',
        sectionId: 'sec_2b',
        sectionName: 'B',
        subjectCode: 'CS302',
        subjectName: 'Digital Principles',
        facultyCode: 'FAC002',
        facultyName: 'Ms. S. Priya',
        weeklyPeriods: 4,
      },
    ];

    const report = checkGenerationReadiness({
      years,
      sections,
      faculty,
      subjects,
      assignments,
      labs: [],
      rooms,
      fixedSlots: [],
      settings,
    });
    expect(report.canGenerate).toBe(true);

    const result = generateTimetable({
      years,
      sections,
      faculty,
      subjects,
      assignments,
      labs: [],
      rooms,
      fixedSlots: [],
      settings,
      periods,
    });

    expect(result.success).toBe(true);
    expect(result.entries.length).toBeGreaterThan(0);

    // Verify Section A uses FAC001 for CS301
    const secACS301 = result.entries.filter(
      (e) => e.sectionId === 'sec_2a' && e.subjectCode === 'CS301'
    );
    expect(secACS301.length).toBe(4);
    secACS301.forEach((e) => expect(e.facultyCode).toBe('FAC001'));

    // Verify Section B uses FAC003 for CS301
    const secBCS301 = result.entries.filter(
      (e) => e.sectionId === 'sec_2b' && e.subjectCode === 'CS301'
    );
    expect(secBCS301.length).toBe(4);
    secBCS301.forEach((e) => expect(e.facultyCode).toBe('FAC003'));

    // Verify FAC002 (who teaches CS302 in both sections) never collides across sections
    const fac002Entries = result.entries.filter((e) => e.facultyCode === 'FAC002');
    const slotSet = new Set<string>();
    for (const e of fac002Entries) {
      const slotKey = `${e.day}_${e.periodNumber}`;
      expect(slotSet.has(slotKey)).toBe(false); // No collision!
      slotSet.add(slotKey);
    }
  });
});
