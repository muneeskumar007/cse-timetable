import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { useUiStore } from '../stores/uiStore';
import { FlaskConical, Plus, Edit2, Trash2, Clock, MapPin, User, Info } from 'lucide-react';
import type { Lab, LabType } from '../types';

export const LabsPage: React.FC = () => {
  const { addToast } = useUiStore();

  const labs = useLiveQuery(() => db.labs.toArray(), []) || [];
  const years = useLiveQuery(() => db.academicYears.orderBy('orderIndex').toArray(), []) || [];
  const sections = useLiveQuery(() => db.sections.toArray(), []) || [];
  const rooms = useLiveQuery(() => db.rooms.where('roomType').equals('lab').toArray(), []) || [];
  const allRooms = useLiveQuery(() => db.rooms.toArray(), []) || [];
  const faculty = useLiveQuery(() => db.faculty.toArray(), []) || [];

  // Filter state
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');

  // Add / Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [labName, setLabName] = useState('');
  const [labType, setLabType] = useState<LabType>('practical');
  const [targetYearId, setTargetYearId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [targetFacultyCode, setTargetFacultyCode] = useState('');
  const [targetRoomId, setTargetRoomId] = useState('');

  // Delete State
  const [deletingLab, setDeletingLab] = useState<Lab | null>(null);

  const openAddModal = () => {
    setEditingLab(null);
    setLabName('');
    setLabType('practical');
    const defaultYearId = years[0]?.id || '';
    setTargetYearId(defaultYearId);
    const availableSections = sections.filter((s) => s.yearId === defaultYearId);
    setTargetSectionId(availableSections[0]?.id || '');
    setTargetFacultyCode(faculty[0]?.facultyCode || '');
    setTargetRoomId(rooms[0]?.id || allRooms[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (lab: Lab) => {
    setEditingLab(lab);
    setLabName(lab.labName);
    setLabType(lab.labType);
    setTargetYearId(lab.yearId);
    setTargetSectionId(lab.sectionId);
    setTargetFacultyCode(lab.facultyCode);
    setTargetRoomId(lab.roomId);
    setIsModalOpen(true);
  };

  const handleYearChange = (newYearId: string) => {
    setTargetYearId(newYearId);
    const availableSections = sections.filter((s) => s.yearId === newYearId);
    setTargetSectionId(availableSections[0]?.id || '');
  };

  const handleSaveLab = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = labName.trim();
    if (!cleanName || !targetYearId || !targetSectionId || !targetFacultyCode || !targetRoomId) {
      addToast({ type: 'error', title: 'Incomplete Details', message: 'All lab fields are required.' });
      return;
    }

    const matchedSec = sections.find((s) => s.id === targetSectionId);
    const matchedFac = faculty.find((f) => f.facultyCode.toUpperCase() === targetFacultyCode.toUpperCase());
    const matchedRoom = allRooms.find((r) => r.id === targetRoomId);

    if (!matchedSec || !matchedFac || !matchedRoom) {
      addToast({ type: 'error', title: 'Invalid References', message: 'Selected section, faculty or room is invalid.' });
      return;
    }

    const weeklyPeriods = labType === 'practical' ? 3 : 2;

    if (!editingLab) {
      await db.labs.add({
        id: `lab_${Date.now()}`,
        labName: cleanName,
        labType,
        yearId: targetYearId,
        sectionId: matchedSec.id,
        sectionName: matchedSec.sectionName,
        facultyCode: matchedFac.facultyCode,
        facultyName: matchedFac.facultyName,
        roomId: matchedRoom.id,
        roomNumber: matchedRoom.roomNumber,
        weeklyPeriods,
      });
      addToast({
        type: 'success',
        title: 'Lab Configured',
        message: `${cleanName} (${labType === 'practical' ? '3 periods' : '2 periods'}) added for Sec ${matchedSec.sectionName}.`,
      });
    } else {
      await db.labs.update(editingLab.id, {
        labName: cleanName,
        labType,
        yearId: targetYearId,
        sectionId: matchedSec.id,
        sectionName: matchedSec.sectionName,
        facultyCode: matchedFac.facultyCode,
        facultyName: matchedFac.facultyName,
        roomId: matchedRoom.id,
        roomNumber: matchedRoom.roomNumber,
        weeklyPeriods,
      });
      addToast({
        type: 'success',
        title: 'Lab Updated',
        message: `${cleanName} updated for Section ${matchedSec.sectionName}.`,
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteLab = async () => {
    if (!deletingLab) return;
    await db.labs.delete(deletingLab.id);
    addToast({
      type: 'success',
      title: 'Lab Session Removed',
      message: `${deletingLab.labName} for Section ${deletingLab.sectionName} deleted.`,
    });
    setDeletingLab(null);
  };

  const filteredLabs = selectedYearFilter === 'all'
    ? labs
    : labs.filter((l) => l.yearId === selectedYearFilter);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Lab Session Configurations</h1>
          <p className="text-xs text-slate-500">
            Configure Practical Labs (3 consecutive periods) and Integrated Labs (2 consecutive periods)
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={openAddModal} icon={<Plus className="w-4 h-4" />}>
          Configure New Lab
        </Button>
      </div>

      {/* Rules Banner */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-purple-900 leading-relaxed">
          <p className="font-semibold text-sm mb-1 text-purple-950">Timetable Lab Constraints Enforcement</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 text-purple-800">
            <div>• <strong>Practical Labs:</strong> Exactly 3 consecutive periods, once per week. Stays as an atomic block. Never crosses lunch.</div>
            <div>• <strong>Integrated Labs:</strong> Exactly 2 consecutive periods, once per week. Stays as an atomic block. Never crosses lunch.</div>
            <div>• <strong>Saturday Rule:</strong> Practical labs are never placed on Saturday due to the 4-period half-day and Unit Test limit.</div>
            <div>• <strong>Workload:</strong> Lab periods automatically contribute to the assigned faculty member’s workload calculation.</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedYearFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            selectedYearFilter === 'all'
              ? 'bg-slate-800 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Years ({labs.length})
        </button>
        {years.map((y) => {
          const count = labs.filter((l) => l.yearId === y.id).length;
          return (
            <button
              key={y.id}
              onClick={() => setSelectedYearFilter(y.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedYearFilter === y.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {y.yearName} ({count})
            </button>
          );
        })}
      </div>

      {/* Labs Table */}
      <Card>
        {filteredLabs.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Lab Sessions Configured</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Configure practical or integrated labs for your academic sections.
            </p>
            <Button size="sm" onClick={openAddModal} icon={<Plus className="w-3.5 h-3.5" />}>
              Configure First Lab
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-5">Lab Course Name</th>
                  <th className="py-3 px-5">Lab Category</th>
                  <th className="py-3 px-5">Duration & Frequency</th>
                  <th className="py-3 px-5">Year / Section</th>
                  <th className="py-3 px-5">Faculty In-Charge</th>
                  <th className="py-3 px-5">Dedicated Lab Room</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLabs.map((lab) => {
                  const y = years.find((item) => item.id === lab.yearId);
                  const isPractical = lab.labType === 'practical';

                  return (
                    <tr key={lab.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        {lab.labName}
                      </td>
                      <td className="py-3.5 px-5">
                        <Badge variant={isPractical ? 'purple' : 'blue'}>
                          {isPractical ? 'Practical Lab' : 'Integrated Lab'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isPractical ? '3 Consecutive Periods' : '2 Consecutive Periods'}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">Once per week (atomic block)</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="text-xs font-medium text-slate-700 block">
                          {y?.yearName || 'Year'}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-bold mt-0.5">
                          Section {lab.sectionName}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-800 text-xs">
                            {lab.facultyName}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400">
                          {lab.facultyCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-purple-600" />
                          <span>{lab.roomNumber}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Edit Lab"
                            onClick={() => openEditModal(lab)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            title="Delete Lab"
                            onClick={() => setDeletingLab(lab)}
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

      {/* Add / Edit Lab Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLab ? 'Edit Lab Configuration' : 'Configure Lab Session'}
        subtitle="Practical (3 periods) or Integrated (2 periods)"
        maxWidth="md"
      >
        <form onSubmit={handleSaveLab} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Lab Course Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Data Structures Laboratory"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Lab Category *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex flex-col cursor-pointer transition-all ${
                  labType === 'practical'
                    ? 'border-purple-500 bg-purple-50/50 text-purple-900 ring-2 ring-purple-400'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="labType"
                  value="practical"
                  checked={labType === 'practical'}
                  onChange={() => setLabType('practical')}
                  className="hidden"
                />
                <span className="font-bold text-sm">Practical Lab</span>
                <span className="text-xs text-slate-500 mt-0.5">3 Consecutive Periods</span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col cursor-pointer transition-all ${
                  labType === 'integrated'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-400'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="labType"
                  value="integrated"
                  checked={labType === 'integrated'}
                  onChange={() => setLabType('integrated')}
                  className="hidden"
                />
                <span className="font-bold text-sm">Integrated Lab</span>
                <span className="text-xs text-slate-500 mt-0.5">2 Consecutive Periods</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Academic Year *
              </label>
              <select
                value={targetYearId}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.yearName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Section *
              </label>
              <select
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {sections
                  .filter((s) => s.yearId === targetYearId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.sectionName}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Faculty In-Charge *
            </label>
            <select
              value={targetFacultyCode}
              onChange={(e) => setTargetFacultyCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {faculty.map((f) => (
                <option key={f.id} value={f.facultyCode}>
                  {f.facultyCode} — {f.facultyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Laboratory Room *
            </label>
            <select
              value={targetRoomId}
              onChange={(e) => setTargetRoomId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {allRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({r.roomName}) [{r.roomType}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingLab ? 'Save Changes' : 'Save Lab Session'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deletingLab}
        onClose={() => setDeletingLab(null)}
        onConfirm={handleDeleteLab}
        title="Delete Lab Session"
        message={`Are you sure you want to delete "${deletingLab?.labName}" for Section ${deletingLab?.sectionName}?`}
        confirmLabel="Delete Lab"
        variant="danger"
      />
    </div>
  );
};
