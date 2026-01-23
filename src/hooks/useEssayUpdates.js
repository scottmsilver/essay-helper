import { useCallback } from 'react';

const generateId = () => Math.random().toString(36).substring(2, 9);

const createProofBlock = () => ({
  id: generateId(),
  quote: '',
  analysis: '',
  connection: '',
});

const createClaim = (text = '') => ({
  id: generateId(),
  text,
});

const createBodyParagraph = (claim) => ({
  id: generateId(),
  provingClaimId: claim.id,
  purpose: '',
  proofBlocks: [createProofBlock()],
  recap: '',
  paragraph: '',
});

/**
 * Hook that provides essay update functions.
 * @param {Function} setEssay - State setter for the essay
 * @param {Function} onUpdate - Optional callback called after each update with the new essay state
 * @returns {Object} Update functions for the essay
 */
export function useEssayUpdates(setEssay, onUpdate) {
  const updateIntro = useCallback((field, value) => {
    setEssay((prev) => {
      const updated = { ...prev, intro: { ...prev.intro, [field]: value } };
      onUpdate?.(updated);
      return updated;
    });
  }, [setEssay, onUpdate]);

  const addClaim = useCallback(() => {
    setEssay((prev) => {
      const newClaim = createClaim('');
      const newBodyParagraph = createBodyParagraph(newClaim);
      const updated = {
        ...prev,
        intro: {
          ...prev.intro,
          claims: [...prev.intro.claims, newClaim],
        },
        bodyParagraphs: [...prev.bodyParagraphs, newBodyParagraph],
      };
      onUpdate?.(updated);
      return updated;
    });
  }, [setEssay, onUpdate]);

  const updateClaim = useCallback((claimId, text) => {
    setEssay((prev) => {
      const updated = {
        ...prev,
        intro: {
          ...prev.intro,
          claims: prev.intro.claims.map((c) =>
            c.id === claimId ? { ...c, text } : c
          ),
        },
      };
      onUpdate?.(updated);
      return updated;
    });
  }, [setEssay, onUpdate]);

  const removeClaim = useCallback((claimId) => {
    setEssay((prev) => {
      if (prev.intro.claims.length <= 1) return prev;
      const updated = {
        ...prev,
        intro: {
          ...prev.intro,
          claims: prev.intro.claims.filter((c) => c.id !== claimId),
        },
        bodyParagraphs: prev.bodyParagraphs.filter(
          (bp) => bp.provingClaimId !== claimId
        ),
      };
      onUpdate?.(updated);
      return updated;
    });
  }, [setEssay, onUpdate]);

  const updateBodyParagraph = useCallback((bodyId, field, value) => {
    setEssay((prev) => {
      const updated = {
        ...prev,
        bodyParagraphs: prev.bodyParagraphs.map((bp) =>
          bp.id === bodyId ? { ...bp, [field]: value } : bp
        ),
      };
      onUpdate?.(updated);
      return updated;
    });
  }, [setEssay, onUpdate]);

  const addProofBlock = useCallback((bodyId) => {
    setEssay((prev) => {
      const updated = {
        ...prev,
        bodyParagraphs: prev.bodyParagraphs.map((bp) =>
          bp.id === bodyId
            ? { ...bp, proofBlocks: [...bp.proofBlocks, createProofBlock()] }
            : bp
        ),
      };
      onUpdate?.(updated);
      return updated;
    });
  }, [setEssay, onUpdate]);

  const updateProofBlock = useCallback((bodyId, proofBlockId, field, value) => {
    setEssay((prev) => {
      const updated = {
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
      };
      onUpdate?.(updated);
      return updated;
    });
  }, [setEssay, onUpdate]);

  const removeProofBlock = useCallback((bodyId, proofBlockId) => {
    setEssay((prev) => {
      const updated = {
        ...prev,
        bodyParagraphs: prev.bodyParagraphs.map((bp) => {
          if (bp.id !== bodyId) return bp;
          if (bp.proofBlocks.length <= 1) return bp;
          return {
            ...bp,
            proofBlocks: bp.proofBlocks.filter((pb) => pb.id !== proofBlockId),
          };
        }),
      };
      onUpdate?.(updated);
      return updated;
    });
  }, [setEssay, onUpdate]);

  const updateConclusion = useCallback((field, value) => {
    setEssay((prev) => {
      const updated = { ...prev, conclusion: { ...prev.conclusion, [field]: value } };
      onUpdate?.(updated);
      return updated;
    });
  }, [setEssay, onUpdate]);

  return {
    updateIntro,
    addClaim,
    updateClaim,
    removeClaim,
    updateBodyParagraph,
    addProofBlock,
    updateProofBlock,
    removeProofBlock,
    updateConclusion,
  };
}

// Export helper functions for creating initial essay structure
export { createClaim, createBodyParagraph, createProofBlock, generateId };
