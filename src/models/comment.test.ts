import { describe, it, expect, vi } from 'vitest';
import {
  groupCommentsIntoThreads,
  sortThreadsByDate,
  groupCommentsByBlock,
  createComment,
  generateCommentId,
  type Comment,
  type CommentThread,
  type BlockType,
} from './comment';

// Mock nanoid to return predictable IDs for testing
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-id'),
}));

// =============================================================================
// Helper Functions
// =============================================================================

function createTestComment(overrides: Partial<Comment> = {}): Comment {
  const now = new Date();
  return {
    id: 'comment-1',
    blockId: 'block-1',
    blockType: 'intro' as BlockType,
    authorUid: 'user-1',
    authorEmail: 'user@example.com',
    authorDisplayName: 'Test User',
    text: 'Test comment',
    createdAt: now,
    updatedAt: now,
    parentCommentId: null,
    resolved: false,
    ...overrides,
  };
}

function createTestThread(
  rootComment: Comment,
  replies: Comment[] = []
): CommentThread {
  return { rootComment, replies };
}

// =============================================================================
// generateCommentId Tests
// =============================================================================

describe('generateCommentId', () => {
  it('returns a string ID', () => {
    const id = generateCommentId();
    expect(typeof id).toBe('string');
    expect(id).toBe('test-id');
  });
});

// =============================================================================
// createComment Tests
// =============================================================================

describe('createComment', () => {
  it('creates a comment with required fields', () => {
    const result = createComment(
      'block-123',
      'intro',
      'user-456',
      'test@example.com',
      'Test User',
      'This is a comment'
    );

    expect(result.blockId).toBe('block-123');
    expect(result.blockType).toBe('intro');
    expect(result.authorUid).toBe('user-456');
    expect(result.authorEmail).toBe('test@example.com');
    expect(result.authorDisplayName).toBe('Test User');
    expect(result.text).toBe('This is a comment');
    expect(result.parentCommentId).toBeNull();
    expect(result.resolved).toBe(false);
  });

  it('generates an id using nanoid', () => {
    const result = createComment(
      'block-1',
      'claim',
      'user-1',
      'user@test.com',
      'User',
      'Comment'
    );

    expect(result.id).toBe('test-id');
  });

  it('sets createdAt and updatedAt to current time', () => {
    const before = new Date();
    const result = createComment(
      'block-1',
      'bodyParagraph',
      'user-1',
      'user@test.com',
      'User',
      'Test'
    );
    const after = new Date();

    expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(result.updatedAt.getTime()).toBe(result.createdAt.getTime());
  });

  it('allows setting parentCommentId for replies', () => {
    const result = createComment(
      'block-1',
      'proofBlock',
      'user-1',
      'user@test.com',
      'User',
      'Reply',
      'parent-123'
    );

    expect(result.parentCommentId).toBe('parent-123');
  });

  it('defaults parentCommentId to null', () => {
    const result = createComment(
      'block-1',
      'conclusion',
      'user-1',
      'user@test.com',
      'User',
      'Comment'
    );

    expect(result.parentCommentId).toBeNull();
  });

  it('creates comments for all block types', () => {
    const blockTypes: BlockType[] = [
      'intro',
      'claim',
      'bodyParagraph',
      'proofBlock',
      'conclusion',
    ];

    blockTypes.forEach((blockType) => {
      const result = createComment(
        `${blockType}-block`,
        blockType,
        'user-1',
        'user@test.com',
        'User',
        `Comment on ${blockType}`
      );

      expect(result.blockType).toBe(blockType);
    });
  });
});

// =============================================================================
// groupCommentsIntoThreads Tests
// =============================================================================

describe('groupCommentsIntoThreads', () => {
  describe('empty and single item cases', () => {
    it('returns empty array for empty input', () => {
      const result = groupCommentsIntoThreads([]);
      expect(result).toEqual([]);
    });

    it('creates a thread from a single root comment', () => {
      const comment = createTestComment();
      const result = groupCommentsIntoThreads([comment]);

      expect(result).toHaveLength(1);
      expect(result[0].rootComment).toEqual(comment);
      expect(result[0].replies).toEqual([]);
    });

    it('handles single reply without root (orphan reply)', () => {
      const reply = createTestComment({
        id: 'reply-1',
        parentCommentId: 'nonexistent-root',
      });
      const result = groupCommentsIntoThreads([reply]);

      // Orphan replies should not create threads (no root comments found)
      expect(result).toHaveLength(0);
    });
  });

  describe('basic threading', () => {
    it('groups a root comment with its replies', () => {
      const root = createTestComment({ id: 'root-1' });
      const reply1 = createTestComment({
        id: 'reply-1',
        parentCommentId: 'root-1',
        text: 'First reply',
      });
      const reply2 = createTestComment({
        id: 'reply-2',
        parentCommentId: 'root-1',
        text: 'Second reply',
      });

      const result = groupCommentsIntoThreads([root, reply1, reply2]);

      expect(result).toHaveLength(1);
      expect(result[0].rootComment.id).toBe('root-1');
      expect(result[0].replies).toHaveLength(2);
      expect(result[0].replies.map((r) => r.id)).toContain('reply-1');
      expect(result[0].replies.map((r) => r.id)).toContain('reply-2');
    });

    it('handles replies provided before root in array', () => {
      const root = createTestComment({ id: 'root-1' });
      const reply = createTestComment({
        id: 'reply-1',
        parentCommentId: 'root-1',
      });

      // Reply comes before root in the array
      const result = groupCommentsIntoThreads([reply, root]);

      expect(result).toHaveLength(1);
      expect(result[0].rootComment.id).toBe('root-1');
      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies[0].id).toBe('reply-1');
    });

    it('sorts replies by createdAt date ascending', () => {
      const root = createTestComment({ id: 'root-1' });
      const olderReply = createTestComment({
        id: 'older-reply',
        parentCommentId: 'root-1',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      });
      const newerReply = createTestComment({
        id: 'newer-reply',
        parentCommentId: 'root-1',
        createdAt: new Date('2024-01-01T12:00:00Z'),
      });

      // Provide in reverse order
      const result = groupCommentsIntoThreads([newerReply, root, olderReply]);

      expect(result[0].replies[0].id).toBe('older-reply');
      expect(result[0].replies[1].id).toBe('newer-reply');
    });
  });

  describe('multiple threads', () => {
    it('creates separate threads for different root comments', () => {
      const root1 = createTestComment({
        id: 'root-1',
        blockId: 'block-1',
      });
      const root2 = createTestComment({
        id: 'root-2',
        blockId: 'block-2',
      });
      const reply1 = createTestComment({
        id: 'reply-1',
        parentCommentId: 'root-1',
        blockId: 'block-1',
      });
      const reply2 = createTestComment({
        id: 'reply-2',
        parentCommentId: 'root-2',
        blockId: 'block-2',
      });

      const result = groupCommentsIntoThreads([root1, root2, reply1, reply2]);

      expect(result).toHaveLength(2);

      const thread1 = result.find((t) => t.rootComment.id === 'root-1');
      const thread2 = result.find((t) => t.rootComment.id === 'root-2');

      expect(thread1).toBeDefined();
      expect(thread1!.replies).toHaveLength(1);
      expect(thread1!.replies[0].id).toBe('reply-1');

      expect(thread2).toBeDefined();
      expect(thread2!.replies).toHaveLength(1);
      expect(thread2!.replies[0].id).toBe('reply-2');
    });

    it('handles multiple threads per block', () => {
      const sameBlockId = 'shared-block';
      const root1 = createTestComment({
        id: 'root-1',
        blockId: sameBlockId,
        createdAt: new Date('2024-01-01T10:00:00Z'),
      });
      const root2 = createTestComment({
        id: 'root-2',
        blockId: sameBlockId,
        createdAt: new Date('2024-01-01T11:00:00Z'),
      });
      const root3 = createTestComment({
        id: 'root-3',
        blockId: sameBlockId,
        createdAt: new Date('2024-01-01T12:00:00Z'),
      });

      const result = groupCommentsIntoThreads([root1, root2, root3]);

      expect(result).toHaveLength(3);
      expect(result.every((t) => t.rootComment.blockId === sameBlockId)).toBe(
        true
      );
    });
  });

  describe('edge cases', () => {
    it('handles comments with same createdAt timestamp', () => {
      const sameTime = new Date('2024-01-01T12:00:00Z');
      const root = createTestComment({
        id: 'root',
        createdAt: sameTime,
      });
      const reply1 = createTestComment({
        id: 'reply-1',
        parentCommentId: 'root',
        createdAt: sameTime,
      });
      const reply2 = createTestComment({
        id: 'reply-2',
        parentCommentId: 'root',
        createdAt: sameTime,
      });

      const result = groupCommentsIntoThreads([root, reply1, reply2]);

      expect(result).toHaveLength(1);
      expect(result[0].replies).toHaveLength(2);
    });

    it('preserves resolved status on root comments', () => {
      const resolvedRoot = createTestComment({
        id: 'root',
        resolved: true,
      });
      const reply = createTestComment({
        id: 'reply',
        parentCommentId: 'root',
        resolved: false,
      });

      const result = groupCommentsIntoThreads([resolvedRoot, reply]);

      expect(result[0].rootComment.resolved).toBe(true);
      expect(result[0].replies[0].resolved).toBe(false);
    });

    it('handles mix of resolved and unresolved threads', () => {
      const resolvedRoot = createTestComment({
        id: 'resolved-root',
        resolved: true,
      });
      const unresolvedRoot = createTestComment({
        id: 'unresolved-root',
        resolved: false,
      });

      const result = groupCommentsIntoThreads([resolvedRoot, unresolvedRoot]);

      expect(result).toHaveLength(2);
      const resolved = result.find(
        (t) => t.rootComment.id === 'resolved-root'
      );
      const unresolved = result.find(
        (t) => t.rootComment.id === 'unresolved-root'
      );

      expect(resolved!.rootComment.resolved).toBe(true);
      expect(unresolved!.rootComment.resolved).toBe(false);
    });

    it('handles different block types', () => {
      const introComment = createTestComment({
        id: 'intro-comment',
        blockType: 'intro',
      });
      const claimComment = createTestComment({
        id: 'claim-comment',
        blockType: 'claim',
      });
      const bodyComment = createTestComment({
        id: 'body-comment',
        blockType: 'bodyParagraph',
      });
      const proofComment = createTestComment({
        id: 'proof-comment',
        blockType: 'proofBlock',
      });
      const conclusionComment = createTestComment({
        id: 'conclusion-comment',
        blockType: 'conclusion',
      });

      const result = groupCommentsIntoThreads([
        introComment,
        claimComment,
        bodyComment,
        proofComment,
        conclusionComment,
      ]);

      expect(result).toHaveLength(5);
      expect(result.map((t) => t.rootComment.blockType)).toContain('intro');
      expect(result.map((t) => t.rootComment.blockType)).toContain('claim');
      expect(result.map((t) => t.rootComment.blockType)).toContain(
        'bodyParagraph'
      );
      expect(result.map((t) => t.rootComment.blockType)).toContain(
        'proofBlock'
      );
      expect(result.map((t) => t.rootComment.blockType)).toContain(
        'conclusion'
      );
    });
  });
});

// =============================================================================
// sortThreadsByDate Tests
// =============================================================================

describe('sortThreadsByDate', () => {
  describe('empty and single item cases', () => {
    it('returns empty array for empty input', () => {
      const result = sortThreadsByDate([]);
      expect(result).toEqual([]);
    });

    it('returns same array for single thread', () => {
      const thread = createTestThread(createTestComment());
      const result = sortThreadsByDate([thread]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(thread);
    });
  });

  describe('sorting behavior', () => {
    it('sorts threads by root comment createdAt descending (newest first) by default', () => {
      const oldThread = createTestThread(
        createTestComment({
          id: 'old',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        })
      );
      const newThread = createTestThread(
        createTestComment({
          id: 'new',
          createdAt: new Date('2024-01-01T12:00:00Z'),
        })
      );

      const result = sortThreadsByDate([oldThread, newThread]);

      expect(result[0].rootComment.id).toBe('new');
      expect(result[1].rootComment.id).toBe('old');
    });

    it('sorts threads by root comment createdAt ascending (oldest first) when specified', () => {
      const oldThread = createTestThread(
        createTestComment({
          id: 'old',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        })
      );
      const newThread = createTestThread(
        createTestComment({
          id: 'new',
          createdAt: new Date('2024-01-01T12:00:00Z'),
        })
      );

      const result = sortThreadsByDate([newThread, oldThread], true);

      expect(result[0].rootComment.id).toBe('old');
      expect(result[1].rootComment.id).toBe('new');
    });

    it('handles multiple threads with various dates', () => {
      const thread1 = createTestThread(
        createTestComment({
          id: 'middle',
          createdAt: new Date('2024-01-02'),
        })
      );
      const thread2 = createTestThread(
        createTestComment({
          id: 'oldest',
          createdAt: new Date('2024-01-01'),
        })
      );
      const thread3 = createTestThread(
        createTestComment({
          id: 'newest',
          createdAt: new Date('2024-01-03'),
        })
      );

      // Descending (default) - newest first
      const resultDesc = sortThreadsByDate([thread1, thread2, thread3]);
      expect(resultDesc.map((t) => t.rootComment.id)).toEqual([
        'newest',
        'middle',
        'oldest',
      ]);

      // Ascending - oldest first
      const resultAsc = sortThreadsByDate([thread1, thread2, thread3], true);
      expect(resultAsc.map((t) => t.rootComment.id)).toEqual([
        'oldest',
        'middle',
        'newest',
      ]);
    });

    it('maintains stable order for threads with same createdAt', () => {
      const sameDate = new Date('2024-01-01');
      const thread1 = createTestThread(
        createTestComment({ id: 'first', createdAt: sameDate })
      );
      const thread2 = createTestThread(
        createTestComment({ id: 'second', createdAt: sameDate })
      );

      const result = sortThreadsByDate([thread1, thread2]);

      // With same dates, original order should be preserved (stable sort)
      expect(result).toHaveLength(2);
    });
  });

  describe('immutability', () => {
    it('does not mutate the original array', () => {
      const thread1 = createTestThread(
        createTestComment({
          id: 'new',
          createdAt: new Date('2024-01-02'),
        })
      );
      const thread2 = createTestThread(
        createTestComment({
          id: 'old',
          createdAt: new Date('2024-01-01'),
        })
      );
      const original = [thread1, thread2];
      const originalFirstId = original[0].rootComment.id;

      sortThreadsByDate(original);

      expect(original[0].rootComment.id).toBe(originalFirstId);
    });
  });
});

// =============================================================================
// groupCommentsByBlock Tests
// =============================================================================

describe('groupCommentsByBlock', () => {
  it('returns empty map for empty input', () => {
    const result = groupCommentsByBlock([]);
    expect(result.size).toBe(0);
  });

  it('groups comments by their blockId', () => {
    const comment1 = createTestComment({
      id: 'c1',
      blockId: 'block-A',
    });
    const comment2 = createTestComment({
      id: 'c2',
      blockId: 'block-B',
    });
    const comment3 = createTestComment({
      id: 'c3',
      blockId: 'block-A',
    });

    const result = groupCommentsByBlock([comment1, comment2, comment3]);

    expect(result.size).toBe(2);
    expect(result.has('block-A')).toBe(true);
    expect(result.has('block-B')).toBe(true);
    expect(result.get('block-A')!).toHaveLength(2);
    expect(result.get('block-B')!).toHaveLength(1);
  });

  it('creates threads within each block group', () => {
    const root = createTestComment({
      id: 'root',
      blockId: 'block-A',
    });
    const reply = createTestComment({
      id: 'reply',
      blockId: 'block-A',
      parentCommentId: 'root',
    });

    const result = groupCommentsByBlock([root, reply]);

    expect(result.get('block-A')!).toHaveLength(1);
    expect(result.get('block-A')![0].rootComment.id).toBe('root');
    expect(result.get('block-A')![0].replies).toHaveLength(1);
  });

  it('sorts threads within each block by date', () => {
    const oldRoot = createTestComment({
      id: 'old-root',
      blockId: 'block-A',
      createdAt: new Date('2024-01-01'),
    });
    const newRoot = createTestComment({
      id: 'new-root',
      blockId: 'block-A',
      createdAt: new Date('2024-01-02'),
    });

    const result = groupCommentsByBlock([oldRoot, newRoot]);
    const threads = result.get('block-A')!;

    // Default sort is descending (newest first)
    expect(threads[0].rootComment.id).toBe('new-root');
    expect(threads[1].rootComment.id).toBe('old-root');
  });

  it('handles multiple blocks with multiple threads each', () => {
    const blockARoot1 = createTestComment({
      id: 'A-root-1',
      blockId: 'block-A',
      createdAt: new Date('2024-01-01'),
    });
    const blockARoot2 = createTestComment({
      id: 'A-root-2',
      blockId: 'block-A',
      createdAt: new Date('2024-01-02'),
    });
    const blockAReply = createTestComment({
      id: 'A-reply',
      blockId: 'block-A',
      parentCommentId: 'A-root-1',
    });
    const blockBRoot = createTestComment({
      id: 'B-root',
      blockId: 'block-B',
    });

    const result = groupCommentsByBlock([
      blockARoot1,
      blockARoot2,
      blockAReply,
      blockBRoot,
    ]);

    expect(result.size).toBe(2);

    const blockAThreads = result.get('block-A')!;
    expect(blockAThreads).toHaveLength(2);

    // Find the thread with replies
    const threadWithReply = blockAThreads.find(
      (t) => t.rootComment.id === 'A-root-1'
    );
    expect(threadWithReply!.replies).toHaveLength(1);

    const blockBThreads = result.get('block-B')!;
    expect(blockBThreads).toHaveLength(1);
    expect(blockBThreads[0].rootComment.id).toBe('B-root');
  });

  it('handles all block types', () => {
    const comments = [
      createTestComment({ id: 'intro', blockId: 'intro-1', blockType: 'intro' }),
      createTestComment({ id: 'claim', blockId: 'claim-1', blockType: 'claim' }),
      createTestComment({
        id: 'body',
        blockId: 'body-1',
        blockType: 'bodyParagraph',
      }),
      createTestComment({
        id: 'proof',
        blockId: 'proof-1',
        blockType: 'proofBlock',
      }),
      createTestComment({
        id: 'conclusion',
        blockId: 'conclusion-1',
        blockType: 'conclusion',
      }),
    ];

    const result = groupCommentsByBlock(comments);

    expect(result.size).toBe(5);
    expect(result.has('intro-1')).toBe(true);
    expect(result.has('claim-1')).toBe(true);
    expect(result.has('body-1')).toBe(true);
    expect(result.has('proof-1')).toBe(true);
    expect(result.has('conclusion-1')).toBe(true);
  });
});
