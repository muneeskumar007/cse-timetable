import { describe, it, expect } from 'vitest';
import { calculateFacultyWorkloads } from '../services/workloadService';
import type { Faculty, SubjectAssignment, Lab } from '../types';

describe('Faculty Workload Service', () => {
  const mockFaculties: Faculty[] = [
    {
      id: 'f1',
      facultyCode: 'FAC001',
      facultyName: 'Dr. Kumar',
      weeklyWorkload: 18,
      isActive: true,
    },
    {
      id: 'f2',
      facultyCode: 'FAC002',
      facultyName: 'Ms. Priya',
      weeklyWorkload: 20,
      isActive: true,
    },
  ];

  const mockAssignments: SubjectAssignment[] = [
    // Dr. Kumar: 4 + 4 + 4 = 12 theory periods
    { id: 'a1', yearId: 'y2', sectionId: 's2a', sectionName: 'A', subjectCode: 'CS301', subjectName: 'DS', facultyCode: 'FAC001', facultyName: 'Dr. Kumar', weeklyPeriods: 4 },
    { id: 'a2', yearId: 'y2', sectionId: 's2b', sectionName: 'B', subjectCode: 'CS301', subjectName: 'DS', facultyCode: 'FAC001', facultyName: 'Dr. Kumar', weeklyPeriods: 4 },
    { id: 'a3', yearId: 'y3', sectionId: 's3a', sectionName: 'A', subjectCode: 'CS501', subjectName: 'DBMS', facultyCode: 'FAC001', facultyName: 'Dr. Kumar', weeklyPeriods: 4 },
    // Ms. Priya: 4 + 4 = 8 theory periods
    { id: 'a4', yearId: 'y2', sectionId: 's2c', sectionName: 'C', subjectCode: 'CS302', subjectName: 'DP', facultyCode: 'FAC002', facultyName: 'Ms. Priya', weeklyPeriods: 4 },
    { id: 'a5', yearId: 'y3', sectionId: 's3b', sectionName: 'B', subjectCode: 'CS502', subjectName: 'CN', facultyCode: 'FAC002', facultyName: 'Ms. Priya', weeklyPeriods: 4 },
  ];

  const mockLabs: Lab[] = [
    // Dr. Kumar has one practical lab (3 periods) and one integrated lab (2 periods) = 5 lab periods
    // Total = 12 theory + 5 lab = 17 periods (required: 18 -> underloaded by -1)
    { id: 'l1', labName: 'DS Lab', labType: 'practical', yearId: 'y2', sectionId: 's2a', sectionName: 'A', facultyCode: 'FAC001', facultyName: 'Dr. Kumar', roomId: 'r1', roomNumber: 'Lab 1', weeklyPeriods: 3 },
    { id: 'l2', labName: 'Java Lab', labType: 'integrated', yearId: 'y2', sectionId: 's2b', sectionName: 'B', facultyCode: 'FAC001', facultyName: 'Dr. Kumar', roomId: 'r1', roomNumber: 'Lab 1', weeklyPeriods: 2 },
    // Ms. Priya has four practical labs (4 * 3 = 12 lab periods)
    // Total = 8 theory + 12 lab = 20 periods (required: 20 -> balanced 0)
    { id: 'l3', labName: 'DP Lab 1', labType: 'practical', yearId: 'y2', sectionId: 's2a', sectionName: 'A', facultyCode: 'FAC002', facultyName: 'Ms. Priya', roomId: 'r2', roomNumber: 'Lab 2', weeklyPeriods: 3 },
    { id: 'l4', labName: 'DP Lab 2', labType: 'practical', yearId: 'y2', sectionId: 's2b', sectionName: 'B', facultyCode: 'FAC002', facultyName: 'Ms. Priya', roomId: 'r2', roomNumber: 'Lab 2', weeklyPeriods: 3 },
    { id: 'l5', labName: 'DP Lab 3', labType: 'practical', yearId: 'y2', sectionId: 's2c', sectionName: 'C', facultyCode: 'FAC002', facultyName: 'Ms. Priya', roomId: 'r2', roomNumber: 'Lab 2', weeklyPeriods: 3 },
    { id: 'l6', labName: 'CN Lab', labType: 'practical', yearId: 'y3', sectionId: 's3a', sectionName: 'A', facultyCode: 'FAC002', facultyName: 'Ms. Priya', roomId: 'r2', roomNumber: 'Lab 2', weeklyPeriods: 3 },
  ];

  it('calculates total assigned periods correctly including practical and integrated labs', () => {
    const reports = calculateFacultyWorkloads(mockFaculties, mockAssignments, mockLabs);

    const kumar = reports.find((r) => r.facultyCode === 'FAC001');
    expect(kumar).toBeDefined();
    expect(kumar?.assignedTheoryPeriods).toBe(12);
    expect(kumar?.assignedLabPeriods).toBe(5);
    expect(kumar?.totalAssigned).toBe(17);
    expect(kumar?.difference).toBe(-1);
    expect(kumar?.status).toBe('underloaded');

    const priya = reports.find((r) => r.facultyCode === 'FAC002');
    expect(priya).toBeDefined();
    expect(priya?.assignedTheoryPeriods).toBe(8);
    expect(priya?.assignedLabPeriods).toBe(12);
    expect(priya?.totalAssigned).toBe(20);
    expect(priya?.difference).toBe(0);
    expect(priya?.status).toBe('balanced');
  });
});
