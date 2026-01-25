import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import type { Essay } from '../models/essay';

// Mock the useAuth hook
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
    signIn: mockSignIn,
    signOut: mockSignOut,
  })),
}));

// Mock the CopyButton to simplify testing
vi.mock('./CopyButton', () => ({
  CopyButton: ({ title }: { title: string }) => (
    <button data-testid="copy-button">{title}</button>
  ),
}));

// Mock the ShareButton
vi.mock('./ShareButton', () => ({
  ShareButton: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="share-button" onClick={onClick}>
      Share
    </button>
  ),
}));

// Mock formatRelativeDate
vi.mock('../utils/formatDate', () => ({
  formatRelativeDate: vi.fn((date: Date) => '5 minutes ago'),
}));

// Import mocked module to change mock implementation
import { useAuth } from '../hooks/useAuth';

const mockUseAuth = vi.mocked(useAuth);

describe('Header', () => {
  const mockEssay: Essay = {
    intro: {
      hook: 'Test hook',
      background: '',
      thesis: '',
      claims: [{ id: '1', text: '' }],
      paragraph: 'Intro',
    },
    bodyParagraphs: [
      {
        id: 'b1',
        provingClaimId: '1',
        purpose: '',
        proofBlocks: [],
        recap: '',
        paragraph: 'Body',
      },
    ],
    conclusion: {
      restatement: '',
      soWhat: '',
      paragraph: 'Conclusion',
    },
  };

  const defaultProps = {
    essay: null,
    getFullEssayText: vi.fn(() => 'Full essay text'),
    currentTitle: 'Test Essay',
    lastSaved: null,
    onRenameEssay: vi.fn(),
    onGoHome: vi.fn(),
    showEditor: true,
    onShareClick: vi.fn(),
    isSharedEssay: false,
    readOnly: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: mockSignIn,
      signOut: mockSignOut,
    });
  });

  describe('Authentication', () => {
    it('renders sign-in button when not authenticated', () => {
      render(<Header {...defaultProps} />);
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    });

    it('renders user avatar when authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: {
          displayName: 'John Doe',
          email: 'john@example.com',
          photoURL: 'https://example.com/photo.jpg',
        } as import('firebase/auth').User,
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      render(<Header {...defaultProps} />);
      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });

    it('renders placeholder when user has no photo', () => {
      mockUseAuth.mockReturnValue({
        user: {
          displayName: 'John Doe',
          email: 'john@example.com',
          photoURL: null,
        } as unknown as import('firebase/auth').User,
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      render(<Header {...defaultProps} />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('renders loading indicator when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      render(<Header {...defaultProps} />);
      expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('calls signIn when sign-in button clicked', async () => {
      mockSignIn.mockResolvedValue({} as import('firebase/auth').User);

      render(<Header {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Navigation', () => {
    it('calls onGoHome when menu button clicked', () => {
      render(<Header {...defaultProps} />);
      const menuButton = screen.getByTitle('Menu');
      fireEvent.click(menuButton);
      expect(defaultProps.onGoHome).toHaveBeenCalledTimes(1);
    });
  });

  describe('Title editing', () => {
    it('displays the current title', () => {
      render(<Header {...defaultProps} />);
      expect(screen.getByText('Test Essay')).toBeInTheDocument();
    });

    it('shows input when title is clicked', () => {
      render(<Header {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Essay'));
      expect(screen.getByPlaceholderText('Essay title...')).toBeInTheDocument();
    });

    it('clears "Untitled" placeholder when editing', () => {
      render(<Header {...defaultProps} currentTitle="Untitled" />);
      fireEvent.click(screen.getByText('Untitled'));
      const input = screen.getByPlaceholderText('Essay title...');
      expect(input).toHaveValue('');
    });

    it('saves title on Enter key', () => {
      const onRenameEssay = vi.fn();
      render(<Header {...defaultProps} onRenameEssay={onRenameEssay} />);

      fireEvent.click(screen.getByText('Test Essay'));
      const input = screen.getByPlaceholderText('Essay title...');
      fireEvent.change(input, { target: { value: 'New Title' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onRenameEssay).toHaveBeenCalledWith('New Title');
    });

    it('cancels editing on Escape key', () => {
      render(<Header {...defaultProps} />);

      fireEvent.click(screen.getByText('Test Essay'));
      const input = screen.getByPlaceholderText('Essay title...');
      fireEvent.change(input, { target: { value: 'New Title' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      // Should revert to showing the button, not the input
      expect(screen.queryByPlaceholderText('Essay title...')).not.toBeInTheDocument();
      expect(screen.getByText('Test Essay')).toBeInTheDocument();
    });

    it('saves title on blur', () => {
      const onRenameEssay = vi.fn();
      render(<Header {...defaultProps} onRenameEssay={onRenameEssay} />);

      fireEvent.click(screen.getByText('Test Essay'));
      const input = screen.getByPlaceholderText('Essay title...');
      fireEvent.change(input, { target: { value: 'Blur Title' } });
      fireEvent.blur(input);

      expect(onRenameEssay).toHaveBeenCalledWith('Blur Title');
    });

    it('uses "Untitled" when saving empty title', () => {
      const onRenameEssay = vi.fn();
      render(<Header {...defaultProps} onRenameEssay={onRenameEssay} />);

      fireEvent.click(screen.getByText('Test Essay'));
      const input = screen.getByPlaceholderText('Essay title...');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onRenameEssay).toHaveBeenCalledWith('Untitled');
    });

    it('does not allow editing when readOnly', () => {
      render(<Header {...defaultProps} readOnly={true} />);
      const titleButton = screen.getByText('Test Essay');
      fireEvent.click(titleButton);
      // Input should not appear
      expect(screen.queryByPlaceholderText('Essay title...')).not.toBeInTheDocument();
    });
  });

  describe('Saved timestamp', () => {
    it('shows "Saved" timestamp when lastSaved provided', () => {
      const lastSaved = new Date();
      render(<Header {...defaultProps} lastSaved={lastSaved} />);
      expect(screen.getByText(/Saved 5 minutes ago/)).toBeInTheDocument();
    });

    it('does not show timestamp when lastSaved is null', () => {
      render(<Header {...defaultProps} lastSaved={null} />);
      expect(screen.queryByText(/Saved/)).not.toBeInTheDocument();
    });

    it('shows "Last edited" and lock icon when readOnly', () => {
      const lastSaved = new Date();
      render(<Header {...defaultProps} lastSaved={lastSaved} readOnly={true} />);
      expect(screen.getByText(/Last edited 5 minutes ago/)).toBeInTheDocument();
      // Lock icon should be present (it's an SVG with class lock-icon)
      const lockIcon = document.querySelector('.lock-icon');
      expect(lockIcon).toBeInTheDocument();
    });
  });

  describe('Share button', () => {
    it('shows share button when not a shared essay and onShareClick provided', () => {
      render(<Header {...defaultProps} isSharedEssay={false} onShareClick={vi.fn()} />);
      expect(screen.getByTestId('share-button')).toBeInTheDocument();
    });

    it('calls onShareClick when share button clicked', () => {
      const onShareClick = vi.fn();
      render(<Header {...defaultProps} isSharedEssay={false} onShareClick={onShareClick} />);

      fireEvent.click(screen.getByTestId('share-button'));
      expect(onShareClick).toHaveBeenCalledTimes(1);
    });

    it('does not show share button for shared essays', () => {
      render(<Header {...defaultProps} isSharedEssay={true} />);
      expect(screen.queryByTestId('share-button')).not.toBeInTheDocument();
    });

    it('does not show share button when onShareClick is null', () => {
      render(<Header {...defaultProps} onShareClick={null} />);
      expect(screen.queryByTestId('share-button')).not.toBeInTheDocument();
    });
  });

  describe('Copy button', () => {
    it('shows copy button when essay is present', () => {
      render(<Header {...defaultProps} essay={mockEssay} />);
      expect(screen.getByTestId('copy-button')).toBeInTheDocument();
    });

    it('does not show copy button when essay is null', () => {
      render(<Header {...defaultProps} essay={null} />);
      expect(screen.queryByTestId('copy-button')).not.toBeInTheDocument();
    });
  });

  describe('Editor visibility', () => {
    it('hides title area when showEditor is false', () => {
      render(<Header {...defaultProps} showEditor={false} />);
      expect(screen.queryByText('Test Essay')).not.toBeInTheDocument();
    });

    it('hides share and copy buttons when showEditor is false', () => {
      render(<Header {...defaultProps} showEditor={false} essay={mockEssay} />);
      expect(screen.queryByTestId('share-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('copy-button')).not.toBeInTheDocument();
    });
  });
});
