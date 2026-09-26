import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { cloudService } from '../services/cloudService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { useUiStore } from '../stores/uiStore';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Building2,
  BookOpen,
  FlaskConical,
  Upload,
} from 'lucide-react';
import type { AcademicYear, Section, Room } from '../types';

export const YearsPage: React.FC = () => {
  const { setPage, setSelectedYearId, addToast } = useUiStore();
  const { years, sections, rooms, assignments, labs } = useData();

  // Add Year State
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [yearName, setYearName] = useState('');
  const [orderIndex, setOrderIndex] = useState(years.length + 1);

  // Edit Year State
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  // Configure Section Room State
  const [configuringSection, setConfiguringSection] = useState<Section | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Delete Confirmation
  const [deletingYear, setDeletingYear] = useState<AcademicYear | null>(null);

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = yearName.trim();
    if (!cleanName) return;

    const exists = years.some((y) => y.yearName.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      addToast({ type: 'error', title: 'Duplicate Year', message: `"${cleanName}" already exists.` });
      return;
    }

    const defaultClassrooms = rooms.filter((r) => r.roomType === 'classroom' && r.isActive);
    await cloudService.years.addWithSections(cleanName, Number(orderIndex) || years.length + 1, defaultClassrooms);

    addToast({
      type: 'success',
      title: 'Academic Year Added',
      message: `${cleanName} created with default Sections A, B, and C.`,
    });

    setIsAddYearModalOpen(false);
    setYearName('');
  };

  const handleUpdateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingYear) return;
    const cleanName = yearName.trim();
    if (!cleanName) return;

    await cloudService.years.update(editingYear.id, {
      yearName: cleanName,
      orderIndex: Number(orderIndex) || editingYear.orderIndex,
    });

    addToast({ type: 'success', title: 'Year Updated', message: `${cleanName} details updated.` });
    setEditingYear(null);
  };

  const handleDeleteYear = async () => {
    if (!deletingYear) return;
    await cloudService.years.delete(deletingYear.id);

    addToast({
      type: 'success',
      title: 'Year Removed',
      message: `Deleted ${deletingYear.yearName} along with its sections, subjects, and lab mappings.`,
    });
    setDeletingYear(null);
  };

  const handleSaveSectionRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringSection) return;

    const matchedRoom = rooms.find((r) => r.id === selectedRoomId);
    await cloudService.sections.updateRoom(
      configuringSection.id,
      selectedRoomId,
      matchedRoom ? matchedRoom.roomNumber : undefined
    );

    addToast({
      type: 'success',
      title: 'Classroom Assigned',
      message: `Section ${configuringSection.sectionName} mapped to Room ${matchedRoom?.roomNumber || 'None'}.`,
    });
    setConfiguringSection(null);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Academic Years & Sections</h1>
          <p className="text-xs text-slate-500">
            Manage academic batches, automatic A/B/C sections, and dedicated classroom assignments
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setYearName('');
            setOrderIndex(years.length + 1);
            setIsAddYearModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Academic Year
        </Button>
      </div>

      {/* Years Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {years.map((year) => {
          const yearSections = sections.filter((s) => s.yearId === year.id);
          const yearAssignments = assignments.filter((a) => a.yearId === year.id);
          const uniqueSubjects = new Set(yearAssignments.map((a) => a.subjectCode));
          const yearLabs = labs.filter((l) => l.yearId === year.id);

          return (
            <Card key={year.id} className="relative flex flex-col justify-between">
              <div>
                {/* Year Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{year.yearName}</h3>
                      <p className="text-xs text-slate-500">CSE Department</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      title="Edit Year"
                      onClick={() => {
                        setEditingYear(year);
                        setYearName(year.yearName);
                        setOrderIndex(year.orderIndex);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      title="Delete Year"
                      onClick={() => setDeletingYear(year)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metrics Badges */}
                <div className="grid grid-cols-2 gap-2 my-4">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      Subjects
                    </span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {uniqueSubjects.size} Subject{uniqueSubjects.size !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                      Labs
                    </span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {yearLabs.length} Session{yearLabs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Sections List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Assigned Sections & Rooms
                  </span>

                  {yearSections.map((sec) => (
                    <div
                      key={sec.id}
                      className="flex items-center justify-between p-2.5 bg-white border border-slate-200/90 rounded-lg text-xs hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                          {sec.sectionName}
                        </span>
                        <span className="font-medium text-slate-700">Section {sec.sectionName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={sec.roomNumber ? 'indigo' : 'amber'}>
                          <Building2 className="w-3 h-3 mr-1" />
                          {sec.roomNumber ? `Room ${sec.roomNumber}` : 'Unassigned'}
                        </Badge>
                        <button
                          onClick={() => {
                            setConfiguringSection(sec);
                            setSelectedRoomId(sec.roomId || '');
                          }}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline ml-1"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    setSelectedYearId(year.id);
                    setPage('subjects');
                  }}
                  icon={<Upload className="w-3.5 h-3.5 text-indigo-600" />}
                >
                  Manage / Upload Subjects
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Year Modal */}
      <Modal
        isOpen={isAddYearModalOpen}
        onClose={() => setIsAddYearModalOpen(false)}
        title="Create Academic Year"
        subtitle="Sections A, B, and C will be created automatically"
        maxWidth="md"
      >
        <form onSubmit={handleAddYear} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Academic Year Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 1st Year, 5th Year"
              value={yearName}
              onChange={(e) => setYearName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Display Order
            </label>
            <input
              type="number"
              min={1}
              value={orderIndex}
              onChange={(e) => setOrderIndex(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800">
            <strong>Note:</strong> Creating this year will instantly generate <strong>Section A</strong>, <strong>Section B</strong>, and <strong>Section C</strong>.
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddYearModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Year
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Year Modal */}
      <Modal
        isOpen={!!editingYear}
        onClose={() => setEditingYear(null)}
        title="Edit Academic Year"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateYear} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Academic Year Name *
            </label>
            <input
              type="text"
              required
              value={yearName}
              onChange={(e) => setYearName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Display Order
            </label>
            <input
              type="number"
              min={1}
              value={orderIndex}
              onChange={(e) => setOrderIndex(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setEditingYear(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Configure Section Room Modal */}
      <Modal
        isOpen={!!configuringSection}
        onClose={() => setConfiguringSection(null)}
        title={`Configure Room for Section ${configuringSection?.sectionName}`}
        subtitle="Select the dedicated lecture classroom"
        maxWidth="md"
      >
        <form onSubmit={handleSaveSectionRoom} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Classroom
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">-- No Room Assigned --</option>
              {rooms
                .filter((r) => r.roomType === 'classroom')
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} ({r.roomName}) - Capacity: {r.capacity || 'N/A'}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setConfiguringSection(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deletingYear}
        onClose={() => setDeletingYear(null)}
        onConfirm={handleDeleteYear}
        title="Delete Academic Year"
        message={`Are you sure you want to delete ${deletingYear?.yearName}? All sections (A, B, C), subject allotments, and lab schedules belonging to this year will be permanently removed.`}
        confirmLabel="Delete Everything"
        variant="danger"
      />
    </div>
  );
};
