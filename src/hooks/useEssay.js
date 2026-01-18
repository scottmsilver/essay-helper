import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'essay-helper-data';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// Create a new claim
const createClaim = (text = '') => ({
  id: generateId(),
  text,
});

// Create a new proof block
const createProofBlock = () => ({
  id: generateId(),
  quote: '',
  analysis: '',
  connection: '',
});

// Create a new body paragraph
const createBodyParagraph = (claim) => ({
  id: generateId(),
  provingClaimId: claim.id,
  proofBlocks: [createProofBlock()],
  recap: '',
  paragraph: '',
});

// Create initial essay state
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

// Load essay from localStorage
const loadEssay = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load essay from localStorage:', e);
  }
  return createInitialEssay();
};

// Save essay to localStorage
const saveEssay = (essay) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(essay));
  } catch (e) {
    console.error('Failed to save essay to localStorage:', e);
  }
};

export function useEssay() {
  const [essay, setEssay] = useState(loadEssay);

  // Auto-save to localStorage whenever essay changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveEssay(essay);
    }, 300); // Debounce 300ms
    return () => clearTimeout(timeoutId);
  }, [essay]);

  // Update intro field
  const updateIntro = useCallback((field, value) => {
    setEssay((prev) => ({
      ...prev,
      intro: { ...prev.intro, [field]: value },
    }));
  }, []);

  // Add a new claim (also creates corresponding body paragraph)
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

  // Remove a claim (also removes corresponding body paragraph)
  const removeClaim = useCallback((claimId) => {
    setEssay((prev) => {
      if (prev.intro.claims.length <= 1) return prev; // Keep at least one claim
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

  // Add proof block to body paragraph
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

  // Remove proof block from body paragraph
  const removeProofBlock = useCallback((bodyId, proofBlockId) => {
    setEssay((prev) => ({
      ...prev,
      bodyParagraphs: prev.bodyParagraphs.map((bp) => {
        if (bp.id !== bodyId) return bp;
        if (bp.proofBlocks.length <= 1) return bp; // Keep at least one proof block
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

  // Reset essay to initial state
  const resetEssay = useCallback(() => {
    const newEssay = createInitialEssay();
    setEssay(newEssay);
    saveEssay(newEssay);
  }, []);

  return {
    essay,
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
  };
}
