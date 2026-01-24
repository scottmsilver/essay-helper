import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  listEssays,
  getEssay,
  saveEssay,
  deleteEssay,
  updateEssayTitle,
  getEssaySharingInfo,
  shareEssay,
  unshareEssay,
  setPublicSharing,
  saveSharingSettings,
  listSharedWithMe,
  getSharedEssay,
  getPublicEssay,
  getEssayWithPermissions,
  FirestoreEssayStorage,
  firestoreStorage,
} from './firestore';
import type { Essay } from '../models/essay';
import type { Collaborator } from '../models/document';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
  },
}));

// Mock the db config
vi.mock('./config', () => ({
  db: {},
}));

// Import mocked functions
import {
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  doc,
  collection,
} from 'firebase/firestore';

const mockGetDocs = getDocs as Mock;
const mockGetDoc = getDoc as Mock;
const mockSetDoc = setDoc as Mock;
const mockDeleteDoc = deleteDoc as Mock;
const mockUpdateDoc = updateDoc as Mock;
const mockDoc = doc as Mock;
const mockCollection = collection as Mock;

function createMockEssay(): Essay {
  return {
    intro: {
      hook: 'Test hook',
      background: 'Test background',
      thesis: 'Test thesis',
      claims: [{ id: 'claim1', text: 'Claim 1' }],
      paragraph: 'Intro paragraph',
    },
    bodyParagraphs: [
      {
        id: 'body1',
        provingClaimId: 'claim1',
        purpose: 'Purpose',
        proofBlocks: [
          { id: 'pb1', quote: 'Quote', analysis: 'Analysis', connection: 'Connection' },
        ],
        recap: 'Recap',
        paragraph: 'Body paragraph',
      },
    ],
    conclusion: {
      restatement: 'Restatement',
      soWhat: 'So what',
      paragraph: 'Conclusion paragraph',
    },
  };
}

function createMockTimestamp(ms: number) {
  return {
    toMillis: () => ms,
    toDate: () => new Date(ms),
  };
}

describe('Essay CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.mockReturnValue({});
    mockCollection.mockReturnValue({});
  });

  describe('listEssays', () => {
    it('returns empty array for user with no essays', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      const result = await listEssays('user123');

      expect(result).toEqual([]);
      expect(mockCollection).toHaveBeenCalled();
    });

    it('returns essays sorted by updatedAt descending', async () => {
      const older = createMockTimestamp(1000);
      const newer = createMockTimestamp(2000);

      mockGetDocs.mockResolvedValue({
        docs: [
          { id: 'essay1', data: () => ({ title: 'Old', data: {}, updatedAt: older }) },
          { id: 'essay2', data: () => ({ title: 'New', data: {}, updatedAt: newer }) },
        ],
      });

      const result = await listEssays('user123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('essay2');
      expect(result[1].id).toBe('essay1');
    });

    it('handles essays without updatedAt', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: 'essay1', data: () => ({ title: 'No timestamp', data: {} }) },
        ],
      });

      const result = await listEssays('user123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('essay1');
    });
  });

  describe('getEssay', () => {
    it('returns null for non-existent essay', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const result = await getEssay('user123', 'nonexistent');

      expect(result).toBeNull();
    });

    it('returns essay document with all fields', async () => {
      const mockEssay = createMockEssay();
      const timestamp = createMockTimestamp(Date.now());

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'essay123',
        data: () => ({
          title: 'Test Essay',
          data: mockEssay,
          updatedAt: timestamp,
          createdAt: timestamp,
        }),
      });

      const result = await getEssay('user123', 'essay123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('essay123');
      expect(result?.title).toBe('Test Essay');
      expect(result?.data).toEqual(mockEssay);
    });
  });

  describe('saveEssay', () => {
    it('creates new essay with timestamp', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      const mockEssay = createMockEssay();
      const result = await saveEssay('user123', 'essay123', mockEssay, 'New Essay');

      expect(result).toBe('essay123');
      expect(mockSetDoc).toHaveBeenCalledTimes(2); // Essay doc + index
    });

    it('creates essayIndex entry', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      const mockEssay = createMockEssay();
      await saveEssay('user123', 'essay123', mockEssay, 'Test');

      // Second setDoc call should be for the index
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'essayIndex', 'essay123');
    });

    it('uses merge option for updates', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      const mockEssay = createMockEssay();
      await saveEssay('user123', 'essay123', mockEssay, 'Test');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ title: 'Test', data: mockEssay }),
        { merge: true }
      );
    });
  });

  describe('deleteEssay', () => {
    it('removes essay and index entry', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await deleteEssay('user123', 'essay123');

      expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateEssayTitle', () => {
    it('updates title with timestamp', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await updateEssayTitle('user123', 'essay123', 'New Title');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ title: 'New Title' }),
        { merge: true }
      );
    });
  });
});

describe('Sharing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.mockReturnValue({});
    mockCollection.mockReturnValue({});
  });

  describe('getEssaySharingInfo', () => {
    it('returns null for non-existent essay', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const result = await getEssaySharingInfo('user123', 'essay123');

      expect(result).toBeNull();
    });

    it('returns default sharing info when not set', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      });

      const result = await getEssaySharingInfo('user123', 'essay123');

      expect(result).toEqual({
        isPublic: false,
        publicToken: null,
        collaborators: [],
      });
    });

    it('returns existing sharing info', async () => {
      const sharingInfo = {
        isPublic: true,
        publicToken: 'abc123',
        collaborators: [{ email: 'test@example.com', permission: 'editor', addedAt: new Date() }],
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ sharing: sharingInfo }),
      });

      const result = await getEssaySharingInfo('user123', 'essay123');

      expect(result?.isPublic).toBe(true);
      expect(result?.publicToken).toBe('abc123');
      expect(result?.collaborators).toHaveLength(1);
      expect(result?.collaborators[0].email).toBe('test@example.com');
      expect(result?.collaborators[0].permission).toBe('editor');
      expect(result?.collaborators[0].addedAt).toBeInstanceOf(Date);
    });
  });

  describe('shareEssay', () => {
    it('adds collaborator to essay', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      });
      mockUpdateDoc.mockResolvedValue(undefined);
      mockSetDoc.mockResolvedValue(undefined);

      await shareEssay(
        'owner123',
        'essay123',
        'collaborator@example.com',
        'editor',
        'owner@example.com',
        'Owner Name',
        'Test Essay'
      );

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('replaces existing collaborator with same email', async () => {
      const existingCollaborator: Collaborator = {
        email: 'test@example.com',
        permission: 'viewer',
        addedAt: new Date(),
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          sharing: { collaborators: [existingCollaborator] },
        }),
      });
      mockUpdateDoc.mockResolvedValue(undefined);
      mockSetDoc.mockResolvedValue(undefined);

      await shareEssay(
        'owner123',
        'essay123',
        'test@example.com',
        'editor',
        'owner@example.com',
        'Owner',
        'Test'
      );

      // Should update existing, not add duplicate
      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  describe('unshareEssay', () => {
    it('removes collaborator from essay', async () => {
      const collaborator: Collaborator = {
        email: 'test@example.com',
        permission: 'editor',
        addedAt: new Date(),
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          sharing: { collaborators: [collaborator] },
        }),
      });
      mockUpdateDoc.mockResolvedValue(undefined);
      mockDeleteDoc.mockResolvedValue(undefined);

      await unshareEssay('owner123', 'essay123', 'test@example.com');

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it('handles essay with no collaborators', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      });
      mockDeleteDoc.mockResolvedValue(undefined);

      await unshareEssay('owner123', 'essay123', 'test@example.com');

      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('setPublicSharing', () => {
    it('generates token when enabling public sharing', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      });
      mockUpdateDoc.mockResolvedValue(undefined);
      mockSetDoc.mockResolvedValue(undefined);

      const token = await setPublicSharing('owner123', 'essay123', true);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token?.length).toBe(8);
    });

    it('returns null and cleans up when disabling public sharing', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          sharing: { isPublic: true, publicToken: 'oldtoken' },
        }),
      });
      mockUpdateDoc.mockResolvedValue(undefined);
      mockDeleteDoc.mockResolvedValue(undefined);

      const token = await setPublicSharing('owner123', 'essay123', false);

      expect(token).toBeNull();
      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('saveSharingSettings', () => {
    it('saves complete sharing configuration', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      });
      mockSetDoc.mockResolvedValue(undefined);

      const collaborators: Collaborator[] = [
        { email: 'test@example.com', permission: 'editor', addedAt: new Date() },
      ];

      const token = await saveSharingSettings(
        'owner123',
        'essay123',
        collaborators,
        true,
        'viewer',
        'owner@example.com',
        'Owner',
        'Test Essay'
      );

      expect(token).toBeTruthy();
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('removes collaborators not in new list', async () => {
      const oldCollaborator: Collaborator = {
        email: 'old@example.com',
        permission: 'viewer',
        addedAt: new Date(),
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          sharing: { collaborators: [oldCollaborator] },
        }),
      });
      mockSetDoc.mockResolvedValue(undefined);
      mockDeleteDoc.mockResolvedValue(undefined);

      await saveSharingSettings(
        'owner123',
        'essay123',
        [],
        false,
        'viewer',
        'owner@example.com',
        'Owner',
        'Test'
      );

      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });
});

describe('Shared Access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.mockReturnValue({});
    mockCollection.mockReturnValue({});
  });

  describe('listSharedWithMe', () => {
    it('returns empty array when no shared essays', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      const result = await listSharedWithMe('test@example.com');

      expect(result).toEqual([]);
    });

    it('returns shared essay references', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'owner_essay',
            data: () => ({
              essayId: 'essay123',
              ownerUid: 'owner123',
              ownerEmail: 'owner@example.com',
              title: 'Shared Essay',
              permission: 'editor',
            }),
          },
        ],
      });

      const result = await listSharedWithMe('test@example.com');

      expect(result).toHaveLength(1);
      expect(result[0].essayId).toBe('essay123');
    });
  });

  describe('getSharedEssay', () => {
    it('returns null for non-existent essay', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const result = await getSharedEssay('owner123', 'essay123');

      expect(result).toBeNull();
    });

    it('returns essay document with ownerUid', async () => {
      const mockEssay = createMockEssay();

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'essay123',
        data: () => ({ title: 'Shared', data: mockEssay }),
      });

      const result = await getSharedEssay('owner123', 'essay123');

      expect(result).not.toBeNull();
      expect(result?.ownerUid).toBe('owner123');
    });
  });

  describe('getPublicEssay', () => {
    it('returns null for invalid token', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const result = await getPublicEssay('invalidtoken');

      expect(result).toBeNull();
    });

    it('returns null if essay no longer public', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ essayId: 'essay123', ownerUid: 'owner123' }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ sharing: { isPublic: false } }),
        });

      const result = await getPublicEssay('validtoken');

      expect(result).toBeNull();
    });

    it('returns essay when publicly shared', async () => {
      const mockEssay = createMockEssay();

      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ essayId: 'essay123', ownerUid: 'owner123' }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            title: 'Public Essay',
            data: mockEssay,
            sharing: { isPublic: true },
          }),
        });

      const result = await getPublicEssay('validtoken');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('essay123');
    });
  });
});

describe('Permission Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.mockReturnValue({});
  });

  describe('getEssayWithPermissions', () => {
    it('returns null for non-existent essay index', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const result = await getEssayWithPermissions('essay123', 'user123', 'user@example.com');

      expect(result.essay).toBeNull();
      expect(result.permission).toBeNull();
      expect(result.ownerUid).toBeNull();
    });

    it('returns null for essay that no longer exists', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ownerUid: 'owner123' }),
        })
        .mockResolvedValueOnce({ exists: () => false });

      const result = await getEssayWithPermissions('essay123', 'user123', null);

      expect(result.essay).toBeNull();
    });

    it('returns owner permission for essay owner', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ownerUid: 'owner123' }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ title: 'My Essay', data: {} }),
        });

      const result = await getEssayWithPermissions('essay123', 'owner123', 'owner@example.com');

      expect(result.permission).toBe('owner');
      expect(result.ownerUid).toBe('owner123');
    });

    it('returns editor permission for editor collaborator', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ownerUid: 'owner123' }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            title: 'Shared Essay',
            data: {},
            sharing: {
              collaboratorEmails: ['editor@example.com'],
              editorEmails: ['editor@example.com'],
            },
          }),
        });

      const result = await getEssayWithPermissions('essay123', 'user456', 'editor@example.com');

      expect(result.permission).toBe('editor');
    });

    it('returns viewer permission for viewer collaborator', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ownerUid: 'owner123' }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            title: 'Shared Essay',
            data: {},
            sharing: {
              collaboratorEmails: ['viewer@example.com'],
              editorEmails: [],
            },
          }),
        });

      const result = await getEssayWithPermissions('essay123', 'user456', 'viewer@example.com');

      expect(result.permission).toBe('viewer');
    });

    it('returns public permission for public essays', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ownerUid: 'owner123' }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            title: 'Public Essay',
            data: {},
            sharing: {
              isPublic: true,
              publicPermission: 'viewer',
            },
          }),
        });

      const result = await getEssayWithPermissions('essay123', null, null);

      expect(result.permission).toBe('viewer');
    });

    it('returns null for unauthorized access', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ownerUid: 'owner123' }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            title: 'Private Essay',
            data: {},
          }),
        });

      const result = await getEssayWithPermissions('essay123', 'stranger', 'stranger@example.com');

      expect(result.essay).toBeNull();
      expect(result.permission).toBeNull();
    });

    it('handles case-insensitive email matching', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ownerUid: 'owner123' }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            title: 'Shared Essay',
            data: {},
            sharing: {
              collaboratorEmails: ['Test@Example.COM'],
              editorEmails: ['Test@Example.COM'],
            },
          }),
        });

      const result = await getEssayWithPermissions('essay123', 'user456', 'test@example.com');

      expect(result.permission).toBe('editor');
    });
  });
});

describe('FirestoreEssayStorage class', () => {
  it('implements EssayStorage interface', () => {
    const storage = new FirestoreEssayStorage();

    expect(storage.listEssays).toBe(listEssays);
    expect(storage.getEssay).toBe(getEssay);
    expect(storage.saveEssay).toBe(saveEssay);
    expect(storage.deleteEssay).toBe(deleteEssay);
    expect(storage.updateEssayTitle).toBe(updateEssayTitle);
    expect(storage.getEssaySharingInfo).toBe(getEssaySharingInfo);
    expect(storage.shareEssay).toBe(shareEssay);
    expect(storage.unshareEssay).toBe(unshareEssay);
    expect(storage.setPublicSharing).toBe(setPublicSharing);
    expect(storage.saveSharingSettings).toBe(saveSharingSettings);
    expect(storage.listSharedWithMe).toBe(listSharedWithMe);
    expect(storage.getSharedEssay).toBe(getSharedEssay);
    expect(storage.getPublicEssay).toBe(getPublicEssay);
    expect(storage.getEssayWithPermissions).toBe(getEssayWithPermissions);
  });

  it('exports singleton instance', () => {
    expect(firestoreStorage).toBeInstanceOf(FirestoreEssayStorage);
  });
});
