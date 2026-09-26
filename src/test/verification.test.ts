import { describe, it, expect } from 'vitest';
import { generateTimetable } from '../timetable/engine';
import {
  calculateFacultyAvailability,
  verifySectionTimetable,
  verifyDepartmentTimetable,
} from '../services/verificationService';
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

describe('Verification Service and Availability Engine', () => {
  const allSections = INITIAL_YEARS.flatMap((y) => y.sections);
  const allYears = INITIAL_YEARS.map((y) => y.year);
  const targetSection = allSections[0];
  const targetYear = allYears.find((y) => y.id === targetSection.yearId)!;

  // Pre-generate a complete valid timetable for tests
  const genResult = generateTimetable({
    years: allYears,
    sections: allSections,
    faculty: DEMO_FACULTY,
    assignments: DEMO_SUBJECT_ASSIGNMENTS,
    labs: DEMO_LABS,
    rooms: DEFAULT_ROOMS,
    fixedSlots: DEFAULT_FIXED_SLOTS,
    settings: DEFAULT_SETTINGS,
    periods: DEFAULT_PERIODS,
  });

  it('correctly calculates faculty free vs busy availability for a given slot', () => {
    expect(genResult.success).toBe(true);

    const slotAvail = calculateFacultyAvailability(
      genResult.entries,
      DEMO_FACULTY,
      'Tuesday',
      3,
      DEFAULT_PERIODS
    );

    expect(slotAvail.day).toBe('Tuesday');
    expect(slotAvail.periodNumber).toBe(3);
    expect(slotAvail.freeFaculty.length).toBeGreaterThan(0);
    expect(slotAvail.busyFaculty.length).toBeGreaterThan(0);

    // Busy faculty verification
    for (const busy of slotAvail.busyFaculty) {
      expect(busy.isFree).toBe(false);
      expect(busy.assignedEntry).toBeDefined();
      expect(busy.assignedEntry?.day).toBe('Tuesday');
      expect(busy.assignedEntry?.periodNumber).toBe(3);
      expect(busy.workload.assigned).toBeGreaterThan(0);
    }

    // Free faculty verification
    for (const free of slotAvail.freeFaculty) {
      expect(free.isFree).toBe(true);
      expect(free.assignedEntry).toBeUndefined();
      expect(free.workload.required).toBeGreaterThan(0);
    }
  });

  it('verifies a generated section timetable as complete with zero errors', () => {
    const verification = verifySectionTimetable(
      genResult.entries,
      targetSection,
      targetYear,
      DEMO_SUBJECT_ASSIGNMENTS,
      DEMO_LABS,
      DEFAULT_FIXED_SLOTS,
      [],
      DEFAULT_SETTINGS,
      DEFAULT_PERIODS
    );

    expect(verification.status).toBe('complete');
    expect(verification.isComplete).toBe(true);
    expect(verification.errors.length).toBe(0);
    expect(verification.unassignedSlots).toBeGreaterThanOrEqual(0);

    // Verify theory frequency summaries
    for (const sub of verification.subjectSummaries) {
      expect(sub.assignedPeriods).toBe(sub.requiredPeriods);
      expect(sub.difference).toBe(0);
      expect(sub.status).toBe('complete');
      expect(sub.occurrences.length).toBe(sub.requiredPeriods);
    }

    // Verify labs
    for (const lab of verification.labSummaries) {
      expect(lab.assignedPeriods).toBe(lab.requiredPeriods);
      expect(lab.status).toBe('complete');
    }

    // Verify library
    expect(verification.librarySummary.status).toBe('complete');
    expect(verification.librarySummary.assignedPeriods).toBeGreaterThanOrEqual(1);
  });

  it('detects under-allocation when a theory period is removed', () => {
    // Clone entries and remove one theory period
    const modifiedEntries = [...genResult.entries];
    const targetSubject = DEMO_SUBJECT_ASSIGNMENTS.find(
      (a) => a.sectionId === targetSection.id
    )!;

    const removeIndex = modifiedEntries.findIndex(
      (e) =>
        e.sectionId === targetSection.id &&
        e.subjectCode === targetSubject.subjectCode &&
        e.entryType === 'theory'
    );
    expect(removeIndex).toBeGreaterThanOrEqual(0);
    modifiedEntries.splice(removeIndex, 1);

    const verification = verifySectionTimetable(
      modifiedEntries,
      targetSection,
      targetYear,
      DEMO_SUBJECT_ASSIGNMENTS,
      DEMO_LABS,
      DEFAULT_FIXED_SLOTS,
      [],
      DEFAULT_SETTINGS,
      DEFAULT_PERIODS
    );

    expect(verification.status).toBe('error');
    expect(verification.isComplete).toBe(false);
    expect(verification.unassignedSlots).toBeGreaterThanOrEqual(1);

    // Subject summary for target subject should show under-allocation
    const subSummary = verification.subjectSummaries.find(
      (s) => s.subjectCode === targetSubject.subjectCode
    );
    expect(subSummary).toBeDefined();
    expect(subSummary?.status).toBe('error');
    expect(subSummary?.difference).toBe(-1);
    expect(subSummary?.assignedPeriods).toBe(targetSubject.weeklyPeriods - 1);
  });

  it('detects missing library period when library entry is removed', () => {
    // Clone entries and strip library entries for target section
    const modifiedEntries = genResult.entries.filter(
      (e) => !(e.sectionId === targetSection.id && e.entryType === 'library')
    );

    const verification = verifySectionTimetable(
      modifiedEntries,
      targetSection,
      targetYear,
      DEMO_SUBJECT_ASSIGNMENTS,
      DEMO_LABS,
      DEFAULT_FIXED_SLOTS,
      [],
      DEFAULT_SETTINGS,
      DEFAULT_PERIODS
    );

    expect(verification.status).toBe('error');
    expect(verification.librarySummary.status).toBe('error');
    expect(verification.librarySummary.assignedPeriods).toBe(0);
    expect(
      verification.errors.some((err) => err.type === 'LIBRARY_REQUIREMENT')
    ).toBe(true);
  });

  it('runs department-wide verification summary across all sections', () => {
    const deptSummary = verifyDepartmentTimetable(
      genResult.entries,
      allYears,
      allSections,
      DEMO_SUBJECT_ASSIGNMENTS,
      DEMO_LABS,
      DEFAULT_FIXED_SLOTS,
      [],
      DEFAULT_SETTINGS,
      DEFAULT_PERIODS
    );

    expect(deptSummary.totalSections).toBe(allSections.length);
    expect(deptSummary.completeSections).toBe(allSections.length);
    expect(deptSummary.warningSections).toBe(0);
    expect(deptSummary.errorSections).toBe(0);
    expect(deptSummary.sectionVerifications.length).toBe(allSections.length);
  });
});
