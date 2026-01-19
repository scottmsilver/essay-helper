import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import {
  listEssays,
  getEssay,
  saveEssay as saveEssayToFirestore,
  deleteEssay as deleteEssayFromFirestore,
  updateEssayTitle,
} from '../firebase/firestore';

const STORAGE_KEY = 'essay-helper-data';
const CURRENT_ESSAY_KEY = 'essay-helper-current-id';

const generateId = () => Math.random().toString(36).substring(2, 9);

const createClaim = (text = '') => ({
  id: generateId(),
  text,
});

const createProofBlock = () => ({
  id: generateId(),
  quote: '',
  analysis: '',
  connection: '',
});

const createBodyParagraph = (claim) => ({
  id: generateId(),
  provingClaimId: claim.id,
  purpose: '',
  proofBlocks: [createProofBlock()],
  recap: '',
  paragraph: '',
});

const createInitialEssay = () => {
  const claim1 = createClaim('');
  return {
    intro: {
      hook: '',
      background: '',
      thesis: '',
      claims: [claim1],
      paragraph: '',
    },
    bodyParagraphs: [createBodyParagraph(claim1)],
    conclusion: {
      soWhat: '',
      paragraph: '',
    },
  };
};

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
  const [essay, setEssay] = useState(createInitialEssay);
  const [essays, setEssays] = useState([]);
  const [currentEssayId, setCurrentEssayId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveError, setSaveError] = useState(null);
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
            const essayData = firstEssay.data || createInitialEssay();
            setEssay(essayData);
            lastSavedEssayRef.current = JSON.stringify(essayData);
            // Set lastSavedAt from Firestore timestamp
            const savedTime = firstEssay.updatedAt?.toDate?.() || firstEssay.updatedAt || new Date();
            setLastSavedAt(savedTime);
          } else {
            const newId = generateId();
            setCurrentEssayId(newId);
            const newEssay = createInitialEssay();
            setEssay(newEssay);
            lastSavedEssayRef.current = JSON.stringify(newEssay);
            setLastSavedAt(null); // New essay, not saved yet
          }
        } catch (error) {
          console.error('Failed to load essays:', error);
          setEssay(loadLocalEssay() || createInitialEssay());
        }
      } else {
        setEssays([]);
        setCurrentEssayId(null);
        const localData = loadLocalEssay() || createInitialEssay();
        setEssay(localData);
        lastSavedEssayRef.current = JSON.stringify(localData);
      }

      setHasUnsavedChanges(false);
      setLoading(false);
    };

    loadData();
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
        const existingEssay = essaysRef.current.find((e) => e.id === currentEssayId);
        const title = existingEssay?.title || 'Untitled Essay';
        await saveEssayToFirestore(user.uid, currentEssayId, currentEssay, title);

        markSaveComplete(currentEssayJson, now);

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
  }, [user, currentEssayId, loading, authLoading, markSaveComplete]);

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
    setEssay(createInitialEssay());
    setShowMigrationPrompt(false);
    localEssayRef.current = null;
    clearLocalEssay();
  }, []);

  // Select an essay
  const selectEssay = useCallback(
    async (essayId) => {
      if (!user) return;

      // Check if it's already the current essay
      if (essayId === currentEssayId) return;

      setLoading(true);
      try {
        const essayData = await getEssay(user.uid, essayId);
        if (essayData) {
          setCurrentEssayId(essayId);
          const loadedData = essayData.data || createInitialEssay();
          setEssay(loadedData);
          lastSavedEssayRef.current = JSON.stringify(loadedData);
          // Set lastSavedAt from loaded essay's timestamp
          const savedTime = essayData.updatedAt?.toDate?.() || essayData.updatedAt || new Date();
          setLastSavedAt(savedTime);
        } else {
          // Essay doesn't exist yet (newly created), just set the ID
          setCurrentEssayId(essayId);
          const newEssay = createInitialEssay();
          setEssay(newEssay);
          lastSavedEssayRef.current = JSON.stringify(newEssay);
          setLastSavedAt(null);
        }
      } catch (error) {
        console.error('Failed to load essay:', error);
        // Still set the ID so user can work on a new essay
        setCurrentEssayId(essayId);
        const newEssay = createInitialEssay();
        setEssay(newEssay);
        lastSavedEssayRef.current = JSON.stringify(newEssay);
        setLastSavedAt(null);
      }
      setHasUnsavedChanges(false);
      setLoading(false);
    },
    [user, currentEssayId]
  );

  // Create new essay
  const createNewEssay = useCallback(() => {
    const newId = generateId();
    const newEssay = createInitialEssay();
    setCurrentEssayId(newId);
    setEssay(newEssay);
    lastSavedEssayRef.current = JSON.stringify(newEssay);
    setHasUnsavedChanges(false);
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

  // Update intro field
  const updateIntro = useCallback((field, value) => {
    setEssay((prev) => ({
      ...prev,
      intro: { ...prev.intro, [field]: value },
    }));
  }, []);

  // Add a new claim
  const addClaim = useCallback(() => {
    setEssay((prev) => {
      const newClaim = createClaim('');
      const newBodyParagraph = createBodyParagraph(newClaim);
      return {
        ...prev,
        intro: {
          ...prev.intro,
          claims: [...prev.intro.claims, newClaim],
        },
        bodyParagraphs: [...prev.bodyParagraphs, newBodyParagraph],
      };
    });
  }, []);

  // Update a claim's text
  const updateClaim = useCallback((claimId, text) => {
    setEssay((prev) => ({
      ...prev,
      intro: {
        ...prev.intro,
        claims: prev.intro.claims.map((c) =>
          c.id === claimId ? { ...c, text } : c
        ),
      },
    }));
  }, []);

  // Remove a claim
  const removeClaim = useCallback((claimId) => {
    setEssay((prev) => {
      if (prev.intro.claims.length <= 1) return prev;
      return {
        ...prev,
        intro: {
          ...prev.intro,
          claims: prev.intro.claims.filter((c) => c.id !== claimId),
        },
        bodyParagraphs: prev.bodyParagraphs.filter(
          (bp) => bp.provingClaimId !== claimId
        ),
      };
    });
  }, []);

  // Update body paragraph field
  const updateBodyParagraph = useCallback((bodyId, field, value) => {
    setEssay((prev) => ({
      ...prev,
      bodyParagraphs: prev.bodyParagraphs.map((bp) =>
        bp.id === bodyId ? { ...bp, [field]: value } : bp
      ),
    }));
  }, []);

  // Add proof block
  const addProofBlock = useCallback((bodyId) => {
    setEssay((prev) => ({
      ...prev,
      bodyParagraphs: prev.bodyParagraphs.map((bp) =>
        bp.id === bodyId
          ? { ...bp, proofBlocks: [...bp.proofBlocks, createProofBlock()] }
          : bp
      ),
    }));
  }, []);

  // Update proof block field
  const updateProofBlock = useCallback((bodyId, proofBlockId, field, value) => {
    setEssay((prev) => ({
      ...prev,
      bodyParagraphs: prev.bodyParagraphs.map((bp) =>
        bp.id === bodyId
          ? {
              ...bp,
              proofBlocks: bp.proofBlocks.map((pb) =>
                pb.id === proofBlockId ? { ...pb, [field]: value } : pb
              ),
            }
          : bp
      ),
    }));
  }, []);

  // Remove proof block
  const removeProofBlock = useCallback((bodyId, proofBlockId) => {
    setEssay((prev) => ({
      ...prev,
      bodyParagraphs: prev.bodyParagraphs.map((bp) => {
        if (bp.id !== bodyId) return bp;
        if (bp.proofBlocks.length <= 1) return bp;
        return {
          ...bp,
          proofBlocks: bp.proofBlocks.filter((pb) => pb.id !== proofBlockId),
        };
      }),
    }));
  }, []);

  // Update conclusion field
  const updateConclusion = useCallback((field, value) => {
    setEssay((prev) => ({
      ...prev,
      conclusion: { ...prev.conclusion, [field]: value },
    }));
  }, []);

  // Get claim by ID
  const getClaimById = useCallback(
    (claimId) => essay.intro.claims.find((c) => c.id === claimId),
    [essay.intro.claims]
  );

  // Reset essay
  const resetEssay = useCallback(() => {
    if (user) {
      createNewEssay();
    } else {
      const newEssay = createInitialEssay();
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
  };
}
