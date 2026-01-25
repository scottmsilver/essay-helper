import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resetMockData,
  setMockEssay,
  getMockData,
  saveSharingSettings,
  getPublicEssay,
  listSharedWithMe,
} from './__mocks__/firestore';

describe('Sharing functionality', () => {
  beforeEach(() => {
    resetMockData();
    vi.clearAllMocks();
  });

  describe('saveSharingSettings', () => {
    it('should save collaborators and update sharedWithMe', async () => {
      // Setup: Create an essay
      setMockEssay('owner123', 'essay456', {
        title: 'Test Essay',
        data: {
          intro: { paragraph: 'Introduction text' },
          bodyParagraphs: [{ id: 'bp1', paragraph: 'Body text' }],
          conclusion: { paragraph: 'Conclusion text' },
        },
      });

      // Share with a collaborator
      await saveSharingSettings(
        'owner123',
        'essay456',
        [{ email: 'collaborator@test.com', permission: 'editor' }],
        false, // not public
        null,
        'owner@test.com',
        'Owner Name',
        'Test Essay'
      );

      // Verify sharing info was saved
      const data = getMockData();
      const sharing = data.users['owner123'].essays['essay456'].sharing;

      expect(sharing.collaborators).toHaveLength(1);
      expect(sharing.collaborators[0].email).toBe('collaborator@test.com');
      expect(sharing.collaborators[0].permission).toBe('editor');
      expect(sharing.collaboratorEmails).toContain('collaborator@test.com');
      expect(sharing.editorEmails).toContain('collaborator@test.com');
    });

    it('should create public link with correct permission', async () => {
      setMockEssay('owner123', 'essay456', {
        title: 'Test Essay',
        data: {
          intro: { paragraph: 'Introduction text' },
          bodyParagraphs: [],
          conclusion: { paragraph: '' },
        },
      });

      const token = await saveSharingSettings(
        'owner123',
        'essay456',
        [],
        true, // public
        'editor', // public permission
        'owner@test.com',
        'Owner Name',
        'Test Essay'
      );

      expect(token).toBeTruthy();

      const data = getMockData();
      const sharing = data.users['owner123'].essays['essay456'].sharing;

      expect(sharing.isPublic).toBe(true);
      expect(sharing.publicToken).toBe(token);
      expect(sharing.publicPermission).toBe('editor');
    });
  });

  describe('getPublicEssay', () => {
    it('should return essay with data when public', async () => {
      const essayData = {
        intro: { paragraph: 'This is the introduction' },
        bodyParagraphs: [
          { id: 'bp1', paragraph: 'This is body paragraph 1' },
          { id: 'bp2', paragraph: 'This is body paragraph 2' },
        ],
        conclusion: { paragraph: 'This is the conclusion' },
      };

      setMockEssay('owner123', 'essay456', {
        title: 'Public Essay',
        data: essayData,
        sharing: {
          isPublic: true,
          publicToken: 'test-token',
          publicPermission: 'viewer',
          collaborators: [],
        },
      });

      // Also set up the publicEssays lookup
      const data = getMockData();
      data.publicEssays['test-token'] = { essayId: 'essay456', ownerUid: 'owner123' };

      const result = await getPublicEssay('test-token');

      expect(result).toBeTruthy();
      expect(result.id).toBe('essay456');
      expect(result.title).toBe('Public Essay');
      expect(result.data).toEqual(essayData);
      expect(result.data.intro.paragraph).toBe('This is the introduction');
      expect(result.data.bodyParagraphs).toHaveLength(2);
      expect(result.data.conclusion.paragraph).toBe('This is the conclusion');
    });

    it('should return null for non-existent token', async () => {
      const result = await getPublicEssay('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null if essay is no longer public', async () => {
      setMockEssay('owner123', 'essay456', {
        title: 'Private Essay',
        data: { intro: { paragraph: 'test' } },
        sharing: {
          isPublic: false,
          publicToken: null,
        },
      });

      const data = getMockData();
      data.publicEssays['test-token'] = { essayId: 'essay456', ownerUid: 'owner123' };

      const result = await getPublicEssay('test-token');
      expect(result).toBeNull();
    });

    it('should include publicPermission in returned data', async () => {
      setMockEssay('owner123', 'essay456', {
        title: 'Editable Essay',
        data: { intro: { paragraph: 'test' } },
        sharing: {
          isPublic: true,
          publicToken: 'test-token',
          publicPermission: 'editor',
        },
      });

      const data = getMockData();
      data.publicEssays['test-token'] = { essayId: 'essay456', ownerUid: 'owner123' };

      const result = await getPublicEssay('test-token');

      expect(result.sharing.publicPermission).toBe('editor');
    });
  });

  describe('listSharedWithMe', () => {
    it('should return essays shared with user (case insensitive email)', async () => {
      setMockEssay('owner123', 'essay456', {
        title: 'Shared Essay',
        data: { intro: { paragraph: 'test' } },
        sharing: {
          collaborators: [{ email: 'user@test.com', permission: 'viewer' }],
        },
      });

      // Manually set up sharedWithMe
      const data = getMockData();
      data.sharedWithMe['user@test.com'] = {
        essays: {
          'owner123_essay456': {
            essayId: 'essay456',
            ownerUid: 'owner123',
            ownerEmail: 'owner@test.com',
            ownerDisplayName: 'Owner',
            title: 'Shared Essay',
            permission: 'viewer',
          },
        },
      };

      // Should work with different case
      const result = await listSharedWithMe('USER@TEST.COM');

      expect(result).toHaveLength(1);
      expect(result[0].essayId).toBe('essay456');
      expect(result[0].title).toBe('Shared Essay');
      expect(result[0].permission).toBe('viewer');
    });

    it('should return empty array when no essays shared', async () => {
      const result = await listSharedWithMe('nobody@test.com');
      expect(result).toEqual([]);
    });
  });
});

describe('Essay data structure', () => {
  it('should have correct nested data structure', () => {
    const essay = {
      id: 'essay123',
      title: 'My Essay',
      data: {
        intro: {
          hook: 'Hook text',
          background: 'Background text',
          thesis: 'Thesis statement',
          claims: [{ id: 'c1', text: 'Claim 1' }],
          paragraph: 'Full introduction paragraph',
        },
        bodyParagraphs: [
          {
            id: 'bp1',
            provingClaimId: 'c1',
            purpose: 'Purpose',
            proofBlocks: [
              { id: 'pb1', quote: 'Quote', analysis: 'Analysis', connection: 'Connection' }
            ],
            recap: 'Recap',
            paragraph: 'Body paragraph text',
          }
        ],
        conclusion: {
          soWhat: 'So what',
          restatement: 'Restatement',
          paragraph: 'Conclusion paragraph',
        },
      },
      sharing: {
        isPublic: true,
        publicToken: 'abc123',
        publicPermission: 'viewer',
        collaborators: [],
      },
    };

    // Verify structure
    expect(essay.data.intro.paragraph).toBe('Full introduction paragraph');
    expect(essay.data.bodyParagraphs[0].paragraph).toBe('Body paragraph text');
    expect(essay.data.conclusion.paragraph).toBe('Conclusion paragraph');
    expect(essay.sharing.publicPermission).toBe('viewer');
  });
});
