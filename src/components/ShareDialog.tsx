import { useState, useEffect, FormEvent, ChangeEvent, MouseEvent } from 'react';
import { useClipboard } from '../hooks/useClipboard';
import type { SharingInfo, Collaborator } from '../firebase/firestore';

interface SaveSharingParams {
  collaborators: Collaborator[];
  isPublic: boolean;
  publicPermission: 'viewer' | 'editor';
}

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sharingInfo: SharingInfo | null;
  onSaveSharing: (params: SaveSharingParams) => Promise<void>;
  isLoading: boolean;
  essayId: string | null;
}

export function ShareDialog({
  isOpen,
  onClose,
  sharingInfo,
  onSaveSharing,
  isLoading,
  essayId,
}: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [localCollaborators, setLocalCollaborators] = useState<Collaborator[]>([]);
  const [localIsPublic, setLocalIsPublic] = useState(false);
  const [localPublicPermission, setLocalPublicPermission] = useState<'viewer' | 'editor'>('viewer');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && sharingInfo) {
      setLocalCollaborators(sharingInfo.collaborators || []);
      setLocalIsPublic(sharingInfo.isPublic || false);
      setLocalPublicPermission(sharingInfo.publicPermission || 'viewer');
      setHasChanges(false);
    } else if (isOpen && !sharingInfo) {
      setLocalCollaborators([]);
      setLocalIsPublic(false);
      setLocalPublicPermission('viewer');
      setHasChanges(false);
    }
  }, [isOpen, sharingInfo]);

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPermission('viewer');
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  const { copied: copySuccess, copy } = useClipboard();

  const publicUrl = essayId ? `${window.location.origin}/essay/${essayId}` : '';

  const handleCopyLink = () => {
    if (publicUrl && localIsPublic) {
      copy(publicUrl);
    }
  };

  if (!isOpen) return null;

  const handleAddCollaborator = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (localCollaborators.some((c) => c.email.toLowerCase() === trimmedEmail)) {
      setError('This person already has access');
      return;
    }

    setLocalCollaborators((prev) => [
      ...prev,
      { email: trimmedEmail, permission, addedAt: new Date() },
    ]);
    setEmail('');
    setPermission('viewer');
    setError(null);
    setHasChanges(true);
  };

  const handleRemoveCollaborator = (emailToRemove: string) => {
    setLocalCollaborators((prev) => prev.filter((c) => c.email !== emailToRemove));
    setHasChanges(true);
  };

  const handleTogglePublic = () => {
    setLocalIsPublic((prev) => !prev);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onSaveSharing({
        collaborators: localCollaborators,
        isPublic: localIsPublic,
        publicPermission: localPublicPermission,
      });
      onClose();
    } catch {
      setError('Failed to save sharing settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content share-dialog" onClick={(e: MouseEvent) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Essay</h2>
          <button className="modal-close" onClick={handleCancel}>
            &times;
          </button>
        </div>

        {isLoading ? (
          <div className="share-loading">Loading...</div>
        ) : (
          <>
            <form className="share-form" onSubmit={handleAddCollaborator}>
              <div className="share-input-row">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="share-email-input"
                  disabled={isSaving}
                />
                <select
                  value={permission}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setPermission(e.target.value as 'viewer' | 'editor')
                  }
                  className="share-permission-select"
                  disabled={isSaving}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button type="submit" className="btn-share-add" disabled={isSaving || !email.trim()}>
                  Add
                </button>
              </div>
              {error && <div className="share-error">{error}</div>}
            </form>

            {localCollaborators.length > 0 && (
              <div className="share-collaborators">
                <h3>People with access</h3>
                <ul className="collaborator-list">
                  {localCollaborators.map((collab) => (
                    <li key={collab.email} className="collaborator-item">
                      <span className="collaborator-email">{collab.email}</span>
                      <span className="collaborator-permission">{collab.permission}</span>
                      <button
                        className="collaborator-remove"
                        onClick={() => handleRemoveCollaborator(collab.email)}
                        disabled={isSaving}
                        title="Remove access"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="share-public-section">
              <h3>Public access</h3>
              <div className="public-toggle-row">
                <label className="public-toggle-label">
                  <input
                    type="checkbox"
                    checked={localIsPublic}
                    onChange={handleTogglePublic}
                    className="public-toggle-checkbox"
                    disabled={isSaving}
                  />
                  <span>Anyone with the link can access</span>
                </label>
                <select
                  value={localPublicPermission}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    setLocalPublicPermission(e.target.value as 'viewer' | 'editor');
                    setHasChanges(true);
                  }}
                  className="public-permission-select"
                  disabled={isSaving || !localIsPublic}
                >
                  <option value="viewer">View only</option>
                  <option value="editor">Can edit</option>
                </select>
              </div>
              {publicUrl && (
                <div
                  className={`public-link-preview ${!localIsPublic ? 'public-link-disabled' : ''}`}
                >
                  <input
                    type="text"
                    className="public-link-input"
                    value={publicUrl}
                    readOnly
                    onClick={(e) => localIsPublic && (e.target as HTMLInputElement).select()}
                    disabled={!localIsPublic}
                  />
                  <button
                    type="button"
                    className="btn-copy-link"
                    onClick={handleCopyLink}
                    disabled={isSaving || !localIsPublic}
                    title={copySuccess ? 'Copied!' : 'Copy link'}
                  >
                    {copySuccess ? '✓' : '⧉'}
                  </button>
                </div>
              )}
            </div>

            <div className="share-dialog-actions">
              <button className="btn-share-cancel" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </button>
              <button
                className="btn-share-save"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
