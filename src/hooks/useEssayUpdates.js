import { useCallback } from 'react';
import {
  updateIntro as modelUpdateIntro,
  addClaim as modelAddClaim,
  updateClaim as modelUpdateClaim,
  removeClaim as modelRemoveClaim,
  updateBodyParagraph as modelUpdateBodyParagraph,
  addProofBlock as modelAddProofBlock,
  updateProofBlock as modelUpdateProofBlock,
  removeProofBlock as modelRemoveProofBlock,
  updateConclusion as modelUpdateConclusion,
} from '../models/essay';

/**
 * Hook that provides essay update functions.
 * Thin React adapter that wraps pure transformation functions from the model.
 *
 * @param {Function} setEssay - State setter for the essay
 * @param {Function} onUpdate - Optional callback called after each update with the new essay state
 * @returns {Object} Update functions for the essay
 */
export function useEssayUpdates(setEssay, onUpdate) {
  const applyTransform = useCallback(
    (transform) => {
      setEssay((prev) => {
        const updated = transform(prev);
        onUpdate?.(updated);
        return updated;
      });
    },
    [setEssay, onUpdate]
  );

  const updateIntro = useCallback(
    (field, value) => applyTransform((essay) => modelUpdateIntro(essay, field, value)),
    [applyTransform]
  );

  const addClaim = useCallback(
    () => applyTransform(modelAddClaim),
    [applyTransform]
  );

  const updateClaim = useCallback(
    (claimId, text) => applyTransform((essay) => modelUpdateClaim(essay, claimId, text)),
    [applyTransform]
  );

  const removeClaim = useCallback(
    (claimId) => applyTransform((essay) => modelRemoveClaim(essay, claimId)),
    [applyTransform]
  );

  const updateBodyParagraph = useCallback(
    (bodyId, field, value) =>
      applyTransform((essay) => modelUpdateBodyParagraph(essay, bodyId, field, value)),
    [applyTransform]
  );

  const addProofBlock = useCallback(
    (bodyId) => applyTransform((essay) => modelAddProofBlock(essay, bodyId)),
    [applyTransform]
  );

  const updateProofBlock = useCallback(
    (bodyId, proofBlockId, field, value) =>
      applyTransform((essay) => modelUpdateProofBlock(essay, bodyId, proofBlockId, field, value)),
    [applyTransform]
  );

  const removeProofBlock = useCallback(
    (bodyId, proofBlockId) =>
      applyTransform((essay) => modelRemoveProofBlock(essay, bodyId, proofBlockId)),
    [applyTransform]
  );

  const updateConclusion = useCallback(
    (field, value) => applyTransform((essay) => modelUpdateConclusion(essay, field, value)),
    [applyTransform]
  );

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
