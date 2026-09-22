import { db } from './database';
import type {
  DepartmentSettings,
  PeriodConfig,
  FixedSlot,
  Room,
  AcademicYear,
  Section,
} from '../types';

export const DEFAULT_SETTINGS: DepartmentSettings = {
  id: 'default',
  departmentName: 'Computer Science and Engineering',
  collegeName: 'Department of Computer Science and Engineering',
  academicYear: '2026-2027',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  periodsPerFullDay: 7,
  periodsOnSaturday: 4,
  lunchAfterPeriod: 4,
  shortBreakAfterPeriod: 2,
};

export const DEFAULT_PERIODS: PeriodConfig[] = [
  { id: 'p1', periodNumber: 1, name: 'Period 1', startTime: '09:00 AM', endTime: '09:55 AM', isSaturdayPeriod: true },
  { id: 'p2', periodNumber: 2, name: 'Period 2', startTime: '09:55 AM', endTime: '10:50 AM', isSaturdayPeriod: true },
  { id: 'p3', periodNumber: 3, name: 'Period 3', startTime: '11:10 AM', endTime: '12:05 PM', isSaturdayPeriod: true },
  { id: 'p4', periodNumber: 4, name: 'Period 4', startTime: '12:05 PM', endTime: '01:00 PM', isSaturdayPeriod: true },
  { id: 'p5', periodNumber: 5, name: 'Period 5', startTime: '01:50 PM', endTime: '02:40 PM', isSaturdayPeriod: false },
  { id: 'p6', periodNumber: 6, name: 'Period 6', startTime: '02:40 PM', endTime: '03:30 PM', isSaturdayPeriod: false },
  { id: 'p7', periodNumber: 7, name: 'Period 7', startTime: '03:30 PM', endTime: '04:20 PM', isSaturdayPeriod: false },
];

export const DEFAULT_FIXED_SLOTS: FixedSlot[] = [
  { id: 'fs_mon_p1', day: 'Monday', periodNumber: 1, slotType: 'unit_test', description: 'Unit Test' },
  { id: 'fs_mon_p2', day: 'Monday', periodNumber: 2, slotType: 'unit_test', description: 'Unit Test' },
  { id: 'fs_sat_p1', day: 'Saturday', periodNumber: 1, slotType: 'unit_test', description: 'Unit Test' },
  { id: 'fs_sat_p2', day: 'Saturday', periodNumber: 2, slotType: 'unit_test', description: 'Unit Test' },
];

export const DEFAULT_ROOMS: Room[] = [
  { id: 'room_201', roomNumber: '201', roomName: '2nd Year Sec A Hall', roomType: 'classroom', capacity: 65, isActive: true },
  { id: 'room_202', roomNumber: '202', roomName: '2nd Year Sec B Hall', roomType: 'classroom', capacity: 65, isActive: true },
  { id: 'room_203', roomNumber: '203', roomName: '2nd Year Sec C Hall', roomType: 'classroom', capacity: 65, isActive: true },
  { id: 'room_301', roomNumber: '301', roomName: '3rd Year Sec A Hall', roomType: 'classroom', capacity: 65, isActive: true },
  { id: 'room_302', roomNumber: '302', roomName: '3rd Year Sec B Hall', roomType: 'classroom', capacity: 65, isActive: true },
  { id: 'room_303', roomNumber: '303', roomName: '3rd Year Sec C Hall', roomType: 'classroom', capacity: 65, isActive: true },
  { id: 'room_401', roomNumber: '401', roomName: '4th Year Sec A Hall', roomType: 'classroom', capacity: 65, isActive: true },
  { id: 'room_402', roomNumber: '402', roomName: '4th Year Sec B Hall', roomType: 'classroom', capacity: 65, isActive: true },
  { id: 'room_403', roomNumber: '403', roomName: '4th Year Sec C Hall', roomType: 'classroom', capacity: 65, isActive: true },
  { id: 'room_lab1', roomNumber: 'CSE Lab 1', roomName: 'Systems & Networks Lab', roomType: 'lab', capacity: 70, isActive: true },
  { id: 'room_lab2', roomNumber: 'CSE Lab 2', roomName: 'Programming & Data Structures Lab', roomType: 'lab', capacity: 70, isActive: true },
  { id: 'room_lab3', roomNumber: 'CSE Lab 3', roomName: 'Web Technologies & AI Lab', roomType: 'lab', capacity: 70, isActive: true },
  { id: 'room_proj', roomNumber: 'Project Lab', roomName: 'Final Year Innovation Lab', roomType: 'lab', capacity: 45, isActive: true },
];

export const INITIAL_YEARS: { year: AcademicYear; sections: Section[] }[] = [
  {
    year: { id: 'year_2', yearName: '2nd Year', orderIndex: 2 },
    sections: [
      { id: 'sec_2a', yearId: 'year_2', sectionName: 'A', roomId: 'room_201', roomNumber: '201' },
      { id: 'sec_2b', yearId: 'year_2', sectionName: 'B', roomId: 'room_202', roomNumber: '202' },
      { id: 'sec_2c', yearId: 'year_2', sectionName: 'C', roomId: 'room_203', roomNumber: '203' },
    ],
  },
  {
    year: { id: 'year_3', yearName: '3rd Year', orderIndex: 3 },
    sections: [
      { id: 'sec_3a', yearId: 'year_3', sectionName: 'A', roomId: 'room_301', roomNumber: '301' },
      { id: 'sec_3b', yearId: 'year_3', sectionName: 'B', roomId: 'room_302', roomNumber: '302' },
      { id: 'sec_3c', yearId: 'year_3', sectionName: 'C', roomId: 'room_303', roomNumber: '303' },
    ],
  },
  {
    year: { id: 'year_4', yearName: '4th Year', orderIndex: 4 },
    sections: [
      { id: 'sec_4a', yearId: 'year_4', sectionName: 'A', roomId: 'room_401', roomNumber: '401' },
      { id: 'sec_4b', yearId: 'year_4', sectionName: 'B', roomId: 'room_402', roomNumber: '402' },
      { id: 'sec_4c', yearId: 'year_4', sectionName: 'C', roomId: 'room_403', roomNumber: '403' },
    ],
  },
];

export async function initializeDatabase(): Promise<void> {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add(DEFAULT_SETTINGS);
  }

  const periodsCount = await db.periodConfigs.count();
  if (periodsCount === 0) {
    await db.periodConfigs.bulkAdd(DEFAULT_PERIODS);
  }

  const fixedSlotsCount = await db.fixedSlots.count();
  if (fixedSlotsCount === 0) {
    await db.fixedSlots.bulkAdd(DEFAULT_FIXED_SLOTS);
  }

  const roomsCount = await db.rooms.count();
  if (roomsCount === 0) {
    await db.rooms.bulkAdd(DEFAULT_ROOMS);
  }

  const yearsCount = await db.academicYears.count();
  if (yearsCount === 0) {
    for (const group of INITIAL_YEARS) {
      await db.academicYears.add(group.year);
      await db.sections.bulkAdd(group.sections);
    }
  }
}
