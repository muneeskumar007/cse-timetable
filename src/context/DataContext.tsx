import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { firestore, isFirebaseConfigured } from '../lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../db/database';
import { cloudService } from '../services/cloudService';
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
  CloudStatus,
} from '../types';

interface DataContextType {
  faculty: Faculty[];
  years: AcademicYear[];
  sections: Section[];
  rooms: Room[];
  subjects: Subject[];
  assignments: SubjectAssignment[];
  labs: Lab[];
  periods: PeriodConfig[];
  fixedSlots: FixedSlot[];
  fixedAssignments: FixedAssignment[];
  entries: TimetableEntry[];
  generatedEntries: TimetableEntry[];
  versions: TimetableVersion[];
  settings: DepartmentSettings;
  metadata: AppMetadata;
  cloudStatus: CloudStatus;
  isCloudReady: boolean;
  publishTimetable: (versionId: string) => Promise<void>;
  saveTimetable: (entries: TimetableEntry[]) => Promise<TimetableVersion>;
  resetToGenerated: () => Promise<boolean>;
  restoreVersion: (version: TimetableVersion) => Promise<void>;
}

const defaultSettings: DepartmentSettings = {
  id: 'default',
  departmentName: 'Computer Science and Engineering',
  collegeName: 'Department of Computer Science and Engineering',
  academicYear: '2026-2027',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  periodsPerFullDay: 7,
  periodsOnSaturday: 4,
  lunchAfterPeriod: 4,
};

const defaultMetadata: AppMetadata = {
  id: 'app',
  currentPublishedVersionId: null,
  publishedAt: null,
  schemaVersion: '1.0.0',
  status: 'DRAFT',
};

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [periods, setPeriods] = useState<PeriodConfig[]>([]);
  const [fixedSlots, setFixedSlots] = useState<FixedSlot[]>([]);
  const [fixedAssignments, setFixedAssignments] = useState<FixedAssignment[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [generatedEntries, setGeneratedEntries] = useState<TimetableEntry[]>([]);
  const [versions, setVersions] = useState<TimetableVersion[]>([]);
  const [settings, setSettings] = useState<DepartmentSettings>(defaultSettings);
  const [metadata, setMetadata] = useState<AppMetadata>(defaultMetadata);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(
    isFirebaseConfigured ? 'syncing' : 'fallback'
  );
  const [isCloudReady, setIsCloudReady] = useState(false);

  // Initialize and attach listeners
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const setup = async () => {
      // Run initial cloud or local seed
      await cloudService.initialize();

      if (isFirebaseConfigured && firestore) {
        setCloudStatus('syncing');

        try {
          // 1. Settings listener
          const unsubSettings = onSnapshot(
            doc(firestore, 'settings', 'department'),
            (snap) => {
              if (snap.exists()) {
                const data = snap.data() as DepartmentSettings;
                setSettings(data);
                db.settings.put(data).catch(() => {});
              }
            },
            (err) => console.warn('Settings listener error:', err)
          );
          unsubs.push(unsubSettings);

          // 2. Metadata listener
          const unsubMeta = onSnapshot(
            doc(firestore, 'metadata', 'app'),
            (snap) => {
              if (snap.exists()) {
                setMetadata(snap.data() as AppMetadata);
              }
            },
            (err) => console.warn('Metadata listener error:', err)
          );
          unsubs.push(unsubMeta);

          // 3. Faculty listener
          const unsubFaculty = onSnapshot(
            collection(firestore, 'faculty'),
            (snap) => {
              const list = snap.docs.map((d) => d.data() as Faculty);
              setFaculty(list);
              db.faculty.clear().then(() => db.faculty.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('Faculty listener error:', err)
          );
          unsubs.push(unsubFaculty);

          // 4. Academic Years listener
          const unsubYears = onSnapshot(
            collection(firestore, 'academicYears'),
            (snap) => {
              const list = snap.docs
                .map((d) => d.data() as AcademicYear)
                .sort((a, b) => a.orderIndex - b.orderIndex);
              setYears(list);
              db.academicYears.clear().then(() => db.academicYears.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('Years listener error:', err)
          );
          unsubs.push(unsubYears);

          // 5. Sections listener
          const unsubSections = onSnapshot(
            collection(firestore, 'sections'),
            (snap) => {
              const list = snap.docs.map((d) => d.data() as Section);
              setSections(list);
              db.sections.clear().then(() => db.sections.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('Sections listener error:', err)
          );
          unsubs.push(unsubSections);

          // 6. Rooms listener
          const unsubRooms = onSnapshot(
            collection(firestore, 'rooms'),
            (snap) => {
              const list = snap.docs.map((d) => d.data() as Room);
              setRooms(list);
              db.rooms.clear().then(() => db.rooms.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('Rooms listener error:', err)
          );
          unsubs.push(unsubRooms);

          // 7. Subjects listener
          const unsubSubjects = onSnapshot(
            collection(firestore, 'subjects'),
            (snap) => {
              const list = snap.docs.map((d) => d.data() as Subject);
              setSubjects(list);
              db.subjects.clear().then(() => db.subjects.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('Subjects listener error:', err)
          );
          unsubs.push(unsubSubjects);

          // 8. Subject Assignments listener
          const unsubAssignments = onSnapshot(
            collection(firestore, 'subjectAssignments'),
            (snap) => {
              const list = snap.docs.map((d) => d.data() as SubjectAssignment);
              setAssignments(list);
              db.subjectAssignments.clear().then(() => db.subjectAssignments.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('Assignments listener error:', err)
          );
          unsubs.push(unsubAssignments);

          // 9. Labs listener
          const unsubLabs = onSnapshot(
            collection(firestore, 'labs'),
            (snap) => {
              const list = snap.docs.map((d) => d.data() as Lab);
              setLabs(list);
              db.labs.clear().then(() => db.labs.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('Labs listener error:', err)
          );
          unsubs.push(unsubLabs);

          // 10. Period Configs listener
          const unsubPeriods = onSnapshot(
            collection(firestore, 'periodConfigs'),
            (snap) => {
              const list = snap.docs
                .map((d) => d.data() as PeriodConfig)
                .sort((a, b) => a.periodNumber - b.periodNumber);
              setPeriods(list);
              db.periodConfigs.clear().then(() => db.periodConfigs.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('PeriodConfigs listener error:', err)
          );
          unsubs.push(unsubPeriods);

          // 11. Fixed Slots listener
          const unsubFixed = onSnapshot(
            collection(firestore, 'fixedSlots'),
            (snap) => {
              const list = snap.docs.map((d) => d.data() as FixedSlot);
              setFixedSlots(list);
              db.fixedSlots.clear().then(() => db.fixedSlots.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('FixedSlots listener error:', err)
          );
          unsubs.push(unsubFixed);

          // 11b. Fixed Assignments listener
          const unsubFixedAssignments = onSnapshot(
            collection(firestore, 'fixedAssignments'),
            (snap) => {
              const list = snap.docs.map((d) => d.data() as FixedAssignment);
              setFixedAssignments(list);
              db.fixedAssignments.clear().then(() => db.fixedAssignments.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('FixedAssignments listener error:', err)
          );
          unsubs.push(unsubFixedAssignments);

          // 12. Timetable Entries listener
          const unsubEntries = onSnapshot(
            collection(firestore, 'timetableEntries'),
            (snap) => {
              const list = snap.docs.map((d) => d.data() as TimetableEntry);
              setEntries(list);
              db.timetableEntries.clear().then(() => db.timetableEntries.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('TimetableEntries listener error:', err)
          );
          unsubs.push(unsubEntries);

          // 13. Generated Entries listener
          const unsubGen = onSnapshot(
            collection(firestore, 'generatedTimetableEntries'),
            (snap) => {
              const list = snap.docs.map((d) => d.data() as TimetableEntry);
              setGeneratedEntries(list);
              db.generatedTimetableEntries.clear().then(() => db.generatedTimetableEntries.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('GeneratedEntries listener error:', err)
          );
          unsubs.push(unsubGen);

          // 14. Timetable Versions listener
          const unsubVersions = onSnapshot(
            collection(firestore, 'timetableVersions'),
            (snap) => {
              const list = snap.docs
                .map((d) => d.data() as TimetableVersion)
                .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
              setVersions(list);
              db.timetableVersions.clear().then(() => db.timetableVersions.bulkPut(list)).catch(() => {});
            },
            (err) => console.warn('Versions listener error:', err)
          );
          unsubs.push(unsubVersions);

          setCloudStatus('connected');
        } catch (err) {
          console.warn('Real-time listener setup error, falling back to local storage:', err);
          setCloudStatus('fallback');
          await loadFromLocal();
        }
      } else {
        setCloudStatus('fallback');
        await loadFromLocal();
      }

      setIsCloudReady(true);
    };

    const loadFromLocal = async () => {
      const [
        sList,
        fac,
        yr,
        sec,
        rm,
        sub,
        asgn,
        lb,
        pr,
        fs,
        fa,
        ent,
        gen,
        ver,
      ] = await Promise.all([
        db.settings.toArray(),
        db.faculty.toArray(),
        db.academicYears.orderBy('orderIndex').toArray(),
        db.sections.toArray(),
        db.rooms.toArray(),
        db.subjects.toArray(),
        db.subjectAssignments.toArray(),
        db.labs.toArray(),
        db.periodConfigs.orderBy('periodNumber').toArray(),
        db.fixedSlots.toArray(),
        db.fixedAssignments.toArray(),
        db.timetableEntries.toArray(),
        db.generatedTimetableEntries.toArray(),
        db.timetableVersions.orderBy('versionNumber').reverse().toArray(),
      ]);

      if (sList[0]) setSettings(sList[0]);
      setFaculty(fac);
      setYears(yr);
      setSections(sec);
      setRooms(rm);
      setSubjects(sub);
      setAssignments(asgn);
      setLabs(lb);
      setPeriods(pr);
      setFixedSlots(fs);
      setFixedAssignments(fa);
      setEntries(ent);
      setGeneratedEntries(gen);
      setVersions(ver);
    };

    setup();

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  const publishTimetable = async (versionId: string) => {
    setCloudStatus('syncing');
    try {
      const ver = versions.find((v) => v.id === versionId) || versions[0];
      await cloudService.timetable.publish(versionId, ver ? ver.versionNumber : 1);
      setMetadata((prev) => ({
        ...prev,
        currentPublishedVersionId: versionId,
        publishedAt: new Date().toISOString(),
        status: 'PUBLISHED',
      }));
      setCloudStatus('saved');
      setTimeout(() => setCloudStatus(isFirebaseConfigured ? 'connected' : 'fallback'), 3000);
    } catch (err) {
      setCloudStatus('offline');
      throw err;
    }
  };

  const saveTimetable = async (newEntries: TimetableEntry[]): Promise<TimetableVersion> => {
    setCloudStatus('syncing');
    try {
      const ver = await cloudService.timetable.saveCurrent(newEntries, versions.length);
      setEntries(newEntries);
      setVersions((prev) => [ver, ...prev]);
      setCloudStatus('saved');
      setTimeout(() => setCloudStatus(isFirebaseConfigured ? 'connected' : 'fallback'), 3000);
      return ver;
    } catch (err) {
      setCloudStatus('offline');
      throw err;
    }
  };

  const resetToGenerated = async (): Promise<boolean> => {
    setCloudStatus('syncing');
    try {
      const gen = await cloudService.timetable.resetToGenerated();
      if (!gen) return false;
      setEntries(gen);
      setCloudStatus('saved');
      setTimeout(() => setCloudStatus(isFirebaseConfigured ? 'connected' : 'fallback'), 3000);
      return true;
    } catch (err) {
      setCloudStatus('offline');
      throw err;
    }
  };

  const restoreVersion = async (version: TimetableVersion): Promise<void> => {
    setCloudStatus('syncing');
    try {
      await cloudService.timetable.restoreVersion(version);
      setEntries(version.entries);
      setCloudStatus('saved');
      setTimeout(() => setCloudStatus(isFirebaseConfigured ? 'connected' : 'fallback'), 3000);
    } catch (err) {
      setCloudStatus('offline');
      throw err;
    }
  };

  const value = useMemo(
    () => ({
      faculty,
      years,
      sections,
      rooms,
      subjects,
      assignments,
      labs,
      periods,
      fixedSlots,
      fixedAssignments,
      entries,
      generatedEntries,
      versions,
      settings,
      metadata,
      cloudStatus,
      isCloudReady,
      publishTimetable,
      saveTimetable,
      resetToGenerated,
      restoreVersion,
    }),
    [
      faculty,
      years,
      sections,
      rooms,
      subjects,
      assignments,
      labs,
      periods,
      fixedSlots,
      fixedAssignments,
      entries,
      generatedEntries,
      versions,
      settings,
      metadata,
      cloudStatus,
      isCloudReady,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
