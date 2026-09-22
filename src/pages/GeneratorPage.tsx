import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useUiStore } from '../stores/uiStore';
import { useTimetableStore } from '../stores/timetableStore';
import { checkGenerationReadiness } from '../timetable/readiness';
import { runGenerationAsync } from '../timetable/worker';
import {
  Wand2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  CalendarRange,
  Eye,
  Info,
} from 'lucide-react';
import type { TimetableVersion } from '../types';

export const GeneratorPage: React.FC = () => {
  const { setPage, addToast } = useUiStore();
  const { setGenerating, isGenerating, setDiagnostics } = useTimetableStore();

  const years = useLiveQuery(() => db.academicYears.orderBy('orderIndex').toArray(), []) || [];
  const sections = useLiveQuery(() => db.sections.toArray(), []) || [];
  const faculty = useLiveQuery(() => db.faculty.toArray(), []) || [];
  const assignments = useLiveQuery(() => db.subjectAssignments.toArray(), []) || [];
  const labs = useLiveQuery(() => db.labs.toArray(), []) || [];
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) || [];
  const fixedSlots = useLiveQuery(() => db.fixedSlots.toArray(), []) || [];
  const settingsList = useLiveQuery(() => db.settings.toArray(), []) || [];
  const periods = useLiveQuery(() => db.periodConfigs.orderBy('periodNumber').toArray(), []) || [];

  const settings = settingsList[0] || {
    id: 'default',
    departmentName: 'Computer Science and Engineering',
    collegeName: 'Department of Computer Science and Engineering',
    academicYear: '2026-2027',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    periodsPerFullDay: 7,
    periodsOnSaturday: 4,
    lunchAfterPeriod: 4,
  };

  const readiness = checkGenerationReadiness({
    years,
    sections,
    faculty,
    assignments,
    labs,
    rooms,
    fixedSlots,
    settings,
  });

  const [currentStep, setCurrentStep] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [generationDiagnostics, setLocalDiagnostics] = useState<string[]>([]);
  const [generationSuccess, setGenerationSuccess] = useState(false);

  const handleStartGeneration = async () => {
    if (!readiness.canGenerate) {
      addToast({
        type: 'error',
        title: 'Prerequisites Incomplete',
        message: 'Please resolve all readiness errors before initiating generation.',
      });
      return;
    }

    setGenerating(true, 'Initializing CSP solver...', 5);
    setCurrentStep('Preparing datasets and constraint matrix...');
    setProgressPercent(10);
    setLocalDiagnostics([]);
    setGenerationSuccess(false);

    try {
      const result = await runGenerationAsync(
        {
          years,
          sections,
          faculty,
          assignments,
          labs,
          rooms,
          fixedSlots,
          settings,
          periods,
        },
        (step, progress) => {
          setCurrentStep(step);
          setProgressPercent(progress);
        }
      );

      if (result.success && result.entries.length > 0) {
        // Save to IndexedDB
        await db.transaction(
          'rw',
          [db.timetableEntries, db.generatedTimetableEntries, db.timetableVersions],
          async () => {
            // Save generated pristine copy
            await db.generatedTimetableEntries.clear();
            await db.generatedTimetableEntries.bulkAdd(result.entries);

            // Save active current copy
            await db.timetableEntries.clear();
            await db.timetableEntries.bulkAdd(result.entries);

            // Create Version 1 snapshot
            const versionCount = await db.timetableVersions.count();
            const newVersion: TimetableVersion = {
              id: `ver_${Date.now()}`,
              versionNumber: versionCount + 1,
              name: `Generated Schedule (V${versionCount + 1})`,
              timestamp: new Date().toLocaleString(),
              isCurrent: true,
              isGenerated: true,
              entries: result.entries,
            };
            await db.timetableVersions.add(newVersion);
          }
        );

        setGenerationSuccess(true);
        addToast({
          type: 'success',
          title: 'Timetable Generated Successfully',
          message: `Scheduled ${result.entries.length} clash-free periods across all sections and laboratories!`,
        });
      } else {
        const diags = result.diagnostics || ['Timetable could not be generated with the current constraint configuration.'];
        setLocalDiagnostics(diags);
        setDiagnostics(diags);
        addToast({
          type: 'error',
          title: 'Generation Failed',
          message: 'Constraint satisfaction solver reached a deadlock. Check diagnostic report below.',
        });
      }
    } catch (err: any) {
      const msg = err?.message || 'Unexpected solver exception.';
      setLocalDiagnostics([msg]);
      addToast({ type: 'error', title: 'Solver Exception', message: msg });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Automated Timetable Generation</h1>
          <p className="text-xs text-slate-500">
            Constraint Satisfaction Problem (CSP) solver for departmental schedules
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          disabled={!readiness.canGenerate || isGenerating}
          isLoading={isGenerating}
          onClick={handleStartGeneration}
          icon={<Wand2 className="w-5 h-5" />}
        >
          {isGenerating ? 'Solving Timetable...' : 'Generate Timetable'}
        </Button>
      </div>

      {/* Progress Card (When Generating or Just Finished) */}
      {isGenerating && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{currentStep}</span>
              </div>
              <span className="font-mono font-bold text-indigo-600">{progressPercent}%</span>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Success Notification Card */}
      {generationSuccess && !isGenerating && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Timetable Generated & Saved Successfully!
                </h3>
                <p className="text-xs text-slate-600">
                  All hard constraints verified: zero faculty collisions, zero room overlaps, continuous labs, and protected unit test slots.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage('dashboard')}
                icon={<Eye className="w-4 h-4 text-indigo-600" />}
              >
                View Class Schedule
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPage('editor')}
                icon={<CalendarRange className="w-4 h-4" />}
              >
                Open Drag & Drop Editor
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Failure Diagnostic Report */}
      {generationDiagnostics.length > 0 && !isGenerating && (
        <Card className="border-rose-200 bg-rose-50/30">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>Generation Deadlock Diagnostics</span>
            </div>

            <div className="p-3 bg-white border border-rose-200 rounded-lg space-y-2 text-xs text-slate-700">
              {generationDiagnostics.map((diag, i) => (
                <p key={i} className="leading-relaxed">
                  {diag}
                </p>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Tip: The CSP engine does not fake success or silently discard required periods. Please check the recommendations above to adjust faculty loads or room assignments.
            </p>
          </div>
        </Card>
      )}

      {/* Readiness Check Panel */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Pre-Generation Readiness Audit</span>
          </div>
        }
        subtitle="Automated integrity check across master data, capacity, and rules"
        action={
          <Badge variant={readiness.isReady ? 'emerald' : 'rose'}>
            {readiness.isReady ? 'READY TO GENERATE' : 'NOT READY — ACTIONS REQUIRED'}
          </Badge>
        }
      >
        <div className="divide-y divide-slate-100 -mx-5 -my-5">
          {readiness.checks.map((c) => (
            <div key={c.id} className="p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {c.status === 'pass' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                )}
                {c.status === 'fail' && (
                  <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                )}
                {c.status === 'warn' && (
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{c.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                      {c.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{c.message}</p>
                </div>
              </div>

              <div>
                {c.status === 'pass' && <Badge variant="emerald">Passed</Badge>}
                {c.status === 'fail' && <Badge variant="rose">Required</Badge>}
                {c.status === 'warn' && <Badge variant="amber">Notice</Badge>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Constraints Summary Reference Card */}
      <Card title="Active Constraints & Priorities">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-800 block text-xs mb-1">
              Priority 1: Hard Constraints (Zero Tolerance)
            </span>
            <p>1. Fixed Unit Tests protected (Monday P1-P2 & Saturday P1-P2).</p>
            <p>2. Zero faculty clashes across all years and sections.</p>
            <p>3. Zero room double-bookings for classrooms or lab rooms.</p>
            <p>4. Practical labs = exactly 3 consecutive periods, once/week.</p>
            <p>5. Integrated labs = exactly 2 consecutive periods, once/week.</p>
            <p>6. No lab may cross the lunch break after Period 4.</p>
            <p>7. Saturday restricted to 4 periods (no practical labs on Saturday).</p>
            <p>8. Exact weekly periods satisfied for each subject.</p>
          </div>

          <div className="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-800 block text-xs mb-1">
              Priority 2: Soft Optimization Heuristics
            </span>
            <p>1. Even subject distribution (avoid scheduling the same theory subject multiple times on the same day).</p>
            <p>2. Balanced faculty load distribution across the week.</p>
            <p>3. Prefer earlier lecture periods for theory core topics.</p>
            <p>4. Afternoon slots prioritized for 3-period practical lab sessions.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
