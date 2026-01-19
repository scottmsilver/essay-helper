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
  const saveTimeoutRef = useRef(null);
  const localEssayRef = useRef(null);

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
          } else if (userEssays.length > 0) {
            const firstEssay = userEssays[0];
            setCurrentEssayId(firstEssay.id);
            setEssay(firstEssay.data || createInitialEssay());
          } else {
            const newId = generateId();
            setCurrentEssayId(newId);
            setEssay(createInitialEssay());
          }
        } catch (error) {
          console.error('Failed to load essays:', error);
          setEssay(loadLocalEssay() || createInitialEssay());
        }
      } else {
        setEssays([]);
        setCurrentEssayId(null);
        setEssay(loadLocalEssay() || createInitialEssay());
      }

      setLoading(false);
    };

    loadData();
  }, [user, authLoading]);

  // Auto-save essay
  useEffect(() => {
    if (loading || authLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (user && currentEssayId) {
        try {
          const existingEssay = essays.find((e) => e.id === currentEssayId);
          const title = existingEssay?.title || 'Untitled Essay';
          await saveEssayToFirestore(user.uid, currentEssayId, essay, title);

          setEssays((prev) => {
            const exists = prev.some((e) => e.id === currentEssayId);
            if (exists) {
              return prev.map((e) =>
                e.id === currentEssayId
                  ? { ...e, data: essay, updatedAt: new Date() }
                  : e
              );
            }
            return [
              { id: currentEssayId, title, data: essay, updatedAt: new Date() },
              ...prev,
            ];
          });
        } catch (error) {
          console.error('Failed to save essay to Firestore:', error);
        }
      } else if (!user) {
        saveLocalEssay(essay);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [essay, user, currentEssayId, loading, authLoading, essays]);

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
          setEssay(essayData.data || createInitialEssay());
        } else {
          // Essay doesn't exist yet (newly created), just set the ID
          setCurrentEssayId(essayId);
          setEssay(createInitialEssay());
        }
      } catch (error) {
        console.error('Failed to load essay:', error);
        // Still set the ID so user can work on a new essay
        setCurrentEssayId(essayId);
        setEssay(createInitialEssay());
      }
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
    }
  }, [user, createNewEssay]);

  return {
    essay,
    essays,
    currentEssayId,
    loading: loading || authLoading,
    showMigrationPrompt,
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
