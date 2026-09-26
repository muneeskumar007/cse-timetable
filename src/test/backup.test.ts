import { describe, it, expect } from 'vitest';
import { validateBackup } from '../services/backupService';

describe('Backup Validation Service', () => {
  it('validates a correct backup structure', () => {
    const validJson = JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      departmentSettings: { departmentName: 'CSE' },
      faculty: [{ facultyCode: 'FAC001', facultyName: 'Dr. Kumar' }],
      years: [{ yearName: '2nd Year' }],
      sections: [{ sectionName: 'A' }],
      rooms: [{ roomNumber: '201' }],
      subjects: [{ subjectCode: 'CS301' }],
      subjectAssignments: [{ subjectCode: 'CS301', sectionName: 'A' }],
      labs: [{ labName: 'DS Lab' }],
      periods: [],
      fixedSlots: [],
      currentTimetable: [],
      generatedTimetable: [],
      timetableVersions: [],
    });

    const result = validateBackup(validJson);
    expect(result.isValid).toBe(true);
    expect(result.summary?.facultyCount).toBe(1);
    expect(result.summary?.yearCount).toBe(1);
  });

  it('rejects invalid or malformed JSON gracefully', () => {
    const corruptJson = '{ invalid_json...';
    const result = validateBackup(corruptJson);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('JSON parse error');
  });

  it('rejects backup with missing required collections', () => {
    const incompleteJson = JSON.stringify({
      version: '1.0.0',
      faculty: [],
      // Missing years, sections, rooms, subjects, etc.
    });

    const result = validateBackup(incompleteJson);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('years'))).toBe(true);
  });

  it('triggers subscriber notifications via notifyDataChanged and unsubscribe stops them', async () => {
    const { subscribeToDataChanges, notifyDataChanged } = await import('../services/cloudService');
    let notified = false;
    const unsubscribe = subscribeToDataChanges(() => {
      notified = true;
    });

    notifyDataChanged();
    expect(notified).toBe(true);
    unsubscribe();

    // Verify unsubscribing stops notifications
    notified = false;
    notifyDataChanged();
    expect(notified).toBe(false);
  });

  it('verifies DEMO datasets are structurally sound and complete', async () => {
    const { DEMO_FACULTY, DEMO_SUBJECTS, DEMO_SUBJECT_ASSIGNMENTS, DEMO_LABS } = await import('../db/demoData');
    const { INITIAL_YEARS, DEFAULT_ROOMS } = await import('../db/seedData');

    expect(DEMO_FACULTY.length).toBe(10);
    expect(DEMO_SUBJECTS.length).toBe(12);
    expect(DEMO_SUBJECT_ASSIGNMENTS.length).toBe(36);
    expect(DEMO_LABS.length).toBe(18);
    expect(INITIAL_YEARS.length).toBe(3);
    expect(DEFAULT_ROOMS.length).toBe(13);

    // Verify all assignment sections exist in INITIAL_YEARS
    const allSectionIds = INITIAL_YEARS.flatMap((y) => y.sections.map((s) => s.id));
    for (const a of DEMO_SUBJECT_ASSIGNMENTS) {
      expect(allSectionIds).toContain(a.sectionId);
    }

    // Verify all lab sections exist in INITIAL_YEARS
    for (const l of DEMO_LABS) {
      expect(allSectionIds).toContain(l.sectionId);
    }
  });
});
