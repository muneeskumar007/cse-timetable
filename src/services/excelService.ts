import * as XLSX from 'xlsx';
import type {
  Faculty,
  SubjectAssignment,
  TimetableEntry,
  PeriodConfig,
  DayOfWeek,
} from '../types';
import { ALL_DAYS } from '../types';

export interface RowError {
  row: number;
  error: string;
}

export interface FacultyImportResult {
  validRows: {
    facultyCode: string;
    facultyName: string;
    weeklyWorkload: number;
    designation?: string;
  }[];
  errors: RowError[];
  totalRows: number;
}

export interface SubjectImportResult {
  validAssignments: {
    yearId: string;
    sectionName: string;
    subjectCode: string;
    subjectName: string;
    facultyCode: string;
    facultyName: string;
    weeklyPeriods: number;
  }[];
  uniqueSubjects: {
    subjectCode: string;
    subjectName: string;
  }[];
  errors: RowError[];
  totalRows: number;
}

/**
 * Downloads a sample Excel template for Global Faculty Master
 */
export function downloadFacultyTemplate(): void {
  const wsData = [
    ['Faculty Code', 'Faculty Name', 'Weekly Workload', 'Designation'],
    ['FAC001', 'Dr. R. Kumar', 18, 'Professor & HOD'],
    ['FAC002', 'Ms. S. Priya', 20, 'Associate Professor'],
    ['FAC003', 'Mr. M. Arun', 22, 'Assistant Professor'],
    ['FAC004', 'Dr. K. Anitha', 18, 'Associate Professor'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Set column widths
  ws['!cols'] = [{ wch: 16 }, { wch: 25 }, { wch: 18 }, { wch: 25 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Faculty Master');
  XLSX.writeFile(wb, 'Faculty_Master_Template.xlsx');
}

/**
 * Downloads a sample Excel template for Year Subject Assignments
 */
export function downloadSubjectTemplate(yearName: string = '2nd Year'): void {
  const wsData = [
    ['Subject Code', 'Subject Name', 'Faculty Code', 'Faculty Name', 'Section', 'Weekly Periods'],
    ['CS301', 'Data Structures', 'FAC001', 'Dr. R. Kumar', 'A', 4],
    ['CS301', 'Data Structures', 'FAC002', 'Ms. S. Priya', 'B', 4],
    ['CS301', 'Data Structures', 'FAC002', 'Ms. S. Priya', 'C', 4],
    ['CS302', 'Digital Principles', 'FAC003', 'Mr. M. Arun', 'A', 4],
    ['CS302', 'Digital Principles', 'FAC003', 'Mr. M. Arun', 'B', 4],
    ['CS302', 'Digital Principles', 'FAC001', 'Dr. R. Kumar', 'C', 4],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 16 }, { wch: 22 }, { wch: 10 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  const safeSheetName = `${yearName.replace(/[^a-zA-Z0-9]/g, '_')}_Subjects`;
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  XLSX.writeFile(wb, `${yearName.replace(/\s+/g, '_')}_Subjects_Template.xlsx`);
}

/**
 * Parses and validates a Faculty Master Excel file
 */
export function parseAndValidateFacultyExcel(data: ArrayBuffer): FacultyImportResult {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { validRows: [], errors: [{ row: 1, error: 'The uploaded workbook contains no sheets.' }], totalRows: 0 };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    return { validRows: [], errors: [{ row: 1, error: 'Excel file is empty or missing data rows.' }], totalRows: 0 };
  }

  // Header validation
  const headerRow = rows[0].map((h) => String(h || '').trim().toLowerCase());
  const colCode = headerRow.findIndex((h) => h.includes('code'));
  const colName = headerRow.findIndex((h) => h.includes('name'));
  const colWorkload = headerRow.findIndex((h) => h.includes('workload') || h.includes('period') || h.includes('hours'));
  const colDesig = headerRow.findIndex((h) => h.includes('desig'));

  if (colCode === -1 || colName === -1 || colWorkload === -1) {
    return {
      validRows: [],
      errors: [
        {
          row: 1,
          error: `Missing required columns. Required: "Faculty Code", "Faculty Name", "Weekly Workload". Found: ${rows[0].join(', ')}`,
        },
      ],
      totalRows: rows.length - 1,
    };
  }

  const validRows: FacultyImportResult['validRows'] = [];
  const errors: RowError[] = [];
  const seenCodes = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const rowNum = i + 1;
    const row = rows[i];

    // Check if entire row is empty
    const isBlank = row.every((val) => String(val || '').trim() === '');
    if (isBlank) continue;

    const facultyCode = String(row[colCode] || '').trim().toUpperCase();
    const facultyName = String(row[colName] || '').trim();
    const rawWorkload = row[colWorkload];
    const weeklyWorkload = Number(rawWorkload);
    const designation = colDesig !== -1 ? String(row[colDesig] || '').trim() : undefined;

    if (!facultyCode) {
      errors.push({ row: rowNum, error: 'Faculty Code is empty.' });
      continue;
    }

    if (seenCodes.has(facultyCode)) {
      errors.push({ row: rowNum, error: `Duplicate Faculty Code "${facultyCode}" within the Excel file.` });
      continue;
    }

    if (!facultyName) {
      errors.push({ row: rowNum, error: `Faculty Name is empty for code "${facultyCode}".` });
      continue;
    }

    if (isNaN(weeklyWorkload) || weeklyWorkload <= 0) {
      errors.push({
        row: rowNum,
        error: `Invalid Weekly Workload "${rawWorkload}" for faculty "${facultyCode}". Must be a positive number.`,
      });
      continue;
    }

    seenCodes.add(facultyCode);
    validRows.push({
      facultyCode,
      facultyName,
      weeklyWorkload,
      designation: designation || undefined,
    });
  }

  return {
    validRows,
    errors,
    totalRows: validRows.length + errors.length,
  };
}

/**
 * Parses and validates a Year Subject Assignment Excel file
 */
export function parseAndValidateSubjectExcel(
  data: ArrayBuffer,
  yearId: string,
  validSections: string[],
  knownFacultyMap: Map<string, string> // Map<facultyCodeUppercase, facultyName>
): SubjectImportResult {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { validAssignments: [], uniqueSubjects: [], errors: [{ row: 1, error: 'Workbook contains no sheets.' }], totalRows: 0 };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    return { validAssignments: [], uniqueSubjects: [], errors: [{ row: 1, error: 'Excel file contains no data rows.' }], totalRows: 0 };
  }

  const headerRow = rows[0].map((h) => String(h || '').trim().toLowerCase());
  const colSubCode = headerRow.findIndex((h) => h.includes('subject') && h.includes('code'));
  const colSubName = headerRow.findIndex((h) => h.includes('subject') && h.includes('name'));
  const colFacCode = headerRow.findIndex((h) => h.includes('faculty') && h.includes('code'));
  const colFacName = headerRow.findIndex((h) => h.includes('faculty') && h.includes('name'));
  const colSection = headerRow.findIndex((h) => h.includes('section'));
  const colPeriods = headerRow.findIndex((h) => h.includes('period') || h.includes('hour'));

  if (colSubCode === -1 || colSubName === -1 || colFacCode === -1 || colSection === -1 || colPeriods === -1) {
    return {
      validAssignments: [],
      uniqueSubjects: [],
      errors: [
        {
          row: 1,
          error: `Missing required columns. Required: "Subject Code", "Subject Name", "Faculty Code", "Faculty Name", "Section", "Weekly Periods". Found: ${rows[0].join(', ')}`,
        },
      ],
      totalRows: rows.length - 1,
    };
  }

  const validAssignments: SubjectImportResult['validAssignments'] = [];
  const errors: RowError[] = [];
  const subjectMap = new Map<string, string>(); // code -> name
  const seenAssignmentKeys = new Set<string>(); // subCode_section

  const validSectionSet = new Set(validSections.map((s) => s.toUpperCase()));

  for (let i = 1; i < rows.length; i++) {
    const rowNum = i + 1;
    const row = rows[i];

    const isBlank = row.every((val) => String(val || '').trim() === '');
    if (isBlank) continue;

    const subjectCode = String(row[colSubCode] || '').trim().toUpperCase();
    const subjectName = String(row[colSubName] || '').trim();
    const facultyCode = String(row[colFacCode] || '').trim().toUpperCase();
    const rawFacName = colFacName !== -1 ? String(row[colFacName] || '').trim() : '';
    const sectionName = String(row[colSection] || '').trim().toUpperCase();
    const rawPeriods = row[colPeriods];
    const weeklyPeriods = Number(rawPeriods);

    if (!subjectCode) {
      errors.push({ row: rowNum, error: 'Subject Code is missing.' });
      continue;
    }

    if (!subjectName) {
      errors.push({ row: rowNum, error: `Subject Name is missing for code "${subjectCode}".` });
      continue;
    }

    if (!sectionName) {
      errors.push({ row: rowNum, error: `Section is missing for subject "${subjectCode}".` });
      continue;
    }

    if (!validSectionSet.has(sectionName)) {
      errors.push({
        row: rowNum,
        error: `Section "${sectionName}" is invalid. Expected one of: ${validSections.join(', ')}`,
      });
      continue;
    }

    if (!facultyCode) {
      errors.push({ row: rowNum, error: `Faculty Code is missing for subject "${subjectCode}" Section ${sectionName}.` });
      continue;
    }

    // Check if faculty exists in Global Faculty Master
    if (!knownFacultyMap.has(facultyCode)) {
      errors.push({
        row: rowNum,
        error: `Faculty Code "${facultyCode}" does not exist in Global Faculty Master. Add the faculty member first.`,
      });
      continue;
    }

    const resolvedFacultyName = rawFacName || knownFacultyMap.get(facultyCode) || facultyCode;

    if (isNaN(weeklyPeriods) || weeklyPeriods <= 0) {
      errors.push({
        row: rowNum,
        error: `Weekly Periods "${rawPeriods}" for "${subjectCode}" Section ${sectionName} must be a positive integer.`,
      });
      continue;
    }

    const assignmentKey = `${subjectCode}_${sectionName}`;
    if (seenAssignmentKeys.has(assignmentKey)) {
      errors.push({
        row: rowNum,
        error: `Duplicate assignment for Subject "${subjectCode}" Section ${sectionName}. Each subject can only be assigned once per section.`,
      });
      continue;
    }

    seenAssignmentKeys.add(assignmentKey);
    subjectMap.set(subjectCode, subjectName);

    validAssignments.push({
      yearId,
      sectionName,
      subjectCode,
      subjectName,
      facultyCode,
      facultyName: resolvedFacultyName,
      weeklyPeriods,
    });
  }

  const uniqueSubjects = Array.from(subjectMap.entries()).map(([code, name]) => ({
    subjectCode: code,
    subjectName: name,
  }));

  return {
    validAssignments,
    uniqueSubjects,
    errors,
    totalRows: validAssignments.length + errors.length,
  };
}

/**
 * Exports a timetable grid into an Excel workbook
 */
export function exportTimetableToExcel(
  entries: TimetableEntry[],
  options: {
    departmentName: string;
    title: string;
    periods: PeriodConfig[];
    days?: DayOfWeek[];
    fileName: string;
  }
): void {
  const days = options.days || ALL_DAYS;
  const periods = options.periods.slice().sort((a, b) => a.periodNumber - b.periodNumber);

  // Build 2D array
  const headerRow = ['Day', ...periods.map((p) => `${p.name}\n(${p.startTime} - ${p.endTime})`)];
  const rows: (string | number)[][] = [];

  rows.push([options.departmentName.toUpperCase()]);
  rows.push([options.title]);
  rows.push([]);
  rows.push(headerRow);

  for (const day of days) {
    const row: (string | number)[] = [day];
    const maxPeriods = day === 'Saturday' ? 4 : periods.length;

    for (const p of periods) {
      if (p.periodNumber > maxPeriods) {
        row.push('---');
        continue;
      }

      const matching = entries.find((e) => e.day === day && e.periodNumber === p.periodNumber);
      if (matching) {
        if (matching.entryType === 'unit_test') {
          row.push('UNIT TEST');
        } else if (matching.entryType === 'practical_lab' || matching.entryType === 'integrated_lab') {
          row.push(`${matching.subjectName} [LAB]\n(${matching.facultyCode})\nRoom: ${matching.roomNumber}`);
        } else {
          row.push(`${matching.subjectCode} - ${matching.subjectName}\n(${matching.facultyCode})\nRoom: ${matching.roomNumber}`);
        }
      } else {
        row.push('FREE');
      }
    }
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, ...periods.map(() => ({ wch: 22 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
  XLSX.writeFile(wb, options.fileName);
}
