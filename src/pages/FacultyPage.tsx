import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { cloudService } from '../services/cloudService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { useUiStore } from '../stores/uiStore';
import { calculateFacultyWorkloads } from '../services/workloadService';
import {
  downloadFacultyTemplate,
  parseAndValidateFacultyExcel,
  type FacultyImportResult,
} from '../services/excelService';
import {
  UserPlus,
  FileSpreadsheet,
  Download,
  Edit2,
  Trash2,
  Calendar,
  Upload,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { Faculty } from '../types';

export const FacultyPage: React.FC = () => {
  const { setPage, setSelectedFacultyCode, addToast } = useUiStore();
  const { faculty: faculties, assignments, labs } = useData();

  const workloads = calculateFacultyWorkloads(faculties, assignments, labs);
  const workloadMap = new Map(workloads.map((w) => [w.facultyCode.toUpperCase(), w]));

  // Faculty Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [facultyCode, setFacultyCode] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [weeklyWorkload, setWeeklyWorkload] = useState(18);
  const [designation, setDesignation] = useState('');

  // Delete Confirmation
  const [deletingFaculty, setDeletingFaculty] = useState<Faculty | null>(null);

  // Excel Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<FacultyImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const openAddModal = () => {
    setEditingFaculty(null);
    setFacultyCode(`FAC00${faculties.length + 1}`);
    setFacultyName('');
    setWeeklyWorkload(18);
    setDesignation('Assistant Professor');
    setIsModalOpen(true);
  };

  const openEditModal = (fac: Faculty) => {
    setEditingFaculty(fac);
    setFacultyCode(fac.facultyCode);
    setFacultyName(fac.facultyName);
    setWeeklyWorkload(fac.weeklyWorkload);
    setDesignation(fac.designation || '');
    setIsModalOpen(true);
  };

  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = facultyCode.trim().toUpperCase();
    const cleanName = facultyName.trim();

    if (!cleanCode || !cleanName) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Code and Name are required.' });
      return;
    }

    // Check duplicate code if adding
    if (!editingFaculty) {
      const exists = faculties.some((f) => f.facultyCode.toUpperCase() === cleanCode);
      if (exists) {
        addToast({
          type: 'error',
          title: 'Duplicate Faculty Code',
          message: `Faculty code "${cleanCode}" already exists.`,
        });
        return;
      }
      await cloudService.faculty.add({
        id: `fac_${Date.now()}`,
        facultyCode: cleanCode,
        facultyName: cleanName,
        weeklyWorkload: Number(weeklyWorkload) || 18,
        designation: designation.trim() || undefined,
        isActive: true,
      });
      addToast({ type: 'success', title: 'Faculty Added', message: `${cleanName} (${cleanCode}) added successfully.` });
    } else {
      await cloudService.faculty.update(editingFaculty.id, {
        facultyCode: cleanCode,
        facultyName: cleanName,
        weeklyWorkload: Number(weeklyWorkload) || 18,
        designation: designation.trim() || undefined,
      });
      addToast({ type: 'success', title: 'Faculty Updated', message: `${cleanName} updated successfully.` });
    }
    setIsModalOpen(false);
  };

  const handleDeleteFaculty = async () => {
    if (!deletingFaculty) return;
    // Check if faculty has assignments
    const code = deletingFaculty.facultyCode.toUpperCase();
    const hasAssignments = assignments.some((a) => a.facultyCode.toUpperCase() === code);
    const hasLabs = labs.some((l) => l.facultyCode.toUpperCase() === code);

    if (hasAssignments || hasLabs) {
      addToast({
        type: 'warning',
        title: 'Faculty In Use',
        message: `Removed faculty "${deletingFaculty.facultyName}". Note: Existing assignments still reference ${code}.`,
      });
    }

    await cloudService.faculty.delete(deletingFaculty.id);
    addToast({ type: 'success', title: 'Faculty Removed', message: `${deletingFaculty.facultyName} has been deleted.` });
    setDeletingFaculty(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const result = parseAndValidateFacultyExcel(buffer);
        setImportResult(result);
        setIsImportModalOpen(true);
      } catch (err: any) {
        addToast({ type: 'error', title: 'File Error', message: err?.message || 'Unable to read Excel file.' });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importResult || importResult.validRows.length === 0) return;
    setIsImporting(true);

    try {
      await cloudService.faculty.bulkUpsert(importResult.validRows, faculties);

      addToast({
        type: 'success',
        title: 'Faculty Master Updated',
        message: `Successfully processed ${importResult.validRows.length} faculty records from Excel.`,
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
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Department Faculty Roster</h1>
          <p className="text-xs text-slate-500">
            Global master record for teaching staff and weekly workload commitments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadFacultyTemplate}
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
              <span>Import Excel</span>
            </span>
          </label>

          <Button variant="primary" size="sm" onClick={openAddModal} icon={<UserPlus className="w-4 h-4" />}>
            Add Faculty
          </Button>
        </div>
      </div>

      {/* Faculty Table Card */}
      <Card>
        {faculties.length === 0 ? (
          <div className="text-center py-12">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Faculty Registered</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Add individual faculty members or upload the department roster using the Excel template.
            </p>
            <div className="flex justify-center gap-3">
              <Button size="sm" onClick={downloadFacultyTemplate} variant="outline" icon={<Download className="w-3.5 h-3.5" />}>
                Template
              </Button>
              <Button size="sm" onClick={openAddModal} icon={<UserPlus className="w-3.5 h-3.5" />}>
                Add Manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-5">Faculty Code</th>
                  <th className="py-3 px-5">Faculty Name</th>
                  <th className="py-3 px-5">Designation</th>
                  <th className="py-3 px-5 text-center">Required</th>
                  <th className="py-3 px-5 text-center">Assigned (Th + Lab)</th>
                  <th className="py-3 px-5 text-center">Difference</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {faculties.map((fac) => {
                  const wl = workloadMap.get(fac.facultyCode.toUpperCase());
                  const required = fac.weeklyWorkload || 0;
                  const assigned = wl?.totalAssigned || 0;
                  const diff = assigned - required;
                  const status = wl?.status || (diff === 0 ? 'balanced' : diff > 0 ? 'overloaded' : 'underloaded');

                  return (
                    <tr key={fac.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-semibold text-indigo-700">
                        {fac.facultyCode}
                      </td>
                      <td className="py-3.5 px-5 font-medium text-slate-900">
                        {fac.facultyName}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 text-xs">
                        {fac.designation || 'Faculty'}
                      </td>
                      <td className="py-3.5 px-5 text-center font-semibold text-slate-700">
                        {required}
                      </td>
                      <td className="py-3.5 px-5 text-center text-slate-600">
                        <span className="font-semibold text-slate-800">{assigned}</span>
                        {wl && (
                          <span className="text-[11px] text-slate-400 block">
                            ({wl.assignedTheoryPeriods} th + {wl.assignedLabPeriods} lab)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center font-semibold">
                        <span
                          className={
                            diff === 0
                              ? 'text-slate-500'
                              : diff > 0
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {status === 'balanced' && (
                          <Badge variant="emerald">Balanced</Badge>
                        )}
                        {status === 'overloaded' && (
                          <Badge variant="rose">Overloaded</Badge>
                        )}
                        {status === 'underloaded' && (
                          <Badge variant="amber">Underloaded</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View Faculty Timetable"
                            onClick={() => {
                              setSelectedFacultyCode(fac.facultyCode);
                              setPage('faculty_timetable');
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button
                            title="Edit Faculty"
                            onClick={() => openEditModal(fac)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            title="Delete Faculty"
                            onClick={() => setDeletingFaculty(fac)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Faculty Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFaculty ? 'Edit Faculty Record' : 'Register New Faculty'}
        subtitle="Global Faculty Master entry"
        maxWidth="md"
      >
        <form onSubmit={handleSaveFaculty} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Faculty Code / Employee ID *
            </label>
            <input
              type="text"
              required
              value={facultyCode}
              onChange={(e) => setFacultyCode(e.target.value.toUpperCase())}
              placeholder="e.g. FAC001"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Faculty Name *
            </label>
            <input
              type="text"
              required
              value={facultyName}
              onChange={(e) => setFacultyName(e.target.value)}
              placeholder="e.g. Dr. R. Kumar"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Weekly Teaching Workload (Periods) *
            </label>
            <input
              type="number"
              required
              min={1}
              max={40}
              value={weeklyWorkload}
              onChange={(e) => setWeeklyWorkload(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Expected departmental teaching load per week (e.g. 18, 20, 22).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Designation (Optional)
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Associate Professor"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingFaculty ? 'Save Changes' : 'Add Faculty'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deletingFaculty}
        onClose={() => setDeletingFaculty(null)}
        onConfirm={handleDeleteFaculty}
        title="Remove Faculty Member"
        message={`Are you sure you want to delete ${deletingFaculty?.facultyName} (${deletingFaculty?.facultyCode})? If this faculty has assigned classes, those will remain until re-assigned.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Excel Import Preview Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportResult(null);
        }}
        title="Faculty Excel Import Preview"
        subtitle="Review records before confirming update"
        maxWidth="2xl"
      >
        {importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-xs text-slate-500 block">Total Processed</span>
                <span className="text-lg font-bold text-slate-800">{importResult.totalRows}</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-xs text-emerald-600 block">Valid Rows</span>
                <span className="text-lg font-bold text-emerald-700">{importResult.validRows.length}</span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                <span className="text-xs text-rose-600 block">Errors</span>
                <span className="text-lg font-bold text-rose-700">{importResult.errors.length}</span>
              </div>
            </div>

            {/* Row-level errors list */}
            {importResult.errors.length > 0 && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl max-h-48 overflow-y-auto space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                  <AlertCircle className="w-4 h-4" />
                  <span>Row Validation Issues (these rows will be skipped):</span>
                </div>
                {importResult.errors.map((err: { row: number; error: string }, idx: number) => (
                  <p key={idx} className="text-xs text-rose-600 pl-5">
                    • <strong>Row {err.row}:</strong> {err.error}
                  </p>
                ))}
              </div>
            )}

            {/* Valid rows preview */}
            {importResult.validRows.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Valid Records to Import / Update:
                </h4>
                <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2">Code</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Workload</th>
                        <th className="p-2">Designation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importResult.validRows.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="p-2 font-mono font-semibold text-indigo-600">{r.facultyCode}</td>
                          <td className="p-2 font-medium text-slate-800">{r.facultyName}</td>
                          <td className="p-2 font-semibold text-slate-700">{r.weeklyWorkload}</td>
                          <td className="p-2 text-slate-500">{r.designation || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Replacement Semantics:</strong> Existing faculty matching by Faculty Code will have their workload and details updated. New faculty will be added without creating duplicates.
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
                disabled={importResult.validRows.length === 0}
                isLoading={isImporting}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm & Apply Import ({importResult.validRows.length} records)
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
