import { db } from '../db/database';
import { initializeDatabase } from '../db/seedData';
import { cloudService } from './cloudService';
import type { BackupData } from '../types';

export interface BackupValidationResult {
  isValid: boolean;
  errors: string[];
  summary?: {
    facultyCount: number;
    yearCount: number;
    sectionCount: number;
    roomCount: number;
    subjectCount: number;
    assignmentCount: number;
    labCount: number;
    fixedAssignmentCount?: number;
    currentTimetableCount: number;
    versionCount: number;
    exportedAt: string;
  };
  data?: BackupData;
}

/**
 * Exports all IndexedDB data as a structured JSON file download
 */
export async function exportBackup(): Promise<void> {
  const [
    settingsList,
    faculty,
    years,
    sections,
    rooms,
    subjects,
    subjectAssignments,
    labs,
    periods,
    fixedSlots,
    fixedAssignments,
    currentTimetable,
    generatedTimetable,
    timetableVersions,
  ] = await Promise.all([
    db.settings.toArray(),
    db.faculty.toArray(),
    db.academicYears.toArray(),
    db.sections.toArray(),
    db.rooms.toArray(),
    db.subjects.toArray(),
    db.subjectAssignments.toArray(),
    db.labs.toArray(),
    db.periodConfigs.toArray(),
    db.fixedSlots.toArray(),
    db.fixedAssignments.toArray(),
    db.timetableEntries.toArray(),
    db.generatedTimetableEntries.toArray(),
    db.timetableVersions.toArray(),
  ]);

  const backupData: BackupData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    departmentSettings: settingsList[0] || {
      id: 'default',
      departmentName: 'Computer Science and Engineering',
      collegeName: 'Department of Computer Science and Engineering',
      academicYear: '2026-2027',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      periodsPerFullDay: 7,
      periodsOnSaturday: 4,
      lunchAfterPeriod: 4,
    },
    faculty,
    years,
    sections,
    rooms,
    subjects,
    subjectAssignments,
    labs,
    periods,
    fixedSlots,
    fixedAssignments,
    timetableVersions,
    currentTimetable,
    generatedTimetable,
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('download', `CSE_Timetable_Backup_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Validates a backup JSON string before allowing restore
 */
export function validateBackup(jsonString: string): BackupValidationResult {
  try {
    const data = JSON.parse(jsonString);

    const errors: string[] = [];
    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['Backup file is not a valid JSON object.'] };
    }

    if (!Array.isArray(data.faculty)) {
      errors.push('Missing or invalid "faculty" collection in backup.');
    }
    if (!Array.isArray(data.years)) {
      errors.push('Missing or invalid "years" collection in backup.');
    }
    if (!Array.isArray(data.sections)) {
      errors.push('Missing or invalid "sections" collection in backup.');
    }
    if (!Array.isArray(data.rooms)) {
      errors.push('Missing or invalid "rooms" collection in backup.');
    }
    if (!Array.isArray(data.subjects)) {
      errors.push('Missing or invalid "subjects" collection in backup.');
    }
    if (!Array.isArray(data.subjectAssignments)) {
      errors.push('Missing or invalid "subjectAssignments" collection in backup.');
    }
    if (!Array.isArray(data.labs)) {
      errors.push('Missing or invalid "labs" collection in backup.');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors: [],
      summary: {
        facultyCount: data.faculty.length,
        yearCount: data.years.length,
        sectionCount: data.sections.length,
        roomCount: data.rooms.length,
        subjectCount: data.subjects.length,
        assignmentCount: data.subjectAssignments.length,
        labCount: data.labs.length,
        fixedAssignmentCount: Array.isArray(data.fixedAssignments) ? data.fixedAssignments.length : 0,
        currentTimetableCount: Array.isArray(data.currentTimetable) ? data.currentTimetable.length : 0,
        versionCount: Array.isArray(data.timetableVersions) ? data.timetableVersions.length : 0,
        exportedAt: data.exportedAt || 'Unknown date',
      },
      data: data as BackupData,
    };
  } catch (err: any) {
    return {
      isValid: false,
      errors: [`JSON parse error: ${err?.message || 'Invalid format'}`],
    };
  }
}

/**
 * Restores all application data from a validated backup to Cloud Firestore and local storage
 */
export async function restoreBackup(backupData: BackupData): Promise<void> {
  await cloudService.restoreAll(backupData);
}

/**
 * Resets cloud and local project cleanly to default factory state
 */
export async function resetProject(): Promise<void> {
  await cloudService.resetProject();
}
