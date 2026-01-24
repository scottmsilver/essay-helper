import { useState, useEffect, useCallback, useRef, MutableRefObject } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from './useAuth';
import { useEssayUpdates, EssayUpdateFunctions } from './useEssayUpdates';
import { Essay, Claim, createEssay, generateId, getClaimById as modelGetClaimById } from '../models/essay';
import {
  listEssays,
  getEssay,
  saveEssay as saveEssayToFirestore,
  deleteEssay as deleteEssayFromFirestore,
  updateEssayTitle,
  getEssaySharingInfo,
  saveSharingSettings,
  listSharedWithMe,
  getSharedEssay,
  saveSharedEssay as saveSharedEssayToFirestore,
  EssayDocument,
  SharedEssayRef,
  SharingInfo,
  Collaborator,
  Permission,
} from '../firebase/firestore';

const STORAGE_KEY = 'essay-helper-data';

function loadLocalEssay(): Essay | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Essay;
    }
  } catch (e) {
    console.error('Failed to load essay from localStorage:', e);
  }
  return null;
}

function saveLocalEssay(essay: Essay): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(essay));
  } catch (e) {
    console.error('Failed to save essay to localStorage:', e);
  }
}

function clearLocalEssay(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear localStorage:', e);
  }
}

interface SaveSharingParams {
  collaborators: Collaborator[];
  isPublic: boolean;
  publicPermission: 'viewer' | 'editor';
}

export interface UseEssayReturn extends EssayUpdateFunctions {
  essay: Essay;
  essays: EssayDocument[];
  currentEssayId: string | null;
  loading: boolean;
  showMigrationPrompt: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;
  dismissSaveError: () => void;
  getClaimById: (claimId: string) => Claim | undefined;
  resetEssay: () => void;
  selectEssay: (essayId: string) => Promise<void>;
  createNewEssay: () => string;
  deleteEssay: (essayId: string) => Promise<void>;
  renameEssay: (essayId: string, newTitle: string) => Promise<void>;
  handleMigrate: () => Promise<void>;
  handleSkipMigration: () => void;
  sharedEssays: SharedEssayRef[];
  sharingInfo: SharingInfo | null;
  isSharedEssay: boolean;
  sharedEssayPermission: Permission | null;
  selectSharedEssay: (ownerUid: string, essayId: string, permission: Permission) => Promise<void>;
  loadSharingInfo: () => Promise<void>;
  saveSharing: (params: SaveSharingParams) => Promise<void>;
}

export function useEssay(): UseEssayReturn {
  const { user, loading: authLoading } = useAuth();
  const [essay, setEssay] = useState<Essay>(createEssay);
  const [essays, setEssays] = useState<EssayDocument[]>([]);
  const [currentEssayId, setCurrentEssayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sharedEssays, setSharedEssays] = useState<SharedEssayRef[]>([]);
  const [sharingInfo, setSharingInfo] = useState<SharingInfo | null>(null);
  const [isSharedEssay, setIsSharedEssay] = useState(false);
  const [sharedEssayOwnerUid, setSharedEssayOwnerUid] = useState<string | null>(null);
  const [sharedEssayPermission, setSharedEssayPermission] = useState<Permission | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localEssayRef = useRef<Essay | null>(null);
  const lastSavedEssayRef = useRef<string | null>(null);
  const essayRef: MutableRefObject<Essay> = useRef(essay);
  const essaysRef: MutableRefObject<EssayDocument[]> = useRef(essays);

  useEffect(() => {
    essayRef.current = essay;
  }, [essay]);

  useEffect(() => {
    essaysRef.current = essays;
  }, [essays]);

  useEffect(() => {
    if (authLoading) return;

    const loadData = async () => {
      setLoading(true);

      if (user) {
        try {
          const userEssays = await listEssays(user.uid);
          setEssays(userEssays);

          const localData = loadLocalEssay();
          const hasLocalContent =
            localData &&
            (localData.intro?.hook ||
              localData.intro?.background ||
              localData.intro?.thesis ||
              localData.intro?.paragraph ||
              localData.conclusion?.paragraph);

          if (hasLocalContent && userEssays.length === 0) {
            localEssayRef.current = localData;
            setShowMigrationPrompt(true);
            setEssay(localData);
            lastSavedEssayRef.current = JSON.stringify(localData);
            setLastSavedAt(new Date());
          } else if (userEssays.length > 0) {
            const firstEssay = userEssays[0];
            setCurrentEssayId(firstEssay.id);
            const essayData = firstEssay.data || createEssay();
            setEssay(essayData);
            lastSavedEssayRef.current = JSON.stringify(essayData);
            const savedTime =
              (firstEssay.updatedAt as Timestamp)?.toDate?.() ||
              (firstEssay.updatedAt as Date) ||
              new Date();
            setLastSavedAt(savedTime);
          } else {
            const newId = generateId();
            setCurrentEssayId(newId);
            const newEssay = createEssay();
            setEssay(newEssay);
            lastSavedEssayRef.current = JSON.stringify(newEssay);
            setLastSavedAt(null);
          }
        } catch (error) {
          console.error('Failed to load essays:', error);
          setEssay(loadLocalEssay() || createEssay());
        }
      } else {
        setEssays([]);
        setCurrentEssayId(null);
        const localData = loadLocalEssay() || createEssay();
        setEssay(localData);
        lastSavedEssayRef.current = JSON.stringify(localData);
      }

      setHasUnsavedChanges(false);
      setLoading(false);
    };

    loadData();
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      return () => setSharedEssays([]);
    }

    let cancelled = false;
    const loadSharedEssays = async () => {
      try {
        if (user.email) {
          const shared = await listSharedWithMe(user.email);
          if (!cancelled) setSharedEssays(shared);
        }
      } catch (error) {
        console.error('Failed to load shared essays:', error);
      }
    };

    loadSharedEssays();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const markSaveComplete = useCallback((essayJson: string, timestamp: Date) => {
    lastSavedEssayRef.current = essayJson;
    setHasUnsavedChanges(false);
    setLastSavedAt(timestamp);
    setSaveError(null);
  }, []);

  const performSave = useCallback(async () => {
    if (loading || authLoading) return;

    const currentEssay = essayRef.current;
    const currentEssayJson = JSON.stringify(currentEssay);

    if (currentEssayJson === lastSavedEssayRef.current) return;

    const now = new Date();

    if (user && currentEssayId) {
      try {
        if (isSharedEssay && sharedEssayOwnerUid && sharedEssayPermission === 'editor') {
          const sharedInfo = sharedEssays.find(
            (e) => e.essayId === currentEssayId && e.ownerUid === sharedEssayOwnerUid
          );
          const title = sharedInfo?.title || 'Untitled Essay';
          await saveSharedEssayToFirestore(sharedEssayOwnerUid, currentEssayId, currentEssay, title);
        } else {
          const existingEssay = essaysRef.current.find((e) => e.id === currentEssayId);
          const title = existingEssay?.title || 'Untitled Essay';
          await saveEssayToFirestore(user.uid, currentEssayId, currentEssay, title);

          setEssays((prev) => {
            const exists = prev.some((e) => e.id === currentEssayId);
            if (exists) {
              return prev.map((e) =>
                e.id === currentEssayId ? { ...e, data: currentEssay, updatedAt: now } : e
              );
            }
            return [
              { id: currentEssayId, title, data: currentEssay, updatedAt: now } as EssayDocument,
              ...prev,
            ];
          });
        }

        markSaveComplete(currentEssayJson, now);
      } catch {
        saveLocalEssay(currentEssay);
        markSaveComplete(currentEssayJson, now);
        setSaveError('Could not save to cloud. Your changes are saved locally.');
      }
    } else if (!user) {
      saveLocalEssay(currentEssay);
      markSaveComplete(currentEssayJson, now);
    }
  }, [
    user,
    currentEssayId,
    loading,
    authLoading,
    markSaveComplete,
    isSharedEssay,
    sharedEssayOwnerUid,
    sharedEssayPermission,
    sharedEssays,
  ]);

  useEffect(() => {
    if (loading || authLoading) return;

    const currentEssayJson = JSON.stringify(essay);
    const hasChanges = currentEssayJson !== lastSavedEssayRef.current;
    setHasUnsavedChanges(hasChanges);
  }, [essay, loading, authLoading]);

  useEffect(() => {
    if (loading || authLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(performSave, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [essay, loading, authLoading, performSave]);

  useEffect(() => {
    if (loading || authLoading) return;

    autoSaveIntervalRef.current = setInterval(() => {
      performSave();
    }, 30000);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [performSave, loading, authLoading]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleMigrate = useCallback(async () => {
    if (!user || !localEssayRef.current) return;

    const newId = generateId();
    setCurrentEssayId(newId);
    setEssay(localEssayRef.current);

    try {
      await saveEssayToFirestore(user.uid, newId, localEssayRef.current, 'Migrated Essay');
      setEssays([
        {
          id: newId,
          title: 'Migrated Essay',
          data: localEssayRef.current,
          updatedAt: new Date(),
        } as EssayDocument,
      ]);
      clearLocalEssay();
    } catch (error) {
      console.error('Failed to migrate essay:', error);
    }

    setShowMigrationPrompt(false);
    localEssayRef.current = null;
  }, [user]);

  const handleSkipMigration = useCallback(() => {
    const newId = generateId();
    setCurrentEssayId(newId);
    setEssay(createEssay());
    setShowMigrationPrompt(false);
    localEssayRef.current = null;
    clearLocalEssay();
  }, []);

  const selectEssay = useCallback(
    async (essayId: string) => {
      if (!user) return;

      if (essayId === currentEssayId && !isSharedEssay) return;

      setLoading(true);
      setIsSharedEssay(false);
      setSharedEssayOwnerUid(null);
      setSharedEssayPermission(null);
      setSharingInfo(null);

      try {
        const essayData = await getEssay(user.uid, essayId);
        if (essayData) {
          setCurrentEssayId(essayId);
          const loadedData = essayData.data || createEssay();
          setEssay(loadedData);
          lastSavedEssayRef.current = JSON.stringify(loadedData);
          const savedTime =
            (essayData.updatedAt as Timestamp)?.toDate?.() ||
            (essayData.updatedAt as Date) ||
            new Date();
          setLastSavedAt(savedTime);
        } else {
          setCurrentEssayId(essayId);
          const newEssay = createEssay();
          setEssay(newEssay);
          lastSavedEssayRef.current = JSON.stringify(newEssay);
          setLastSavedAt(null);
        }
      } catch (error) {
        console.error('Failed to load essay:', error);
        setCurrentEssayId(essayId);
        const newEssay = createEssay();
        setEssay(newEssay);
        lastSavedEssayRef.current = JSON.stringify(newEssay);
        setLastSavedAt(null);
      }
      setHasUnsavedChanges(false);
      setLoading(false);
    },
    [user, currentEssayId, isSharedEssay]
  );

  const selectSharedEssay = useCallback(
    async (ownerUid: string, essayId: string, permission: Permission) => {
      if (!user) return;

      setLoading(true);
      try {
        const essayData = await getSharedEssay(ownerUid, essayId);
        if (essayData) {
          setCurrentEssayId(essayId);
          const loadedData = essayData.data || createEssay();
          setEssay(loadedData);
          lastSavedEssayRef.current = JSON.stringify(loadedData);
          const savedTime =
            (essayData.updatedAt as Timestamp)?.toDate?.() ||
            (essayData.updatedAt as Date) ||
            new Date();
          setLastSavedAt(savedTime);
          setIsSharedEssay(true);
          setSharedEssayOwnerUid(ownerUid);
          setSharedEssayPermission(permission);
        }
      } catch (error) {
        console.error('Failed to load shared essay:', error);
      }
      setHasUnsavedChanges(false);
      setLoading(false);
    },
    [user]
  );

  const loadSharingInfo = useCallback(async () => {
    if (!user || !currentEssayId || isSharedEssay) {
      setSharingInfo(null);
      return;
    }

    try {
      const info = await getEssaySharingInfo(user.uid, currentEssayId);
      setSharingInfo(info);
    } catch (error) {
      console.error('Failed to load sharing info:', error);
      setSharingInfo(null);
    }
  }, [user, currentEssayId, isSharedEssay]);

  const saveSharing = useCallback(
    async ({ collaborators, isPublic, publicPermission }: SaveSharingParams) => {
      if (!user || !currentEssayId || isSharedEssay) return;

      try {
        const currentEssayData = essays.find((e) => e.id === currentEssayId);
        const title = currentEssayData?.title || 'Untitled Essay';

        const currentEssay = essayRef.current;
        await saveEssayToFirestore(user.uid, currentEssayId, currentEssay, title);

        const publicToken = await saveSharingSettings(
          user.uid,
          currentEssayId,
          collaborators,
          isPublic,
          publicPermission || 'viewer',
          user.email || '',
          user.displayName || '',
          title
        );

        setSharingInfo({
          isPublic,
          publicToken,
          publicPermission,
          collaborators,
        });

        const now = new Date();
        markSaveComplete(JSON.stringify(currentEssay), now);
      } catch (error) {
        console.error('Failed to save sharing settings:', error);
        throw error;
      }
    },
    [user, currentEssayId, isSharedEssay, essays, markSaveComplete]
  );

  const createNewEssay = useCallback((): string => {
    const newId = generateId();
    const newEssay = createEssay();
    setCurrentEssayId(newId);
    setEssay(newEssay);
    lastSavedEssayRef.current = JSON.stringify(newEssay);
    setHasUnsavedChanges(false);
    setIsSharedEssay(false);
    setSharedEssayOwnerUid(null);
    setSharedEssayPermission(null);
    setSharingInfo(null);
    setEssays((prev) => [
      { id: newId, title: 'Untitled', data: newEssay, updatedAt: new Date() } as EssayDocument,
      ...prev,
    ]);
    return newId;
  }, []);

  const deleteEssay = useCallback(
    async (essayId: string) => {
      if (!user) return;

      try {
        await deleteEssayFromFirestore(user.uid, essayId);
        setEssays((prev) => prev.filter((e) => e.id !== essayId));

        if (essayId === currentEssayId) {
          const remaining = essays.filter((e) => e.id !== essayId);
          if (remaining.length > 0) {
            selectEssay(remaining[0].id);
          } else {
            createNewEssay();
          }
        }
      } catch (error) {
        console.error('Failed to delete essay:', error);
      }
    },
    [user, currentEssayId, essays, selectEssay, createNewEssay]
  );

  const renameEssay = useCallback(
    async (essayId: string, newTitle: string) => {
      if (!user) return;

      setEssays((prev) =>
        prev.map((e) => (e.id === essayId ? { ...e, title: newTitle, updatedAt: new Date() } : e))
      );

      try {
        await updateEssayTitle(user.uid, essayId, newTitle);
      } catch (error) {
        console.error('Failed to rename essay:', error);
      }
    },
    [user]
  );

  const {
    updateIntro,
    addClaim,
    updateClaim,
    removeClaim,
    updateBodyParagraph,
    addProofBlock,
    updateProofBlock,
    removeProofBlock,
    updateConclusion,
  } = useEssayUpdates(setEssay);

  const getClaimById = useCallback(
    (claimId: string) => modelGetClaimById(essay, claimId),
    [essay]
  );

  const resetEssay = useCallback(() => {
    if (user) {
      createNewEssay();
    } else {
      const newEssay = createEssay();
      setEssay(newEssay);
      saveLocalEssay(newEssay);
      lastSavedEssayRef.current = JSON.stringify(newEssay);
      setHasUnsavedChanges(false);
    }
  }, [user, createNewEssay]);

  const dismissSaveError = useCallback(() => setSaveError(null), []);

  return {
    essay,
    essays,
    currentEssayId,
    loading: loading || authLoading,
    showMigrationPrompt,
    hasUnsavedChanges,
    lastSavedAt,
    saveError,
    dismissSaveError,
    updateIntro,
    addClaim,
    updateClaim,
    removeClaim,
    updateBodyParagraph,
    addProofBlock,
    updateProofBlock,
    removeProofBlock,
    updateConclusion,
    getClaimById,
    resetEssay,
    selectEssay,
    createNewEssay,
    deleteEssay,
    renameEssay,
    handleMigrate,
    handleSkipMigration,
    sharedEssays,
    sharingInfo,
    isSharedEssay,
    sharedEssayPermission,
    selectSharedEssay,
    loadSharingInfo,
    saveSharing,
  };
}
