import React, { useState } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { useUiStore } from '../stores/uiStore';
import {
  exportBackup,
  validateBackup,
  restoreBackup,
  resetProject,
  type BackupValidationResult,
} from '../services/backupService';
import { cloudService } from '../services/cloudService';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileJson,
  ShieldAlert,
} from 'lucide-react';

export const BackupPage: React.FC = () => {
  const { addToast } = useUiStore();

  // Restore state
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreValidation, setRestoreValidation] = useState<BackupValidationResult | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Reset project state
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Demo data state
  const [isDemoDialogOpen, setIsDemoDialogOpen] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  const handleExport = async () => {
    try {
      await exportBackup();
      addToast({
        type: 'success',
        title: 'Backup Downloaded',
        message: 'Complete local project JSON snapshot exported successfully.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Export Failed', message: err?.message || 'Could not export backup.' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const result = validateBackup(text);
        setRestoreValidation(result);
        setIsRestoreModalOpen(true);
      } catch (err: any) {
        addToast({ type: 'error', title: 'File Error', message: err?.message || 'Failed to parse JSON file.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!restoreValidation || !restoreValidation.data) return;
    setIsRestoring(true);

    try {
      await restoreBackup(restoreValidation.data);
      addToast({
        type: 'success',
        title: 'Project Restored',
        message: 'All application tables and timetable states were restored from the backup file.',
      });
      setIsRestoreModalOpen(false);
      setRestoreValidation(null);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Restore Failed', message: err?.message || 'Could not restore database.' });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleResetProject = async () => {
    setIsResetting(true);
    try {
      await resetProject();
      addToast({
        type: 'success',
        title: 'Project Reset',
        message: 'Database tables reset to initial factory configuration across cloud and local storage.',
      });
      setIsResetDialogOpen(false);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reset Failed', message: err?.message || 'Could not reset project.' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      await cloudService.loadDemoData();
      addToast({
        type: 'success',
        title: 'Demo Data Loaded',
        message: 'Loaded full CSE curriculum: 2nd, 3rd, 4th Years (Sections A, B, C), 10 Faculty, 12 Subjects, 18 Labs, and Rooms.',
      });
      setIsDemoDialogOpen(false);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Demo Load Failed', message: err?.message || 'Could not load demo data.' });
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Backup, Restore & Maintenance</h1>
        <p className="text-xs text-slate-500">
          Manage local IndexedDB snapshots, export portable backups, and load sample curriculum data
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              <span>Export Local Backup</span>
            </div>
          }
          subtitle="Generate a portable JSON snapshot"
        >
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Download a complete JSON backup file containing all departmental master data:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-500">
              <li>Global Faculty Master & workloads</li>
              <li>Academic Years, Sections (A, B, C) & Room mappings</li>
              <li>Year-wise Subject Allocations & Labs</li>
              <li>Classrooms & Computer Laboratories</li>
              <li>Current Saved Timetable & Version Snapshots</li>
              <li>Timings, Lunch Break & Protected Unit Test configurations</li>
            </ul>

            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={handleExport}
                icon={<Download className="w-4 h-4" />}
              >
                Export JSON Backup
              </Button>
            </div>
          </div>
        </Card>

        {/* Restore Backup Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              <span>Restore from Backup</span>
            </div>
          }
          subtitle="Import a previously exported JSON backup"
        >
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Restore the application state from a verified backup file. The system will validate the schema and preview records before applying changes.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
              Corrupt or malformed files are automatically rejected without affecting existing local data.
            </div>

            <div className="pt-2">
              <label className="block w-full cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <span className="w-full inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg text-sm px-3.5 py-2 gap-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
                  <FileJson className="w-4 h-4 text-emerald-600" />
                  <span>Select Backup JSON File</span>
                </span>
              </label>
            </div>
          </div>
        </Card>

        {/* Demo Data Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Load Realistic CSE Demo Data</span>
            </div>
          }
          subtitle="Instant comprehensive evaluation dataset"
        >
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Pre-populates the database with a fully balanced, production-like Computer Science curriculum:
            </p>
            <div className="grid grid-cols-2 gap-2 text-slate-500">
              <div>• 2nd, 3rd, and 4th Years</div>
              <div>• Sections A, B, and C</div>
              <div>• 10 CSE Faculty Members</div>
              <div>• 12 Subject Assignments</div>
              <div>• 18 Practical & Integrated Labs</div>
              <div>• 13 Lecture & Lab Rooms</div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                onClick={() => setIsDemoDialogOpen(true)}
                icon={<Sparkles className="w-4 h-4 text-amber-600" />}
              >
                Load CSE Demo Data
              </Button>
            </div>
          </div>
        </Card>

        {/* Factory Reset Card */}
        <Card
          title={
            <div className="flex items-center gap-2 text-rose-700">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Reset Local Project</span>
            </div>
          }
          subtitle="Clear all IndexedDB storage and restore defaults"
        >
          <div className="space-y-3 text-xs text-slate-600">
            <p className="text-rose-800 leading-relaxed">
              <strong>Caution:</strong> This irreversible operation purges all local IndexedDB tables including faculty records, year allotments, lab configs, and saved timetables.
            </p>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs">
              Use this if you wish to start a clean slate for a fresh academic term.
            </div>

            <div className="pt-2">
              <Button
                variant="danger"
                className="w-full"
                onClick={() => setIsResetDialogOpen(true)}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                Reset Local Database
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Restore Preview Modal */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => {
          setIsRestoreModalOpen(false);
          setRestoreValidation(null);
        }}
        title="Restore Backup Verification"
        subtitle="Review backup contents before overwriting"
        maxWidth="lg"
      >
        {restoreValidation && (
          <div className="space-y-4">
            {restoreValidation.isValid && restoreValidation.summary ? (
              <>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="text-xs text-emerald-900">
                    <p className="font-bold">Backup Integrity Verified</p>
                    <p>Exported at: {restoreValidation.summary.exportedAt}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-50 border rounded-lg">
                    <span className="text-slate-400 block">Faculty</span>
                    <span className="font-bold text-base text-slate-800">
                      {restoreValidation.summary.facultyCount}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border rounded-lg">
                    <span className="text-slate-400 block">Years / Sec</span>
                    <span className="font-bold text-base text-slate-800">
                      {restoreValidation.summary.yearCount} / {restoreValidation.summary.sectionCount}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border rounded-lg">
                    <span className="text-slate-400 block">Allotments</span>
                    <span className="font-bold text-base text-slate-800">
                      {restoreValidation.summary.assignmentCount}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border rounded-lg">
                    <span className="text-slate-400 block">Labs</span>
                    <span className="font-bold text-base text-slate-800">
                      {restoreValidation.summary.labCount}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Confirmation Notice:</strong> Restoring this backup will replace current IndexedDB records with the contents of this file.
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsRestoreModalOpen(false);
                      setRestoreValidation(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleConfirmRestore}
                    isLoading={isRestoring}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Confirm & Restore
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900">
                    <p className="font-bold">Invalid or Corrupt Backup File</p>
                    <p className="mt-1">
                      This JSON file does not conform to the required backup structure. No changes were made to your database.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white border border-rose-200 rounded-lg text-xs text-rose-700 space-y-1">
                  {restoreValidation.errors.map((err, idx) => (
                    <p key={idx}>• {err}</p>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsRestoreModalOpen(false);
                      setRestoreValidation(null);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetProject}
        isLoading={isResetting}
        title="Reset Local Project Database"
        message="Are you completely sure you want to erase all local data? This will delete all custom faculty, year configs, rooms, labs, and saved timetables, restoring the database to default factory settings."
        confirmLabel="Erase & Reset"
        variant="danger"
      />

      {/* Demo Data Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDemoDialogOpen}
        onClose={() => setIsDemoDialogOpen(false)}
        onConfirm={handleLoadDemo}
        isLoading={isLoadingDemo}
        title="Load CSE Demonstration Data"
        message="This will overwrite current project data with the complete demonstration dataset: 2nd, 3rd, and 4th Years (Sections A, B, C), 10 CSE faculty members, full subject rosters, 18 weekly lab sessions, and classroom mappings."
        confirmLabel="Load Demo Data"
        variant="primary"
      />
    </div>
  );
};
