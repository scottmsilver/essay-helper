import { MouseEvent } from 'react';
import { formatRelativeDate } from '../utils/formatDate';
import type { EssayDocument, SharedEssayRef, Permission } from '../models/document';

interface HomePageProps {
  essays: EssayDocument[];
  sharedEssays: SharedEssayRef[];
  onSelectEssay: (essayId: string) => void;
  onSelectSharedEssay: (ownerUid: string, essayId: string, permission: Permission) => void;
  onNewEssay: () => void;
  onDeleteEssay: (essayId: string) => void;
  isLoggedIn: boolean;
}

export function HomePage({
  essays,
  sharedEssays,
  onSelectEssay,
  onSelectSharedEssay,
  onNewEssay,
  onDeleteEssay,
  isLoggedIn,
}: HomePageProps) {
  const handleDelete = (e: MouseEvent<HTMLButtonElement>, essayId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this essay?')) {
      onDeleteEssay(essayId);
    }
  };

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>Essay Helper</h1>
        <p className="home-subtitle">Structure your arguments, one paragraph at a time</p>
      </div>

      <div className="home-content">
        <button className="btn-new-essay-large" onClick={onNewEssay}>
          + New Essay
        </button>

        {essays.length > 0 && (
          <div className="essays-section">
            <h2>Your Essays</h2>
            <div className="essays-grid">
              {essays.map((essay) => (
                <div
                  key={essay.id}
                  className="essay-card"
                  onClick={() => onSelectEssay(essay.id)}
                >
                  <div className="essay-card-title">{essay.title || 'Untitled Essay'}</div>
                  <div className="essay-card-date">
                    Modified {formatRelativeDate(essay.updatedAt)}
                  </div>
                  <button
                    className="essay-card-delete"
                    onClick={(e) => handleDelete(e, essay.id)}
                    title="Delete essay"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {sharedEssays && sharedEssays.length > 0 && (
          <div className="essays-section shared-section">
            <h2>Shared with me</h2>
            <div className="essays-grid">
              {sharedEssays.map((shared) => (
                <div
                  key={shared.id}
                  className="essay-card essay-card-shared"
                  onClick={() =>
                    onSelectSharedEssay(shared.ownerUid, shared.essayId, shared.permission)
                  }
                >
                  <div className="essay-card-title">{shared.title || 'Untitled Essay'}</div>
                  <div className="essay-card-owner">
                    From: {shared.ownerDisplayName || shared.ownerEmail}
                  </div>
                  <div className="essay-card-permission">
                    {shared.permission === 'editor' ? 'Can edit' : 'View only'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoggedIn && (
          <p className="home-note">
            Sign in to save your essays to the cloud and access them anywhere.
          </p>
        )}
      </div>
    </div>
  );
}
