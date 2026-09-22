import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TimetableEntry, PeriodConfig, DayOfWeek } from '../types';
import { ALL_DAYS } from '../types';

export interface PdfExportOptions {
  departmentName: string;
  title: string;
  subtitle?: string;
  roomInfo?: string;
  periods: PeriodConfig[];
  days?: DayOfWeek[];
  fileName: string;
  isFacultyTimetable?: boolean;
}

export function exportTimetableToPdf(
  entries: TimetableEntry[],
  options: PdfExportOptions
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const days = options.days || ALL_DAYS;
  const periods = options.periods.slice().sort((a, b) => a.periodNumber - b.periodNumber);

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(options.departmentName.toUpperCase(), 148, 14, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(79, 70, 229); // Indigo 600
  doc.text(options.title, 148, 20, { align: 'center' });

  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(options.subtitle, 148, 25, { align: 'center' });
  }

  // Define Table Columns:
  // Day | P1 | P2 | P3 | P4 | LUNCH | P5 | P6 | P7
  const headCols: string[] = ['DAY'];
  for (const p of periods) {
    if (p.periodNumber === 5) {
      headCols.push('LUNCH\n01:00-01:50');
    }
    headCols.push(`${p.name}\n${p.startTime}-${p.endTime}`);
  }

  const tableRows: (string | { content: string; styles?: Record<string, unknown>; colSpan?: number; rowSpan?: number })[][] = [];

  for (const day of days) {
    const row: (string | { content: string; styles?: Record<string, unknown>; colSpan?: number; rowSpan?: number })[] = [day];
    const isSaturday = day === 'Saturday';

    for (const p of periods) {
      if (p.periodNumber === 5) {
        if (isSaturday) {
          row.push({ content: '—', styles: { fillColor: [248, 250, 252], textColor: [148, 163, 184] } });
        } else {
          row.push({ content: 'LUNCH BREAK', styles: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: 'bold' } });
        }
      }

      if (isSaturday && p.periodNumber > 4) {
        row.push({ content: '—', styles: { fillColor: [248, 250, 252], textColor: [148, 163, 184] } });
        continue;
      }

      const match = entries.find((e) => e.day === day && e.periodNumber === p.periodNumber);
      if (!match) {
        row.push({ content: '—', styles: { textColor: [148, 163, 184] } });
        continue;
      }

      if (match.entryType === 'unit_test') {
        row.push({
          content: 'UNIT TEST\n(Protected)',
          styles: { fillColor: [254, 226, 226], textColor: [185, 28, 28], fontStyle: 'bold' },
        });
      } else if (match.entryType === 'practical_lab' || match.entryType === 'integrated_lab') {
        const labLabel = match.entryType === 'practical_lab' ? 'Prac. Lab' : 'Int. Lab';
        const display = options.isFacultyTimetable
          ? `${match.subjectName}\n[${labLabel}]\n${match.sectionName ? `Sec ${match.sectionName}` : ''} | ${match.roomNumber}`
          : `${match.subjectName}\n[${labLabel}]\nFac: ${match.facultyCode} | ${match.roomNumber}`;
        row.push({
          content: display,
          styles: { fillColor: [224, 231, 255], textColor: [67, 56, 202], fontStyle: 'bold' },
        });
      } else {
        const display = options.isFacultyTimetable
          ? `${match.subjectCode}\n${match.subjectName}\nSec ${match.sectionName} | Rm: ${match.roomNumber}`
          : `${match.subjectCode} - ${match.subjectName}\nFac: ${match.facultyCode}\nRm: ${match.roomNumber}`;
        row.push({
          content: display,
          styles: { textColor: [30, 41, 59] },
        });
      }
    }
    tableRows.push(row);
  }

  autoTable(doc, {
    startY: options.subtitle ? 28 : 24,
    head: [headCols],
    body: tableRows as any,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      halign: 'center',
      valign: 'middle',
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [67, 56, 202], // Indigo 700
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold', fillColor: [241, 245, 249] },
    },
    didDrawPage: (data) => {
      // Footer
      const str = `Generated on ${new Date().toLocaleDateString()} | Smart CSE Timetable Management System`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 14, doc.internal.pageSize.height - 8);
    },
  });

  doc.save(options.fileName);
}
