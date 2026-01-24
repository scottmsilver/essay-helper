/**
 * Pure essay data model - no React or UI dependencies
 *
 * This module contains:
 * - Type definitions (JSDoc)
 * - Factory functions for creating essay structures
 * - Pure transformation functions (essay in, essay out)
 * - Query functions
 */

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * @typedef {Object} ProofBlock
 * @property {string} id - Unique identifier
 * @property {string} quote - Evidence quote
 * @property {string} analysis - Analysis of the quote
 * @property {string} connection - Connection to the claim
 */

/**
 * @typedef {Object} Claim
 * @property {string} id - Unique identifier
 * @property {string} text - The claim text
 */

/**
 * @typedef {Object} Intro
 * @property {string} hook - Opening hook
 * @property {string} background - Background information
 * @property {string} thesis - Thesis statement
 * @property {Claim[]} claims - List of claims
 * @property {string} paragraph - Full intro paragraph
 */

/**
 * @typedef {Object} BodyParagraph
 * @property {string} id - Unique identifier
 * @property {string} provingClaimId - ID of the claim this paragraph proves
 * @property {string} purpose - Purpose of the paragraph
 * @property {ProofBlock[]} proofBlocks - Evidence and analysis blocks
 * @property {string} recap - Recap of the paragraph
 * @property {string} paragraph - Full body paragraph
 */

/**
 * @typedef {Object} Conclusion
 * @property {string} restatement - Restatement of thesis and claims
 * @property {string} soWhat - "So what?" answer
 * @property {string} paragraph - Full conclusion paragraph
 */

/**
 * @typedef {Object} Essay
 * @property {Intro} intro - Introduction section
 * @property {BodyParagraph[]} bodyParagraphs - Body paragraphs
 * @property {Conclusion} conclusion - Conclusion section
 */

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Generate a random ID
 * @returns {string}
 */
export const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * Create a new empty proof block
 * @returns {ProofBlock}
 */
export const createProofBlock = () => ({
  id: generateId(),
  quote: '',
  analysis: '',
  connection: '',
});

/**
 * Create a new claim
 * @param {string} [text=''] - Initial claim text
 * @returns {Claim}
 */
export const createClaim = (text = '') => ({
  id: generateId(),
  text,
});

/**
 * Create a new body paragraph linked to a claim
 * @param {Claim} claim - The claim this paragraph proves
 * @returns {BodyParagraph}
 */
export const createBodyParagraph = (claim) => ({
  id: generateId(),
  provingClaimId: claim.id,
  purpose: '',
  proofBlocks: [createProofBlock()],
  recap: '',
  paragraph: '',
});

/**
 * Create a new empty essay
 * @returns {Essay}
 */
export const createEssay = () => {
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

/**
 * Update a field in the intro section
 * @param {Essay} essay - Current essay state
 * @param {string} field - Field name to update
 * @param {*} value - New value
 * @returns {Essay} New essay with updated intro
 */
export const updateIntro = (essay, field, value) => ({
  ...essay,
  intro: { ...essay.intro, [field]: value },
});

/**
 * Add a new claim and corresponding body paragraph
 * @param {Essay} essay - Current essay state
 * @returns {Essay} New essay with added claim and body paragraph
 */
export const addClaim = (essay) => {
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

/**
 * Update a claim's text
 * @param {Essay} essay - Current essay state
 * @param {string} claimId - ID of the claim to update
 * @param {string} text - New claim text
 * @returns {Essay} New essay with updated claim
 */
export const updateClaim = (essay, claimId, text) => ({
  ...essay,
  intro: {
    ...essay.intro,
    claims: essay.intro.claims.map((c) =>
      c.id === claimId ? { ...c, text } : c
    ),
  },
});

/**
 * Remove a claim and its corresponding body paragraph
 * @param {Essay} essay - Current essay state
 * @param {string} claimId - ID of the claim to remove
 * @returns {Essay} New essay without the claim (unchanged if only one claim)
 */
export const removeClaim = (essay, claimId) => {
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

/**
 * Update a field in a body paragraph
 * @param {Essay} essay - Current essay state
 * @param {string} bodyId - ID of the body paragraph
 * @param {string} field - Field name to update
 * @param {*} value - New value
 * @returns {Essay} New essay with updated body paragraph
 */
export const updateBodyParagraph = (essay, bodyId, field, value) => ({
  ...essay,
  bodyParagraphs: essay.bodyParagraphs.map((bp) =>
    bp.id === bodyId ? { ...bp, [field]: value } : bp
  ),
});

/**
 * Add a proof block to a body paragraph
 * @param {Essay} essay - Current essay state
 * @param {string} bodyId - ID of the body paragraph
 * @returns {Essay} New essay with added proof block
 */
export const addProofBlock = (essay, bodyId) => ({
  ...essay,
  bodyParagraphs: essay.bodyParagraphs.map((bp) =>
    bp.id === bodyId
      ? { ...bp, proofBlocks: [...bp.proofBlocks, createProofBlock()] }
      : bp
  ),
});

/**
 * Update a field in a proof block
 * @param {Essay} essay - Current essay state
 * @param {string} bodyId - ID of the body paragraph
 * @param {string} proofBlockId - ID of the proof block
 * @param {string} field - Field name to update
 * @param {*} value - New value
 * @returns {Essay} New essay with updated proof block
 */
export const updateProofBlock = (essay, bodyId, proofBlockId, field, value) => ({
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

/**
 * Remove a proof block from a body paragraph
 * @param {Essay} essay - Current essay state
 * @param {string} bodyId - ID of the body paragraph
 * @param {string} proofBlockId - ID of the proof block to remove
 * @returns {Essay} New essay without the proof block (unchanged if only one)
 */
export const removeProofBlock = (essay, bodyId, proofBlockId) => ({
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

/**
 * Update a field in the conclusion section
 * @param {Essay} essay - Current essay state
 * @param {string} field - Field name to update
 * @param {*} value - New value
 * @returns {Essay} New essay with updated conclusion
 */
export const updateConclusion = (essay, field, value) => ({
  ...essay,
  conclusion: { ...essay.conclusion, [field]: value },
});

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get a claim by its ID
 * @param {Essay} essay - Essay to search
 * @param {string} claimId - ID of the claim to find
 * @returns {Claim|undefined} The claim or undefined if not found
 */
export const getClaimById = (essay, claimId) =>
  essay.intro.claims.find((c) => c.id === claimId);

/**
 * Get the full essay text (all paragraphs concatenated)
 * @param {Essay} essay - Essay to extract text from
 * @returns {string} Full essay text
 */
export const getFullEssayText = (essay) =>
  [
    essay.intro.paragraph,
    ...essay.bodyParagraphs.map((b) => b.paragraph),
    essay.conclusion.paragraph,
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join('\n\n');
