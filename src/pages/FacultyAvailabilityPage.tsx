import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { calculateFacultyAvailability } from '../services/verificationService';
import {
  Clock,
  UserCheck,
  UserX,
  Search,
  Calendar,
  Layers,
  MapPin,
  Sparkles,
  BookOpen,
  FlaskConical,
  Library,
  Briefcase,
} from 'lucide-react';
import type { DayOfWeek, TimetableEntry, FacultyFreeBusySlot } from '../types';
import { ALL_DAYS } from '../types';

export const FacultyAvailabilityPage: React.FC = () => {
  const { entries, versions, faculty, years, rooms, periods, settings } = useData();

  // State
  const [selectedVersionId, setSelectedVersionId] = useState<string>('current');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [selectedPeriodNumber, setSelectedPeriodNumber] = useState<number>(1);
  const [filterMode, setFilterMode] = useState<'all' | 'free' | 'busy'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Determine active timetable entries based on version selector
  const activeEntries = useMemo<TimetableEntry[]>(() => {
    if (selectedVersionId === 'current') return entries;
    const matchedVer = versions.find((v) => v.id === selectedVersionId);
    return matchedVer ? matchedVer.entries : entries;
  }, [selectedVersionId, versions, entries]);

  // Compute availability using verification service
  const availability = useMemo(() => {
    return calculateFacultyAvailability(
      activeEntries,
      faculty,
      selectedDay,
      selectedPeriodNumber,
      periods
    );
  }, [activeEntries, faculty, selectedDay, selectedPeriodNumber, periods]);

  // All faculty free/busy list combined
  const allFacultySlots = useMemo<FacultyFreeBusySlot[]>(() => {
    return [...availability.freeFaculty, ...availability.busyFaculty].sort((a, b) =>
      a.faculty.facultyName.localeCompare(b.faculty.facultyName)
    );
  }, [availability]);

  // Filter faculty by search query and free/busy mode
  const filteredFaculty = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sourceList =
      filterMode === 'free'
        ? availability.freeFaculty
        : filterMode === 'busy'
        ? availability.busyFaculty
        : allFacultySlots;

    return sourceList.filter((item) => {
      if (q) {
        const matchesName = item.faculty.facultyName.toLowerCase().includes(q);
        const matchesCode = item.faculty.facultyCode.toLowerCase().includes(q);
        const matchesSubject =
          item.assignedEntry?.subjectName.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesCode && !matchesSubject) return false;
      }
      return true;
    });
  }, [availability, allFacultySlots, filterMode, searchQuery]);

  // Best substitute recommendation: free faculty with the lowest workload
  const bestSubstitute = useMemo(() => {
    if (availability.freeFaculty.length === 0) return null;
    return [...availability.freeFaculty].sort(
      (a, b) => a.workload.assigned - b.workload.assigned
    )[0];
  }, [availability.freeFaculty]);

  // Selected period config
  const currentPeriodConfig = availability.periodConfig;

  const totalFacultyCount = availability.freeFaculty.length + availability.busyFaculty.length;
  const freeFacultyCount = availability.freeFaculty.length;
  const busyFacultyCount = availability.busyFaculty.length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl border border-indigo-900/50 shadow-sm text-white">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              <Clock className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight">Faculty Free / Busy Availability</h2>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl">
            Inspect real-time faculty availability at any designated Day and Period across the
            entire department. Quick substitute matching helps assign replacement teachers instantly.
          </p>
        </div>

        {/* Timetable Version Selector */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 text-xs">
          <Layers className="w-4 h-4 text-indigo-400 ml-2" />
          <span className="text-slate-400 font-medium">Timetable:</span>
          <select
            value={selectedVersionId}
            onChange={(e) => setSelectedVersionId(e.target.value)}
            className="bg-slate-900 text-white border border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="current">Current / Live Timetable</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name || `Version ${v.versionNumber}`} ({v.status || 'Draft'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interactive Day & Period Control Bar */}
      <Card className="p-4 border-slate-200">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Day Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              Day:
            </span>
            {ALL_DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedDay === d
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Period Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              Period:
            </span>
            {periods
              .filter((p) => selectedDay !== 'Saturday' || p.periodNumber <= (settings.periodsOnSaturday || 4))
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriodNumber(p.periodNumber)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedPeriodNumber === p.periodNumber
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  P{p.periodNumber}
                </button>
              ))}
          </div>
        </div>

        {/* Current Active Slot Banner */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-semibold text-slate-800">
              Viewing: {selectedDay}, Period {selectedPeriodNumber}
            </span>
            {currentPeriodConfig && (
              <span className="text-slate-400">
                ({currentPeriodConfig.startTime} - {currentPeriodConfig.endTime})
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {freeFacultyCount} Free
            </span>
            <span className="flex items-center gap-1 text-rose-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {busyFacultyCount} Busy
            </span>
          </div>
        </div>
      </Card>

      {/* Recommended Substitute Card */}
      {bestSubstitute && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Recommended Substitute
                </span>
                <Badge variant="success" size="sm">
                  Optimal Load
                </Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {bestSubstitute.faculty.facultyName} ({bestSubstitute.faculty.facultyCode})
              </h4>
              <p className="text-xs text-slate-600">
                Weekly Workload: {bestSubstitute.workload.assigned} / {bestSubstitute.workload.required} periods •{' '}
                {bestSubstitute.workload.remaining} periods spare capacity
              </p>
            </div>
          </div>
          <Badge variant="success" size="lg">
            Available Right Now
          </Badge>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Toggle Free / Busy */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Faculty ({totalFacultyCount})
          </button>
          <button
            onClick={() => setFilterMode('free')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterMode === 'free'
                ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Free Only ({freeFacultyCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('busy')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterMode === 'busy'
                ? 'bg-white text-rose-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserX className="w-3.5 h-3.5 text-rose-500" />
            <span>Busy Only ({busyFacultyCount})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search faculty, code, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Faculty Cards Grid */}
      {filteredFaculty.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-sm text-slate-500">No faculty members match the selected filter criteria.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFaculty.map((item) => {
            const loadPercent = Math.min(
              100,
              Math.round((item.workload.assigned / (item.workload.required || 18)) * 100)
            );

            const yr = years.find((y) => y.id === item.assignedEntry?.yearId);
            const rm = rooms.find((r) => r.id === item.assignedEntry?.roomId);

            return (
              <Card
                key={item.faculty.id}
                className={`relative transition-all border ${
                  item.isFree
                    ? 'border-emerald-200/90 bg-emerald-50/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {item.faculty.facultyName}
                      </h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        {item.faculty.facultyCode}
                      </span>
                    </div>
                    {item.faculty.designation && (
                      <p className="text-xs text-slate-500">{item.faculty.designation}</p>
                    )}
                  </div>

                  <Badge variant={item.isFree ? 'success' : 'danger'} size="sm">
                    {item.isFree ? 'FREE' : 'BUSY'}
                  </Badge>
                </div>

                {/* Status Content */}
                {item.isFree ? (
                  <div className="p-3 bg-emerald-100/50 rounded-xl border border-emerald-200/60 mb-3 text-xs">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-1">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Available for Teaching / Relief</span>
                    </div>
                    <p className="text-emerald-700 text-[11px]">
                      No classes scheduled for {selectedDay} Period {selectedPeriodNumber}.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 mb-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        {item.assignedEntry?.entryType === 'practical_lab' ||
                        item.assignedEntry?.entryType === 'integrated_lab' ? (
                          <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                        ) : item.assignedEntry?.entryType === 'library' ? (
                          <Library className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>{item.assignedEntry?.subjectName}</span>
                      </span>
                      <span className="text-[10px] font-mono px-1 rounded bg-slate-200 text-slate-700">
                        {item.assignedEntry?.subjectCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-600 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        {yr?.yearName || 'Year'} • Sec {item.assignedEntry?.sectionName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        Room {item.assignedEntry?.roomNumber || rm?.roomName || 'Room'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Workload Progress Bar */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Weekly Workload</span>
                    <span className="font-semibold text-slate-700">
                      {item.workload.assigned} / {item.workload.required} periods ({loadPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        loadPercent > 100
                          ? 'bg-rose-500'
                          : loadPercent >= 80
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, loadPercent)}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
