import { db } from './database';
import { DEFAULT_SETTINGS, DEFAULT_PERIODS, DEFAULT_FIXED_SLOTS, DEFAULT_ROOMS, INITIAL_YEARS } from './seedData';
import type { Faculty, Subject, SubjectAssignment, Lab } from '../types';

export const DEMO_FACULTY: Faculty[] = [
  { id: 'fac_01', facultyCode: 'FAC001', facultyName: 'Dr. R. Kumar', weeklyWorkload: 18, designation: 'Professor & HOD', isActive: true },
  { id: 'fac_02', facultyCode: 'FAC002', facultyName: 'Ms. S. Priya', weeklyWorkload: 20, designation: 'Associate Professor', isActive: true },
  { id: 'fac_03', facultyCode: 'FAC003', facultyName: 'Mr. M. Arun', weeklyWorkload: 20, designation: 'Assistant Professor', isActive: true },
  { id: 'fac_04', facultyCode: 'FAC004', facultyName: 'Dr. K. Anitha', weeklyWorkload: 18, designation: 'Associate Professor', isActive: true },
  { id: 'fac_05', facultyCode: 'FAC005', facultyName: 'Mr. P. Suresh', weeklyWorkload: 20, designation: 'Assistant Professor', isActive: true },
  { id: 'fac_06', facultyCode: 'FAC006', facultyName: 'Dr. N. Meena', weeklyWorkload: 18, designation: 'Professor', isActive: true },
  { id: 'fac_07', facultyCode: 'FAC007', facultyName: 'Mr. V. Karthik', weeklyWorkload: 20, designation: 'Assistant Professor', isActive: true },
  { id: 'fac_08', facultyCode: 'FAC008', facultyName: 'Ms. T. Divya', weeklyWorkload: 20, designation: 'Assistant Professor', isActive: true },
  { id: 'fac_09', facultyCode: 'FAC009', facultyName: 'Dr. S. Rajesh', weeklyWorkload: 18, designation: 'Associate Professor', isActive: true },
  { id: 'fac_10', facultyCode: 'FAC010', facultyName: 'Ms. G. Kavitha', weeklyWorkload: 20, designation: 'Assistant Professor', isActive: true },
];

export const DEMO_SUBJECTS: Subject[] = [
  // 2nd Year
  { id: 'sub_cs301', yearId: 'year_2', subjectCode: 'CS301', subjectName: 'Data Structures' },
  { id: 'sub_cs302', yearId: 'year_2', subjectCode: 'CS302', subjectName: 'Digital Principles & Design' },
  { id: 'sub_cs303', yearId: 'year_2', subjectCode: 'CS303', subjectName: 'Discrete Mathematics' },
  { id: 'sub_cs304', yearId: 'year_2', subjectCode: 'CS304', subjectName: 'Object Oriented Java' },
  // 3rd Year
  { id: 'sub_cs501', yearId: 'year_3', subjectCode: 'CS501', subjectName: 'Database Management Systems' },
  { id: 'sub_cs502', yearId: 'year_3', subjectCode: 'CS502', subjectName: 'Computer Networks' },
  { id: 'sub_cs503', yearId: 'year_3', subjectCode: 'CS503', subjectName: 'Theory of Computation' },
  { id: 'sub_cs504', yearId: 'year_3', subjectCode: 'CS504', subjectName: 'Web Technologies' },
  // 4th Year
  { id: 'sub_cs701', yearId: 'year_4', subjectCode: 'CS701', subjectName: 'Cloud Computing' },
  { id: 'sub_cs702', yearId: 'year_4', subjectCode: 'CS702', subjectName: 'Cryptography & Security' },
  { id: 'sub_cs703', yearId: 'year_4', subjectCode: 'CS703', subjectName: 'Artificial Intelligence' },
  { id: 'sub_cs704', yearId: 'year_4', subjectCode: 'CS704', subjectName: 'Distributed Systems' },
];

export const DEMO_SUBJECT_ASSIGNMENTS: SubjectAssignment[] = [
  // 2nd Year Section A
  { id: 'sa_2a_1', yearId: 'year_2', sectionId: 'sec_2a', sectionName: 'A', subjectCode: 'CS301', subjectName: 'Data Structures', facultyCode: 'FAC001', facultyName: 'Dr. R. Kumar', weeklyPeriods: 4 },
  { id: 'sa_2a_2', yearId: 'year_2', sectionId: 'sec_2a', sectionName: 'A', subjectCode: 'CS302', subjectName: 'Digital Principles & Design', facultyCode: 'FAC002', facultyName: 'Ms. S. Priya', weeklyPeriods: 4 },
  { id: 'sa_2a_3', yearId: 'year_2', sectionId: 'sec_2a', sectionName: 'A', subjectCode: 'CS303', subjectName: 'Discrete Mathematics', facultyCode: 'FAC003', facultyName: 'Mr. M. Arun', weeklyPeriods: 4 },
  { id: 'sa_2a_4', yearId: 'year_2', sectionId: 'sec_2a', sectionName: 'A', subjectCode: 'CS304', subjectName: 'Object Oriented Java', facultyCode: 'FAC005', facultyName: 'Mr. P. Suresh', weeklyPeriods: 4 },

  // 2nd Year Section B
  { id: 'sa_2b_1', yearId: 'year_2', sectionId: 'sec_2b', sectionName: 'B', subjectCode: 'CS301', subjectName: 'Data Structures', facultyCode: 'FAC002', facultyName: 'Ms. S. Priya', weeklyPeriods: 4 },
  { id: 'sa_2b_2', yearId: 'year_2', sectionId: 'sec_2b', sectionName: 'B', subjectCode: 'CS302', subjectName: 'Digital Principles & Design', facultyCode: 'FAC001', facultyName: 'Dr. R. Kumar', weeklyPeriods: 4 },
  { id: 'sa_2b_3', yearId: 'year_2', sectionId: 'sec_2b', sectionName: 'B', subjectCode: 'CS303', subjectName: 'Discrete Mathematics', facultyCode: 'FAC003', facultyName: 'Mr. M. Arun', weeklyPeriods: 4 },
  { id: 'sa_2b_4', yearId: 'year_2', sectionId: 'sec_2b', sectionName: 'B', subjectCode: 'CS304', subjectName: 'Object Oriented Java', facultyCode: 'FAC005', facultyName: 'Mr. P. Suresh', weeklyPeriods: 4 },

  // 2nd Year Section C
  { id: 'sa_2c_1', yearId: 'year_2', sectionId: 'sec_2c', sectionName: 'C', subjectCode: 'CS301', subjectName: 'Data Structures', facultyCode: 'FAC001', facultyName: 'Dr. R. Kumar', weeklyPeriods: 4 },
  { id: 'sa_2c_2', yearId: 'year_2', sectionId: 'sec_2c', sectionName: 'C', subjectCode: 'CS302', subjectName: 'Digital Principles & Design', facultyCode: 'FAC002', facultyName: 'Ms. S. Priya', weeklyPeriods: 4 },
  { id: 'sa_2c_3', yearId: 'year_2', sectionId: 'sec_2c', sectionName: 'C', subjectCode: 'CS303', subjectName: 'Discrete Mathematics', facultyCode: 'FAC003', facultyName: 'Mr. M. Arun', weeklyPeriods: 4 },
  { id: 'sa_2c_4', yearId: 'year_2', sectionId: 'sec_2c', sectionName: 'C', subjectCode: 'CS304', subjectName: 'Object Oriented Java', facultyCode: 'FAC005', facultyName: 'Mr. P. Suresh', weeklyPeriods: 4 },

  // 3rd Year Section A
  { id: 'sa_3a_1', yearId: 'year_3', sectionId: 'sec_3a', sectionName: 'A', subjectCode: 'CS501', subjectName: 'Database Management Systems', facultyCode: 'FAC004', facultyName: 'Dr. K. Anitha', weeklyPeriods: 4 },
  { id: 'sa_3a_2', yearId: 'year_3', sectionId: 'sec_3a', sectionName: 'A', subjectCode: 'CS502', subjectName: 'Computer Networks', facultyCode: 'FAC005', facultyName: 'Mr. P. Suresh', weeklyPeriods: 4 },
  { id: 'sa_3a_3', yearId: 'year_3', sectionId: 'sec_3a', sectionName: 'A', subjectCode: 'CS503', subjectName: 'Theory of Computation', facultyCode: 'FAC006', facultyName: 'Dr. N. Meena', weeklyPeriods: 4 },
  { id: 'sa_3a_4', yearId: 'year_3', sectionId: 'sec_3a', sectionName: 'A', subjectCode: 'CS504', subjectName: 'Web Technologies', facultyCode: 'FAC007', facultyName: 'Mr. V. Karthik', weeklyPeriods: 4 },

  // 3rd Year Section B
  { id: 'sa_3b_1', yearId: 'year_3', sectionId: 'sec_3b', sectionName: 'B', subjectCode: 'CS501', subjectName: 'Database Management Systems', facultyCode: 'FAC004', facultyName: 'Dr. K. Anitha', weeklyPeriods: 4 },
  { id: 'sa_3b_2', yearId: 'year_3', sectionId: 'sec_3b', sectionName: 'B', subjectCode: 'CS502', subjectName: 'Computer Networks', facultyCode: 'FAC007', facultyName: 'Mr. V. Karthik', weeklyPeriods: 4 },
  { id: 'sa_3b_3', yearId: 'year_3', sectionId: 'sec_3b', sectionName: 'B', subjectCode: 'CS503', subjectName: 'Theory of Computation', facultyCode: 'FAC006', facultyName: 'Dr. N. Meena', weeklyPeriods: 4 },
  { id: 'sa_3b_4', yearId: 'year_3', sectionId: 'sec_3b', sectionName: 'B', subjectCode: 'CS504', subjectName: 'Web Technologies', facultyCode: 'FAC008', facultyName: 'Ms. T. Divya', weeklyPeriods: 4 },

  // 3rd Year Section C
  { id: 'sa_3c_1', yearId: 'year_3', sectionId: 'sec_3c', sectionName: 'C', subjectCode: 'CS501', subjectName: 'Database Management Systems', facultyCode: 'FAC006', facultyName: 'Dr. N. Meena', weeklyPeriods: 4 },
  { id: 'sa_3c_2', yearId: 'year_3', sectionId: 'sec_3c', sectionName: 'C', subjectCode: 'CS502', subjectName: 'Computer Networks', facultyCode: 'FAC007', facultyName: 'Mr. V. Karthik', weeklyPeriods: 4 },
  { id: 'sa_3c_3', yearId: 'year_3', sectionId: 'sec_3c', sectionName: 'C', subjectCode: 'CS503', subjectName: 'Theory of Computation', facultyCode: 'FAC004', facultyName: 'Dr. K. Anitha', weeklyPeriods: 4 },
  { id: 'sa_3c_4', yearId: 'year_3', sectionId: 'sec_3c', sectionName: 'C', subjectCode: 'CS504', subjectName: 'Web Technologies', facultyCode: 'FAC008', facultyName: 'Ms. T. Divya', weeklyPeriods: 4 },

  // 4th Year Section A
  { id: 'sa_4a_1', yearId: 'year_4', sectionId: 'sec_4a', sectionName: 'A', subjectCode: 'CS701', subjectName: 'Cloud Computing', facultyCode: 'FAC008', facultyName: 'Ms. T. Divya', weeklyPeriods: 4 },
  { id: 'sa_4a_2', yearId: 'year_4', sectionId: 'sec_4a', sectionName: 'A', subjectCode: 'CS702', subjectName: 'Cryptography & Security', facultyCode: 'FAC009', facultyName: 'Dr. S. Rajesh', weeklyPeriods: 4 },
  { id: 'sa_4a_3', yearId: 'year_4', sectionId: 'sec_4a', sectionName: 'A', subjectCode: 'CS703', subjectName: 'Artificial Intelligence', facultyCode: 'FAC010', facultyName: 'Ms. G. Kavitha', weeklyPeriods: 4 },
  { id: 'sa_4a_4', yearId: 'year_4', sectionId: 'sec_4a', sectionName: 'A', subjectCode: 'CS704', subjectName: 'Distributed Systems', facultyCode: 'FAC003', facultyName: 'Mr. M. Arun', weeklyPeriods: 4 },

  // 4th Year Section B
  { id: 'sa_4b_1', yearId: 'year_4', sectionId: 'sec_4b', sectionName: 'B', subjectCode: 'CS701', subjectName: 'Cloud Computing', facultyCode: 'FAC008', facultyName: 'Ms. T. Divya', weeklyPeriods: 4 },
  { id: 'sa_4b_2', yearId: 'year_4', sectionId: 'sec_4b', sectionName: 'B', subjectCode: 'CS702', subjectName: 'Cryptography & Security', facultyCode: 'FAC009', facultyName: 'Dr. S. Rajesh', weeklyPeriods: 4 },
  { id: 'sa_4b_3', yearId: 'year_4', sectionId: 'sec_4b', sectionName: 'B', subjectCode: 'CS703', subjectName: 'Artificial Intelligence', facultyCode: 'FAC010', facultyName: 'Ms. G. Kavitha', weeklyPeriods: 4 },
  { id: 'sa_4b_4', yearId: 'year_4', sectionId: 'sec_4b', sectionName: 'B', subjectCode: 'CS704', subjectName: 'Distributed Systems', facultyCode: 'FAC003', facultyName: 'Mr. M. Arun', weeklyPeriods: 4 },

  // 4th Year Section C
  { id: 'sa_4c_1', yearId: 'year_4', sectionId: 'sec_4c', sectionName: 'C', subjectCode: 'CS701', subjectName: 'Cloud Computing', facultyCode: 'FAC009', facultyName: 'Dr. S. Rajesh', weeklyPeriods: 4 },
  { id: 'sa_4c_2', yearId: 'year_4', sectionId: 'sec_4c', sectionName: 'C', subjectCode: 'CS702', subjectName: 'Cryptography & Security', facultyCode: 'FAC008', facultyName: 'Ms. T. Divya', weeklyPeriods: 4 },
  { id: 'sa_4c_3', yearId: 'year_4', sectionId: 'sec_4c', sectionName: 'C', subjectCode: 'CS703', subjectName: 'Artificial Intelligence', facultyCode: 'FAC010', facultyName: 'Ms. G. Kavitha', weeklyPeriods: 4 },
  { id: 'sa_4c_4', yearId: 'year_4', sectionId: 'sec_4c', sectionName: 'C', subjectCode: 'CS704', subjectName: 'Distributed Systems', facultyCode: 'FAC002', facultyName: 'Ms. S. Priya', weeklyPeriods: 4 },
];

export const DEMO_LABS: Lab[] = [
  // 2nd Year Labs (Practical = 3, Integrated = 2)
  { id: 'lab_2a_prac', labName: 'Data Structures Lab', labType: 'practical', yearId: 'year_2', sectionId: 'sec_2a', sectionName: 'A', facultyCode: 'FAC001', facultyName: 'Dr. R. Kumar', roomId: 'room_lab2', roomNumber: 'CSE Lab 2', weeklyPeriods: 3 },
  { id: 'lab_2a_int', labName: 'Java Programming Lab', labType: 'integrated', yearId: 'year_2', sectionId: 'sec_2a', sectionName: 'A', facultyCode: 'FAC003', facultyName: 'Mr. M. Arun', roomId: 'room_lab1', roomNumber: 'CSE Lab 1', weeklyPeriods: 2 },
  { id: 'lab_2b_prac', labName: 'Data Structures Lab', labType: 'practical', yearId: 'year_2', sectionId: 'sec_2b', sectionName: 'B', facultyCode: 'FAC002', facultyName: 'Ms. S. Priya', roomId: 'room_lab2', roomNumber: 'CSE Lab 2', weeklyPeriods: 3 },
  { id: 'lab_2b_int', labName: 'Java Programming Lab', labType: 'integrated', yearId: 'year_2', sectionId: 'sec_2b', sectionName: 'B', facultyCode: 'FAC003', facultyName: 'Mr. M. Arun', roomId: 'room_lab1', roomNumber: 'CSE Lab 1', weeklyPeriods: 2 },
  { id: 'lab_2c_prac', labName: 'Data Structures Lab', labType: 'practical', yearId: 'year_2', sectionId: 'sec_2c', sectionName: 'C', facultyCode: 'FAC001', facultyName: 'Dr. R. Kumar', roomId: 'room_lab2', roomNumber: 'CSE Lab 2', weeklyPeriods: 3 },
  { id: 'lab_2c_int', labName: 'Java Programming Lab', labType: 'integrated', yearId: 'year_2', sectionId: 'sec_2c', sectionName: 'C', facultyCode: 'FAC005', facultyName: 'Mr. P. Suresh', roomId: 'room_lab1', roomNumber: 'CSE Lab 1', weeklyPeriods: 2 },

  // 3rd Year Labs
  { id: 'lab_3a_prac', labName: 'DBMS Lab', labType: 'practical', yearId: 'year_3', sectionId: 'sec_3a', sectionName: 'A', facultyCode: 'FAC004', facultyName: 'Dr. K. Anitha', roomId: 'room_lab3', roomNumber: 'CSE Lab 3', weeklyPeriods: 3 },
  { id: 'lab_3a_int', labName: 'Networks Lab', labType: 'integrated', yearId: 'year_3', sectionId: 'sec_3a', sectionName: 'A', facultyCode: 'FAC005', facultyName: 'Mr. P. Suresh', roomId: 'room_lab1', roomNumber: 'CSE Lab 1', weeklyPeriods: 2 },
  { id: 'lab_3b_prac', labName: 'DBMS Lab', labType: 'practical', yearId: 'year_3', sectionId: 'sec_3b', sectionName: 'B', facultyCode: 'FAC004', facultyName: 'Dr. K. Anitha', roomId: 'room_lab3', roomNumber: 'CSE Lab 3', weeklyPeriods: 3 },
  { id: 'lab_3b_int', labName: 'Networks Lab', labType: 'integrated', yearId: 'year_3', sectionId: 'sec_3b', sectionName: 'B', facultyCode: 'FAC007', facultyName: 'Mr. V. Karthik', roomId: 'room_lab1', roomNumber: 'CSE Lab 1', weeklyPeriods: 2 },
  { id: 'lab_3c_prac', labName: 'DBMS Lab', labType: 'practical', yearId: 'year_3', sectionId: 'sec_3c', sectionName: 'C', facultyCode: 'FAC006', facultyName: 'Dr. N. Meena', roomId: 'room_lab3', roomNumber: 'CSE Lab 3', weeklyPeriods: 3 },
  { id: 'lab_3c_int', labName: 'Networks Lab', labType: 'integrated', yearId: 'year_3', sectionId: 'sec_3c', sectionName: 'C', facultyCode: 'FAC007', facultyName: 'Mr. V. Karthik', roomId: 'room_lab1', roomNumber: 'CSE Lab 1', weeklyPeriods: 2 },

  // 4th Year Labs
  { id: 'lab_4a_prac', labName: 'Cloud & Security Lab', labType: 'practical', yearId: 'year_4', sectionId: 'sec_4a', sectionName: 'A', facultyCode: 'FAC008', facultyName: 'Ms. T. Divya', roomId: 'room_proj', roomNumber: 'Project Lab', weeklyPeriods: 3 },
  { id: 'lab_4a_int', labName: 'AI & ML Lab', labType: 'integrated', yearId: 'year_4', sectionId: 'sec_4a', sectionName: 'A', facultyCode: 'FAC009', facultyName: 'Dr. S. Rajesh', roomId: 'room_lab2', roomNumber: 'CSE Lab 2', weeklyPeriods: 2 },
  { id: 'lab_4b_prac', labName: 'Cloud & Security Lab', labType: 'practical', yearId: 'year_4', sectionId: 'sec_4b', sectionName: 'B', facultyCode: 'FAC008', facultyName: 'Ms. T. Divya', roomId: 'room_proj', roomNumber: 'Project Lab', weeklyPeriods: 3 },
  { id: 'lab_4b_int', labName: 'AI & ML Lab', labType: 'integrated', yearId: 'year_4', sectionId: 'sec_4b', sectionName: 'B', facultyCode: 'FAC010', facultyName: 'Ms. G. Kavitha', roomId: 'room_lab2', roomNumber: 'CSE Lab 2', weeklyPeriods: 2 },
  { id: 'lab_4c_prac', labName: 'Cloud & Security Lab', labType: 'practical', yearId: 'year_4', sectionId: 'sec_4c', sectionName: 'C', facultyCode: 'FAC009', facultyName: 'Dr. S. Rajesh', roomId: 'room_proj', roomNumber: 'Project Lab', weeklyPeriods: 3 },
  { id: 'lab_4c_int', labName: 'AI & ML Lab', labType: 'integrated', yearId: 'year_4', sectionId: 'sec_4c', sectionName: 'C', facultyCode: 'FAC010', facultyName: 'Ms. G. Kavitha', roomId: 'room_lab2', roomNumber: 'CSE Lab 2', weeklyPeriods: 2 },
];

export async function loadDemoData(): Promise<void> {
  // Clear existing operational data
  await db.faculty.clear();
  await db.academicYears.clear();
  await db.sections.clear();
  await db.rooms.clear();
  await db.subjects.clear();
  await db.subjectAssignments.clear();
  await db.labs.clear();
  await db.periodConfigs.clear();
  await db.fixedSlots.clear();
  await db.timetableEntries.clear();
  await db.generatedTimetableEntries.clear();
  await db.timetableVersions.clear();
  await db.settings.clear();

  // Load defaults
  await db.settings.add(DEFAULT_SETTINGS);
  await db.periodConfigs.bulkAdd(DEFAULT_PERIODS);
  await db.fixedSlots.bulkAdd(DEFAULT_FIXED_SLOTS);
  await db.rooms.bulkAdd(DEFAULT_ROOMS);

  // Load Academic Years & Sections
  for (const group of INITIAL_YEARS) {
    await db.academicYears.add(group.year);
    await db.sections.bulkAdd(group.sections);
  }

  // Load Faculty
  await db.faculty.bulkAdd(DEMO_FACULTY);

  // Load Subjects & Assignments
  await db.subjects.bulkAdd(DEMO_SUBJECTS);
  await db.subjectAssignments.bulkAdd(DEMO_SUBJECT_ASSIGNMENTS);

  // Load Labs
  await db.labs.bulkAdd(DEMO_LABS);
}
