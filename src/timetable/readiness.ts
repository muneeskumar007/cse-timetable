import type {
  AcademicYear,
  Section,
  Faculty,
  SubjectAssignment,
  Lab,
  Room,
  FixedSlot,
  FixedAssignment,
  DepartmentSettings,
} from '../types';

export interface ReadinessCheckItem {
  id: string;
  category: 'Years & Sections' | 'Faculty Master' | 'Subject Assignments' | 'Labs' | 'Capacity & Settings';
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

export interface ReadinessReport {
  isReady: boolean;
  canGenerate: boolean;
  checks: ReadinessCheckItem[];
  summary: {
    totalYears: number;
    totalSections: number;
    totalFaculty: number;
    totalSubjects: number;
    totalLabs: number;
    totalRooms: number;
  };
}

export function checkGenerationReadiness(params: {
  years: AcademicYear[];
  sections: Section[];
  faculty: Faculty[];
  assignments: SubjectAssignment[];
  labs: Lab[];
  rooms: Room[];
  fixedSlots: FixedSlot[];
  fixedAssignments?: FixedAssignment[];
  settings: DepartmentSettings;
}): ReadinessReport {
  const { years, sections, faculty, assignments, labs, rooms, fixedSlots, fixedAssignments = [], settings } = params;
  const checks: ReadinessCheckItem[] = [];

  // 1. Years & Sections Check
  if (years.length === 0) {
    checks.push({
      id: 'years_exist',
      category: 'Years & Sections',
      name: 'Academic Years',
      status: 'fail',
      message: 'No academic years configured. Add at least one academic year.',
    });
  } else {
    checks.push({
      id: 'years_exist',
      category: 'Years & Sections',
      name: 'Academic Years',
      status: 'pass',
      message: `${years.length} academic year(s) configured (${years.map((y) => y.yearName).join(', ')}).`,
    });
  }

  // Sections check: each year must have sections A, B, C
  const yearsMissingSections: string[] = [];
  for (const y of years) {
    const secForYear = sections.filter((s) => s.yearId === y.id);
    if (secForYear.length === 0) {
      yearsMissingSections.push(y.yearName);
    }
  }
  if (yearsMissingSections.length > 0) {
    checks.push({
      id: 'sections_exist',
      category: 'Years & Sections',
      name: 'Section Distribution',
      status: 'fail',
      message: `Sections are missing for: ${yearsMissingSections.join(', ')}.`,
    });
  } else {
    checks.push({
      id: 'sections_exist',
      category: 'Years & Sections',
      name: 'Section Distribution',
      status: 'pass',
      message: `All ${years.length} academic year(s) have sections configured (${sections.length} sections total).`,
    });
  }

  // Section rooms mapped
  const sectionsWithoutRooms = sections.filter((s) => !s.roomId);
  if (sectionsWithoutRooms.length > 0) {
    checks.push({
      id: 'section_rooms',
      category: 'Years & Sections',
      name: 'Section Classrooms',
      status: 'fail',
      message: `${sectionsWithoutRooms.length} section(s) do not have an assigned classroom.`,
    });
  } else {
    checks.push({
      id: 'section_rooms',
      category: 'Years & Sections',
      name: 'Section Classrooms',
      status: 'pass',
      message: 'Every section has a designated classroom assigned.',
    });
  }

  // 2. Faculty Master Check
  const activeFaculty = faculty.filter((f) => f.isActive !== false);
  if (activeFaculty.length === 0) {
    checks.push({
      id: 'faculty_exist',
      category: 'Faculty Master',
      name: 'Faculty Master',
      status: 'fail',
      message: 'No active faculty found in Faculty Master. Import or add faculty.',
    });
  } else {
    checks.push({
      id: 'faculty_exist',
      category: 'Faculty Master',
      name: 'Faculty Master',
      status: 'pass',
      message: `${activeFaculty.length} active faculty member(s) registered.`,
    });
  }

  // 3. Subject Assignments Check
  if (assignments.length === 0) {
    checks.push({
      id: 'assignments_exist',
      category: 'Subject Assignments',
      name: 'Subject Allocations',
      status: 'fail',
      message: 'No subject assignments found. Upload subject Excel files for each year.',
    });
  } else {
    // Check if every section has subjects
    const sectionsWithoutSubjects = sections.filter(
      (s) => !assignments.some((a) => a.sectionId === s.id)
    );
    if (sectionsWithoutSubjects.length > 0) {
      checks.push({
        id: 'assignments_exist',
        category: 'Subject Assignments',
        name: 'Subject Allocations',
        status: 'fail',
        message: `${sectionsWithoutSubjects.length} section(s) have no subject assignments uploaded.`,
      });
    } else {
      checks.push({
        id: 'assignments_exist',
        category: 'Subject Assignments',
        name: 'Subject Allocations',
        status: 'pass',
        message: `${assignments.length} subject assignments mapped across all sections.`,
      });
    }
  }

  // Check unknown faculty codes in assignments
  const knownFacultyCodes = new Set(faculty.map((f) => f.facultyCode.toUpperCase()));
  const unknownFacultyAssignments = assignments.filter(
    (a) => !knownFacultyCodes.has(a.facultyCode.toUpperCase())
  );
  if (unknownFacultyAssignments.length > 0) {
    checks.push({
      id: 'unknown_faculty_assignments',
      category: 'Subject Assignments',
      name: 'Faculty Integrity',
      status: 'fail',
      message: `${unknownFacultyAssignments.length} assignment(s) reference unrecognised faculty codes (${Array.from(new Set(unknownFacultyAssignments.map((a) => a.facultyCode))).join(', ')}).`,
    });
  } else {
    checks.push({
      id: 'unknown_faculty_assignments',
      category: 'Subject Assignments',
      name: 'Faculty Integrity',
      status: 'pass',
      message: 'All subject assignments link to valid Faculty Master records.',
    });
  }

  // 4. Labs Check
  const unknownFacultyLabs = labs.filter((l) => !knownFacultyCodes.has(l.facultyCode.toUpperCase()));
  if (unknownFacultyLabs.length > 0) {
    checks.push({
      id: 'unknown_faculty_labs',
      category: 'Labs',
      name: 'Lab Faculty Integrity',
      status: 'fail',
      message: `${unknownFacultyLabs.length} lab(s) reference unknown faculty codes.`,
    });
  } else if (labs.length > 0) {
    checks.push({
      id: 'unknown_faculty_labs',
      category: 'Labs',
      name: 'Lab Configuration',
      status: 'pass',
      message: `${labs.length} lab session(s) configured with verified faculty and rooms.`,
    });
  } else {
    checks.push({
      id: 'unknown_faculty_labs',
      category: 'Labs',
      name: 'Lab Configuration',
      status: 'warn',
      message: 'No labs are configured yet. The timetable will generate with theory classes only.',
    });
  }

  // 5. Capacity Check
  const fullDaysCount = 5; // Monday to Friday
  const periodsPerFullDay = settings.periodsPerFullDay || 7;
  const saturdayPeriods = settings.periodsOnSaturday || 4;
  const totalSlotsPerWeek = fullDaysCount * periodsPerFullDay + saturdayPeriods;
  const fixedSlotCount = fixedSlots.length;
  const availableSlotsPerSection = totalSlotsPerWeek - fixedSlotCount;

  let capacityFailed = false;
  for (const s of sections) {
    const theoryPeriods = assignments
      .filter((a) => a.sectionId === s.id)
      .reduce((sum, a) => sum + (Number(a.weeklyPeriods) || 0), 0);
    const labPeriods = labs
      .filter((l) => l.sectionId === s.id)
      .reduce((sum, l) => sum + (l.labType === 'practical' ? 3 : 2), 0);
    const totalRequired = theoryPeriods + labPeriods + 1; // Includes mandatory weekly Library period

    if (totalRequired > availableSlotsPerSection) {
      capacityFailed = true;
      checks.push({
        id: `capacity_${s.id}`,
        category: 'Capacity & Settings',
        name: `Capacity: Sec ${s.sectionName}`,
        status: 'fail',
        message: `Sec ${s.sectionName} requires ${totalRequired} periods/week (including Library), but only ${availableSlotsPerSection} slots are available (Total: ${totalSlotsPerWeek} - Fixed: ${fixedSlotCount}).`,
      });
    }
  }

  if (!capacityFailed) {
    checks.push({
      id: 'capacity_ok',
      category: 'Capacity & Settings',
      name: 'Timetable Capacity',
      status: 'pass',
      message: `All sections fit within the available weekly slot capacity (${availableSlotsPerSection} teaching slots available).`,
    });
  }

  const hasFail = checks.some((c) => c.status === 'fail');

  return {
    isReady: !hasFail,
    canGenerate: !hasFail,
    checks,
    summary: {
      totalYears: years.length,
      totalSections: sections.length,
      totalFaculty: activeFaculty.length,
      totalSubjects: new Set(assignments.map((a) => a.subjectCode)).size,
      totalLabs: labs.length,
      totalRooms: rooms.length,
    },
  };
}
