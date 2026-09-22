import { describe, it, expect } from 'vitest';
import { generateTimetable } from '../timetable/engine';
import { validateTimetable } from '../timetable/validator';
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

describe('Timetable Constraint Satisfaction Engine', () => {
  it('generates a complete valid department schedule without constraint violations', () => {
    const allSections = INITIAL_YEARS.flatMap((y) => y.sections);
    const allYears = INITIAL_YEARS.map((y) => y.year);

    const result = generateTimetable({
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

    expect(result.success).toBe(true);
    expect(result.entries.length).toBeGreaterThan(0);

    // Full validation check
    const validation = validateTimetable(result.entries, {
      assignments: DEMO_SUBJECT_ASSIGNMENTS,
      labs: DEMO_LABS,
      fixedSlots: DEFAULT_FIXED_SLOTS,
      settings: DEFAULT_SETTINGS,
      periods: DEFAULT_PERIODS,
    });

    if (!validation.isValid) {
      console.error('Validation errors:', validation.errors);
    }
    expect(validation.isValid).toBe(true);
    expect(validation.errors.length).toBe(0);

    // Verify fixed unit tests: Monday P1/P2 and Saturday P1/P2 are present for every section
    for (const sec of allSections) {
      const monUT1 = result.entries.find(
        (e) => e.sectionId === sec.id && e.day === 'Monday' && e.periodNumber === 1 && e.entryType === 'unit_test'
      );
      const monUT2 = result.entries.find(
        (e) => e.sectionId === sec.id && e.day === 'Monday' && e.periodNumber === 2 && e.entryType === 'unit_test'
      );
      const satUT1 = result.entries.find(
        (e) => e.sectionId === sec.id && e.day === 'Saturday' && e.periodNumber === 1 && e.entryType === 'unit_test'
      );
      const satUT2 = result.entries.find(
        (e) => e.sectionId === sec.id && e.day === 'Saturday' && e.periodNumber === 2 && e.entryType === 'unit_test'
      );

      expect(monUT1).toBeDefined();
      expect(monUT2).toBeDefined();
      expect(satUT1).toBeDefined();
      expect(satUT2).toBeDefined();
    }

    // Verify Practical Lab continuity: 3 consecutive periods, once per week
    for (const lab of DEMO_LABS.filter((l) => l.labType === 'practical')) {
      const labEntries = result.entries.filter(
        (e) => e.entryType === 'practical_lab' && e.sectionId === lab.sectionId && e.subjectName === lab.labName
      );
      expect(labEntries.length).toBe(3);
      // Verify same day
      const day = labEntries[0].day;
      expect(labEntries.every((e) => e.day === day)).toBe(true);
      // Verify consecutive periods
      const periods = labEntries.map((e) => e.periodNumber).sort((a, b) => a - b);
      expect(periods[1]).toBe(periods[0] + 1);
      expect(periods[2]).toBe(periods[1] + 1);
      // Verify does not cross lunch (lunch is after period 4)
      const crossesLunch = periods.some((p) => p <= 4) && periods.some((p) => p > 4);
      expect(crossesLunch).toBe(false);
      // Verify never on Saturday
      expect(day).not.toBe('Saturday');
    }

    // Verify Integrated Lab continuity: 2 consecutive periods, once per week
    for (const lab of DEMO_LABS.filter((l) => l.labType === 'integrated')) {
      const labEntries = result.entries.filter(
        (e) => e.entryType === 'integrated_lab' && e.sectionId === lab.sectionId && e.subjectName === lab.labName
      );
      expect(labEntries.length).toBe(2);
      const day = labEntries[0].day;
      expect(labEntries.every((e) => e.day === day)).toBe(true);
      const periods = labEntries.map((e) => e.periodNumber).sort((a, b) => a - b);
      expect(periods[1]).toBe(periods[0] + 1);
      const crossesLunch = periods.some((p) => p <= 4) && periods.some((p) => p > 4);
      expect(crossesLunch).toBe(false);
    }
  });
});
