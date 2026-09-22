import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { useUiStore } from '../stores/uiStore';
import { Building2, Plus, Edit2, Trash2, FlaskConical } from 'lucide-react';
import type { Room, RoomType } from '../types';

export const RoomsPage: React.FC = () => {
  const { addToast } = useUiStore();

  const rooms = useLiveQuery(() => db.rooms.toArray(), []) || [];
  const sections = useLiveQuery(() => db.sections.toArray(), []) || [];
  const labs = useLiveQuery(() => db.labs.toArray(), []) || [];

  // Add / Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('classroom');
  const [capacity, setCapacity] = useState(65);

  // Delete State
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

  const openAddModal = () => {
    setEditingRoom(null);
    setRoomNumber('');
    setRoomName('');
    setRoomType('classroom');
    setCapacity(65);
    setIsModalOpen(true);
  };

  const openEditModal = (r: Room) => {
    setEditingRoom(r);
    setRoomNumber(r.roomNumber);
    setRoomName(r.roomName);
    setRoomType(r.roomType);
    setCapacity(r.capacity || 60);
    setIsModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = roomNumber.trim();
    const cleanName = roomName.trim() || `Room ${cleanNumber}`;

    if (!cleanNumber) return;

    if (!editingRoom) {
      const exists = rooms.some((r) => r.roomNumber.toLowerCase() === cleanNumber.toLowerCase());
      if (exists) {
        addToast({ type: 'error', title: 'Duplicate Room', message: `Room "${cleanNumber}" already exists.` });
        return;
      }

      await db.rooms.add({
        id: `room_${Date.now()}`,
        roomNumber: cleanNumber,
        roomName: cleanName,
        roomType,
        capacity: Number(capacity) || 60,
        isActive: true,
      });

      addToast({ type: 'success', title: 'Room Added', message: `Room ${cleanNumber} created.` });
    } else {
      await db.rooms.update(editingRoom.id, {
        roomNumber: cleanNumber,
        roomName: cleanName,
        roomType,
        capacity: Number(capacity) || 60,
      });

      // Update roomNumber on sections and labs mapped to this room
      await db.sections.where('roomId').equals(editingRoom.id).modify({ roomNumber: cleanNumber });
      await db.labs.where('roomId').equals(editingRoom.id).modify({ roomNumber: cleanNumber });

      addToast({ type: 'success', title: 'Room Updated', message: `Room ${cleanNumber} updated.` });
    }

    setIsModalOpen(false);
  };

  const handleDeleteRoom = async () => {
    if (!deletingRoom) return;

    const roomId = deletingRoom.id;
    // Check usage
    const isSectionRoom = sections.some((s) => s.roomId === roomId);
    const isLabRoom = labs.some((l) => l.roomId === roomId);

    if (isSectionRoom || isLabRoom) {
      addToast({
        type: 'warning',
        title: 'Room Was In Use',
        message: `Deleted Room ${deletingRoom.roomNumber}. Remember to update affected sections/labs.`,
      });
    }

    await db.rooms.delete(roomId);
    addToast({ type: 'success', title: 'Room Removed', message: `Room ${deletingRoom.roomNumber} deleted.` });
    setDeletingRoom(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Room & Facility Management</h1>
          <p className="text-xs text-slate-500">
            Define department lecture halls, tutorial rooms, and specialized computing laboratories
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={openAddModal} icon={<Plus className="w-4 h-4" />}>
          Add Room
        </Button>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {rooms.map((room) => {
          const mappedSections = sections.filter((s) => s.roomId === room.id);
          const mappedLabs = labs.filter((l) => l.roomId === room.id);

          return (
            <Card key={room.id} className="relative flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        room.roomType === 'lab'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {room.roomType === 'lab' ? (
                        <FlaskConical className="w-5 h-5" />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{room.roomNumber}</h3>
                      <p className="text-xs text-slate-500">{room.roomName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      title="Edit Room"
                      onClick={() => openEditModal(room)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      title="Delete Room"
                      onClick={() => setDeletingRoom(room)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Facility Type:</span>
                    <Badge variant={room.roomType === 'lab' ? 'purple' : 'indigo'}>
                      {room.roomType === 'lab' ? 'Computer Lab' : 'Lecture Classroom'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Seating Capacity:</span>
                    <span className="font-semibold text-slate-800">{room.capacity || '—'} students</span>
                  </div>

                  {mappedSections.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 block mb-1">Base Classroom For:</span>
                      <div className="flex flex-wrap gap-1">
                        {mappedSections.map((s) => (
                          <span
                            key={s.id}
                            className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-semibold"
                          >
                            Sec {s.sectionName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {mappedLabs.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 block mb-1">Host Laboratory For:</span>
                      <div className="flex flex-wrap gap-1">
                        {mappedLabs.map((l) => (
                          <span
                            key={l.id}
                            className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] font-medium"
                          >
                            {l.labName} (Sec {l.sectionName})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Room Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? 'Edit Room' : 'Add Department Room'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Room Number / ID *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 201 or CSE Lab 1"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Room Description / Label
            </label>
            <input
              type="text"
              placeholder="e.g. 2nd Year Lecture Hall A"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Room Type
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as RoomType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="classroom">Lecture Classroom</option>
                <option value="lab">Computer Lab</option>
                <option value="seminar">Seminar / Tutorial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Seating Capacity
              </label>
              <input
                type="number"
                min={10}
                max={200}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingRoom ? 'Save Changes' : 'Create Room'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deletingRoom}
        onClose={() => setDeletingRoom(null)}
        onConfirm={handleDeleteRoom}
        title="Delete Room"
        message={`Are you sure you want to delete Room ${deletingRoom?.roomNumber}? Any sections or labs assigned to this room will have their room mapping unassigned.`}
        confirmLabel="Delete Room"
        variant="danger"
      />
    </div>
  );
};
