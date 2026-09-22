export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export const ALL_DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday' ,
  'Thursday',
  'Friday',
  'Saturday',
];

export const FULL_DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

export interface Faculty {
  id: string;
  facultyCode: string; // Unique, e.g. "FAC001"
  facultyName: string;
  weeklyWorkload: number; // e.g. 18, 22, 24
  designation?: string;
  isActive: boolean;
}

export interface AcademicYear {
  id: string;
  yearName: string; // "2nd Year", "3rd Year", "4th Year"
  orderIndex: number;
}

export interface Section {
  id: string;
  yearId: string;
  sectionName: string; // "A", "B", "C"
  roomId?: string; // Mapped default room ID
  roomNumber?: string;
}

export type RoomType = 'classroom' | 'lab' | 'seminar';

export interface Room {
  id: string;
  roomNumber: string; // e.g. "201", "Lab 1"
  roomName: string;
  roomType: RoomType;
  capacity?: number;
  isActive: boolean;
}

export interface Subject {
  id: string;
  yearId: string;
  subjectCode: string; // e.g. "CS301"
  subjectName: string;
}

export interface SubjectAssignment {
  id: string;
  yearId: string;
  sectionId: string;
  sectionName: string;
  subjectCode: string;
  subjectName: string;
  facultyCode: string;
  facultyName: string;
  weeklyPeriods: number; // Theory periods needed per week
}

export type LabType = 'practical' | 'integrated';

export interface Lab {
  id: string;
  labName: string;
  labType: LabType;
  yearId: string;
  sectionId: string;
  sectionName: string;
  facultyCode: string;
  facultyName: string;
  roomId: string;
  roomNumber: string;
  weeklyPeriods: number; // 3 for practical, 2 for integrated
}

export interface PeriodConfig {
  id: string;
  periodNumber: number; // 1 to 7
  name: string; // "Period 1"
  startTime: string; // "09:00 AM"
  endTime: string; // "09:55 AM"
  isSaturdayPeriod: boolean; // true for 1..4, false for 5..7
}

export type FixedSlotType = 'unit_test' | 'assembly' | 'other';

export interface FixedSlot {
  id: string;
  day: DayOfWeek;
  periodNumber: number;
  slotType: FixedSlotType;
  description: string;
}

export type EntryType = 'theory' | 'practical_lab' | 'integrated_lab' | 'unit_test';

export interface TimetableEntry {
  id: string;
  day: DayOfWeek;
  periodNumber: number;
  yearId: string;
  sectionId: string;
  sectionName: string;
  subjectCode: string;
  subjectName: string;
  facultyCode: string;
  facultyName: string;
  roomId: string;
  roomNumber: string;
  entryType: EntryType;
  isFixed: boolean;
  labBlockId?: string; // Shared ID for all periods in a lab block
  labBlockPeriodIndex?: number; // 0, 1, 2
  labType?: LabType;
}

export interface TimetableVersion {
  id: string;
  versionNumber: number;
  name: string;
  timestamp: string;
  isCurrent: boolean;
  isGenerated: boolean;
  entries: TimetableEntry[];
}

export interface DepartmentSettings {
  id: string;
  departmentName: string;
  collegeName: string;
  academicYear: string;
  workingDays: DayOfWeek[];
  periodsPerFullDay: number;
  periodsOnSaturday: number;
  lunchAfterPeriod: number;
  shortBreakAfterPeriod?: number;
}

export type ValidationErrorType =
  | 'FACULTY_CONFLICT'
  | 'SECTION_CONFLICT'
  | 'ROOM_CONFLICT'
  | 'FIXED_SLOT'
  | 'LUNCH_CROSSING'
  | 'LAB_CONTINUITY'
  | 'LAB_FREQUENCY'
  | 'WEEKLY_PERIODS'
  | 'SATURDAY_RESTRICTION'
  | 'UNKNOWN_FACULTY'
  | 'CAPACITY_OVERFLOW'
  | 'MISSING_DATA';

export interface ValidationError {
  type: ValidationErrorType;
  severity: 'error' | 'warning';
  day?: DayOfWeek;
  periodNumber?: number;
  facultyCode?: string;
  facultyName?: string;
  yearId?: string;
  sectionId?: string;
  sectionName?: string;
  roomId?: string;
  roomNumber?: string;
  subjectCode?: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export type WorkloadStatus = 'balanced' | 'overloaded' | 'underloaded';

export interface FacultyWorkloadReport {
  facultyCode: string;
  facultyName: string;
  requiredWorkload: number;
  assignedTheoryPeriods: number;
  assignedLabPeriods: number;
  totalAssigned: number;
  difference: number; // totalAssigned - requiredWorkload
  status: WorkloadStatus;
}

export interface GenerationProgress {
  status: 'idle' | 'preparing' | 'validating' | 'scheduling_labs' | 'scheduling_theory' | 'optimizing' | 'completed' | 'failed';
  step: string;
  progressPercent: number;
  diagnostics?: string[];
}

export interface BackupData {
  version: string;
  exportedAt: string;
  departmentSettings: DepartmentSettings;
  faculty: Faculty[];
  years: AcademicYear[];
  sections: Section[];
  rooms: Room[];
  subjects: Subject[];
  subjectAssignments: SubjectAssignment[];
  labs: Lab[];
  periods: PeriodConfig[];
  fixedSlots: FixedSlot[];
  timetableVersions: TimetableVersion[];
  currentTimetable: TimetableEntry[];
  generatedTimetable: TimetableEntry[];
}
