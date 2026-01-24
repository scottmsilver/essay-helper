import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useEssayUpdates } from './useEssayUpdates';
import { createEssay, generateId, getClaimById as modelGetClaimById } from '../models/essay';
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
} from '../firebase/firestore';

const STORAGE_KEY = 'essay-helper-data';

const loadLocalEssay = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load essay from localStorage:', e);
  }
  return null;
};

const saveLocalEssay = (essay) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(essay));
  } catch (e) {
    console.error('Failed to save essay to localStorage:', e);
  }
};

const clearLocalEssay = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear localStorage:', e);
  }
};

export function useEssay() {
  const { user, loading: authLoading } = useAuth();
  const [essay, setEssay] = useState(createEssay);
  const [essays, setEssays] = useState([]);
  const [currentEssayId, setCurrentEssayId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [sharedEssays, setSharedEssays] = useState([]);
  const [sharingInfo, setSharingInfo] = useState(null);
  const [isSharedEssay, setIsSharedEssay] = useState(false);
  const [sharedEssayOwnerUid, setSharedEssayOwnerUid] = useState(null);
  const [sharedEssayPermission, setSharedEssayPermission] = useState(null);
  const saveTimeoutRef = useRef(null);
  const autoSaveIntervalRef = useRef(null);
  const localEssayRef = useRef(null);
  const lastSavedEssayRef = useRef(null);
  const essayRef = useRef(essay);
  const essaysRef = useRef(essays);

  // Keep refs in sync
  useEffect(() => {
    essayRef.current = essay;
  }, [essay]);

  useEffect(() => {
    essaysRef.current = essays;
  }, [essays]);

  // Load essays when user changes
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
            // Set lastSavedAt from Firestore timestamp
            const savedTime = firstEssay.updatedAt?.toDate?.() || firstEssay.updatedAt || new Date();
            setLastSavedAt(savedTime);
          } else {
            const newId = generateId();
            setCurrentEssayId(newId);
            const newEssay = createEssay();
            setEssay(newEssay);
            lastSavedEssayRef.current = JSON.stringify(newEssay);
            setLastSavedAt(null); // New essay, not saved yet
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

  // Load shared essays when user changes
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Clear shared essays when logged out - handled in cleanup
      return () => setSharedEssays([]);
    }

    let cancelled = false;
    const loadSharedEssays = async () => {
      try {
        const shared = await listSharedWithMe(user.email);
        if (!cancelled) setSharedEssays(shared);
      } catch (error) {
        console.error('Failed to load shared essays:', error);
      }
    };

    loadSharedEssays();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  // Helper to mark save complete
  const markSaveComplete = useCallback((essayJson, timestamp) => {
    lastSavedEssayRef.current = essayJson;
    setHasUnsavedChanges(false);
    setLastSavedAt(timestamp);
    setSaveError(null);
  }, []);

  // Save function (shared between debounce and interval)
  // Uses refs to avoid recreating on every keystroke
  const performSave = useCallback(async () => {
    if (loading || authLoading) return;

    const currentEssay = essayRef.current;
    const currentEssayJson = JSON.stringify(currentEssay);

    if (currentEssayJson === lastSavedEssayRef.current) return;

    const now = new Date();

    if (user && currentEssayId) {
      try {
        // Check if this is a shared essay we're editing
        if (isSharedEssay && sharedEssayOwnerUid && sharedEssayPermission === 'editor') {
          // Find the shared essay info to get the title
          const sharedInfo = sharedEssays.find(
            (e) => e.essayId === currentEssayId && e.ownerUid === sharedEssayOwnerUid
          );
          const title = sharedInfo?.title || 'Untitled Essay';
          await saveSharedEssayToFirestore(sharedEssayOwnerUid, currentEssayId, currentEssay, title);
        } else {
          // Normal save to user's own essay
          const existingEssay = essaysRef.current.find((e) => e.id === currentEssayId);
          const title = existingEssay?.title || 'Untitled Essay';
          await saveEssayToFirestore(user.uid, currentEssayId, currentEssay, title);

          setEssays((prev) => {
            const exists = prev.some((e) => e.id === currentEssayId);
            if (exists) {
              return prev.map((e) =>
                e.id === currentEssayId
                  ? { ...e, data: currentEssay, updatedAt: now }
                  : e
              );
            }
            return [
              { id: currentEssayId, title, data: currentEssay, updatedAt: now },
              ...prev,
            ];
          });
        }

        markSaveComplete(currentEssayJson, now);
      } catch {
        // Fall back to localStorage on Firestore failure
        saveLocalEssay(currentEssay);
        markSaveComplete(currentEssayJson, now);
        setSaveError('Could not save to cloud. Your changes are saved locally.');
      }
    } else if (!user) {
      saveLocalEssay(currentEssay);
      markSaveComplete(currentEssayJson, now);
    }
  }, [user, currentEssayId, loading, authLoading, markSaveComplete, isSharedEssay, sharedEssayOwnerUid, sharedEssayPermission, sharedEssays]);

  // Track unsaved changes
  useEffect(() => {
    if (loading || authLoading) return;

    const currentEssayJson = JSON.stringify(essay);
    const hasChanges = currentEssayJson !== lastSavedEssayRef.current;
    setHasUnsavedChanges(hasChanges);
  }, [essay, loading, authLoading]);

  // Debounced auto-save (2 seconds after typing stops)
  useEffect(() => {
    if (loading || authLoading) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout - will only fire if no changes for 2 seconds
    saveTimeoutRef.current = setTimeout(performSave, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [essay, loading, authLoading, performSave]);

  // Periodic auto-save every 30 seconds (backup in case debounce misses)
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

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle migration
  const handleMigrate = useCallback(async () => {
    if (!user || !localEssayRef.current) return;

    const newId = generateId();
    setCurrentEssayId(newId);
    setEssay(localEssayRef.current);

    try {
      await saveEssayToFirestore(
        user.uid,
        newId,
        localEssayRef.current,
        'Migrated Essay'
      );
      setEssays([
        {
          id: newId,
          title: 'Migrated Essay',
          data: localEssayRef.current,
          updatedAt: new Date(),
        },
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

  // Select an essay
  const selectEssay = useCallback(
    async (essayId) => {
      if (!user) return;

      // Check if it's already the current essay (and not a shared one)
      if (essayId === currentEssayId && !isSharedEssay) return;

      setLoading(true);
      // Clear shared essay state when selecting own essay
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
          // Set lastSavedAt from loaded essay's timestamp
          const savedTime = essayData.updatedAt?.toDate?.() || essayData.updatedAt || new Date();
          setLastSavedAt(savedTime);
        } else {
          // Essay doesn't exist yet (newly created), just set the ID
          setCurrentEssayId(essayId);
          const newEssay = createEssay();
          setEssay(newEssay);
          lastSavedEssayRef.current = JSON.stringify(newEssay);
          setLastSavedAt(null);
        }
      } catch (error) {
        console.error('Failed to load essay:', error);
        // Still set the ID so user can work on a new essay
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

  // Select a shared essay
  const selectSharedEssay = useCallback(
    async (ownerUid, essayId, permission) => {
      if (!user) return;

      setLoading(true);
      try {
        const essayData = await getSharedEssay(ownerUid, essayId);
        if (essayData) {
          setCurrentEssayId(essayId);
          const loadedData = essayData.data || createEssay();
          setEssay(loadedData);
          lastSavedEssayRef.current = JSON.stringify(loadedData);
          const savedTime = essayData.updatedAt?.toDate?.() || essayData.updatedAt || new Date();
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

  // Load sharing info for current essay
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

  // Save all sharing settings at once
  const saveSharing = useCallback(
    async ({ collaborators, isPublic, publicPermission }) => {
      if (!user || !currentEssayId || isSharedEssay) return;

      try {
        const currentEssayData = essays.find((e) => e.id === currentEssayId);
        const title = currentEssayData?.title || 'Untitled Essay';

        // IMPORTANT: Save the essay content first to ensure it's in Firestore
        // This ensures the data field exists when someone accesses the shared link
        const currentEssay = essayRef.current;
        await saveEssayToFirestore(user.uid, currentEssayId, currentEssay, title);

        const publicToken = await saveSharingSettings(
          user.uid,
          currentEssayId,
          collaborators,
          isPublic,
          publicPermission || 'viewer',
          user.email,
          user.displayName,
          title
        );

        // Update local sharing info
        setSharingInfo({
          isPublic,
          publicToken,
          publicPermission,
          collaborators,
        });

        // Mark as saved since we just saved
        const now = new Date();
        markSaveComplete(JSON.stringify(currentEssay), now);
      } catch (error) {
        console.error('Failed to save sharing settings:', error);
        throw error;
      }
    },
    [user, currentEssayId, isSharedEssay, essays, markSaveComplete]
  );

  // Create new essay
  const createNewEssay = useCallback(() => {
    const newId = generateId();
    const newEssay = createEssay();
    setCurrentEssayId(newId);
    setEssay(newEssay);
    lastSavedEssayRef.current = JSON.stringify(newEssay);
    setHasUnsavedChanges(false);
    // Clear shared essay state
    setIsSharedEssay(false);
    setSharedEssayOwnerUid(null);
    setSharedEssayPermission(null);
    setSharingInfo(null);
    // Add to essays list immediately
    setEssays((prev) => [
      { id: newId, title: 'Untitled', data: newEssay, updatedAt: new Date() },
      ...prev,
    ]);
    return newId;
  }, []);

  // Delete essay
  const deleteEssay = useCallback(
    async (essayId) => {
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

  // Rename essay
  const renameEssay = useCallback(
    async (essayId, newTitle) => {
      if (!user) return;

      // Update local state immediately
      setEssays((prev) =>
        prev.map((e) => (e.id === essayId ? { ...e, title: newTitle, updatedAt: new Date() } : e))
      );

      // Then sync to Firestore
      try {
        await updateEssayTitle(user.uid, essayId, newTitle);
      } catch (error) {
        console.error('Failed to rename essay:', error);
      }
    },
    [user]
  );

  // Use the shared essay update functions
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

  // Get claim by ID
  const getClaimById = useCallback(
    (claimId) => modelGetClaimById(essay, claimId),
    [essay]
  );

  // Reset essay
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
    // Sharing-related
    sharedEssays,
    sharingInfo,
    isSharedEssay,
    sharedEssayPermission,
    selectSharedEssay,
    loadSharingInfo,
    saveSharing,
  };
}
