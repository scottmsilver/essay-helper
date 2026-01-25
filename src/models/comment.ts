/**
 * Pure comment data model - no React or UI dependencies
 */
import { nanoid } from 'nanoid';

// =============================================================================
// Types
// =============================================================================

/**
 * The type of block that a comment is attached to
 */
export type BlockType = 'claim' | 'bodyParagraph' | 'proofBlock' | 'intro' | 'conclusion';

/**
 * A single comment on an essay block
 */
export interface Comment {
  id: string;
  blockId: string;
  blockType: BlockType;
  authorUid: string;
  authorEmail: string;
  authorDisplayName: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  parentCommentId: string | null;
  resolved: boolean;
}

/**
 * A thread of comments (root comment + replies)
 */
export interface CommentThread {
  rootComment: Comment;
  replies: Comment[];
}

// =============================================================================
// Factory Functions
// =============================================================================

export const generateCommentId = (): string => nanoid(7);

export const createComment = (
  blockId: string,
  blockType: BlockType,
  authorUid: string,
  authorEmail: string,
  authorDisplayName: string,
  text: string,
  parentCommentId: string | null = null
): Comment => {
  const now = new Date();
  return {
    id: generateCommentId(),
    blockId,
    blockType,
    authorUid,
    authorEmail,
    authorDisplayName,
    text,
    createdAt: now,
    updatedAt: now,
    parentCommentId,
    resolved: false,
  };
};

// =============================================================================
// Pure Transformation Functions
// =============================================================================

/**
 * Groups a flat list of comments into threads.
 * Each thread has a root comment (parentCommentId === null) and its replies.
 */
export function groupCommentsIntoThreads(comments: Comment[]): CommentThread[] {
  // Separate root comments from replies
  const rootComments = comments.filter((c) => c.parentCommentId === null);
  const replies = comments.filter((c) => c.parentCommentId !== null);

  // Create a map for quick lookup of replies by parent ID
  const repliesByParentId = new Map<string, Comment[]>();
  for (const reply of replies) {
    const parentId = reply.parentCommentId!;
    const existing = repliesByParentId.get(parentId) || [];
    existing.push(reply);
    repliesByParentId.set(parentId, existing);
  }

  // Build threads
  const threads: CommentThread[] = rootComments.map((rootComment) => {
    const threadReplies = repliesByParentId.get(rootComment.id) || [];
    // Sort replies by creation date (oldest first)
    threadReplies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return {
      rootComment,
      replies: threadReplies,
    };
  });

  return threads;
}

/**
 * Sorts threads by the creation date of their root comment (newest first)
 */
export function sortThreadsByDate(threads: CommentThread[], ascending = false): CommentThread[] {
  const sorted = [...threads].sort((a, b) => {
    const aTime = a.rootComment.createdAt.getTime();
    const bTime = b.rootComment.createdAt.getTime();
    return ascending ? aTime - bTime : bTime - aTime;
  });
  return sorted;
}

/**
 * Groups comments by their block ID, then into threads
 */
export function groupCommentsByBlock(comments: Comment[]): Map<string, CommentThread[]> {
  const byBlock = new Map<string, Comment[]>();

  for (const comment of comments) {
    const existing = byBlock.get(comment.blockId) || [];
    existing.push(comment);
    byBlock.set(comment.blockId, existing);
  }

  const result = new Map<string, CommentThread[]>();
  for (const [blockId, blockComments] of byBlock) {
    const threads = groupCommentsIntoThreads(blockComments);
    const sortedThreads = sortThreadsByDate(threads);
    result.set(blockId, sortedThreads);
  }

  return result;
}
