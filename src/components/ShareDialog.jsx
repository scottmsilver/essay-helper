import { useState, useEffect } from 'react';
import { useClipboard } from '../hooks/useClipboard';

export function ShareDialog({
  isOpen,
  onClose,
  sharingInfo,
  onSaveSharing,
  isLoading,
  essayId,
}) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('viewer');
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Local state for pending changes
  const [localCollaborators, setLocalCollaborators] = useState([]);
  const [localIsPublic, setLocalIsPublic] = useState(false);
  const [localPublicPermission, setLocalPublicPermission] = useState('viewer');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state when dialog opens or sharingInfo changes
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

  // Reset form state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPermission('viewer');
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  // Use shared clipboard hook
  const { copied: copySuccess, copy } = useClipboard();

  // Generate URL for public link (uses essay ID directly now)
  const publicUrl = essayId
    ? `${window.location.origin}/essay/${essayId}`
    : '';

  const handleCopyLink = () => {
    if (publicUrl && localIsPublic) {
      copy(publicUrl);
    }
  };

  if (!isOpen) return null;

  const handleAddCollaborator = (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if already in list
    if (localCollaborators.some(c => c.email.toLowerCase() === trimmedEmail)) {
      setError('This person already has access');
      return;
    }

    // Add to local list
    setLocalCollaborators(prev => [
      ...prev,
      { email: trimmedEmail, permission, addedAt: new Date() }
    ]);
    setEmail('');
    setPermission('viewer');
    setError(null);
    setHasChanges(true);
  };

  const handleRemoveCollaborator = (emailToRemove) => {
    setLocalCollaborators(prev => prev.filter(c => c.email !== emailToRemove));
    setHasChanges(true);
  };

  const handleTogglePublic = () => {
    setLocalIsPublic(prev => !prev);
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
      <div className="modal-content share-dialog" onClick={(e) => e.stopPropagation()}>
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="share-email-input"
                  disabled={isSaving}
                />
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                  className="share-permission-select"
                  disabled={isSaving}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  type="submit"
                  className="btn-share-add"
                  disabled={isSaving || !email.trim()}
                >
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
                  onChange={(e) => {
                    setLocalPublicPermission(e.target.value);
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
                <div className={`public-link-preview ${!localIsPublic ? 'public-link-disabled' : ''}`}>
                  <input
                    type="text"
                    className="public-link-input"
                    value={publicUrl}
                    readOnly
                    onClick={(e) => localIsPublic && e.target.select()}
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
              <button
                className="btn-share-cancel"
                onClick={handleCancel}
                disabled={isSaving}
              >
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
