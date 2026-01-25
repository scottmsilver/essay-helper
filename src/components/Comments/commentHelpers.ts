import type { BlockType } from '../../models/comment';

export interface CommentProps {
  commentCount?: number;
  hasUnresolvedComments?: boolean;
  onCommentClick?: (selectedText?: string) => void;
}

export interface CommentHelpers {
  getBlockStats: (blockId: string) => { count: number; hasUnresolved: boolean };
  onCommentClick: (blockId: string, blockType: BlockType, selectedText?: string) => void;
}

export function makeCommentProps(
  commentHelpers: CommentHelpers | undefined,
  blockId: string,
  blockType: BlockType
): CommentProps {
  if (!commentHelpers) return {};
  const stats = commentHelpers.getBlockStats(blockId);
  return {
    commentCount: stats.count,
    hasUnresolvedComments: stats.hasUnresolved,
    onCommentClick: (selectedText?: string) => commentHelpers.onCommentClick(blockId, blockType, selectedText),
  };
}
