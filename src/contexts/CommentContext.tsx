import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useComments, UseCommentsReturn } from '../hooks/useComments';
import { toCommentThreadData, CommentThreadData } from '../components/Comments';
import type { BlockType, CommentThread } from '../models/comment';

interface ActiveBlock {
  id: string;
  type: BlockType;
}

interface CommentContextValue extends UseCommentsReturn {
  // Active block for commenting
  activeBlock: ActiveBlock | null;
  setActiveBlock: (block: ActiveBlock | null) => void;

  // Panel visibility
  isPanelOpen: boolean;
  openPanel: (block?: ActiveBlock) => void;
  closePanel: () => void;

  // Helper to get thread data for UI
  getThreadsForBlock: (blockId: string) => CommentThreadData[];
  getAllThreads: () => CommentThreadData[];

  // Helper to get comment stats for a block
  getBlockStats: (blockId: string) => { count: number; hasUnresolved: boolean };
}

const CommentContext = createContext<CommentContextValue | null>(null);

interface CommentProviderProps {
  children: ReactNode;
  essayId: string | null;
  ownerUid?: string | null;
}

export function CommentProvider({ children, essayId, ownerUid }: CommentProviderProps) {
  const commentsHook = useComments({ essayId, ownerUid });
  const [activeBlock, setActiveBlock] = useState<ActiveBlock | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const openPanel = useCallback((block?: ActiveBlock) => {
    if (block) {
      setActiveBlock(block);
    }
    setIsPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const getThreadsForBlock = useCallback((blockId: string): CommentThreadData[] => {
    const threads = commentsHook.commentsByBlock.get(blockId) || [];
    return threads.map((thread: CommentThread) =>
      toCommentThreadData(thread, blockId, thread.rootComment.blockType)
    );
  }, [commentsHook.commentsByBlock]);

  const getAllThreads = useCallback((): CommentThreadData[] => {
    const allThreads: CommentThreadData[] = [];
    commentsHook.commentsByBlock.forEach((threads: CommentThread[], blockId: string) => {
      threads.forEach((thread: CommentThread) => {
        allThreads.push(toCommentThreadData(thread, blockId, thread.rootComment.blockType));
      });
    });
    // Sort by date (newest first)
    return allThreads.sort((a, b) =>
      b.rootComment.createdAt.getTime() - a.rootComment.createdAt.getTime()
    );
  }, [commentsHook.commentsByBlock]);

  const getBlockStats = useCallback((blockId: string): { count: number; hasUnresolved: boolean } => {
    const threads = commentsHook.commentsByBlock.get(blockId) || [];
    const count = threads.reduce((sum: number, t: CommentThread) => sum + 1 + t.replies.length, 0);
    const hasUnresolved = threads.some((t: CommentThread) => !t.rootComment.resolved);
    return { count, hasUnresolved };
  }, [commentsHook.commentsByBlock]);

  const value = useMemo((): CommentContextValue => ({
    ...commentsHook,
    activeBlock,
    setActiveBlock,
    isPanelOpen,
    openPanel,
    closePanel,
    getThreadsForBlock,
    getAllThreads,
    getBlockStats,
  }), [
    commentsHook,
    activeBlock,
    isPanelOpen,
    openPanel,
    closePanel,
    getThreadsForBlock,
    getAllThreads,
    getBlockStats,
  ]);

  return (
    <CommentContext.Provider value={value}>
      {children}
    </CommentContext.Provider>
  );
}

export function useCommentContext(): CommentContextValue {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error('useCommentContext must be used within a CommentProvider');
  }
  return context;
}
