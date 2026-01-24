/**
 * Pure essay data model - no React or UI dependencies
 */

// =============================================================================
// Types
// =============================================================================

export interface ProofBlock {
  id: string;
  quote: string;
  analysis: string;
  connection: string;
}

export interface Claim {
  id: string;
  text: string;
}

export interface Intro {
  hook: string;
  background: string;
  thesis: string;
  claims: Claim[];
  paragraph: string;
}

export interface BodyParagraph {
  id: string;
  provingClaimId: string;
  purpose: string;
  proofBlocks: ProofBlock[];
  recap: string;
  paragraph: string;
}

export interface Conclusion {
  restatement: string;
  soWhat: string;
  paragraph: string;
}

export interface Essay {
  intro: Intro;
  bodyParagraphs: BodyParagraph[];
  conclusion: Conclusion;
}

// =============================================================================
// Factory Functions
// =============================================================================

export const generateId = (): string =>
  Math.random().toString(36).substring(2, 9);

export const createProofBlock = (): ProofBlock => ({
  id: generateId(),
  quote: '',
  analysis: '',
  connection: '',
});

export const createClaim = (text = ''): Claim => ({
  id: generateId(),
  text,
});

export const createBodyParagraph = (claim: Claim): BodyParagraph => ({
  id: generateId(),
  provingClaimId: claim.id,
  purpose: '',
  proofBlocks: [createProofBlock()],
  recap: '',
  paragraph: '',
});

export const createEssay = (): Essay => {
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
      restatement: '',
      soWhat: '',
      paragraph: '',
    },
  };
};

// =============================================================================
// Pure Transformation Functions
// =============================================================================

export const updateIntro = (
  essay: Essay,
  field: keyof Intro,
  value: Intro[keyof Intro]
): Essay => ({
  ...essay,
  intro: { ...essay.intro, [field]: value },
});

export const addClaim = (essay: Essay): Essay => {
  const newClaim = createClaim('');
  const newBodyParagraph = createBodyParagraph(newClaim);
  return {
    ...essay,
    intro: {
      ...essay.intro,
      claims: [...essay.intro.claims, newClaim],
    },
    bodyParagraphs: [...essay.bodyParagraphs, newBodyParagraph],
  };
};

export const updateClaim = (
  essay: Essay,
  claimId: string,
  text: string
): Essay => ({
  ...essay,
  intro: {
    ...essay.intro,
    claims: essay.intro.claims.map((c) =>
      c.id === claimId ? { ...c, text } : c
    ),
  },
});

export const removeClaim = (essay: Essay, claimId: string): Essay => {
  if (essay.intro.claims.length <= 1) return essay;
  return {
    ...essay,
    intro: {
      ...essay.intro,
      claims: essay.intro.claims.filter((c) => c.id !== claimId),
    },
    bodyParagraphs: essay.bodyParagraphs.filter(
      (bp) => bp.provingClaimId !== claimId
    ),
  };
};

export const updateBodyParagraph = (
  essay: Essay,
  bodyId: string,
  field: keyof BodyParagraph,
  value: BodyParagraph[keyof BodyParagraph]
): Essay => ({
  ...essay,
  bodyParagraphs: essay.bodyParagraphs.map((bp) =>
    bp.id === bodyId ? { ...bp, [field]: value } : bp
  ),
});

export const addProofBlock = (essay: Essay, bodyId: string): Essay => ({
  ...essay,
  bodyParagraphs: essay.bodyParagraphs.map((bp) =>
    bp.id === bodyId
      ? { ...bp, proofBlocks: [...bp.proofBlocks, createProofBlock()] }
      : bp
  ),
});

export const updateProofBlock = (
  essay: Essay,
  bodyId: string,
  proofBlockId: string,
  field: keyof ProofBlock,
  value: string
): Essay => ({
  ...essay,
  bodyParagraphs: essay.bodyParagraphs.map((bp) =>
    bp.id === bodyId
      ? {
          ...bp,
          proofBlocks: bp.proofBlocks.map((pb) =>
            pb.id === proofBlockId ? { ...pb, [field]: value } : pb
          ),
        }
      : bp
  ),
});

export const removeProofBlock = (
  essay: Essay,
  bodyId: string,
  proofBlockId: string
): Essay => ({
  ...essay,
  bodyParagraphs: essay.bodyParagraphs.map((bp) => {
    if (bp.id !== bodyId) return bp;
    if (bp.proofBlocks.length <= 1) return bp;
    return {
      ...bp,
      proofBlocks: bp.proofBlocks.filter((pb) => pb.id !== proofBlockId),
    };
  }),
});

export const updateConclusion = (
  essay: Essay,
  field: keyof Conclusion,
  value: string
): Essay => ({
  ...essay,
  conclusion: { ...essay.conclusion, [field]: value },
});

// =============================================================================
// Query Functions
// =============================================================================

export const getClaimById = (essay: Essay, claimId: string): Claim | undefined =>
  essay.intro.claims.find((c) => c.id === claimId);

export const getFullEssayText = (essay: Essay): string =>
  [
    essay.intro.paragraph,
    ...essay.bodyParagraphs.map((b) => b.paragraph),
    essay.conclusion.paragraph,
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join('\n\n');
