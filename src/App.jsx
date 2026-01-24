import { useEffect, useState, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { useEssay } from './hooks/useEssay';
import { useEssayUpdates } from './hooks/useEssayUpdates';
import { useAuth } from './hooks/useAuth';
import { getFullEssayText } from './models/essay';
import { IntroSection, BodySection, ConclusionSection, ShareDialog } from './components';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { MigrationPrompt } from './components/MigrationPrompt';
import { getEssayWithPermissions, savePublicEssay } from './firebase/firestore';
import './App.css';

const COLLAPSED_STORAGE_KEY = 'essay-helper-collapsed-sections';

function loadCollapsedState() {
  try {
    const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load collapsed state:', e);
  }
  return { sections: {} };
}

function saveCollapsedState(state) {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save collapsed state:', e);
  }
}

// Component for editing external essays (shared or public with edit permission)
function ExternalEssayEditor({ externalEssay, externalPermission, externalOwnerUid }) {
  const isEditor = externalPermission === 'editor';
  const saveTimeoutRef = useRef(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local essay state
  const [essay, setEssay] = useState(() => externalEssay.data || {
    intro: { hook: '', background: '', thesis: '', claims: [], paragraph: '' },
    bodyParagraphs: [],
    conclusion: { soWhat: '', paragraph: '' },
  });

  // Auto-save function
  const saveEssay = useCallback(async (essayData) => {
    if (!isEditor || !externalOwnerUid || !externalEssay?.id) return;

    setIsSaving(true);
    try {
      await savePublicEssay(externalOwnerUid, externalEssay.id, essayData, externalEssay.title);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  }, [isEditor, externalOwnerUid, externalEssay]);

  // Debounced save trigger
  const triggerSave = useCallback((essayData) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => saveEssay(essayData), 2000);
  }, [saveEssay]);

  // Callback to trigger save after each update (only if editor)
  const handleUpdate = useCallback((updatedEssay) => {
    if (isEditor) triggerSave(updatedEssay);
  }, [isEditor, triggerSave]);

  // Use the shared essay update functions with auto-save callback
  const {
    updateIntro,
    updateClaim,
    updateBodyParagraph,
    updateProofBlock,
    updateConclusion,
  } = useEssayUpdates(setEssay, handleUpdate);

  const getClaimById = useCallback((claimId) =>
    essay.intro?.claims?.find(c => c.id === claimId),
  [essay.intro?.claims]);

  // Compute badge text
  const permissionBadge = isEditor
    ? (isSaving ? 'Saving...' : lastSaved ? 'Saved' : 'Can Edit')
    : 'View Only';

  return (
    <EssayEditor
      essay={essay}
      currentEssayId={externalEssay.id}
      lastSaved={lastSaved}
      currentTitle={externalEssay.title || 'Untitled Essay'}
      updateIntro={updateIntro}
      addClaim={() => {}}
      updateClaim={updateClaim}
      removeClaim={() => {}}
      updateBodyParagraph={updateBodyParagraph}
      addProofBlock={() => {}}
      updateProofBlock={updateProofBlock}
      removeProofBlock={() => {}}
      updateConclusion={updateConclusion}
      getClaimById={getClaimById}
      renameEssay={() => {}}
      selectEssay={() => {}}
      sharingInfo={null}
      isSharedEssay={true}
      loadSharingInfo={() => {}}
      saveSharing={() => {}}
      readOnly={!isEditor}
      permissionBadge={permissionBadge}
    />
  );
}

function EssayEditor({
  essay,
  currentEssayId,
  lastSaved,
  currentTitle,
  updateIntro,
  addClaim,
  updateClaim,
  removeClaim,
  updateBodyParagraph,
  addProofBlock,
  updateProofBlock,
  removeProofBlock,
  updateConclusion,
  getClaimById,
  renameEssay,
  selectEssay,
  sharingInfo,
  isSharedEssay,
  loadSharingInfo,
  saveSharing,
  readOnly = false,
  permissionBadge = null,
}) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [collapsedState, setCollapsedState] = useState(loadCollapsedState);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);

  // Load sharing info when essay changes
  useEffect(() => {
    if (!currentEssayId || isSharedEssay || !loadSharingInfo) return;

    let cancelled = false;
    const load = async () => {
      if (!cancelled) setSharingLoading(true);
      try {
        await loadSharingInfo();
      } finally {
        if (!cancelled) setSharingLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentEssayId, isSharedEssay, loadSharingInfo]);

  // Column collapse state
  const purposeCollapsed = collapsedState.purpose ?? false;
  const outlineCollapsed = collapsedState.outline ?? false;
  const paragraphCollapsed = collapsedState.paragraph ?? false;


  useEffect(() => {
    if (id && id !== currentEssayId) {
      selectEssay(id);
    }
  }, [id, currentEssayId, selectEssay]);

  const handleRenameEssay = (newTitle) => {
    if (currentEssayId) {
      renameEssay(currentEssayId, newTitle);
    }
  };

  // Generic toggle function for columns and sections
  const toggleCollapse = (key, isSection = false) => {
    let newState;
    if (isSection) {
      const newSections = { ...collapsedState.sections, [key]: !(collapsedState.sections?.[key] ?? false) };
      newState = { ...collapsedState, sections: newSections };
    } else {
      newState = { ...collapsedState, [key]: !collapsedState[key] };
    }
    setCollapsedState(newState);
    saveCollapsedState(newState);
  };

  const isSectionCollapsed = (sectionKey) => collapsedState.sections?.[sectionKey] ?? false;

  return (
    <>
      <Header
        essay={essay}
        getFullEssayText={getFullEssayText}
        currentTitle={currentTitle}
        lastSaved={lastSaved}
        onRenameEssay={readOnly ? () => {} : handleRenameEssay}
        onGoHome={() => navigate('/')}
        showEditor={true}
        onShareClick={readOnly ? null : () => setShowShareDialog(true)}
        isSharedEssay={isSharedEssay}
        permissionBadge={permissionBadge}
      />

      {!readOnly && (
        <ShareDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          sharingInfo={sharingInfo}
          onSaveSharing={saveSharing}
          isLoading={sharingLoading}
          essayId={currentEssayId}
        />
      )}

      <main className={['essay-grid', purposeCollapsed && 'purpose-collapsed', outlineCollapsed && 'outline-collapsed', paragraphCollapsed && 'paragraph-collapsed'].filter(Boolean).join(' ')}>
        <div className="header-row">
          <div className="header-cell"></div>
          {[
            { key: 'purpose', label: 'Purpose', short: 'P', collapsed: purposeCollapsed },
            { key: 'outline', label: 'Outline', short: 'O', collapsed: outlineCollapsed },
            { key: 'paragraph', label: 'Paragraph', short: '¶', collapsed: paragraphCollapsed },
          ].map(col => (
            <div key={col.key} className="header-cell header-cell-collapsible" onClick={() => toggleCollapse(col.key)}>
              <span>{col.collapsed ? col.short : col.label}</span>
              <span className="column-collapse-icon">▼</span>
            </div>
          ))}
        </div>

        <IntroSection
          intro={essay.intro}
          updateIntro={updateIntro}
          addClaim={addClaim}
          updateClaim={updateClaim}
          removeClaim={removeClaim}
          sectionCollapsed={isSectionCollapsed('intro')}
          onToggleSection={() => toggleCollapse('intro', true)}
          readOnly={readOnly}
        />

        {essay.bodyParagraphs.map((bodyParagraph, index) => (
          <BodySection
            key={bodyParagraph.id}
            bodyParagraph={bodyParagraph}
            bodyIndex={index}
            thesis={essay.intro.thesis}
            claim={getClaimById(bodyParagraph.provingClaimId)}
            updateBodyParagraph={updateBodyParagraph}
            addProofBlock={addProofBlock}
            updateProofBlock={updateProofBlock}
            removeProofBlock={removeProofBlock}
            sectionCollapsed={isSectionCollapsed(`body-${index}`)}
            onToggleSection={() => toggleCollapse(`body-${index}`, true)}
            readOnly={readOnly}
          />
        ))}

        <ConclusionSection
          conclusion={essay.conclusion}
          thesis={essay.intro.thesis}
          claims={essay.intro.claims}
          updateConclusion={updateConclusion}
          sectionCollapsed={isSectionCollapsed('conclusion')}
          onToggleSection={() => toggleCollapse('conclusion', true)}
          readOnly={readOnly}
        />
      </main>
    </>
  );
}

// Unified essay route that handles owner, shared, and public access
function UnifiedEssayRoute({
  // Props for owner/shared editor mode
  essay,
  essays,
  currentEssayId,
  lastSaved,
  currentTitle,
  updateIntro,
  addClaim,
  updateClaim,
  removeClaim,
  updateBodyParagraph,
  addProofBlock,
  updateProofBlock,
  removeProofBlock,
  updateConclusion,
  getClaimById,
  renameEssay,
  selectEssay,
  sharingInfo,
  isSharedEssay,
  loadSharingInfo,
  saveSharing,
  user,
}) {
  const { id } = useParams();
  const [externalEssay, setExternalEssay] = useState(null);
  const [externalPermission, setExternalPermission] = useState(null);
  const [externalOwnerUid, setExternalOwnerUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadEssay = async () => {
      setLoading(true);
      setError(null);

      // If user is logged in, assume they might own this essay
      // Let the EssayEditor/selectEssay handle loading - it knows how to load user's essays
      if (user) {
        // Check if this essay is in the user's essays list
        if (essays && essays.some(e => e.id === id)) {
          // User owns this essay - use owner flow
          setExternalEssay(null);
          setExternalPermission(null);
          setExternalOwnerUid(null);
          setLoading(false);
          return;
        }

        // Essay not in user's list - could be shared or public
        // Try unified permissions, but handle errors gracefully
        try {
          const result = await getEssayWithPermissions(id, user.uid, user.email);
          if (result.essay) {
            if (result.permission === 'owner') {
              // User owns it (found via index) - use owner flow
              setExternalEssay(null);
              setExternalPermission(null);
              setExternalOwnerUid(null);
            } else {
              // Shared or public access
              setExternalEssay(result.essay);
              setExternalPermission(result.permission);
              setExternalOwnerUid(result.ownerUid);
            }
            setLoading(false);
            return;
          }
        } catch (err) {
          console.log('Permission check failed, trying as owner:', err.message);
        }

        // Fallback: assume user owns it and let selectEssay handle it
        // This handles essays without essayIndex entries
        setExternalEssay(null);
        setExternalPermission(null);
        setExternalOwnerUid(null);
        setLoading(false);
        return;
      }

      // Not logged in - must be public access
      try {
        const result = await getEssayWithPermissions(id, null, null);
        if (result.essay && result.permission) {
          setExternalEssay(result.essay);
          setExternalPermission(result.permission);
          setExternalOwnerUid(result.ownerUid);
        } else {
          setError('Essay not found or is not public');
        }
      } catch (err) {
        setError('Essay not found or is not public');
      }

      setLoading(false);
    };

    if (id) {
      loadEssay();
    }
  }, [id, user, essays]);

  if (loading) {
    return (
      <div className="public-essay-view">
        <div className="public-essay-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-essay-view">
        <div className="public-essay-error">
          <h2>Oops!</h2>
          <p>{error}</p>
          <Link to="/" className="btn-go-home">Go to Essay Helper</Link>
        </div>
      </div>
    );
  }

  // External access (shared or public) - use the same editor but with permission restrictions
  if (externalEssay && externalPermission) {
    return (
      <ExternalEssayEditor
        externalEssay={externalEssay}
        externalPermission={externalPermission}
        externalOwnerUid={externalOwnerUid}
      />
    );
  }

  // Owner access - use full editor
  return (
    <EssayEditor
      essay={essay}
      currentEssayId={currentEssayId}
      lastSaved={lastSaved}
      currentTitle={currentTitle}
      updateIntro={updateIntro}
      addClaim={addClaim}
      updateClaim={updateClaim}
      removeClaim={removeClaim}
      updateBodyParagraph={updateBodyParagraph}
      addProofBlock={addProofBlock}
      updateProofBlock={updateProofBlock}
      removeProofBlock={removeProofBlock}
      updateConclusion={updateConclusion}
      getClaimById={getClaimById}
      renameEssay={renameEssay}
      selectEssay={selectEssay}
      sharingInfo={sharingInfo}
      isSharedEssay={isSharedEssay}
      loadSharingInfo={loadSharingInfo}
      saveSharing={saveSharing}
    />
  );
}

function HomePageWrapper({ essays, sharedEssays, onNewEssay, deleteEssay, selectSharedEssay, isLoggedIn }) {
  const navigate = useNavigate();

  const handleSelectEssay = (essayId) => {
    navigate(`/essay/${essayId}`);
  };

  const handleSelectSharedEssay = async (ownerUid, essayId, permission) => {
    await selectSharedEssay(ownerUid, essayId, permission);
    navigate(`/essay/${essayId}`);
  };

  const handleNewEssay = () => {
    const newId = onNewEssay();
    if (newId) {
      navigate(`/essay/${newId}`);
    }
  };

  return (
    <>
      <Header
        essay={null}
        getFullEssayText={() => ''}
        currentTitle=""
        lastSaved={null}
        onRenameEssay={() => {}}
        onGoHome={() => {}}
        showEditor={false}
        onShareClick={() => {}}
        isSharedEssay={false}
      />
      <HomePage
        essays={essays}
        sharedEssays={sharedEssays}
        onSelectEssay={handleSelectEssay}
        onSelectSharedEssay={handleSelectSharedEssay}
        onNewEssay={handleNewEssay}
        onDeleteEssay={deleteEssay}
        isLoggedIn={isLoggedIn}
      />
    </>
  );
}

function App() {
  const { user } = useAuth();

  const {
    essay,
    essays,
    currentEssayId,
    loading,
    showMigrationPrompt,
    lastSavedAt,
    saveError,
    dismissSaveError,
    updateIntro,
    addClaim,
    updateClaim,
    removeClaim,
    updateBodyParagraph,
    addProofBlock,
    updateProofBlock,
    removeProofBlock,
    updateConclusion,
    getClaimById,
    selectEssay,
    createNewEssay,
    deleteEssay,
    renameEssay,
    handleMigrate,
    handleSkipMigration,
    // Sharing-related
    sharedEssays,
    sharingInfo,
    isSharedEssay,
    selectSharedEssay,
    loadSharingInfo,
    saveSharing,
  } = useEssay();

  const currentEssay = essays?.find((e) => e.id === currentEssayId);
  const currentTitle = currentEssay?.title || 'Untitled';
  // Use lastSavedAt from hook, fall back to essay's updatedAt for initial load
  const lastSaved = lastSavedAt || currentEssay?.updatedAt;

  if (loading) {
    return (
      <div className="app">
        <div className="loading-state">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {saveError && (
        <div className="save-error-banner">
          <span>{saveError}</span>
          <button onClick={dismissSaveError} className="save-error-dismiss">×</button>
        </div>
      )}

      {showMigrationPrompt && (
        <MigrationPrompt
          onMigrate={handleMigrate}
          onSkip={handleSkipMigration}
        />
      )}

      <Routes>
        <Route
          path="/"
          element={
            <HomePageWrapper
              essays={essays}
              sharedEssays={sharedEssays}
              onNewEssay={createNewEssay}
              deleteEssay={deleteEssay}
              selectSharedEssay={selectSharedEssay}
              isLoggedIn={!!user}
            />
          }
        />
        <Route
          path="/essay/:id"
          element={
            <UnifiedEssayRoute
              essay={essay}
              essays={essays}
              currentEssayId={currentEssayId}
              lastSaved={lastSaved}
              currentTitle={currentTitle}
              updateIntro={updateIntro}
              addClaim={addClaim}
              updateClaim={updateClaim}
              removeClaim={removeClaim}
              updateBodyParagraph={updateBodyParagraph}
              addProofBlock={addProofBlock}
              updateProofBlock={updateProofBlock}
              removeProofBlock={removeProofBlock}
              updateConclusion={updateConclusion}
              getClaimById={getClaimById}
              renameEssay={renameEssay}
              selectEssay={selectEssay}
              sharingInfo={sharingInfo}
              isSharedEssay={isSharedEssay}
              loadSharingInfo={loadSharingInfo}
              saveSharing={saveSharing}
              user={user}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
