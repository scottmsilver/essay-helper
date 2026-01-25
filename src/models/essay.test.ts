import { describe, it, expect, vi } from 'vitest';
import {
  createEssay,
  createClaim,
  createProofBlock,
  createBodyParagraph,
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
  getFullEssayText,
  generateId,
  type Essay,
  type Claim,
} from './essay';

// Mock nanoid to return predictable IDs for testing
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-id'),
}));

describe('Factory Functions', () => {
  describe('generateId', () => {
    it('returns a string ID', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id).toBe('test-id');
    });
  });

  describe('createProofBlock', () => {
    it('creates a proof block with empty fields', () => {
      const block = createProofBlock();
      expect(block).toEqual({
        id: 'test-id',
        quote: '',
        analysis: '',
        connection: '',
      });
    });
  });

  describe('createClaim', () => {
    it('creates a claim with empty text by default', () => {
      const claim = createClaim();
      expect(claim).toEqual({
        id: 'test-id',
        text: '',
      });
    });

    it('creates a claim with provided text', () => {
      const claim = createClaim('My claim text');
      expect(claim.text).toBe('My claim text');
    });
  });

  describe('createBodyParagraph', () => {
    it('creates a body paragraph linked to a claim', () => {
      const claim: Claim = { id: 'claim-123', text: 'Test claim' };
      const body = createBodyParagraph(claim);
      expect(body.provingClaimId).toBe('claim-123');
      expect(body.purpose).toBe('');
      expect(body.proofBlocks).toHaveLength(1);
      expect(body.recap).toBe('');
      expect(body.paragraph).toBe('');
    });
  });

  describe('createEssay', () => {
    it('creates an essay with initial structure', () => {
      const essay = createEssay();
      expect(essay.intro.claims).toHaveLength(1);
      expect(essay.bodyParagraphs).toHaveLength(1);
      expect(essay.bodyParagraphs[0].provingClaimId).toBe(essay.intro.claims[0].id);
    });

    it('creates an essay with empty intro fields', () => {
      const essay = createEssay();
      expect(essay.intro.hook).toBe('');
      expect(essay.intro.background).toBe('');
      expect(essay.intro.thesis).toBe('');
      expect(essay.intro.paragraph).toBe('');
    });

    it('creates an essay with empty conclusion fields', () => {
      const essay = createEssay();
      expect(essay.conclusion.restatement).toBe('');
      expect(essay.conclusion.soWhat).toBe('');
      expect(essay.conclusion.paragraph).toBe('');
    });
  });
});

describe('Pure Transformation Functions', () => {
  const createTestEssay = (): Essay => ({
    intro: {
      hook: 'Original hook',
      background: 'Original background',
      thesis: 'Original thesis',
      claims: [
        { id: 'claim-1', text: 'First claim' },
        { id: 'claim-2', text: 'Second claim' },
      ],
      paragraph: 'Intro paragraph',
    },
    bodyParagraphs: [
      {
        id: 'body-1',
        provingClaimId: 'claim-1',
        purpose: 'Purpose 1',
        proofBlocks: [
          { id: 'proof-1', quote: 'Quote 1', analysis: 'Analysis 1', connection: 'Connection 1' },
          { id: 'proof-2', quote: 'Quote 2', analysis: 'Analysis 2', connection: 'Connection 2' },
        ],
        recap: 'Recap 1',
        paragraph: 'Body 1 paragraph',
      },
      {
        id: 'body-2',
        provingClaimId: 'claim-2',
        purpose: 'Purpose 2',
        proofBlocks: [
          { id: 'proof-3', quote: 'Quote 3', analysis: 'Analysis 3', connection: 'Connection 3' },
        ],
        recap: 'Recap 2',
        paragraph: 'Body 2 paragraph',
      },
    ],
    conclusion: {
      restatement: 'Original restatement',
      soWhat: 'Original so what',
      paragraph: 'Conclusion paragraph',
    },
  });

  describe('updateIntro', () => {
    it('updates the hook field', () => {
      const essay = createTestEssay();
      const updated = updateIntro(essay, 'hook', 'New hook');
      expect(updated.intro.hook).toBe('New hook');
      expect(updated.intro.background).toBe('Original background');
    });

    it('updates the thesis field', () => {
      const essay = createTestEssay();
      const updated = updateIntro(essay, 'thesis', 'New thesis');
      expect(updated.intro.thesis).toBe('New thesis');
    });

    it('does not mutate the original essay', () => {
      const essay = createTestEssay();
      updateIntro(essay, 'hook', 'New hook');
      expect(essay.intro.hook).toBe('Original hook');
    });
  });

  describe('addClaim', () => {
    it('adds a new claim to the intro', () => {
      const essay = createTestEssay();
      const updated = addClaim(essay);
      expect(updated.intro.claims).toHaveLength(3);
    });

    it('adds a corresponding body paragraph', () => {
      const essay = createTestEssay();
      const updated = addClaim(essay);
      expect(updated.bodyParagraphs).toHaveLength(3);
      const newClaim = updated.intro.claims[2];
      const newBody = updated.bodyParagraphs[2];
      expect(newBody.provingClaimId).toBe(newClaim.id);
    });
  });

  describe('updateClaim', () => {
    it('updates the text of a specific claim', () => {
      const essay = createTestEssay();
      const updated = updateClaim(essay, 'claim-1', 'Updated claim text');
      expect(updated.intro.claims[0].text).toBe('Updated claim text');
      expect(updated.intro.claims[1].text).toBe('Second claim');
    });

    it('does not modify other claims', () => {
      const essay = createTestEssay();
      const updated = updateClaim(essay, 'claim-1', 'Updated');
      expect(updated.intro.claims[1]).toEqual(essay.intro.claims[1]);
    });
  });

  describe('removeClaim', () => {
    it('removes a claim and its body paragraph', () => {
      const essay = createTestEssay();
      const updated = removeClaim(essay, 'claim-1');
      expect(updated.intro.claims).toHaveLength(1);
      expect(updated.intro.claims[0].id).toBe('claim-2');
      expect(updated.bodyParagraphs).toHaveLength(1);
      expect(updated.bodyParagraphs[0].provingClaimId).toBe('claim-2');
    });

    it('does not remove the last claim', () => {
      const essay = createTestEssay();
      const oneClaimEssay = removeClaim(essay, 'claim-1');
      const stillOneClaimEssay = removeClaim(oneClaimEssay, 'claim-2');
      expect(stillOneClaimEssay.intro.claims).toHaveLength(1);
    });
  });

  describe('updateBodyParagraph', () => {
    it('updates a specific field of a body paragraph', () => {
      const essay = createTestEssay();
      const updated = updateBodyParagraph(essay, 'body-1', 'purpose', 'New purpose');
      expect(updated.bodyParagraphs[0].purpose).toBe('New purpose');
      expect(updated.bodyParagraphs[1].purpose).toBe('Purpose 2');
    });

    it('updates the paragraph field', () => {
      const essay = createTestEssay();
      const updated = updateBodyParagraph(essay, 'body-2', 'paragraph', 'New body text');
      expect(updated.bodyParagraphs[1].paragraph).toBe('New body text');
    });
  });

  describe('addProofBlock', () => {
    it('adds a proof block to a specific body paragraph', () => {
      const essay = createTestEssay();
      const updated = addProofBlock(essay, 'body-1');
      expect(updated.bodyParagraphs[0].proofBlocks).toHaveLength(3);
      expect(updated.bodyParagraphs[1].proofBlocks).toHaveLength(1);
    });
  });

  describe('updateProofBlock', () => {
    it('updates a specific proof block field', () => {
      const essay = createTestEssay();
      const updated = updateProofBlock(essay, 'body-1', 'proof-1', 'quote', 'New quote');
      expect(updated.bodyParagraphs[0].proofBlocks[0].quote).toBe('New quote');
      expect(updated.bodyParagraphs[0].proofBlocks[0].analysis).toBe('Analysis 1');
    });

    it('does not affect other proof blocks', () => {
      const essay = createTestEssay();
      const updated = updateProofBlock(essay, 'body-1', 'proof-1', 'quote', 'New quote');
      expect(updated.bodyParagraphs[0].proofBlocks[1].quote).toBe('Quote 2');
    });
  });

  describe('removeProofBlock', () => {
    it('removes a proof block from a body paragraph', () => {
      const essay = createTestEssay();
      const updated = removeProofBlock(essay, 'body-1', 'proof-1');
      expect(updated.bodyParagraphs[0].proofBlocks).toHaveLength(1);
      expect(updated.bodyParagraphs[0].proofBlocks[0].id).toBe('proof-2');
    });

    it('does not remove the last proof block', () => {
      const essay = createTestEssay();
      const withOneBlock = removeProofBlock(essay, 'body-1', 'proof-1');
      const stillOneBlock = removeProofBlock(withOneBlock, 'body-1', 'proof-2');
      expect(stillOneBlock.bodyParagraphs[0].proofBlocks).toHaveLength(1);
    });

    it('does not affect other body paragraphs', () => {
      const essay = createTestEssay();
      const updated = removeProofBlock(essay, 'body-1', 'proof-1');
      expect(updated.bodyParagraphs[1].proofBlocks).toHaveLength(1);
    });
  });

  describe('updateConclusion', () => {
    it('updates the restatement field', () => {
      const essay = createTestEssay();
      const updated = updateConclusion(essay, 'restatement', 'New restatement');
      expect(updated.conclusion.restatement).toBe('New restatement');
      expect(updated.conclusion.soWhat).toBe('Original so what');
    });

    it('updates the soWhat field', () => {
      const essay = createTestEssay();
      const updated = updateConclusion(essay, 'soWhat', 'New so what');
      expect(updated.conclusion.soWhat).toBe('New so what');
    });
  });
});

describe('Query Functions', () => {
  const createTestEssay = (): Essay => ({
    intro: {
      hook: '',
      background: '',
      thesis: '',
      claims: [
        { id: 'claim-1', text: 'First claim' },
        { id: 'claim-2', text: 'Second claim' },
      ],
      paragraph: 'Intro paragraph',
    },
    bodyParagraphs: [
      {
        id: 'body-1',
        provingClaimId: 'claim-1',
        purpose: '',
        proofBlocks: [],
        recap: '',
        paragraph: 'Body 1',
      },
      {
        id: 'body-2',
        provingClaimId: 'claim-2',
        purpose: '',
        proofBlocks: [],
        recap: '',
        paragraph: 'Body 2',
      },
    ],
    conclusion: {
      restatement: '',
      soWhat: '',
      paragraph: 'Conclusion',
    },
  });

  describe('getClaimById', () => {
    it('returns a claim when found', () => {
      const essay = createTestEssay();
      const claim = getClaimById(essay, 'claim-1');
      expect(claim).toEqual({ id: 'claim-1', text: 'First claim' });
    });

    it('returns undefined when not found', () => {
      const essay = createTestEssay();
      const claim = getClaimById(essay, 'nonexistent');
      expect(claim).toBeUndefined();
    });
  });

  describe('getFullEssayText', () => {
    it('returns all paragraphs joined with double newlines', () => {
      const essay = createTestEssay();
      const text = getFullEssayText(essay);
      expect(text).toBe('Intro paragraph\n\nBody 1\n\nBody 2\n\nConclusion');
    });

    it('filters out empty paragraphs', () => {
      const essay = createTestEssay();
      essay.bodyParagraphs[0].paragraph = '';
      const text = getFullEssayText(essay);
      expect(text).toBe('Intro paragraph\n\nBody 2\n\nConclusion');
    });

    it('trims whitespace from paragraphs', () => {
      const essay = createTestEssay();
      essay.intro.paragraph = '  Intro with spaces  ';
      const text = getFullEssayText(essay);
      expect(text).toContain('Intro with spaces');
      expect(text).not.toContain('  Intro');
    });

    it('returns empty string when all paragraphs are empty', () => {
      const essay = createTestEssay();
      essay.intro.paragraph = '';
      essay.bodyParagraphs[0].paragraph = '';
      essay.bodyParagraphs[1].paragraph = '';
      essay.conclusion.paragraph = '';
      const text = getFullEssayText(essay);
      expect(text).toBe('');
    });
  });
});
