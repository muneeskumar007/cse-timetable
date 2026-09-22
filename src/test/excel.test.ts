import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseAndValidateFacultyExcel,
  parseAndValidateSubjectExcel,
} from '../services/excelService';

describe('Excel Parsing and Validation Service', () => {
  it('parses valid faculty excel workbook cleanly', () => {
    const wsData = [
      ['Faculty Code', 'Faculty Name', 'Weekly Workload', 'Designation'],
      ['FAC001', 'Dr. Kumar', 18, 'Professor'],
      ['FAC002', 'Ms. Priya', 20, 'Associate Professor'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = parseAndValidateFacultyExcel(buffer);
    expect(result.errors.length).toBe(0);
    expect(result.validRows.length).toBe(2);
    expect(result.validRows[0].facultyCode).toBe('FAC001');
    expect(result.validRows[0].weeklyWorkload).toBe(18);
  });

  it('rejects faculty excel if required headers are missing', () => {
    const wsData = [
      ['Random Column', 'Another Header'],
      ['FAC001', 'Dr. Kumar'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = parseAndValidateFacultyExcel(buffer);
    expect(result.validRows.length).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].error).toContain('Missing required columns');
  });

  it('detects unknown faculty codes when parsing year subject excel', () => {
    const wsData = [
      ['Subject Code', 'Subject Name', 'Faculty Code', 'Faculty Name', 'Section', 'Weekly Periods'],
      ['CS301', 'Data Structures', 'FAC999', 'Unknown Ghost', 'A', 4],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Subjects');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const knownFaculty = new Map<string, string>([['FAC001', 'Dr. Kumar']]);
    const result = parseAndValidateSubjectExcel(buffer, 'year_2', ['A', 'B', 'C'], knownFaculty);

    expect(result.validAssignments.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].error).toContain('FAC999');
    expect(result.errors[0].error).toContain('does not exist in Global Faculty Master');
  });
});
