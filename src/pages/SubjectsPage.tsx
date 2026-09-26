import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { cloudService } from '../services/cloudService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { useUiStore } from '../stores/uiStore';
import {
  downloadSubjectTemplate,
  parseAndValidateSubjectExcel,
  type SubjectImportResult,
} from '../services/excelService';
import {
  BookOpen,
  Upload,
  Download,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { SubjectAssignment, Subject } from '../types';

export const SubjectsPage: React.FC = () => {
  const { selectedYearId, setSelectedYearId, addToast } = useUiStore();
  const { years, sections: allSections, assignments: allAssignments, faculty } = useData();

  const sortedYears = [...years].sort((a, b) => a.orderIndex - b.orderIndex);
  const activeYearId = selectedYearId || sortedYears[0]?.id;
  const currentYear = sortedYears.find((y) => y.id === activeYearId) || sortedYears[0];

  const sections = allSections.filter((s) => s.yearId === activeYearId);
  const assignments = allAssignments.filter((a) => a.yearId === activeYearId);
  const facultyMap = new Map(faculty.map((f) => [f.facultyCode.toUpperCase(), f.facultyName]));

  // Add / Edit Assignment State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<SubjectAssignment | null>(null);
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [targetSectionName, setTargetSectionName] = useState('A');
  const [targetFacultyCode, setTargetFacultyCode] = useState('');
  const [weeklyPeriods, setWeeklyPeriods] = useState(4);

  // Delete State
  const [deletingAssignment, setDeletingAssignment] = useState<SubjectAssignment | null>(null);

  // Excel Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<SubjectImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const openAddModal = () => {
    setEditingAssignment(null);
    setSubjectCode('');
    setSubjectName('');
    setTargetSectionName(sections[0]?.sectionName || 'A');
    setTargetFacultyCode(faculty[0]?.facultyCode || '');
    setWeeklyPeriods(4);
    setIsModalOpen(true);
  };

  const openEditModal = (a: SubjectAssignment) => {
    setEditingAssignment(a);
    setSubjectCode(a.subjectCode);
    setSubjectName(a.subjectName);
    setTargetSectionName(a.sectionName);
    setTargetFacultyCode(a.facultyCode);
    setWeeklyPeriods(a.weeklyPeriods);
    setIsModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentYear) return;

    const cleanSubCode = subjectCode.trim().toUpperCase();
    const cleanSubName = subjectName.trim();
    const cleanFacCode = targetFacultyCode.trim().toUpperCase();
    const sec = sections.find((s) => s.sectionName.toUpperCase() === targetSectionName.toUpperCase());

    if (!sec) {
      addToast({ type: 'error', title: 'Invalid Section', message: 'Selected section not found.' });
      return;
    }

    const facName = facultyMap.get(cleanFacCode) || cleanFacCode;

    // Check duplicate assignment for same subject + section
    if (!editingAssignment) {
      const exists = assignments.some(
        (a) => a.subjectCode.toUpperCase() === cleanSubCode && a.sectionId === sec.id
      );
      if (exists) {
        addToast({
          type: 'error',
          title: 'Duplicate Allocation',
          message: `${cleanSubCode} is already assigned to Section ${sec.sectionName}.`,
        });
        return;
      }

      await cloudService.assignments.add({
        id: `sa_${Date.now()}`,
        yearId: currentYear.id,
        sectionId: sec.id,
        sectionName: sec.sectionName,
        subjectCode: cleanSubCode,
        subjectName: cleanSubName,
        facultyCode: cleanFacCode,
        facultyName: facName,
        weeklyPeriods: Number(weeklyPeriods) || 4,
      });

      addToast({
        type: 'success',
        title: 'Subject Assigned',
        message: `${cleanSubCode} mapped to Sec ${sec.sectionName} (${facName}).`,
      });
    } else {
      await cloudService.assignments.update(editingAssignment.id, {
        sectionId: sec.id,
        sectionName: sec.sectionName,
        subjectCode: cleanSubCode,
        subjectName: cleanSubName,
        facultyCode: cleanFacCode,
        facultyName: facName,
        weeklyPeriods: Number(weeklyPeriods) || 4,
      });

      addToast({
        type: 'success',
        title: 'Assignment Updated',
        message: `${cleanSubCode} updated for Sec ${sec.sectionName}.`,
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteAssignment = async () => {
    if (!deletingAssignment) return;
    await cloudService.assignments.delete(deletingAssignment.id);
    addToast({
      type: 'success',
      title: 'Assignment Deleted',
      message: `${deletingAssignment.subjectCode} removed from Section ${deletingAssignment.sectionName}.`,
    });
    setDeletingAssignment(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentYear) return;

    const validSecNames = sections.map((s) => s.sectionName);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const result = parseAndValidateSubjectExcel(
          buffer,
          currentYear.id,
          validSecNames,
          facultyMap
        );
        setImportResult(result);
        setIsImportModalOpen(true);
      } catch (err: any) {
        addToast({ type: 'error', title: 'File Error', message: err?.message || 'Unable to parse Excel file.' });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importResult || !currentYear || importResult.validAssignments.length === 0) return;
    setIsImporting(true);

    try {
      // REPLACEMENT SEMANTICS: replace subject assignments for this year
      const newSubjects: Subject[] = importResult.uniqueSubjects.map((s) => ({
        id: `sub_${currentYear.id}_${s.subjectCode}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        yearId: currentYear.id,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
      }));

      // Map sectionName to actual sectionId
      const newAssignments: SubjectAssignment[] = [];
      for (const va of importResult.validAssignments) {
        const sec = sections.find((s) => s.sectionName.toUpperCase() === va.sectionName.toUpperCase());
        if (sec) {
          newAssignments.push({
            id: `sa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            yearId: currentYear.id,
            sectionId: sec.id,
            sectionName: sec.sectionName,
            subjectCode: va.subjectCode,
            subjectName: va.subjectName,
            facultyCode: va.facultyCode,
            facultyName: va.facultyName,
            weeklyPeriods: va.weeklyPeriods,
          });
        }
      }

      await cloudService.assignments.replaceForYear(currentYear.id, newAssignments, newSubjects);

      addToast({
        type: 'success',
        title: 'Subject Allocations Updated',
        message: `Successfully loaded ${importResult.validAssignments.length} assignments for ${currentYear.yearName}. Previous allocations replaced.`,
      });
      setIsImportModalOpen(false);
      setImportResult(null);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Import Failed', message: err?.message || 'Failed to update database.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Year Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {sortedYears.map((year) => {
          const isSelected = (currentYear?.id || '') === year.id;
          return (
            <button
              key={year.id}
              onClick={() => setSelectedYearId(year.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {year.yearName}
            </button>
          );
        })}
      </div>

      {currentYear && (
        <>
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {currentYear.yearName} — Subject Allocations
              </h2>
              <p className="text-xs text-slate-500">
                Assign subjects and faculties across Sections {sections.map((s) => s.sectionName).join(', ')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadSubjectTemplate(currentYear.yearName)}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download Excel Template
              </Button>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <span className="inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg text-sm px-3.5 py-2 gap-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Upload {currentYear.yearName} Excel</span>
                </span>
              </label>

              <Button variant="primary" size="sm" onClick={openAddModal} icon={<Plus className="w-4 h-4" />}>
                Add Allocation
              </Button>
            </div>
          </div>

          {/* Assignments Table */}
          <Card>
            {assignments.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">
                  No Subjects Allocated for {currentYear.yearName}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Upload the year-specific Excel file or add individual subject-faculty mappings manually.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadSubjectTemplate(currentYear.yearName)}
                    icon={<Download className="w-3.5 h-3.5" />}
                  >
                    Template
                  </Button>
                  <Button size="sm" onClick={openAddModal} icon={<Plus className="w-3.5 h-3.5" />}>
                    Add Manually
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 -my-5">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-5">Code</th>
                      <th className="py-3 px-5">Subject Name</th>
                      <th className="py-3 px-5 text-center">Section</th>
                      <th className="py-3 px-5">Faculty Code</th>
                      <th className="py-3 px-5">Faculty Name</th>
                      <th className="py-3 px-5 text-center">Weekly Periods</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-semibold text-indigo-700">
                          {a.subjectCode}
                        </td>
                        <td className="py-3.5 px-5 font-medium text-slate-900">
                          {a.subjectName}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold inline-flex items-center justify-center text-xs">
                            {a.sectionName}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-600 text-xs font-semibold">
                          {a.facultyCode}
                        </td>
                        <td className="py-3.5 px-5 text-slate-800 font-medium">
                          {a.facultyName}
                        </td>
                        <td className="py-3.5 px-5 text-center font-bold text-slate-900">
                          {a.weeklyPeriods}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title="Edit Allocation"
                              onClick={() => openEditModal(a)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              title="Delete Allocation"
                              onClick={() => setDeletingAssignment(a)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Add / Edit Assignment Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingAssignment ? 'Edit Subject Allocation' : 'Add Subject Allocation'}
            subtitle={`Academic Year: ${currentYear.yearName}`}
            maxWidth="md"
          >
            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Subject Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS301"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures and Algorithms"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Section *
                  </label>
                  <select
                    value={targetSectionName}
                    onChange={(e) => setTargetSectionName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.sectionName}>
                        Section {s.sectionName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Weekly Periods *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={weeklyPeriods}
                    onChange={(e) => setWeeklyPeriods(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Faculty Member *
                </label>
                <select
                  required
                  value={targetFacultyCode}
                  onChange={(e) => setTargetFacultyCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Select Faculty --</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.facultyCode}>
                      {f.facultyCode} — {f.facultyName} ({f.weeklyWorkload} periods)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingAssignment ? 'Save Changes' : 'Allocate Subject'}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirmation */}
          <ConfirmationDialog
            isOpen={!!deletingAssignment}
            onClose={() => setDeletingAssignment(null)}
            onConfirm={handleDeleteAssignment}
            title="Delete Subject Allocation"
            message={`Are you sure you want to remove ${deletingAssignment?.subjectCode} (${deletingAssignment?.subjectName}) for Section ${deletingAssignment?.sectionName}?`}
            confirmLabel="Delete"
            variant="danger"
          />

          {/* Subject Excel Import Preview Modal */}
          <Modal
            isOpen={isImportModalOpen}
            onClose={() => {
              setIsImportModalOpen(false);
              setImportResult(null);
            }}
            title={`${currentYear.yearName} — Subject Excel Import Preview`}
            subtitle="Verify allocations before replacing existing data"
            maxWidth="2xl"
          >
            {importResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-xs text-slate-500 block">Total Rows</span>
                    <span className="text-lg font-bold text-slate-800">{importResult.totalRows}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-xs text-emerald-600 block">Valid Allocations</span>
                    <span className="text-lg font-bold text-emerald-700">{importResult.validAssignments.length}</span>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                    <span className="text-xs text-rose-600 block">Errors Found</span>
                    <span className="text-lg font-bold text-rose-700">{importResult.errors.length}</span>
                  </div>
                </div>

                {/* Row Errors */}
                {importResult.errors.length > 0 && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl max-h-44 overflow-y-auto space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                      <AlertCircle className="w-4 h-4" />
                      <span>Row Validation Errors (these rows cannot be imported):</span>
                    </div>
                    {importResult.errors.map((err, idx) => (
                      <p key={idx} className="text-xs text-rose-600 pl-5">
                        • <strong>Row {err.row}:</strong> {err.error}
                      </p>
                    ))}
                  </div>
                )}

                {/* Valid Assignments Table */}
                {importResult.validAssignments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Valid Allocations to Apply:
                    </h4>
                    <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="p-2">Code</th>
                            <th className="p-2">Subject Name</th>
                            <th className="p-2">Sec</th>
                            <th className="p-2">Faculty</th>
                            <th className="p-2 text-center">Periods</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importResult.validAssignments.map((a, i) => (
                            <tr key={i} className="hover:bg-slate-50/60">
                              <td className="p-2 font-mono font-semibold text-indigo-600">{a.subjectCode}</td>
                              <td className="p-2 font-medium text-slate-800">{a.subjectName}</td>
                              <td className="p-2 font-bold text-slate-700">{a.sectionName}</td>
                              <td className="p-2 text-slate-600">
                                {a.facultyName} ({a.facultyCode})
                              </td>
                              <td className="p-2 text-center font-bold text-slate-800">{a.weeklyPeriods}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Replacement Notice:</strong> Confirming this import will completely replace all previous subject allocations for <strong>{currentYear.yearName}</strong> with the valid records above.
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportResult(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleConfirmImport}
                    disabled={importResult.validAssignments.length === 0}
                    isLoading={isImporting}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Confirm & Replace for {currentYear.yearName}
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  );
};
