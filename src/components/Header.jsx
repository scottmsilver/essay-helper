import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { CopyButton } from './CopyButton';
import { formatRelativeDate } from '../utils/formatDate';

export function Header({
  essay,
  getFullEssayText,
  currentTitle,
  lastSaved,
  onRenameEssay,
  onGoHome,
  showEditor,
}) {
  const { user, loading, signIn, signOut } = useAuth();
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const avatarMenuRef = useRef(null);
  const titleInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
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

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="home-btn" onClick={onGoHome} title="Home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>

        {showEditor && (
          <div className="title-area">
            {isEditingTitle ? (
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
              <button className="title-btn" onClick={handleTitleClick}>
                {currentTitle || 'Untitled'}
              </button>
            )}
            {lastSaved && (
              <span className="last-saved">Saved {formatRelativeDate(lastSaved)}</span>
            )}
          </div>
        )}
      </div>

      <div className="header-actions">
        {showEditor && (
          <CopyButton text={getFullEssayText(essay)} variant="full" />
        )}

        <div className="auth-section">
          {loading ? (
            <span className="auth-loading">...</span>
          ) : user ? (
            <div className="avatar-menu-container" ref={avatarMenuRef}>
              <button
                className="avatar-btn"
                onClick={() => setShowAvatarMenu(!showAvatarMenu)}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="user-avatar"
                  />
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
