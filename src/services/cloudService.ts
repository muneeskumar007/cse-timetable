import { firestore, isFirebaseConfigured } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  type WriteBatch,
  type Firestore,
} from 'firebase/firestore';
import { db } from '../db/database';
import {
  DEFAULT_SETTINGS,
  DEFAULT_PERIODS,
  DEFAULT_FIXED_SLOTS,
  DEFAULT_ROOMS,
  INITIAL_YEARS,
} from '../db/seedData';
import {
  DEMO_FACULTY,
  DEMO_SUBJECTS,
  DEMO_SUBJECT_ASSIGNMENTS,
  DEMO_LABS,
} from '../db/demoData';
import type {
  Faculty,
  AcademicYear,
  Section,
  Room,
  Subject,
  SubjectAssignment,
  Lab,
  PeriodConfig,
  FixedSlot,
  FixedAssignment,
  TimetableEntry,
  TimetableVersion,
  DepartmentSettings,
  AppMetadata,
  BackupData,
} from '../types';

type DataChangeListener = () => void;
const changeListeners: Set<DataChangeListener> = new Set();

export const subscribeToDataChanges = (listener: DataChangeListener) => {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
};

export const notifyDataChanged = () => {
  changeListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error in data change listener:', e);
    }
  });
};

async function commitInChunks(
  fs: Firestore,
  operations: ((batch: WriteBatch) => void)[]
): Promise<void> {
  const CHUNK_SIZE = 400; // Keep well under Firestore's 500 writes per batch limit
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const batch = writeBatch(fs);
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    for (const op of chunk) {
      op(batch);
    }
    await batch.commit();
  }
}

export const cloudService = {
  /**
   * Initializes cloud database with initial years, rooms, settings if empty
   */
  async initialize(): Promise<void> {
    if (!isFirebaseConfigured || !firestore) {
      // Fallback to local Dexie initialization
      const settingsCount = await db.settings.count();
      if (settingsCount === 0) {
        await db.settings.add(DEFAULT_SETTINGS);
        await db.periodConfigs.bulkAdd(DEFAULT_PERIODS);
        await db.fixedSlots.bulkAdd(DEFAULT_FIXED_SLOTS);
        await db.rooms.bulkAdd(DEFAULT_ROOMS);
        for (const group of INITIAL_YEARS) {
          await db.academicYears.add(group.year);
          await db.sections.bulkAdd(group.sections);
        }
      }
      return;
    }

    try {
      const settingsRef = doc(firestore, 'settings', 'department');
      const settingsSnap = await getDoc(settingsRef);

      if (!settingsSnap.exists()) {
        const batch = writeBatch(firestore);

        // Seed settings
        batch.set(settingsRef, { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() });

        // Seed App metadata
        const metaRef = doc(firestore, 'metadata', 'app');
        batch.set(metaRef, {
          id: 'app',
          currentPublishedVersionId: null,
          publishedAt: null,
          schemaVersion: '1.0.0',
          status: 'DRAFT',
          lastSavedAt: new Date().toISOString(),
        } as AppMetadata);

        // Seed periods
        for (const p of DEFAULT_PERIODS) {
          batch.set(doc(firestore, 'periodConfigs', p.id), p);
        }

        // Seed fixed slots
        for (const fs of DEFAULT_FIXED_SLOTS) {
          batch.set(doc(firestore, 'fixedSlots', fs.id), fs);
        }

        // Seed default rooms
        for (const r of DEFAULT_ROOMS) {
          batch.set(doc(firestore, 'rooms', r.id), r);
        }

        // Seed initial years and sections
        for (const group of INITIAL_YEARS) {
          batch.set(doc(firestore, 'academicYears', group.year.id), group.year);
          for (const sec of group.sections) {
            batch.set(doc(firestore, 'sections', sec.id), sec);
          }
        }

        await batch.commit();
      }
    } catch (err) {
      console.warn('Could not initialize Cloud Firestore, falling back to local storage:', err);
    }
  },

  // ================= FACULTY =================
  faculty: {
    async add(fac: Faculty): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await setDoc(doc(firestore, 'faculty', fac.id), {
          ...fac,
          updatedAt: new Date().toISOString(),
        });
      }
      await db.faculty.put(fac);
      notifyDataChanged();
    },

    async update(id: string, partial: Partial<Faculty>): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        const facRef = doc(firestore, 'faculty', id);
        await setDoc(facRef, { ...partial, updatedAt: new Date().toISOString() }, { merge: true });
      }
      await db.faculty.update(id, partial);
      notifyDataChanged();
    },

    async delete(id: string): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await deleteDoc(doc(firestore, 'faculty', id));
      }
      await db.faculty.delete(id);
      notifyDataChanged();
    },

    async bulkUpsert(rows: { facultyCode: string; facultyName: string; weeklyWorkload: number; designation?: string }[], existingFaculty: Faculty[]): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        const batch = writeBatch(firestore);
        for (const row of rows) {
          const match = existingFaculty.find((f) => f.facultyCode.toUpperCase() === row.facultyCode.toUpperCase());
          const id = match?.id || `fac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const facDoc: Faculty = {
            id,
            facultyCode: row.facultyCode,
            facultyName: row.facultyName,
            weeklyWorkload: row.weeklyWorkload,
            designation: row.designation || match?.designation,
            isActive: true,
          };
          batch.set(doc(firestore, 'faculty', id), {
            ...facDoc,
            updatedAt: new Date().toISOString(),
          });
          await db.faculty.put(facDoc);
        }
        await batch.commit();
      } else {
        for (const row of rows) {
          const match = existingFaculty.find((f) => f.facultyCode.toUpperCase() === row.facultyCode.toUpperCase());
          const facDoc: Faculty = {
            id: match?.id || `fac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            facultyCode: row.facultyCode,
            facultyName: row.facultyName,
            weeklyWorkload: row.weeklyWorkload,
            designation: row.designation || match?.designation,
            isActive: true,
          };
          await db.faculty.put(facDoc);
        }
      }
      notifyDataChanged();
    },
  },

  // ================= ACADEMIC YEARS & SECTIONS =================
  years: {
    async addWithSections(yearName: string, orderIndex: number, defaultClassrooms: Room[]): Promise<void> {
      const yearId = `year_${Date.now()}`;
      const year: AcademicYear = { id: yearId, yearName, orderIndex };

      const newSections: Section[] = [
        {
          id: `sec_${yearId}_a`,
          yearId,
          sectionName: 'A',
          roomId: defaultClassrooms[0]?.id,
          roomNumber: defaultClassrooms[0]?.roomNumber,
        },
        {
          id: `sec_${yearId}_b`,
          yearId,
          sectionName: 'B',
          roomId: defaultClassrooms[1]?.id,
          roomNumber: defaultClassrooms[1]?.roomNumber,
        },
        {
          id: `sec_${yearId}_c`,
          yearId,
          sectionName: 'C',
          roomId: defaultClassrooms[2]?.id,
          roomNumber: defaultClassrooms[2]?.roomNumber,
        },
      ];

      if (isFirebaseConfigured && firestore) {
        const batch = writeBatch(firestore);
        batch.set(doc(firestore, 'academicYears', yearId), { ...year, updatedAt: new Date().toISOString() });
        for (const s of newSections) {
          batch.set(doc(firestore, 'sections', s.id), { ...s, updatedAt: new Date().toISOString() });
        }
        await batch.commit();
      }

      await db.academicYears.put(year);
      await db.sections.bulkPut(newSections);
      notifyDataChanged();
    },

    async update(id: string, partial: Partial<AcademicYear>): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await setDoc(doc(firestore, 'academicYears', id), { ...partial, updatedAt: new Date().toISOString() }, { merge: true });
      }
      await db.academicYears.update(id, partial);
      notifyDataChanged();
    },

    async delete(yearId: string): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        const batch = writeBatch(firestore);
        batch.delete(doc(firestore, 'academicYears', yearId));

        // Delete associated sections
        const secSnap = await getDocs(query(collection(firestore, 'sections'), where('yearId', '==', yearId)));
        secSnap.forEach((d) => batch.delete(d.ref));

        // Delete associated subjects & assignments
        const subSnap = await getDocs(query(collection(firestore, 'subjects'), where('yearId', '==', yearId)));
        subSnap.forEach((d) => batch.delete(d.ref));

        const assignSnap = await getDocs(query(collection(firestore, 'subjectAssignments'), where('yearId', '==', yearId)));
        assignSnap.forEach((d) => batch.delete(d.ref));

        const labSnap = await getDocs(query(collection(firestore, 'labs'), where('yearId', '==', yearId)));
        labSnap.forEach((d) => batch.delete(d.ref));

        const entrySnap = await getDocs(query(collection(firestore, 'timetableEntries'), where('yearId', '==', yearId)));
        entrySnap.forEach((d) => batch.delete(d.ref));

        await batch.commit();
      }

      await db.academicYears.delete(yearId);
      await db.sections.where('yearId').equals(yearId).delete();
      await db.subjects.where('yearId').equals(yearId).delete();
      await db.subjectAssignments.where('yearId').equals(yearId).delete();
      await db.labs.where('yearId').equals(yearId).delete();
      await db.timetableEntries.where('yearId').equals(yearId).delete();
      notifyDataChanged();
    },
  },

  // ================= SECTIONS =================
  sections: {
    async updateRoom(sectionId: string, roomId: string, roomNumber?: string): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await setDoc(
          doc(firestore, 'sections', sectionId),
          { roomId, roomNumber: roomNumber || null, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }
      await db.sections.update(sectionId, { roomId, roomNumber });
      notifyDataChanged();
    },
  },

  // ================= ROOMS =================
  rooms: {
    async add(room: Room): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await setDoc(doc(firestore, 'rooms', room.id), { ...room, updatedAt: new Date().toISOString() });
      }
      await db.rooms.put(room);
      notifyDataChanged();
    },

    async update(id: string, partial: Partial<Room>): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await setDoc(doc(firestore, 'rooms', id), { ...partial, updatedAt: new Date().toISOString() }, { merge: true });
      }
      await db.rooms.update(id, partial);
      notifyDataChanged();
    },

    async delete(id: string): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await deleteDoc(doc(firestore, 'rooms', id));
      }
      await db.rooms.delete(id);
      notifyDataChanged();
    },
  },

  // ================= SUBJECTS & ASSIGNMENTS =================
  assignments: {
    async add(assignment: SubjectAssignment): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await setDoc(doc(firestore, 'subjectAssignments', assignment.id), {
          ...assignment,
          updatedAt: new Date().toISOString(),
        });
      }
      await db.subjectAssignments.put(assignment);
      notifyDataChanged();
    },

    async update(id: string, partial: Partial<SubjectAssignment>): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await setDoc(doc(firestore, 'subjectAssignments', id), {
          ...partial,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      await db.subjectAssignments.update(id, partial);
      notifyDataChanged();
    },

    async delete(id: string): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await deleteDoc(doc(firestore, 'subjectAssignments', id));
      }
      await db.subjectAssignments.delete(id);
      notifyDataChanged();
    },

    async replaceForYear(
      yearId: string,
      newAssignments: SubjectAssignment[],
      uniqueSubjects: Subject[]
    ): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        const batch = writeBatch(firestore);

        // Delete existing for this year
        const oldSubSnap = await getDocs(query(collection(firestore, 'subjects'), where('yearId', '==', yearId)));
        oldSubSnap.forEach((d) => batch.delete(d.ref));

        const oldAssignSnap = await getDocs(query(collection(firestore, 'subjectAssignments'), where('yearId', '==', yearId)));
        oldAssignSnap.forEach((d) => batch.delete(d.ref));

        // Add new unique subjects
        for (const s of uniqueSubjects) {
          batch.set(doc(firestore, 'subjects', s.id), { ...s, updatedAt: new Date().toISOString() });
        }

        // Add new assignments
        for (const a of newAssignments) {
          batch.set(doc(firestore, 'subjectAssignments', a.id), { ...a, updatedAt: new Date().toISOString() });
        }

        await batch.commit();
      }

      await db.subjects.where('yearId').equals(yearId).delete();
      await db.subjectAssignments.where('yearId').equals(yearId).delete();
      await db.subjects.bulkPut(uniqueSubjects);
      await db.subjectAssignments.bulkPut(newAssignments);
      notifyDataChanged();
    },
  },

  // ================= LABS =================
  labs: {
    async add(lab: Lab): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await setDoc(doc(firestore, 'labs', lab.id), { ...lab, updatedAt: new Date().toISOString() });
      }
      await db.labs.put(lab);
      notifyDataChanged();
    },

    async update(id: string, partial: Partial<Lab>): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await setDoc(doc(firestore, 'labs', id), { ...partial, updatedAt: new Date().toISOString() }, { merge: true });
      }
      await db.labs.update(id, partial);
      notifyDataChanged();
    },

    async delete(id: string): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await deleteDoc(doc(firestore, 'labs', id));
      }
      await db.labs.delete(id);
      notifyDataChanged();
    },
  },

  // ================= FIXED ASSIGNMENTS =================
  fixedAssignments: {
    async add(assignment: FixedAssignment | (Omit<FixedAssignment, 'id'> & { id?: string })): Promise<FixedAssignment> {
      const fullAssignment: FixedAssignment = {
        ...assignment,
        id: assignment.id || `fa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };
      if (isFirebaseConfigured && firestore) {
        await setDoc(doc(firestore, 'fixedAssignments', fullAssignment.id), {
          ...fullAssignment,
          updatedAt: new Date().toISOString(),
        });
      }
      await db.fixedAssignments.put(fullAssignment);
      notifyDataChanged();
      return fullAssignment;
    },

    async update(id: string, partial: Partial<FixedAssignment>): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await setDoc(doc(firestore, 'fixedAssignments', id), {
          ...partial,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      await db.fixedAssignments.update(id, partial);
      notifyDataChanged();
    },

    async delete(id: string): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await deleteDoc(doc(firestore, 'fixedAssignments', id));
      }
      await db.fixedAssignments.delete(id);
      notifyDataChanged();
    },

    async toggleActive(id: string, active: boolean): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        await setDoc(doc(firestore, 'fixedAssignments', id), {
          active,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      await db.fixedAssignments.update(id, { active });
      notifyDataChanged();
    },
  },

  // ================= SETTINGS =================
  settings: {
    async saveSettings(settings: DepartmentSettings, periods: PeriodConfig[]): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        const batch = writeBatch(firestore);
        batch.set(doc(firestore, 'settings', 'department'), { ...settings, updatedAt: new Date().toISOString() });
        for (const p of periods) {
          batch.set(doc(firestore, 'periodConfigs', p.id), { ...p, updatedAt: new Date().toISOString() });
        }
        await batch.commit();
      }
      await db.settings.put(settings);
      for (const p of periods) {
        await db.periodConfigs.update(p.id, p);
      }
      notifyDataChanged();
    },
  },

  // ================= TIMETABLE =================
  timetable: {
    async saveGenerated(entries: TimetableEntry[]): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        // Clear old generated and batch write new
        const oldSnap = await getDocs(collection(firestore, 'generatedTimetableEntries'));
        const batch = writeBatch(firestore);
        oldSnap.forEach((d) => batch.delete(d.ref));
        for (const e of entries) {
          batch.set(doc(firestore, 'generatedTimetableEntries', e.id), e);
        }
        await batch.commit();
      }
      await db.generatedTimetableEntries.clear();
      await db.generatedTimetableEntries.bulkPut(entries);
      notifyDataChanged();
    },

    async saveCurrent(entries: TimetableEntry[], versionCount: number): Promise<TimetableVersion> {
      const versionId = `ver_${Date.now()}`;
      const newVersion: TimetableVersion = {
        id: versionId,
        versionNumber: versionCount + 1,
        name: `Version ${versionCount + 1}`,
        timestamp: new Date().toLocaleString(),
        isCurrent: true,
        isGenerated: false,
        status: 'FINAL',
        entries: [...entries],
      };

      if (isFirebaseConfigured && firestore) {
        const batch = writeBatch(firestore);

        // Delete previous current entries and set new
        const oldSnap = await getDocs(collection(firestore, 'timetableEntries'));
        oldSnap.forEach((d) => batch.delete(d.ref));
        for (const e of entries) {
          batch.set(doc(firestore, 'timetableEntries', e.id), e);
        }

        // Add version
        batch.set(doc(firestore, 'timetableVersions', versionId), newVersion);

        // Update metadata
        batch.set(
          doc(firestore, 'metadata', 'app'),
          {
            lastSavedAt: new Date().toISOString(),
            status: 'SAVED',
          },
          { merge: true }
        );

        await batch.commit();
      }

      await db.timetableEntries.clear();
      await db.timetableEntries.bulkPut(entries);
      await db.timetableVersions.put(newVersion);
      notifyDataChanged();

      return newVersion;
    },

    async resetToGenerated(): Promise<TimetableEntry[] | null> {
      let generated: TimetableEntry[] = [];
      if (isFirebaseConfigured && firestore) {
        const snap = await getDocs(collection(firestore, 'generatedTimetableEntries'));
        generated = snap.docs.map((d) => d.data() as TimetableEntry);
      }
      if (generated.length === 0) {
        generated = await db.generatedTimetableEntries.toArray();
      }
      if (generated.length === 0) return null;

      if (isFirebaseConfigured && firestore) {
        const batch = writeBatch(firestore);
        const oldSnap = await getDocs(collection(firestore, 'timetableEntries'));
        oldSnap.forEach((d) => batch.delete(d.ref));
        for (const e of generated) {
          batch.set(doc(firestore, 'timetableEntries', e.id), e);
        }
        await batch.commit();
      }

      await db.timetableEntries.clear();
      await db.timetableEntries.bulkPut(generated);
      notifyDataChanged();
      return generated;
    },

    async restoreVersion(version: TimetableVersion): Promise<void> {
      if (isFirebaseConfigured && firestore) {
        const batch = writeBatch(firestore);
        const oldSnap = await getDocs(collection(firestore, 'timetableEntries'));
        oldSnap.forEach((d) => batch.delete(d.ref));
        for (const e of version.entries) {
          batch.set(doc(firestore, 'timetableEntries', e.id), e);
        }
        await batch.commit();
      }
      await db.timetableEntries.clear();
      await db.timetableEntries.bulkPut(version.entries);
      notifyDataChanged();
    },

    async publish(versionId: string, versionNumber: number): Promise<void> {
      const now = new Date().toISOString();
      if (isFirebaseConfigured && firestore) {
        const batch = writeBatch(firestore);
        batch.set(
          doc(firestore, 'metadata', 'app'),
          {
            currentPublishedVersionId: versionId,
            publishedAt: now,
            status: 'PUBLISHED',
          },
          { merge: true }
        );
        batch.set(
          doc(firestore, 'timetableVersions', versionId),
          {
            isPublished: true,
            status: 'PUBLISHED',
          },
          { merge: true }
        );
        await batch.commit();
      }

      await db.timetableVersions.update(versionId, { isPublished: true, status: 'PUBLISHED' });
      notifyDataChanged();
    },
  },

  // ================= DEMO DATA & RESET =================
  async loadDemoData(): Promise<void> {
    if (isFirebaseConfigured && firestore) {
      const fs = firestore;
      try {
        const collectionsToClear = [
          'faculty',
          'academicYears',
          'sections',
          'rooms',
          'subjects',
          'subjectAssignments',
          'labs',
          'periodConfigs',
          'fixedSlots',
          'fixedAssignments',
          'timetableEntries',
          'generatedTimetableEntries',
          'timetableVersions',
        ];

        const ops: ((batch: WriteBatch) => void)[] = [];

        for (const colName of collectionsToClear) {
          const snap = await getDocs(collection(fs, colName));
          snap.forEach((d) => {
            ops.push((batch) => batch.delete(d.ref));
          });
        }

        // Add Settings
        ops.push((batch) =>
          batch.set(doc(fs, 'settings', 'department'), {
            ...DEFAULT_SETTINGS,
            updatedAt: new Date().toISOString(),
          })
        );

        // Add Periods
        for (const p of DEFAULT_PERIODS) {
          ops.push((batch) => batch.set(doc(fs, 'periodConfigs', p.id), p));
        }

        // Add Fixed Slots
        for (const fsItem of DEFAULT_FIXED_SLOTS) {
          ops.push((batch) => batch.set(doc(fs, 'fixedSlots', fsItem.id), fsItem));
        }

        // Add Rooms
        for (const r of DEFAULT_ROOMS) {
          ops.push((batch) => batch.set(doc(fs, 'rooms', r.id), r));
        }

        // Add Years and Sections
        for (const group of INITIAL_YEARS) {
          ops.push((batch) => batch.set(doc(fs, 'academicYears', group.year.id), group.year));
          for (const s of group.sections) {
            ops.push((batch) => batch.set(doc(fs, 'sections', s.id), s));
          }
        }

        // Add Demo Faculty
        for (const f of DEMO_FACULTY) {
          ops.push((batch) => batch.set(doc(fs, 'faculty', f.id), f));
        }

        // Add Demo Subjects & Assignments
        for (const s of DEMO_SUBJECTS) {
          ops.push((batch) => batch.set(doc(fs, 'subjects', s.id), s));
        }
        for (const a of DEMO_SUBJECT_ASSIGNMENTS) {
          ops.push((batch) => batch.set(doc(fs, 'subjectAssignments', a.id), a));
        }

        // Add Demo Labs
        for (const l of DEMO_LABS) {
          ops.push((batch) => batch.set(doc(fs, 'labs', l.id), l));
        }

        // Reset App Metadata
        ops.push((batch) =>
          batch.set(doc(fs, 'metadata', 'app'), {
            id: 'app',
            currentPublishedVersionId: null,
            publishedAt: null,
            schemaVersion: '1.0.0',
            status: 'DRAFT',
            lastSavedAt: new Date().toISOString(),
          })
        );

        await commitInChunks(fs, ops);
      } catch (fsErr) {
        console.warn('Firestore loadDemoData warning (continuing to local storage):', fsErr);
      }
    }

    // Mirror to local Dexie
    await db.faculty.clear();
    await db.academicYears.clear();
    await db.sections.clear();
    await db.rooms.clear();
    await db.subjects.clear();
    await db.subjectAssignments.clear();
    await db.labs.clear();
    await db.periodConfigs.clear();
    await db.fixedSlots.clear();
    await db.fixedAssignments.clear();
    await db.timetableEntries.clear();
    await db.generatedTimetableEntries.clear();
    await db.timetableVersions.clear();
    await db.settings.clear();

    await db.settings.add(DEFAULT_SETTINGS);
    await db.periodConfigs.bulkAdd(DEFAULT_PERIODS);
    await db.fixedSlots.bulkAdd(DEFAULT_FIXED_SLOTS);
    await db.rooms.bulkAdd(DEFAULT_ROOMS);
    for (const group of INITIAL_YEARS) {
      await db.academicYears.add(group.year);
      await db.sections.bulkAdd(group.sections);
    }
    await db.faculty.bulkAdd(DEMO_FACULTY);
    await db.subjects.bulkAdd(DEMO_SUBJECTS);
    await db.subjectAssignments.bulkAdd(DEMO_SUBJECT_ASSIGNMENTS);
    await db.labs.bulkAdd(DEMO_LABS);

    notifyDataChanged();
  },

  async resetProject(): Promise<void> {
    if (isFirebaseConfigured && firestore) {
      const fs = firestore;
      try {
        const collectionsToClear = [
          'faculty',
          'academicYears',
          'sections',
          'rooms',
          'subjects',
          'subjectAssignments',
          'labs',
          'periodConfigs',
          'fixedSlots',
          'fixedAssignments',
          'timetableEntries',
          'generatedTimetableEntries',
          'timetableVersions',
        ];

        const ops: ((batch: WriteBatch) => void)[] = [];
        for (const colName of collectionsToClear) {
          const snap = await getDocs(collection(fs, colName));
          snap.forEach((d) => ops.push((batch) => batch.delete(d.ref)));
        }

        ops.push((batch) =>
          batch.set(doc(fs, 'settings', 'department'), {
            ...DEFAULT_SETTINGS,
            updatedAt: new Date().toISOString(),
          })
        );
        for (const p of DEFAULT_PERIODS) {
          ops.push((batch) => batch.set(doc(fs, 'periodConfigs', p.id), p));
        }
        for (const fsItem of DEFAULT_FIXED_SLOTS) {
          ops.push((batch) => batch.set(doc(fs, 'fixedSlots', fsItem.id), fsItem));
        }
        for (const r of DEFAULT_ROOMS) {
          ops.push((batch) => batch.set(doc(fs, 'rooms', r.id), r));
        }
        for (const group of INITIAL_YEARS) {
          ops.push((batch) => batch.set(doc(fs, 'academicYears', group.year.id), group.year));
          for (const s of group.sections) {
            ops.push((batch) => batch.set(doc(fs, 'sections', s.id), s));
          }
        }
        ops.push((batch) =>
          batch.set(doc(fs, 'metadata', 'app'), {
            id: 'app',
            currentPublishedVersionId: null,
            publishedAt: null,
            schemaVersion: '1.0.0',
            status: 'DRAFT',
          })
        );

        await commitInChunks(fs, ops);
      } catch (fsErr) {
        console.warn('Firestore reset warning (continuing to local storage):', fsErr);
      }
    }

    await db.faculty.clear();
    await db.academicYears.clear();
    await db.sections.clear();
    await db.rooms.clear();
    await db.subjects.clear();
    await db.subjectAssignments.clear();
    await db.labs.clear();
    await db.periodConfigs.clear();
    await db.fixedSlots.clear();
    await db.fixedAssignments.clear();
    await db.timetableEntries.clear();
    await db.generatedTimetableEntries.clear();
    await db.timetableVersions.clear();
    await db.settings.clear();

    await db.settings.add(DEFAULT_SETTINGS);
    await db.periodConfigs.bulkAdd(DEFAULT_PERIODS);
    await db.fixedSlots.bulkAdd(DEFAULT_FIXED_SLOTS);
    await db.rooms.bulkAdd(DEFAULT_ROOMS);
    for (const group of INITIAL_YEARS) {
      await db.academicYears.add(group.year);
      await db.sections.bulkAdd(group.sections);
    }

    notifyDataChanged();
  },

  async restoreAll(backupData: BackupData): Promise<void> {
    if (isFirebaseConfigured && firestore) {
      const fs = firestore;
      try {
        const collectionsToClear = [
          'faculty',
          'academicYears',
          'sections',
          'rooms',
          'subjects',
          'subjectAssignments',
          'labs',
          'periodConfigs',
          'fixedSlots',
          'fixedAssignments',
          'timetableEntries',
          'generatedTimetableEntries',
          'timetableVersions',
        ];

        const ops: ((batch: WriteBatch) => void)[] = [];
        for (const colName of collectionsToClear) {
          const snap = await getDocs(collection(fs, colName));
          snap.forEach((d) => ops.push((batch) => batch.delete(d.ref)));
        }

        if (backupData.departmentSettings) {
          ops.push((batch) => batch.set(doc(fs, 'settings', 'department'), backupData.departmentSettings));
        }
        for (const f of backupData.faculty || []) {
          ops.push((batch) => batch.set(doc(fs, 'faculty', f.id), f));
        }
        for (const y of backupData.years || []) {
          ops.push((batch) => batch.set(doc(fs, 'academicYears', y.id), y));
        }
        for (const s of backupData.sections || []) {
          ops.push((batch) => batch.set(doc(fs, 'sections', s.id), s));
        }
        for (const r of backupData.rooms || []) {
          ops.push((batch) => batch.set(doc(fs, 'rooms', r.id), r));
        }
        for (const sub of backupData.subjects || []) {
          ops.push((batch) => batch.set(doc(fs, 'subjects', sub.id), sub));
        }
        for (const a of backupData.subjectAssignments || []) {
          ops.push((batch) => batch.set(doc(fs, 'subjectAssignments', a.id), a));
        }
        for (const l of backupData.labs || []) {
          ops.push((batch) => batch.set(doc(fs, 'labs', l.id), l));
        }
        for (const p of backupData.periods || []) {
          ops.push((batch) => batch.set(doc(fs, 'periodConfigs', p.id), p));
        }
        for (const fsItem of backupData.fixedSlots || []) {
          ops.push((batch) => batch.set(doc(fs, 'fixedSlots', fsItem.id), fsItem));
        }
        for (const fa of backupData.fixedAssignments || []) {
          ops.push((batch) => batch.set(doc(fs, 'fixedAssignments', fa.id), fa));
        }
        for (const e of backupData.currentTimetable || []) {
          ops.push((batch) => batch.set(doc(fs, 'timetableEntries', e.id), e));
        }
        for (const ge of backupData.generatedTimetable || []) {
          ops.push((batch) => batch.set(doc(fs, 'generatedTimetableEntries', ge.id), ge));
        }
        for (const v of backupData.timetableVersions || []) {
          ops.push((batch) => batch.set(doc(fs, 'timetableVersions', v.id), v));
        }

        await commitInChunks(fs, ops);
      } catch (fsErr) {
        console.warn('Firestore restoreAll warning (continuing to local storage):', fsErr);
      }
    }

    // Mirror to Dexie
    await db.settings.clear();
    await db.faculty.clear();
    await db.academicYears.clear();
    await db.sections.clear();
    await db.rooms.clear();
    await db.subjects.clear();
    await db.subjectAssignments.clear();
    await db.labs.clear();
    await db.periodConfigs.clear();
    await db.fixedSlots.clear();
    await db.fixedAssignments.clear();
    await db.timetableEntries.clear();
    await db.generatedTimetableEntries.clear();
    await db.timetableVersions.clear();

    if (backupData.departmentSettings) await db.settings.add(backupData.departmentSettings);
    if (backupData.faculty?.length) await db.faculty.bulkAdd(backupData.faculty);
    if (backupData.years?.length) await db.academicYears.bulkAdd(backupData.years);
    if (backupData.sections?.length) await db.sections.bulkAdd(backupData.sections);
    if (backupData.rooms?.length) await db.rooms.bulkAdd(backupData.rooms);
    if (backupData.subjects?.length) await db.subjects.bulkAdd(backupData.subjects);
    if (backupData.subjectAssignments?.length) await db.subjectAssignments.bulkAdd(backupData.subjectAssignments);
    if (backupData.labs?.length) await db.labs.bulkAdd(backupData.labs);
    if (backupData.periods?.length) await db.periodConfigs.bulkAdd(backupData.periods);
    if (backupData.fixedSlots?.length) await db.fixedSlots.bulkAdd(backupData.fixedSlots);
    if (backupData.fixedAssignments?.length) await db.fixedAssignments.bulkAdd(backupData.fixedAssignments);
    if (backupData.currentTimetable?.length) await db.timetableEntries.bulkAdd(backupData.currentTimetable);
    if (backupData.generatedTimetable?.length) await db.generatedTimetableEntries.bulkAdd(backupData.generatedTimetable);
    if (backupData.timetableVersions?.length) await db.timetableVersions.bulkAdd(backupData.timetableVersions);

    notifyDataChanged();
  },
};
