import { db } from '../db/database';
import { initializeDatabase } from '../db/seedData';
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
 * Restores all application data from a validated backup
 */
export async function restoreBackup(backupData: BackupData): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.settings,
      db.faculty,
      db.academicYears,
      db.sections,
      db.rooms,
      db.subjects,
      db.subjectAssignments,
      db.labs,
      db.periodConfigs,
      db.fixedSlots,
      db.timetableEntries,
      db.generatedTimetableEntries,
      db.timetableVersions,
    ],
    async () => {
      // Clear existing data
      await Promise.all([
        db.settings.clear(),
        db.faculty.clear(),
        db.academicYears.clear(),
        db.sections.clear(),
        db.rooms.clear(),
        db.subjects.clear(),
        db.subjectAssignments.clear(),
        db.labs.clear(),
        db.periodConfigs.clear(),
        db.fixedSlots.clear(),
        db.timetableEntries.clear(),
        db.generatedTimetableEntries.clear(),
        db.timetableVersions.clear(),
      ]);

      // Populate restored data
      if (backupData.departmentSettings) {
        await db.settings.add(backupData.departmentSettings);
      }
      if (backupData.faculty?.length) await db.faculty.bulkAdd(backupData.faculty);
      if (backupData.years?.length) await db.academicYears.bulkAdd(backupData.years);
      if (backupData.sections?.length) await db.sections.bulkAdd(backupData.sections);
      if (backupData.rooms?.length) await db.rooms.bulkAdd(backupData.rooms);
      if (backupData.subjects?.length) await db.subjects.bulkAdd(backupData.subjects);
      if (backupData.subjectAssignments?.length) await db.subjectAssignments.bulkAdd(backupData.subjectAssignments);
      if (backupData.labs?.length) await db.labs.bulkAdd(backupData.labs);
      if (backupData.periods?.length) await db.periodConfigs.bulkAdd(backupData.periods);
      if (backupData.fixedSlots?.length) await db.fixedSlots.bulkAdd(backupData.fixedSlots);
      if (backupData.currentTimetable?.length) await db.timetableEntries.bulkAdd(backupData.currentTimetable);
      if (backupData.generatedTimetable?.length) await db.generatedTimetableEntries.bulkAdd(backupData.generatedTimetable);
      if (backupData.timetableVersions?.length) await db.timetableVersions.bulkAdd(backupData.timetableVersions);
    }
  );
}

/**
 * Resets local IndexedDB project cleanly to default factory state
 */
export async function resetProject(): Promise<void> {
  await Promise.all([
    db.settings.clear(),
    db.faculty.clear(),
    db.academicYears.clear(),
    db.sections.clear(),
    db.rooms.clear(),
    db.subjects.clear(),
    db.subjectAssignments.clear(),
    db.labs.clear(),
    db.periodConfigs.clear(),
    db.fixedSlots.clear(),
    db.timetableEntries.clear(),
    db.generatedTimetableEntries.clear(),
    db.timetableVersions.clear(),
  ]);

  await initializeDatabase();
}
