import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CommentThread, type CommentThreadData } from './CommentThread';
import type { Comment } from '../../models/comment';

// =============================================================================
// Helper Functions
// =============================================================================

function createMockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'comment-1',
    blockId: 'block-1',
    blockType: 'intro',
    authorUid: 'user-1',
    authorEmail: 'test@example.com',
    authorDisplayName: 'Test User',
    text: 'Test comment text',
    createdAt: new Date('2024-01-15T12:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    parentCommentId: null,
    resolved: false,
    ...overrides,
  };
}

function createMockThread(overrides: Partial<CommentThreadData> = {}): CommentThreadData {
  return {
    id: 'thread-1',
    blockId: 'block-1',
    blockType: 'intro',
    rootComment: createMockComment(),
    replies: [],
    resolved: false,
    ...overrides,
  };
}

// Helper to hover over thread (needed since Reply/Resolve buttons are hidden until hover)
function hoverThread() {
  const thread = document.querySelector('.comment-thread');
  if (thread) fireEvent.mouseEnter(thread);
}

// Helper to hover thread and click Reply button
function hoverAndClickReply() {
  hoverThread();
  fireEvent.click(screen.getByText('Reply'));
}

const defaultProps = {
  thread: createMockThread(),
  currentUserId: 'user-1',
  essayOwnerId: 'owner-1',
  onAddReply: vi.fn(),
  onEditComment: vi.fn(),
  onDeleteComment: vi.fn(),
  onResolve: vi.fn(),
  isActive: false,
  onActivate: vi.fn(),
};

// =============================================================================
// Tests
// =============================================================================

describe('CommentThread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the root comment', () => {
      render(<CommentThread {...defaultProps} />);

      expect(screen.getByText('Test comment text')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('renders author avatar placeholder when no photo URL', () => {
      render(<CommentThread {...defaultProps} />);

      const avatar = screen.getByText('T');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('comment-avatar-placeholder');
    });

    it('renders author avatar placeholder with first letter of name', () => {
      const thread = createMockThread({
        rootComment: createMockComment({
          authorDisplayName: 'John Doe',
        }),
      });

      render(<CommentThread {...defaultProps} thread={thread} />);

      const avatar = screen.getByText('J');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('comment-avatar-placeholder');
    });

    it('renders replies when present', () => {
      const thread = createMockThread({
        replies: [
          createMockComment({
            id: 'reply-1',
            authorDisplayName: 'Reply Author 1',
            text: 'First reply',
          }),
          createMockComment({
            id: 'reply-2',
            authorDisplayName: 'Reply Author 2',
            text: 'Second reply',
          }),
        ],
      });

      render(<CommentThread {...defaultProps} thread={thread} />);

      expect(screen.getByText('First reply')).toBeInTheDocument();
      expect(screen.getByText('Second reply')).toBeInTheDocument();
      expect(screen.getByText('Reply Author 1')).toBeInTheDocument();
      expect(screen.getByText('Reply Author 2')).toBeInTheDocument();
    });

    it('shows "(edited)" indicator when comment has updatedAt', () => {
      const thread = createMockThread({
        rootComment: createMockComment({
          updatedAt: new Date('2024-01-15T14:00:00Z'),
        }),
      });

      render(<CommentThread {...defaultProps} thread={thread} />);

      expect(screen.getByText(/\(edited\)/)).toBeInTheDocument();
    });

    it('applies active class when isActive is true', () => {
      const { container } = render(
        <CommentThread {...defaultProps} isActive={true} />
      );

      expect(container.querySelector('.comment-thread-active')).toBeInTheDocument();
    });

    it('applies resolved class when thread is resolved', () => {
      const thread = createMockThread({ resolved: true });
      const { container } = render(
        <CommentThread {...defaultProps} thread={thread} />
      );

      expect(container.querySelector('.comment-thread-resolved')).toBeInTheDocument();
    });

    it('shows resolved badge when thread is resolved', () => {
      const thread = createMockThread({ resolved: true });
      render(<CommentThread {...defaultProps} thread={thread} />);

      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });
  });

  describe('resolve button visibility', () => {
    it('shows resolve button when user is the comment author', () => {
      const thread = createMockThread({
        rootComment: createMockComment({ authorUid: 'user-1' }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
          essayOwnerId="owner-other"
        />
      );

      hoverThread();
      expect(screen.getByText('Resolve')).toBeInTheDocument();
    });

    it('shows resolve button when user is the essay owner', () => {
      const thread = createMockThread({
        rootComment: createMockComment({ authorUid: 'other-user' }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="essay-owner"
          essayOwnerId="essay-owner"
        />
      );

      hoverThread();
      expect(screen.getByText('Resolve')).toBeInTheDocument();
    });

    it('hides resolve button when user is neither author nor owner', () => {
      const thread = createMockThread({
        rootComment: createMockComment({ authorUid: 'comment-author' }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="random-user"
          essayOwnerId="essay-owner"
        />
      );

      hoverThread();
      expect(screen.queryByText('Resolve')).not.toBeInTheDocument();
    });

    it('shows "Re-open" text when thread is resolved', () => {
      const thread = createMockThread({
        rootComment: createMockComment({ authorUid: 'user-1' }),
        resolved: true,
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
        />
      );

      hoverThread();
      expect(screen.getByText('Re-open')).toBeInTheDocument();
    });
  });

  describe('edit/delete visibility for own comments', () => {
    it('shows edit and delete buttons for own comments on hover', async () => {
      const thread = createMockThread({
        rootComment: createMockComment({ authorUid: 'user-1' }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
        />
      );

      // Find the comment item and hover over it
      const commentItem = screen.getByText('Test comment text').closest('.comment-item');
      expect(commentItem).toBeInTheDocument();

      fireEvent.mouseEnter(commentItem!);

      // Look for edit button by title
      expect(screen.getByTitle('Edit')).toBeInTheDocument();
      expect(screen.getByTitle('Delete')).toBeInTheDocument();
    });

    it('hides edit and delete buttons for other users comments', () => {
      const thread = createMockThread({
        rootComment: createMockComment({ authorUid: 'other-user' }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
        />
      );

      const commentItem = screen.getByText('Test comment text').closest('.comment-item');
      fireEvent.mouseEnter(commentItem!);

      expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
    });

    it('shows edit/delete for own replies', () => {
      const thread = createMockThread({
        rootComment: createMockComment({ authorUid: 'other-user' }),
        replies: [
          createMockComment({
            id: 'my-reply',
            authorUid: 'user-1',
            text: 'My reply',
          }),
        ],
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
        />
      );

      // Find the reply by its text and hover
      const myReply = screen.getByText('My reply').closest('.comment-item');
      fireEvent.mouseEnter(myReply!);

      // Should show actions for own reply
      const actionsWithin = within(myReply!);
      expect(actionsWithin.getByTitle('Edit')).toBeInTheDocument();
      expect(actionsWithin.getByTitle('Delete')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onActivate when thread is clicked', () => {
      const onActivate = vi.fn();
      render(<CommentThread {...defaultProps} onActivate={onActivate} />);

      fireEvent.click(screen.getByText('Test comment text').closest('.comment-thread')!);

      expect(onActivate).toHaveBeenCalled();
    });

    it('calls onResolve with true when resolve button is clicked', () => {
      const onResolve = vi.fn();
      const thread = createMockThread({
        rootComment: createMockComment({ authorUid: 'user-1' }),
        resolved: false,
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
          onResolve={onResolve}
        />
      );

      hoverThread();
      fireEvent.click(screen.getByText('Resolve'));

      expect(onResolve).toHaveBeenCalledWith(true);
    });

    it('calls onResolve with false when re-open button is clicked', () => {
      const onResolve = vi.fn();
      const thread = createMockThread({
        rootComment: createMockComment({ authorUid: 'user-1' }),
        resolved: true,
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
          onResolve={onResolve}
        />
      );

      hoverThread();
      fireEvent.click(screen.getByText('Re-open'));

      expect(onResolve).toHaveBeenCalledWith(false);
    });

    it('calls onDeleteComment when delete button is clicked', () => {
      const onDeleteComment = vi.fn();
      const thread = createMockThread({
        rootComment: createMockComment({ id: 'comment-to-delete', authorUid: 'user-1' }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
          onDeleteComment={onDeleteComment}
        />
      );

      const commentItem = screen.getByText('Test comment text').closest('.comment-item');
      fireEvent.mouseEnter(commentItem!);
      fireEvent.click(screen.getByTitle('Delete'));

      expect(onDeleteComment).toHaveBeenCalledWith('comment-to-delete');
    });
  });

  describe('reply functionality', () => {
    it('shows reply form when Reply button is clicked', () => {
      render(<CommentThread {...defaultProps} />);

      hoverAndClickReply();

      expect(screen.getByPlaceholderText('Reply...')).toBeInTheDocument();
    });

    it('hides reply form when Cancel is clicked', () => {
      render(<CommentThread {...defaultProps} />);

      hoverAndClickReply();
      expect(screen.getByPlaceholderText('Reply...')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.queryByPlaceholderText('Reply...')).not.toBeInTheDocument();
    });

    it('calls onAddReply when reply is submitted', () => {
      const onAddReply = vi.fn();
      render(<CommentThread {...defaultProps} onAddReply={onAddReply} />);

      hoverAndClickReply();

      const textarea = screen.getByPlaceholderText('Reply...');
      fireEvent.change(textarea, { target: { value: 'My reply text' } });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

      expect(onAddReply).toHaveBeenCalledWith('My reply text');
    });

    it('trims whitespace from reply text', () => {
      const onAddReply = vi.fn();
      render(<CommentThread {...defaultProps} onAddReply={onAddReply} />);

      hoverAndClickReply();

      const textarea = screen.getByPlaceholderText('Reply...');
      fireEvent.change(textarea, { target: { value: '  My reply text  ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

      expect(onAddReply).toHaveBeenCalledWith('My reply text');
    });

    it('disables submit button when reply text is empty', () => {
      render(<CommentThread {...defaultProps} />);

      hoverAndClickReply();

      const submitButton = screen.getByRole('button', { name: 'Reply' });
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when reply text is provided', () => {
      render(<CommentThread {...defaultProps} />);

      hoverAndClickReply();

      const textarea = screen.getByPlaceholderText('Reply...');
      fireEvent.change(textarea, { target: { value: 'Some text' } });

      const submitButton = screen.getByRole('button', { name: 'Reply' });
      expect(submitButton).not.toBeDisabled();
    });

    it('submits reply on Ctrl+Enter', () => {
      const onAddReply = vi.fn();
      render(<CommentThread {...defaultProps} onAddReply={onAddReply} />);

      hoverAndClickReply();

      const textarea = screen.getByPlaceholderText('Reply...');
      fireEvent.change(textarea, { target: { value: 'Ctrl+Enter reply' } });
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      expect(onAddReply).toHaveBeenCalledWith('Ctrl+Enter reply');
    });

    it('submits reply on Cmd+Enter (Mac)', () => {
      const onAddReply = vi.fn();
      render(<CommentThread {...defaultProps} onAddReply={onAddReply} />);

      hoverAndClickReply();

      const textarea = screen.getByPlaceholderText('Reply...');
      fireEvent.change(textarea, { target: { value: 'Cmd+Enter reply' } });
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

      expect(onAddReply).toHaveBeenCalledWith('Cmd+Enter reply');
    });

    it('cancels reply on Escape key', () => {
      render(<CommentThread {...defaultProps} />);

      hoverAndClickReply();

      const textarea = screen.getByPlaceholderText('Reply...');
      fireEvent.change(textarea, { target: { value: 'Some text' } });
      fireEvent.keyDown(textarea, { key: 'Escape' });

      expect(screen.queryByPlaceholderText('Reply...')).not.toBeInTheDocument();
    });

    it('clears reply text after submission', () => {
      const onAddReply = vi.fn();
      render(<CommentThread {...defaultProps} onAddReply={onAddReply} />);

      // First reply
      hoverAndClickReply();
      const textarea = screen.getByPlaceholderText('Reply...');
      fireEvent.change(textarea, { target: { value: 'First reply' } });
      fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

      // Form should be hidden after submit
      expect(screen.queryByPlaceholderText('Reply...')).not.toBeInTheDocument();

      // Open form again and check it's empty
      hoverAndClickReply();
      const newTextarea = screen.getByPlaceholderText('Reply...');
      expect(newTextarea).toHaveValue('');
    });
  });

  describe('edit functionality', () => {
    it('shows edit form when edit button is clicked', () => {
      const thread = createMockThread({
        rootComment: createMockComment({
          authorUid: 'user-1',
          text: 'Original text',
        }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
        />
      );

      const commentItem = screen.getByText('Original text').closest('.comment-item');
      fireEvent.mouseEnter(commentItem!);
      fireEvent.click(screen.getByTitle('Edit'));

      const editInput = screen.getByDisplayValue('Original text');
      expect(editInput).toBeInTheDocument();
    });

    it('calls onEditComment when edit is saved', () => {
      const onEditComment = vi.fn();
      const thread = createMockThread({
        rootComment: createMockComment({
          id: 'comment-1',
          authorUid: 'user-1',
          text: 'Original text',
        }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
          onEditComment={onEditComment}
        />
      );

      const commentItem = screen.getByText('Original text').closest('.comment-item');
      fireEvent.mouseEnter(commentItem!);
      fireEvent.click(screen.getByTitle('Edit'));

      const editInput = screen.getByDisplayValue('Original text');
      fireEvent.change(editInput, { target: { value: 'Updated text' } });
      fireEvent.click(screen.getByText('Save'));

      expect(onEditComment).toHaveBeenCalledWith('comment-1', 'Updated text');
    });

    it('cancels edit on Cancel button', () => {
      const thread = createMockThread({
        rootComment: createMockComment({
          authorUid: 'user-1',
          text: 'Original text',
        }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
        />
      );

      const commentItem = screen.getByText('Original text').closest('.comment-item');
      fireEvent.mouseEnter(commentItem!);
      fireEvent.click(screen.getByTitle('Edit'));

      const editInput = screen.getByDisplayValue('Original text');
      fireEvent.change(editInput, { target: { value: 'Changed text' } });
      fireEvent.click(screen.getByText('Cancel'));

      // Should show original text again
      expect(screen.getByText('Original text')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Changed text')).not.toBeInTheDocument();
    });

    it('cancels edit on Escape key', () => {
      const thread = createMockThread({
        rootComment: createMockComment({
          authorUid: 'user-1',
          text: 'Original text',
        }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
        />
      );

      const commentItem = screen.getByText('Original text').closest('.comment-item');
      fireEvent.mouseEnter(commentItem!);
      fireEvent.click(screen.getByTitle('Edit'));

      const editInput = screen.getByDisplayValue('Original text');
      fireEvent.keyDown(editInput, { key: 'Escape' });

      expect(screen.getByText('Original text')).toBeInTheDocument();
    });

    it('saves edit on Ctrl+Enter', () => {
      const onEditComment = vi.fn();
      const thread = createMockThread({
        rootComment: createMockComment({
          id: 'comment-1',
          authorUid: 'user-1',
          text: 'Original text',
        }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
          onEditComment={onEditComment}
        />
      );

      const commentItem = screen.getByText('Original text').closest('.comment-item');
      fireEvent.mouseEnter(commentItem!);
      fireEvent.click(screen.getByTitle('Edit'));

      const editInput = screen.getByDisplayValue('Original text');
      fireEvent.change(editInput, { target: { value: 'Ctrl+Enter edit' } });
      fireEvent.keyDown(editInput, { key: 'Enter', ctrlKey: true });

      expect(onEditComment).toHaveBeenCalledWith('comment-1', 'Ctrl+Enter edit');
    });

    it('disables save button when edit text is empty', () => {
      const thread = createMockThread({
        rootComment: createMockComment({
          authorUid: 'user-1',
          text: 'Original text',
        }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
        />
      );

      const commentItem = screen.getByText('Original text').closest('.comment-item');
      fireEvent.mouseEnter(commentItem!);
      fireEvent.click(screen.getByTitle('Edit'));

      const editInput = screen.getByDisplayValue('Original text');
      fireEvent.change(editInput, { target: { value: '' } });

      expect(screen.getByText('Save')).toBeDisabled();
    });

    it('does not call onEditComment when text is unchanged', () => {
      const onEditComment = vi.fn();
      const thread = createMockThread({
        rootComment: createMockComment({
          id: 'comment-1',
          authorUid: 'user-1',
          text: 'Original text',
        }),
      });

      render(
        <CommentThread
          {...defaultProps}
          thread={thread}
          currentUserId="user-1"
          onEditComment={onEditComment}
        />
      );

      const commentItem = screen.getByText('Original text').closest('.comment-item');
      fireEvent.mouseEnter(commentItem!);
      fireEvent.click(screen.getByTitle('Edit'));

      // Don't change the text, just save
      fireEvent.click(screen.getByText('Save'));

      expect(onEditComment).not.toHaveBeenCalled();
    });
  });

  describe('timestamp formatting', () => {
    it('formats recent timestamps', () => {
      const thread = createMockThread({
        rootComment: createMockComment({
          createdAt: new Date(), // Now
        }),
      });

      render(<CommentThread {...defaultProps} thread={thread} />);

      expect(screen.getByText(/less than a minute ago/)).toBeInTheDocument();
    });

    it('formats timestamps in minutes', () => {
      const thread = createMockThread({
        rootComment: createMockComment({
          createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        }),
      });

      render(<CommentThread {...defaultProps} thread={thread} />);

      expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
    });

    it('formats timestamps in hours', () => {
      const thread = createMockThread({
        rootComment: createMockComment({
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        }),
      });

      render(<CommentThread {...defaultProps} thread={thread} />);

      expect(screen.getByText(/3 hours ago/)).toBeInTheDocument();
    });

    it('formats timestamps in days', () => {
      const thread = createMockThread({
        rootComment: createMockComment({
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        }),
      });

      render(<CommentThread {...defaultProps} thread={thread} />);

      expect(screen.getByText(/2 days ago/)).toBeInTheDocument();
    });
  });
});
