import type { Faculty, SubjectAssignment, Lab, FacultyWorkloadReport } from '../types';

export function calculateFacultyWorkloads(
  faculties: Faculty[],
  assignments: SubjectAssignment[],
  labs: Lab[]
): FacultyWorkloadReport[] {
  return faculties.map((faculty) => {
    // Sum theory periods assigned to this faculty
    const assignedTheoryPeriods = assignments
      .filter((a) => a.facultyCode.trim().toUpperCase() === faculty.facultyCode.trim().toUpperCase())
      .reduce((sum, a) => sum + (Number(a.weeklyPeriods) || 0), 0);

    // Sum lab periods assigned to this faculty (Practical = 3, Integrated = 2)
    const assignedLabPeriods = labs
      .filter((l) => l.facultyCode.trim().toUpperCase() === faculty.facultyCode.trim().toUpperCase())
      .reduce((sum, l) => sum + (Number(l.weeklyPeriods) || (l.labType === 'practical' ? 3 : 2)), 0);

    const totalAssigned = assignedTheoryPeriods + assignedLabPeriods;
    const requiredWorkload = Number(faculty.weeklyWorkload) || 0;
    const difference = totalAssigned - requiredWorkload;

    let status: 'balanced' | 'overloaded' | 'underloaded' = 'balanced';
    if (difference > 0) {
      status = 'overloaded';
    } else if (difference < 0) {
      status = 'underloaded';
    }

    return {
      facultyCode: faculty.facultyCode,
      facultyName: faculty.facultyName,
      requiredWorkload,
      assignedTheoryPeriods,
      assignedLabPeriods,
      totalAssigned,
      difference,
      status,
    };
  });
}
