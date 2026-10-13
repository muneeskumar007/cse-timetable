import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { cloudService } from '../services/cloudService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { useUiStore } from '../stores/uiStore';
import {
  downloadSubjectTemplate,
  parseAndValidateYearSubjectExcel,
  type YearSubjectImportResult,
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
  ArrowRight,
  Users,
} from 'lucide-react';
import type { Subject } from '../types';

export const SubjectsPage: React.FC = () => {
  const { selectedYearId, setSelectedYearId, addToast, setPage } = useUiStore();
  const { years, sections: allSections, subjects: allSubjects } = useData();

  const sortedYears = useMemo(
    () => [...years].sort((a, b) => a.orderIndex - b.orderIndex),
    [years]
  );
  const activeYearId = selectedYearId || sortedYears[0]?.id;
  const currentYear = sortedYears.find((y) => y.id === activeYearId) || sortedYears[0];

  const sections = useMemo(
    () => allSections.filter((s) => s.yearId === activeYearId),
    [allSections, activeYearId]
  );

  const yearSubjects = useMemo(
    () => allSubjects.filter((s) => s.yearId === activeYearId),
    [allSubjects, activeYearId]
  );

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [weeklyPeriods, setWeeklyPeriods] = useState(4);

  // Delete State
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  // Excel Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<YearSubjectImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const openAddModal = () => {
    setEditingSubject(null);
    setSubjectCode('');
    setSubjectName('');
    setWeeklyPeriods(4);
    setIsModalOpen(true);
  };

  const openEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setSubjectCode(sub.subjectCode);
    setSubjectName(sub.subjectName);
    setWeeklyPeriods(sub.weeklyPeriods || 4);
    setIsModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentYear) return;

    const cleanCode = subjectCode.trim().toUpperCase();
    const cleanName = subjectName.trim();
    const periodsNum = Number(weeklyPeriods) || 4;

    if (!cleanCode || !cleanName) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Subject Code and Name are required.' });
      return;
    }

    if (periodsNum <= 0) {
      addToast({ type: 'error', title: 'Invalid Periods', message: 'Weekly Periods must be a positive integer.' });
      return;
    }

    // Check duplicate code within this academic year
    if (!editingSubject) {
      const exists = yearSubjects.some((s) => s.subjectCode.toUpperCase() === cleanCode);
      if (exists) {
        addToast({
          type: 'error',
          title: 'Duplicate Subject Code',
          message: `${cleanCode} already exists in ${currentYear.yearName}.`,
        });
        return;
      }

      await cloudService.subjects.add({
        id: `sub_${currentYear.id}_${cleanCode}_${Date.now()}`,
        yearId: currentYear.id,
        subjectCode: cleanCode,
        subjectName: cleanName,
        weeklyPeriods: periodsNum,
      });

      addToast({
        type: 'success',
        title: 'Subject Added',
        message: `${cleanCode} added to ${currentYear.yearName} curriculum.`,
      });
    } else {
      await cloudService.subjects.update(editingSubject.id, {
        subjectCode: cleanCode,
        subjectName: cleanName,
        weeklyPeriods: periodsNum,
      });

      addToast({
        type: 'success',
        title: 'Subject Updated',
        message: `${cleanCode} updated successfully.`,
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteSubject = async () => {
    if (!deletingSubject) return;
    await cloudService.subjects.delete(deletingSubject.id);
    addToast({
      type: 'success',
      title: 'Subject Deleted',
      message: `${deletingSubject.subjectCode} removed from curriculum.`,
    });
    setDeletingSubject(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentYear) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const result = parseAndValidateYearSubjectExcel(buffer, currentYear.id);
        setImportResult(result);
        setIsImportModalOpen(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unable to parse Excel file.';
        addToast({ type: 'error', title: 'File Error', message: msg });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importResult || !currentYear || importResult.validSubjects.length === 0) return;
    setIsImporting(true);

    try {
      const newSubjects: Subject[] = importResult.validSubjects.map((s) => ({
        id: `sub_${currentYear.id}_${s.subjectCode}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        yearId: currentYear.id,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        weeklyPeriods: s.weeklyPeriods,
      }));

      await cloudService.subjects.replaceForYear(currentYear.id, newSubjects);

      addToast({
        type: 'success',
        title: 'Curriculum Updated',
        message: `Successfully loaded ${newSubjects.length} subjects for ${currentYear.yearName}. Previous subjects for this year replaced.`,
      });
      setIsImportModalOpen(false);
      setImportResult(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update database.';
      addToast({ type: 'error', title: 'Import Failed', message: msg });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Year Selector Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage('section_faculty')}
            icon={<Users className="w-4 h-4 text-indigo-600" />}
          >
            Assign Faculty per Section →
          </Button>
        </div>
      </div>

      {currentYear && (
        <>
          {/* Action & Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>{currentYear.yearName} — Subject Master</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Curriculum subjects defined here are automatically available to all sections (
                {sections.map((s) => s.sectionName).join(', ') || 'A, B, C'}) in {currentYear.yearName}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadSubjectTemplate(currentYear.yearName)}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download Template
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

              <Button
                variant="primary"
                size="sm"
                onClick={openAddModal}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Subject
              </Button>
            </div>
          </div>

          {/* Sharing Scope Notification */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-indigo-900">
              <BookOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>
                <strong>Shared Curriculum:</strong> Upload subjects once for {currentYear.yearName}. Then assign faculty separately for each section in the Section Faculty Assignment view.
              </span>
            </div>
            <button
              onClick={() => setPage('section_faculty')}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 whitespace-nowrap"
            >
              <span>Go to Faculty Assignment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Subjects Table */}
          <Card>
            {yearSubjects.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">
                  No Subjects Configured for {currentYear.yearName}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Upload an Excel file with columns (Subject Code, Subject Name, Weekly Periods) or add subjects manually.
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
                      <th className="py-3 px-5">Subject Code</th>
                      <th className="py-3 px-5">Subject Name</th>
                      <th className="py-3 px-5 text-center">Weekly Periods</th>
                      <th className="py-3 px-5">Shared Scope</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearSubjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-bold text-indigo-700">
                          {sub.subjectCode}
                        </td>
                        <td className="py-3.5 px-5 font-medium text-slate-900">
                          {sub.subjectName}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                            {sub.weeklyPeriods || 4}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-600 text-xs">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            Sections {sections.map((s) => s.sectionName).join(', ') || 'All'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title="Edit Subject"
                              onClick={() => openEditModal(sub)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              title="Delete Subject"
                              onClick={() => setDeletingSubject(sub)}
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

          {/* Add / Edit Subject Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingSubject ? 'Edit Subject' : 'Add Subject'}
            subtitle={`Academic Year: ${currentYear.yearName}`}
            maxWidth="md"
          >
            <form onSubmit={handleSaveSubject} className="space-y-4">
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
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Number of theory periods scheduled per week for each section.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingSubject ? 'Save Changes' : 'Add Subject'}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirmation */}
          <ConfirmationDialog
            isOpen={!!deletingSubject}
            onClose={() => setDeletingSubject(null)}
            onConfirm={handleDeleteSubject}
            title="Delete Subject"
            message={`Are you sure you want to remove ${deletingSubject?.subjectCode} (${deletingSubject?.subjectName})? Associated section faculty mappings for this subject will also be cleaned up.`}
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
            subtitle="Verify curriculum rows before replacing"
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
                    <span className="text-xs text-emerald-600 block">Valid Subjects</span>
                    <span className="text-lg font-bold text-emerald-700">
                      {importResult.validSubjects.length}
                    </span>
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

                {/* Valid Subjects Table */}
                {importResult.validSubjects.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Valid Subjects to Apply:
                    </h4>
                    <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="p-2">Subject Code</th>
                            <th className="p-2">Subject Name</th>
                            <th className="p-2 text-center">Weekly Periods</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importResult.validSubjects.map((s, i) => (
                            <tr key={i} className="hover:bg-slate-50/60">
                              <td className="p-2 font-mono font-semibold text-indigo-600">
                                {s.subjectCode}
                              </td>
                              <td className="p-2 font-medium text-slate-800">{s.subjectName}</td>
                              <td className="p-2 text-center font-bold text-slate-800">
                                {s.weeklyPeriods}
                              </td>
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
                    <strong>Replacement Notice:</strong> Confirming this import will replace the curriculum subjects for <strong>{currentYear.yearName}</strong> with the valid records above. Other academic years will remain completely unaffected.
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
                    disabled={importResult.validSubjects.length === 0}
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
