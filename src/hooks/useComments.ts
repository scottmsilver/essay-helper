import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import type { Comment, CommentThread, BlockType } from '../models/comment';
import { createComment, groupCommentsByBlock } from '../models/comment';
import {
  addComment as addCommentToFirestore,
  updateComment as updateCommentInFirestore,
  deleteComment as deleteCommentFromFirestore,
  resolveThread as resolveThreadInFirestore,
  subscribeToComments,
} from '../firebase/firestore';

export interface UseCommentsReturn {
  /**
   * Map from blockId to array of comment threads for that block
   */
  commentsByBlock: Map<string, CommentThread[]>;

  /**
   * Add a new comment or reply to a block
   */
  addComment: (
    blockId: string,
    blockType: BlockType,
    text: string,
    parentCommentId?: string | null
  ) => Promise<Comment | null>;

  /**
   * Edit an existing comment's text
   */
  editComment: (commentId: string, text: string) => Promise<void>;

  /**
   * Delete a comment
   */
  deleteComment: (commentId: string) => Promise<void>;

  /**
   * Resolve or unresolve a thread (by its root comment ID)
   */
  resolveThread: (rootCommentId: string, resolved: boolean) => Promise<void>;

  /**
   * Whether comments are currently loading
   */
  loading: boolean;

  /**
   * Any error that occurred
   */
  error: string | null;
}

interface UseCommentsParams {
  essayId: string | null;
  ownerUid?: string | null;
}

export function useComments({ essayId, ownerUid }: UseCommentsParams): UseCommentsReturn {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsByBlock, setCommentsByBlock] = useState<Map<string, CommentThread[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to comments for quick lookup in operations
  const commentsRef = useRef<Comment[]>([]);
  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  // The effective user ID for storing/loading comments
  // If ownerUid is provided (for shared essays), use that; otherwise use the current user
  const effectiveUserId = ownerUid ?? user?.uid ?? null;

  // Subscribe to real-time comment updates
  useEffect(() => {
    if (!effectiveUserId || !essayId) {
      setComments([]);
      setCommentsByBlock(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToComments(
      effectiveUserId,
      essayId,
      (newComments) => {
        setComments(newComments);
        setCommentsByBlock(groupCommentsByBlock(newComments));
        setLoading(false);
      },
      (err) => {
        console.error('Error loading comments:', err);
        setError('Failed to load comments');
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [effectiveUserId, essayId]);

  const addComment = useCallback(
    async (
      blockId: string,
      blockType: BlockType,
      text: string,
      parentCommentId: string | null = null
    ): Promise<Comment | null> => {
      if (!user || !effectiveUserId || !essayId) {
        setError('You must be logged in to comment');
        return null;
      }

      if (!text.trim()) {
        setError('Comment text cannot be empty');
        return null;
      }

      try {
        setError(null);

        const comment = createComment(
          blockId,
          blockType,
          user.uid,
          user.email || '',
          user.displayName || user.email || 'Anonymous',
          text.trim(),
          parentCommentId
        );

        const savedComment = await addCommentToFirestore(effectiveUserId, essayId, comment);
        return savedComment;
      } catch (err) {
        console.error('Error adding comment:', err);
        setError('Failed to add comment');
        return null;
      }
    },
    [user, effectiveUserId, essayId]
  );

  const editComment = useCallback(
    async (commentId: string, text: string): Promise<void> => {
      if (!user || !effectiveUserId || !essayId) {
        setError('You must be logged in to edit comments');
        return;
      }

      if (!text.trim()) {
        setError('Comment text cannot be empty');
        return;
      }

      // Check if the user owns this comment
      const comment = commentsRef.current.find((c) => c.id === commentId);
      if (!comment) {
        setError('Comment not found');
        return;
      }

      if (comment.authorUid !== user.uid) {
        setError('You can only edit your own comments');
        return;
      }

      try {
        setError(null);
        await updateCommentInFirestore(effectiveUserId, essayId, commentId, text.trim());
      } catch (err) {
        console.error('Error updating comment:', err);
        setError('Failed to update comment');
      }
    },
    [user, effectiveUserId, essayId]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<void> => {
      if (!user || !effectiveUserId || !essayId) {
        setError('You must be logged in to delete comments');
        return;
      }

      // Check if the user owns this comment
      const comment = commentsRef.current.find((c) => c.id === commentId);
      if (!comment) {
        setError('Comment not found');
        return;
      }

      if (comment.authorUid !== user.uid) {
        setError('You can only delete your own comments');
        return;
      }

      try {
        setError(null);

        // If this is a root comment, also delete all replies
        if (comment.parentCommentId === null) {
          const replies = commentsRef.current.filter((c) => c.parentCommentId === commentId);
          await Promise.all([
            deleteCommentFromFirestore(effectiveUserId, essayId, commentId),
            ...replies.map((r) => deleteCommentFromFirestore(effectiveUserId, essayId, r.id)),
          ]);
        } else {
          await deleteCommentFromFirestore(effectiveUserId, essayId, commentId);
        }
      } catch (err) {
        console.error('Error deleting comment:', err);
        setError('Failed to delete comment');
      }
    },
    [user, effectiveUserId, essayId]
  );

  const resolveThread = useCallback(
    async (rootCommentId: string, resolved: boolean): Promise<void> => {
      if (!user || !effectiveUserId || !essayId) {
        setError('You must be logged in to resolve threads');
        return;
      }

      // Verify this is a root comment
      const comment = commentsRef.current.find((c) => c.id === rootCommentId);
      if (!comment) {
        setError('Comment not found');
        return;
      }

      if (comment.parentCommentId !== null) {
        setError('Can only resolve root comments');
        return;
      }

      try {
        setError(null);
        await resolveThreadInFirestore(effectiveUserId, essayId, rootCommentId, resolved);
      } catch (err) {
        console.error('Error resolving thread:', err);
        setError('Failed to resolve thread');
      }
    },
    [user, effectiveUserId, essayId]
  );

  return {
    commentsByBlock,
    addComment,
    editComment,
    deleteComment,
    resolveThread,
    loading,
    error,
  };
}
