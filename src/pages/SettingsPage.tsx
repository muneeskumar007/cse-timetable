import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useUiStore } from '../stores/uiStore';
import { Settings as SettingsIcon, Clock, ShieldCheck, Save, CheckCircle2 } from 'lucide-react';
import type { DepartmentSettings, PeriodConfig, FixedSlot } from '../types';

export const SettingsPage: React.FC = () => {
  const { addToast } = useUiStore();

  const settingsList = useLiveQuery(() => db.settings.toArray(), []) || [];
  const periods = useLiveQuery(() => db.periodConfigs.orderBy('periodNumber').toArray(), []) || [];
  const fixedSlots = useLiveQuery(() => db.fixedSlots.toArray(), []) || [];

  const [deptName, setDeptName] = useState('Department of Computer Science and Engineering');
  const [collegeName, setCollegeName] = useState('College of Engineering');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [periodsPerFullDay, setPeriodsPerFullDay] = useState(7);
  const [periodsOnSaturday, setPeriodsOnSaturday] = useState(4);
  const [lunchAfterPeriod, setLunchAfterPeriod] = useState(4);

  const [periodTimings, setPeriodTimings] = useState<PeriodConfig[]>([]);

  useEffect(() => {
    if (settingsList.length > 0) {
      const s = settingsList[0];
      setDeptName(s.departmentName);
      setCollegeName(s.collegeName || '');
      setAcademicYear(s.academicYear || '2026-2027');
      setPeriodsPerFullDay(s.periodsPerFullDay || 7);
      setPeriodsOnSaturday(s.periodsOnSaturday || 4);
      setLunchAfterPeriod(s.lunchAfterPeriod || 4);
    }
  }, [settingsList]);

  useEffect(() => {
    if (periods.length > 0) {
      setPeriodTimings(periods);
    }
  }, [periods]);

  const handleTimingChange = (id: string, field: 'startTime' | 'endTime' | 'name', val: string) => {
    setPeriodTimings((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await db.transaction('rw', [db.settings, db.periodConfigs], async () => {
        // Save general settings
        const currentSetting = settingsList[0];
        const updatedSettings: DepartmentSettings = {
          id: currentSetting?.id || 'default',
          departmentName: deptName.trim(),
          collegeName: collegeName.trim(),
          academicYear: academicYear.trim(),
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          periodsPerFullDay: Number(periodsPerFullDay) || 7,
          periodsOnSaturday: Number(periodsOnSaturday) || 4,
          lunchAfterPeriod: Number(lunchAfterPeriod) || 4,
        };

        await db.settings.put(updatedSettings);

        // Save periods
        for (const p of periodTimings) {
          await db.periodConfigs.update(p.id, {
            name: p.name,
            startTime: p.startTime,
            endTime: p.endTime,
          });
        }
      });

      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Department parameters and period timings updated successfully.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Save Failed', message: err?.message || 'Could not save settings.' });
    }
  };

  return (
    <form onSubmit={handleSaveAllSettings} className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Timetable & Department Settings</h1>
          <p className="text-xs text-slate-500">
            Configure department metadata, timetable bell schedule, lunch break, and protected slots
          </p>
        </div>

        <Button type="submit" variant="primary" size="sm" icon={<Save className="w-4 h-4" />}>
          Save All Changes
        </Button>
      </div>

      {/* Department Metadata Card */}
      <Card title="Department & College Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Department Name *
            </label>
            <input
              type="text"
              required
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Academic Year *
            </label>
            <input
              type="text"
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2026-2027"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Institution / College Name
            </label>
            <input
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. National Institute of Engineering & Technology"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Timetable Structure & Lunch */}
      <Card title="Timetable Layout & Break Rules">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Day Teaching Periods (Mon - Fri)
            </label>
            <input
              type="number"
              min={5}
              max={9}
              value={periodsPerFullDay}
              onChange={(e) => setPeriodsPerFullDay(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Saturday Teaching Periods (Half Day)
            </label>
            <input
              type="number"
              min={3}
              max={5}
              value={periodsOnSaturday}
              onChange={(e) => setPeriodsOnSaturday(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">Standard: 4 periods on Saturday</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Lunch Break Position
            </label>
            <input
              type="number"
              min={3}
              max={6}
              value={lunchAfterPeriod}
              onChange={(e) => setLunchAfterPeriod(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">Lunch is placed after Period {lunchAfterPeriod}</p>
          </div>
        </div>
      </Card>

      {/* Period Timings Configuration Table */}
      <Card
        title="Period Timings (Bell Schedule)"
        subtitle="Custom start and end hours for each lecture slot"
      >
        <div className="overflow-x-auto -mx-5 -my-5">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-5">Slot</th>
                <th className="py-3 px-5">Display Label</th>
                <th className="py-3 px-5">Start Time</th>
                <th className="py-3 px-5">End Time</th>
                <th className="py-3 px-5 text-center">Active on Saturday</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periodTimings.map((p) => {
                const isSaturdayActive = p.periodNumber <= periodsOnSaturday;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-5 font-bold text-slate-700">Period {p.periodNumber}</td>
                    <td className="py-3 px-5">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleTimingChange(p.id, 'name', e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none w-32"
                      />
                    </td>
                    <td className="py-3 px-5">
                      <input
                        type="text"
                        value={p.startTime}
                        onChange={(e) => handleTimingChange(p.id, 'startTime', e.target.value)}
                        placeholder="09:00 AM"
                        className="px-2.5 py-1.5 border border-slate-300 rounded text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none w-28"
                      />
                    </td>
                    <td className="py-3 px-5">
                      <input
                        type="text"
                        value={p.endTime}
                        onChange={(e) => handleTimingChange(p.id, 'endTime', e.target.value)}
                        placeholder="09:55 AM"
                        className="px-2.5 py-1.5 border border-slate-300 rounded text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none w-28"
                      />
                    </td>
                    <td className="py-3 px-5 text-center">
                      <Badge variant={isSaturdayActive ? 'emerald' : 'slate'}>
                        {isSaturdayActive ? 'Yes (Active)' : 'No (Half-day closed)'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Fixed Unit Test Slots Protection */}
      <Card
        title="Protected Unit Test Slots"
        subtitle="Slots reserved college-wide for periodic student assessments"
      >
        <div className="space-y-3">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-rose-950">
              <p className="font-semibold text-sm mb-0.5">Fixed Protected Slots</p>
              <p className="text-rose-800">
                The Timetable Generator and Drag-and-Drop Editor strictly enforce that no regular theory lecture or laboratory session can occupy these reserved testing slots:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {fixedSlots.map((fs) => (
              <div
                key={fs.id}
                className="p-3 bg-white border border-rose-200 rounded-xl shadow-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-800 text-sm block">{fs.day}</span>
                  <span className="text-xs font-semibold text-rose-600">Period {fs.periodNumber}</span>
                </div>
                <Badge variant="rose">Unit Test</Badge>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary" size="lg" icon={<Save className="w-4 h-4" />}>
          Save All Settings
        </Button>
      </div>
    </form>
  );
};
