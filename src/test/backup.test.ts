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
});
