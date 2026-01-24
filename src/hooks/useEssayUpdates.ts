import { useCallback, Dispatch, SetStateAction } from 'react';
import {
  Essay,
  Intro,
  BodyParagraph,
  Conclusion,
  ProofBlock,
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

export interface EssayUpdateFunctions {
  updateIntro: (field: keyof Intro, value: Intro[keyof Intro]) => void;
  addClaim: () => void;
  updateClaim: (claimId: string, text: string) => void;
  removeClaim: (claimId: string) => void;
  updateBodyParagraph: (bodyId: string, field: keyof BodyParagraph, value: BodyParagraph[keyof BodyParagraph]) => void;
  addProofBlock: (bodyId: string) => void;
  updateProofBlock: (bodyId: string, proofBlockId: string, field: keyof ProofBlock, value: string) => void;
  removeProofBlock: (bodyId: string, proofBlockId: string) => void;
  updateConclusion: (field: keyof Conclusion, value: string) => void;
}

export function useEssayUpdates(
  setEssay: Dispatch<SetStateAction<Essay>>,
  onUpdate?: (essay: Essay) => void
): EssayUpdateFunctions {
  const applyTransform = useCallback(
    (transform: (essay: Essay) => Essay) => {
      setEssay((prev) => {
        const updated = transform(prev);
        onUpdate?.(updated);
        return updated;
      });
    },
    [setEssay, onUpdate]
  );

  const updateIntro = useCallback(
    (field: keyof Intro, value: Intro[keyof Intro]) =>
      applyTransform((essay) => modelUpdateIntro(essay, field, value)),
    [applyTransform]
  );

  const addClaim = useCallback(() => applyTransform(modelAddClaim), [applyTransform]);

  const updateClaim = useCallback(
    (claimId: string, text: string) =>
      applyTransform((essay) => modelUpdateClaim(essay, claimId, text)),
    [applyTransform]
  );

  const removeClaim = useCallback(
    (claimId: string) => applyTransform((essay) => modelRemoveClaim(essay, claimId)),
    [applyTransform]
  );

  const updateBodyParagraph = useCallback(
    (bodyId: string, field: keyof BodyParagraph, value: BodyParagraph[keyof BodyParagraph]) =>
      applyTransform((essay) => modelUpdateBodyParagraph(essay, bodyId, field, value)),
    [applyTransform]
  );

  const addProofBlock = useCallback(
    (bodyId: string) => applyTransform((essay) => modelAddProofBlock(essay, bodyId)),
    [applyTransform]
  );

  const updateProofBlock = useCallback(
    (bodyId: string, proofBlockId: string, field: keyof ProofBlock, value: string) =>
      applyTransform((essay) => modelUpdateProofBlock(essay, bodyId, proofBlockId, field, value)),
    [applyTransform]
  );

  const removeProofBlock = useCallback(
    (bodyId: string, proofBlockId: string) =>
      applyTransform((essay) => modelRemoveProofBlock(essay, bodyId, proofBlockId)),
    [applyTransform]
  );

  const updateConclusion = useCallback(
    (field: keyof Conclusion, value: string) =>
      applyTransform((essay) => modelUpdateConclusion(essay, field, value)),
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
