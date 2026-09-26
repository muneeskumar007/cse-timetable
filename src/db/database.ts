import Dexie, { type Table } from 'dexie';
import type {
  Faculty,
  AcademicYear,
  Section,
  Room,
  Subject,
  SubjectAssignment,
  Lab,
  PeriodConfig,
  FixedSlot,
  FixedAssignment,
  TimetableEntry,
  TimetableVersion,
  DepartmentSettings,
} from '../types';

export class TimetableDatabase extends Dexie {
  faculty!: Table<Faculty, string>;
  academicYears!: Table<AcademicYear, string>;
  sections!: Table<Section, string>;
  rooms!: Table<Room, string>;
  subjects!: Table<Subject, string>;
  subjectAssignments!: Table<SubjectAssignment, string>;
  labs!: Table<Lab, string>;
  periodConfigs!: Table<PeriodConfig, string>;
  fixedSlots!: Table<FixedSlot, string>;
  fixedAssignments!: Table<FixedAssignment, string>;
  timetableEntries!: Table<TimetableEntry, string>;
  generatedTimetableEntries!: Table<TimetableEntry, string>;
  timetableVersions!: Table<TimetableVersion, string>;
  settings!: Table<DepartmentSettings, string>;

  constructor() {
    super('CseTimetableDB');
    this.version(1).stores({
      faculty: 'id, &facultyCode, facultyName, isActive',
      academicYears: 'id, &yearName, orderIndex',
      sections: 'id, yearId, [yearId+sectionName]',
      rooms: 'id, &roomNumber, roomType, isActive',
      subjects: 'id, yearId, subjectCode, [yearId+subjectCode]',
      subjectAssignments: 'id, yearId, sectionId, subjectCode, facultyCode, [yearId+sectionId+subjectCode]',
      labs: 'id, yearId, sectionId, facultyCode, roomId, labType',
      periodConfigs: 'id, &periodNumber',
      fixedSlots: 'id, day, periodNumber, [day+periodNumber]',
      timetableEntries: 'id, day, periodNumber, yearId, sectionId, facultyCode, roomId, [day+periodNumber+sectionId], [day+periodNumber+facultyCode], [day+periodNumber+roomId]',
      generatedTimetableEntries: 'id, day, periodNumber, yearId, sectionId, facultyCode',
      timetableVersions: 'id, &versionNumber, timestamp, isCurrent, isGenerated',
      settings: 'id',
    });

    this.version(2).stores({
      fixedAssignments: 'id, yearId, sectionId, assignmentType, day, active, [yearId+sectionId]',
    });
  }
}

export const db = new TimetableDatabase();
