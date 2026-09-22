import React from 'react';
import type { TimetableEntry, PeriodConfig, DayOfWeek } from '../../types';
import { ALL_DAYS } from '../../types';
import { ShieldCheck, MapPin, User, Clock, FlaskConical } from 'lucide-react';

interface TimetableGridProps {
  entries: TimetableEntry[];
  periods: PeriodConfig[];
  days?: DayOfWeek[];
  isFacultyView?: boolean;
  lunchAfterPeriod?: number;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  entries,
  periods,
  days = ALL_DAYS,
  isFacultyView = false,
  lunchAfterPeriod = 4,
}) => {
  const sortedPeriods = periods.slice().sort((a, b) => a.periodNumber - b.periodNumber);

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
      <table className="w-full text-left border-collapse min-w-[950px]">
        <thead>
          <tr className="bg-slate-900 text-white text-xs font-semibold">
            <th className="py-3.5 px-4 w-28 uppercase tracking-wider text-slate-300 border-r border-slate-800">
              Day
            </th>
            {sortedPeriods.map((p) => {
              const isAfterLunch = p.periodNumber === lunchAfterPeriod + 1;
              return (
                <React.Fragment key={p.id}>
                  {isAfterLunch && (
                    <th className="py-3 px-2 w-14 text-center bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider border-r border-slate-800">
                      Lunch
                    </th>
                  )}
                  <th className="py-3 px-3 text-center border-r border-slate-800">
                    <div className="font-bold text-xs">{p.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                      {p.startTime} - {p.endTime}
                    </div>
                  </th>
                </React.Fragment>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-xs">
          {days.map((day) => {
            const isSaturday = day === 'Saturday';

            return (
              <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                {/* Day Header Column */}
                <td className="py-3 px-4 font-bold text-slate-900 bg-slate-50/80 border-r border-slate-200">
                  <span>{day}</span>
                  {isSaturday && (
                    <span className="block text-[10px] text-amber-600 font-normal mt-0.5">
                      Half Day (4 Pds)
                    </span>
                  )}
                </td>

                {/* Period Cells */}
                {sortedPeriods.map((p) => {
                  const isAfterLunch = p.periodNumber === lunchAfterPeriod + 1;
                  const isClosedSaturday = isSaturday && p.periodNumber > 4;

                  const match = entries.find(
                    (e) => e.day === day && e.periodNumber === p.periodNumber
                  );

                  return (
                    <React.Fragment key={p.id}>
                      {/* Lunch Divider Column */}
                      {isAfterLunch && (
                        <td
                          className={`p-1 text-center border-r border-slate-200 ${
                            isSaturday ? 'bg-slate-50 text-slate-300' : 'bg-amber-50/70 text-amber-800 font-semibold'
                          }`}
                        >
                          {!isSaturday && (
                            <div className="writing-mode-vertical text-[10px] uppercase tracking-widest py-2 select-none text-amber-700">
                              LUNCH
                            </div>
                          )}
                        </td>
                      )}

                      {/* Period Content Cell */}
                      <td
                        className={`p-2.5 border-r border-slate-200 align-top transition-colors min-w-[130px] ${
                          isClosedSaturday
                            ? 'bg-slate-100/60 text-slate-400 text-center font-medium select-none'
                            : ''
                        }`}
                      >
                        {isClosedSaturday ? (
                          <span className="text-[11px] text-slate-400 italic block py-4">— Closed —</span>
                        ) : match ? (
                          match.entryType === 'unit_test' ? (
                            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 shadow-xs">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
                                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>UNIT TEST</span>
                              </div>
                              <span className="text-[10px] text-rose-600 block mt-0.5">
                                Protected Assessment
                              </span>
                            </div>
                          ) : match.entryType === 'practical_lab' ? (
                            <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-950 shadow-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-purple-900 leading-tight">
                                  {match.subjectName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-purple-700 font-medium">
                                <FlaskConical className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                <span>Practical Lab (3 Pds)</span>
                              </div>
                              {isFacultyView ? (
                                <div className="text-[10px] text-purple-800 font-semibold">
                                  Sec {match.sectionName}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                  <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span className="font-mono font-medium">{match.facultyCode}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-[10px] text-purple-800 font-medium pt-0.5">
                                <MapPin className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                <span>{match.roomNumber}</span>
                              </div>
                            </div>
                          ) : match.entryType === 'integrated_lab' ? (
                            <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-950 shadow-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-indigo-900 leading-tight">
                                  {match.subjectName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-medium">
                                <FlaskConical className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                                <span>Integrated Lab (2 Pds)</span>
                              </div>
                              {isFacultyView ? (
                                <div className="text-[10px] text-indigo-800 font-semibold">
                                  Sec {match.sectionName}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                  <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span className="font-mono font-medium">{match.facultyCode}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-[10px] text-indigo-800 font-medium pt-0.5">
                                <MapPin className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                                <span>{match.roomNumber}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs space-y-1 hover:border-indigo-300 transition-colors">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-xs text-indigo-700">
                                  {match.subjectCode}
                                </span>
                              </div>
                              <p className="font-medium text-slate-800 text-[11px] leading-snug line-clamp-1">
                                {match.subjectName}
                              </p>
                              {isFacultyView ? (
                                <div className="text-[10px] text-indigo-700 font-semibold">
                                  Section {match.sectionName}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span className="font-mono">{match.facultyCode}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span>Rm {match.roomNumber}</span>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="py-4 text-center text-[10px] text-slate-300 select-none">
                            — Free —
                          </div>
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
