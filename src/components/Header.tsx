import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { CopyButton } from './CopyButton';
import { ShareButton } from './ShareButton';
import { formatRelativeDate } from '../utils/formatDate';
import type { Essay } from '../models/essay';

interface HeaderProps {
  essay: Essay | null;
  getFullEssayText: (essay: Essay) => string;
  currentTitle: string;
  lastSaved: Date | null;
  onRenameEssay: (newTitle: string) => void;
  onGoHome: () => void;
  showEditor: boolean;
  onShareClick: (() => void) | null;
  isSharedEssay: boolean;
  permissionBadge?: string | null;
}

export function Header({
  essay,
  getFullEssayText,
  currentTitle,
  lastSaved,
  onRenameEssay,
  onGoHome,
  showEditor,
  onShareClick,
  isSharedEssay,
  permissionBadge,
}: HeaderProps) {
  const { user, loading, signIn, signOut } = useAuth();
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setShowAvatarMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowAvatarMenu(false);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleTitleClick = () => {
    setEditTitle(currentTitle === 'Untitled' ? '' : currentTitle);
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    const newTitle = editTitle.trim() || 'Untitled';
    onRenameEssay(newTitle);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="menu-btn" onClick={onGoHome} title="Menu">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {showEditor && (
          <div className="title-area">
            {isEditingTitle && !permissionBadge ? (
              <input
                ref={titleInputRef}
                type="text"
                className="title-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                placeholder="Essay title..."
              />
            ) : (
              <button
                className="title-btn"
                onClick={permissionBadge ? undefined : handleTitleClick}
                style={permissionBadge ? { cursor: 'default' } : undefined}
              >
                {currentTitle || 'Untitled'}
              </button>
            )}
            {permissionBadge && <span className="permission-badge">{permissionBadge}</span>}
            {lastSaved && !permissionBadge && (
              <span className="last-saved">Saved {formatRelativeDate(lastSaved)}</span>
            )}
          </div>
        )}
      </div>

      <div className="header-actions">
        {showEditor && !isSharedEssay && onShareClick && (
          <ShareButton onClick={onShareClick} className="share-btn-header" />
        )}
        {showEditor && essay && (
          <CopyButton
            text={getFullEssayText(essay)}
            title="Copy Full Essay"
            className="copy-btn-header"
          />
        )}

        <div className="auth-section">
          {loading ? (
            <span className="auth-loading">...</span>
          ) : user ? (
            <div className="avatar-menu-container" ref={avatarMenuRef}>
              <button className="avatar-btn" onClick={() => setShowAvatarMenu(!showAvatarMenu)}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="user-avatar" />
                ) : (
                  <div className="user-avatar-placeholder">
                    {user.displayName?.[0] || user.email?.[0] || '?'}
                  </div>
                )}
              </button>
              {showAvatarMenu && (
                <div className="avatar-dropdown">
                  <div className="avatar-dropdown-header">
                    <span className="avatar-dropdown-name">{user.displayName}</span>
                    <span className="avatar-dropdown-email">{user.email}</span>
                  </div>
                  <button className="avatar-dropdown-item" onClick={handleSignOut}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn-auth btn-signin" onClick={handleSignIn}>
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
