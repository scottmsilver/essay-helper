import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComments } from './useComments';
import type { Comment } from '../models/comment';

// Mock useAuth hook
const mockUser = {
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

vi.mock('./useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    loading: false,
  })),
}));

// Mock firebase/firestore functions
const mockUnsubscribe = vi.fn();
vi.mock('../firebase/firestore', () => ({
  addComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  resolveThread: vi.fn(),
  subscribeToComments: vi.fn((userId, essayId, onComments, onError) => {
    // Default to returning empty comments array
    onComments([]);
    return mockUnsubscribe;
  }),
}));

// Mock comment model
vi.mock('../models/comment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../models/comment')>();
  return {
    ...actual,
    createComment: vi.fn((blockId, blockType, authorUid, authorEmail, authorDisplayName, text, parentCommentId) => ({
      id: 'new-comment-id',
      blockId,
      blockType,
      authorUid,
      authorEmail,
      authorDisplayName,
      text,
      createdAt: new Date('2024-01-15T12:00:00Z'),
      updatedAt: new Date('2024-01-15T12:00:00Z'),
      parentCommentId: parentCommentId ?? null,
      resolved: false,
    })),
  };
});

// Import mocked modules
import { useAuth } from './useAuth';
import {
  addComment as addCommentToFirestore,
  updateComment as updateCommentInFirestore,
  deleteComment as deleteCommentFromFirestore,
  resolveThread as resolveThreadInFirestore,
  subscribeToComments,
} from '../firebase/firestore';

const mockUseAuth = vi.mocked(useAuth);
const mockAddComment = addCommentToFirestore as Mock;
const mockUpdateComment = updateCommentInFirestore as Mock;
const mockDeleteComment = deleteCommentFromFirestore as Mock;
const mockResolveThread = resolveThreadInFirestore as Mock;
const mockSubscribe = subscribeToComments as Mock;

function createMockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'comment-1',
    blockId: 'block-1',
    blockType: 'intro',
    authorUid: 'user-123',
    authorEmail: 'test@example.com',
    authorDisplayName: 'Test User',
    text: 'Test comment',
    createdAt: new Date('2024-01-15T12:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    parentCommentId: null,
    resolved: false,
    ...overrides,
  };
}

describe('useComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser as unknown as import('firebase/auth').User,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    mockUnsubscribe.mockClear();
  });

  describe('initialization', () => {
    it('returns empty commentsByBlock initially', () => {
      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      expect(result.current.commentsByBlock.size).toBe(0);
    });

    it('subscribes to comments when essayId and ownerUid are provided', () => {
      renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      expect(mockSubscribe).toHaveBeenCalledWith(
        'owner-1',
        'essay-1',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('uses current user uid when ownerUid is not provided', () => {
      renderHook(() => useComments({ essayId: 'essay-1' }));

      expect(mockSubscribe).toHaveBeenCalledWith(
        'user-123',
        'essay-1',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('does not subscribe when essayId is null', () => {
      renderHook(() => useComments({ essayId: null }));

      expect(mockSubscribe).not.toHaveBeenCalled();
    });

    it('does not subscribe when user is not logged in and no ownerUid', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
      });

      renderHook(() => useComments({ essayId: 'essay-1' }));

      expect(mockSubscribe).not.toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('sets loading to false after comments load', async () => {
      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('receiving comments', () => {
    it('groups comments by block when received', async () => {
      const comments = [
        createMockComment({ id: 'c1', blockId: 'block-A' }),
        createMockComment({ id: 'c2', blockId: 'block-B' }),
        createMockComment({ id: 'c3', blockId: 'block-A', parentCommentId: 'c1' }),
      ];

      mockSubscribe.mockImplementation((userId, essayId, onComments) => {
        onComments(comments);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await waitFor(() => {
        expect(result.current.commentsByBlock.size).toBe(2);
      });

      const blockAThreads = result.current.commentsByBlock.get('block-A');
      expect(blockAThreads).toBeDefined();
      expect(blockAThreads).toHaveLength(1);
      expect(blockAThreads![0].rootComment.id).toBe('c1');
      expect(blockAThreads![0].replies).toHaveLength(1);

      const blockBThreads = result.current.commentsByBlock.get('block-B');
      expect(blockBThreads).toBeDefined();
      expect(blockBThreads).toHaveLength(1);
    });

    it('handles subscription errors', async () => {
      mockSubscribe.mockImplementation((userId, essayId, onComments, onError) => {
        onError(new Error('Subscription failed'));
        return mockUnsubscribe;
      });

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load comments');
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('addComment', () => {
    it('creates and saves a new comment', async () => {
      const savedComment = createMockComment({ id: 'saved-id' });
      mockAddComment.mockResolvedValue(savedComment);

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      let returnedComment: Comment | null = null;
      await act(async () => {
        returnedComment = await result.current.addComment(
          'block-1',
          'intro',
          'My new comment'
        );
      });

      expect(mockAddComment).toHaveBeenCalledWith(
        'owner-1',
        'essay-1',
        expect.objectContaining({
          blockId: 'block-1',
          blockType: 'intro',
          text: 'My new comment',
          authorUid: 'user-123',
        })
      );
      expect(returnedComment).toEqual(savedComment);
    });

    it('creates a reply with parentCommentId', async () => {
      const savedReply = createMockComment({
        id: 'reply-id',
        parentCommentId: 'parent-id',
      });
      mockAddComment.mockResolvedValue(savedReply);

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await act(async () => {
        await result.current.addComment(
          'block-1',
          'intro',
          'My reply',
          'parent-id'
        );
      });

      expect(mockAddComment).toHaveBeenCalledWith(
        'owner-1',
        'essay-1',
        expect.objectContaining({
          parentCommentId: 'parent-id',
        })
      );
    });

    it('trims whitespace from comment text', async () => {
      mockAddComment.mockResolvedValue(createMockComment());

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await act(async () => {
        await result.current.addComment(
          'block-1',
          'intro',
          '  My comment with spaces  '
        );
      });

      expect(mockAddComment).toHaveBeenCalledWith(
        'owner-1',
        'essay-1',
        expect.objectContaining({
          text: 'My comment with spaces',
        })
      );
    });

    it('sets error when text is empty', async () => {
      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      let returnedComment: Comment | null = null;
      await act(async () => {
        returnedComment = await result.current.addComment('block-1', 'intro', '   ');
      });

      expect(returnedComment).toBeNull();
      expect(result.current.error).toBe('Comment text cannot be empty');
      expect(mockAddComment).not.toHaveBeenCalled();
    });

    it('sets error when user is not logged in', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
      });

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      let returnedComment: Comment | null = null;
      await act(async () => {
        returnedComment = await result.current.addComment(
          'block-1',
          'intro',
          'My comment'
        );
      });

      expect(returnedComment).toBeNull();
      expect(result.current.error).toBe('You must be logged in to comment');
    });

    it('handles firestore errors', async () => {
      mockAddComment.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await act(async () => {
        await result.current.addComment('block-1', 'intro', 'My comment');
      });

      expect(result.current.error).toBe('Failed to add comment');
    });
  });

  describe('editComment', () => {
    it('updates comment text when user owns the comment', async () => {
      const existingComment = createMockComment({
        id: 'comment-to-edit',
        authorUid: 'user-123',
      });

      mockSubscribe.mockImplementation((userId, essayId, onComments) => {
        onComments([existingComment]);
        return mockUnsubscribe;
      });
      mockUpdateComment.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await waitFor(() => {
        expect(result.current.commentsByBlock.size).toBe(1);
      });

      await act(async () => {
        await result.current.editComment('comment-to-edit', 'Updated text');
      });

      expect(mockUpdateComment).toHaveBeenCalledWith(
        'owner-1',
        'essay-1',
        'comment-to-edit',
        'Updated text'
      );
    });

    it('sets error when user does not own the comment', async () => {
      const existingComment = createMockComment({
        id: 'other-comment',
        authorUid: 'other-user',
      });

      mockSubscribe.mockImplementation((userId, essayId, onComments) => {
        onComments([existingComment]);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await waitFor(() => {
        expect(result.current.commentsByBlock.size).toBe(1);
      });

      await act(async () => {
        await result.current.editComment('other-comment', 'Updated text');
      });

      expect(result.current.error).toBe('You can only edit your own comments');
      expect(mockUpdateComment).not.toHaveBeenCalled();
    });

    it('sets error when comment is not found', async () => {
      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await act(async () => {
        await result.current.editComment('nonexistent', 'Updated text');
      });

      expect(result.current.error).toBe('Comment not found');
    });

    it('sets error when text is empty', async () => {
      const existingComment = createMockComment({
        id: 'comment-to-edit',
        authorUid: 'user-123',
      });

      mockSubscribe.mockImplementation((userId, essayId, onComments) => {
        onComments([existingComment]);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await waitFor(() => {
        expect(result.current.commentsByBlock.size).toBe(1);
      });

      await act(async () => {
        await result.current.editComment('comment-to-edit', '   ');
      });

      expect(result.current.error).toBe('Comment text cannot be empty');
    });
  });

  describe('deleteComment', () => {
    it('deletes a reply comment the user owns', async () => {
      const rootComment = createMockComment({
        id: 'root-comment',
        authorUid: 'other-user',
        parentCommentId: null,
      });
      const replyToDelete = createMockComment({
        id: 'comment-to-delete',
        authorUid: 'user-123',
        parentCommentId: 'root-comment',
      });

      mockSubscribe.mockImplementation((userId, essayId, onComments) => {
        onComments([rootComment, replyToDelete]);
        return mockUnsubscribe;
      });
      mockDeleteComment.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await waitFor(() => {
        expect(result.current.commentsByBlock.size).toBe(1);
      });

      await act(async () => {
        await result.current.deleteComment('comment-to-delete');
      });

      expect(mockDeleteComment).toHaveBeenCalledWith('owner-1', 'essay-1', 'comment-to-delete');
    });

    it('deletes root comment and all its replies', async () => {
      const rootComment = createMockComment({
        id: 'root-comment',
        authorUid: 'user-123',
        parentCommentId: null,
      });
      const reply1 = createMockComment({
        id: 'reply-1',
        authorUid: 'other-user',
        parentCommentId: 'root-comment',
      });
      const reply2 = createMockComment({
        id: 'reply-2',
        authorUid: 'another-user',
        parentCommentId: 'root-comment',
      });

      mockSubscribe.mockImplementation((userId, essayId, onComments) => {
        onComments([rootComment, reply1, reply2]);
        return mockUnsubscribe;
      });
      mockDeleteComment.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await waitFor(() => {
        expect(result.current.commentsByBlock.size).toBe(1);
      });

      await act(async () => {
        await result.current.deleteComment('root-comment');
      });

      // Should delete root and both replies
      expect(mockDeleteComment).toHaveBeenCalledTimes(3);
      expect(mockDeleteComment).toHaveBeenCalledWith('owner-1', 'essay-1', 'root-comment');
      expect(mockDeleteComment).toHaveBeenCalledWith('owner-1', 'essay-1', 'reply-1');
      expect(mockDeleteComment).toHaveBeenCalledWith('owner-1', 'essay-1', 'reply-2');
    });

    it('sets error when user does not own the comment', async () => {
      const existingComment = createMockComment({
        id: 'other-comment',
        authorUid: 'other-user',
      });

      mockSubscribe.mockImplementation((userId, essayId, onComments) => {
        onComments([existingComment]);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await waitFor(() => {
        expect(result.current.commentsByBlock.size).toBe(1);
      });

      await act(async () => {
        await result.current.deleteComment('other-comment');
      });

      expect(result.current.error).toBe('You can only delete your own comments');
      expect(mockDeleteComment).not.toHaveBeenCalled();
    });

    it('sets error when comment is not found', async () => {
      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await act(async () => {
        await result.current.deleteComment('nonexistent');
      });

      expect(result.current.error).toBe('Comment not found');
    });
  });

  describe('resolveThread', () => {
    it('resolves a thread by root comment ID', async () => {
      const rootComment = createMockComment({
        id: 'root-comment',
        parentCommentId: null,
        resolved: false,
      });

      mockSubscribe.mockImplementation((userId, essayId, onComments) => {
        onComments([rootComment]);
        return mockUnsubscribe;
      });
      mockResolveThread.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await waitFor(() => {
        expect(result.current.commentsByBlock.size).toBe(1);
      });

      await act(async () => {
        await result.current.resolveThread('root-comment', true);
      });

      expect(mockResolveThread).toHaveBeenCalledWith(
        'owner-1',
        'essay-1',
        'root-comment',
        true
      );
    });

    it('unresolves a thread', async () => {
      const rootComment = createMockComment({
        id: 'root-comment',
        parentCommentId: null,
        resolved: true,
      });

      mockSubscribe.mockImplementation((userId, essayId, onComments) => {
        onComments([rootComment]);
        return mockUnsubscribe;
      });
      mockResolveThread.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await waitFor(() => {
        expect(result.current.commentsByBlock.size).toBe(1);
      });

      await act(async () => {
        await result.current.resolveThread('root-comment', false);
      });

      expect(mockResolveThread).toHaveBeenCalledWith(
        'owner-1',
        'essay-1',
        'root-comment',
        false
      );
    });

    it('sets error when trying to resolve a reply (not root comment)', async () => {
      const reply = createMockComment({
        id: 'reply-comment',
        parentCommentId: 'some-root',
      });

      mockSubscribe.mockImplementation((userId, essayId, onComments) => {
        onComments([reply]);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      // Wait for comments to load (orphan creates no threads but comment is still in ref)
      await new Promise((resolve) => setTimeout(resolve, 0));

      await act(async () => {
        await result.current.resolveThread('reply-comment', true);
      });

      expect(result.current.error).toBe('Can only resolve root comments');
      expect(mockResolveThread).not.toHaveBeenCalled();
    });

    it('sets error when comment is not found', async () => {
      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await act(async () => {
        await result.current.resolveThread('nonexistent', true);
      });

      expect(result.current.error).toBe('Comment not found');
    });

    it('sets error when user is not logged in', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
      });

      const { result } = renderHook(() =>
        useComments({ essayId: 'essay-1', ownerUid: 'owner-1' })
      );

      await act(async () => {
        await result.current.resolveThread('root-comment', true);
      });

      expect(result.current.error).toBe('You must be logged in to resolve threads');
    });
  });

  describe('resubscription on dependency changes', () => {
    it('resubscribes when essayId changes', async () => {
      const { rerender } = renderHook(
        ({ essayId }) => useComments({ essayId, ownerUid: 'owner-1' }),
        { initialProps: { essayId: 'essay-1' as string | null } }
      );

      expect(mockSubscribe).toHaveBeenCalledTimes(1);

      rerender({ essayId: 'essay-2' });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalledTimes(2);
      expect(mockSubscribe).toHaveBeenLastCalledWith(
        'owner-1',
        'essay-2',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('resubscribes when ownerUid changes', async () => {
      const { rerender } = renderHook(
        ({ ownerUid }) => useComments({ essayId: 'essay-1', ownerUid }),
        { initialProps: { ownerUid: 'owner-1' as string | null | undefined } }
      );

      expect(mockSubscribe).toHaveBeenCalledTimes(1);

      rerender({ ownerUid: 'owner-2' });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalledTimes(2);
      expect(mockSubscribe).toHaveBeenLastCalledWith(
        'owner-2',
        'essay-1',
        expect.any(Function),
        expect.any(Function)
      );
    });
  });
});
