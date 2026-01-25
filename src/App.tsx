import { useEffect, useState, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { User } from 'firebase/auth';
import { useEssay } from './hooks/useEssay';
import { useEssayUpdates } from './hooks/useEssayUpdates';
import { useAuth } from './hooks/useAuth';
import { getFullEssayText, Essay, createEssay, Claim, Intro, BodyParagraph, Conclusion, ProofBlock } from './models/essay';
import { IntroSection, BodySection, ConclusionSection, ShareDialog } from './components';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { MigrationPrompt } from './components/MigrationPrompt';
import { CommentPanel, toCommentThreadData, CommentThreadData } from './components/Comments';
import { useComments } from './hooks/useComments';
import { getEssayWithPermissions, savePublicEssay } from './firebase/firestore';
import type { EssayDocument, SharingInfo, Permission, SharedEssayRef } from './models/document';
import type { BlockType, CommentThread } from './models/comment';
import './App.css';

const COLLAPSED_STORAGE_KEY = 'essay-helper-collapsed-sections';

interface CollapsedState {
  purpose?: boolean;
  outline?: boolean;
  paragraph?: boolean;
  sections?: Record<string, boolean>;
}

function loadCollapsedState(): CollapsedState {
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

function saveCollapsedState(state: CollapsedState): void {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save collapsed state:', e);
  }
}

interface ExternalEssayEditorProps {
  externalEssay: EssayDocument;
  externalPermission: Permission;
  externalOwnerUid: string;
}

function ExternalEssayEditor({ externalEssay, externalPermission, externalOwnerUid }: ExternalEssayEditorProps) {
  const isEditor = externalPermission === 'editor';
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [essay, setEssay] = useState<Essay>(() => externalEssay.data || createEssay());

  const saveEssay = useCallback(
    async (essayData: Essay) => {
      if (!isEditor || !externalOwnerUid || !externalEssay?.id) return;

      try {
        await savePublicEssay(externalOwnerUid, externalEssay.id, essayData, externalEssay.title);
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to save:', err);
      }
    },
    [isEditor, externalOwnerUid, externalEssay]
  );

  const triggerSave = useCallback(
    (essayData: Essay) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => saveEssay(essayData), 2000);
    },
    [saveEssay]
  );

  const handleUpdate = useCallback(
    (updatedEssay: Essay) => {
      if (isEditor) triggerSave(updatedEssay);
    },
    [isEditor, triggerSave]
  );

  const { updateIntro, updateClaim, updateBodyParagraph, updateProofBlock, updateConclusion } =
    useEssayUpdates(setEssay, handleUpdate);

  const getClaimById = useCallback(
    (claimId: string) => essay.intro?.claims?.find((c) => c.id === claimId),
    [essay.intro?.claims]
  );

  // Show session save time if available, otherwise document's last modified time
  const displayLastSaved = lastSaved || externalEssay.updatedAt;

  return (
    <EssayEditor
      essay={essay}
      currentEssayId={externalEssay.id}
      lastSaved={displayLastSaved}
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
      selectEssay={() => Promise.resolve()}
      sharingInfo={null}
      isSharedEssay={true}
      loadSharingInfo={() => Promise.resolve()}
      saveSharing={() => Promise.resolve()}
      readOnly={!isEditor}
    />
  );
}

interface EssayEditorProps {
  essay: Essay;
  currentEssayId: string | null;
  lastSaved: Date | null;
  currentTitle: string;
  updateIntro: (field: keyof Intro, value: Intro[keyof Intro]) => void;
  addClaim: () => void;
  updateClaim: (claimId: string, text: string) => void;
  removeClaim: (claimId: string) => void;
  updateBodyParagraph: (bodyId: string, field: keyof BodyParagraph, value: BodyParagraph[keyof BodyParagraph]) => void;
  addProofBlock: (bodyId: string) => void;
  updateProofBlock: (bodyId: string, proofBlockId: string, field: keyof ProofBlock, value: string) => void;
  removeProofBlock: (bodyId: string, proofBlockId: string) => void;
  updateConclusion: (field: keyof Conclusion, value: string) => void;
  getClaimById: (claimId: string) => Claim | undefined;
  renameEssay: (essayId: string, newTitle: string) => void;
  selectEssay: (essayId: string) => Promise<void>;
  sharingInfo: SharingInfo | null;
  isSharedEssay: boolean;
  loadSharingInfo: () => Promise<void>;
  saveSharing: (params: { collaborators: SharingInfo['collaborators']; isPublic: boolean; publicPermission: 'viewer' | 'editor' }) => Promise<void>;
  readOnly?: boolean;
  ownerUid?: string | null;
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
  ownerUid,
}: EssayEditorProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [collapsedState, setCollapsedState] = useState<CollapsedState>(loadCollapsedState);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);

  // Comments state
  const [activeBlock, setActiveBlock] = useState<{ id: string; type: BlockType } | null>(null);
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [quotedText, setQuotedText] = useState<string | null>(null);

  const {
    commentsByBlock,
    addComment,
    editComment,
    deleteComment,
    resolveThread,
  } = useComments({ essayId: currentEssayId, ownerUid });

  // Helper to get comment stats for a block
  const getBlockStats = useCallback((blockId: string) => {
    const threads = commentsByBlock.get(blockId) || [];
    const count = threads.reduce((sum: number, t: CommentThread) => sum + 1 + t.replies.length, 0);
    const hasUnresolved = threads.some((t: CommentThread) => !t.rootComment.resolved);
    return { count, hasUnresolved };
  }, [commentsByBlock]);

  // Helper to convert all threads to UI format
  const getAllThreads = useCallback((): CommentThreadData[] => {
    const allThreads: CommentThreadData[] = [];
    commentsByBlock.forEach((threads: CommentThread[], blockId: string) => {
      threads.forEach((thread: CommentThread) => {
        allThreads.push(toCommentThreadData(thread, blockId, thread.rootComment.blockType));
      });
    });
    return allThreads.sort((a, b) =>
      b.rootComment.createdAt.getTime() - a.rootComment.createdAt.getTime()
    );
  }, [commentsByBlock]);

  const handleCommentClick = useCallback((blockId: string, blockType: BlockType, selectedText?: string) => {
    setActiveBlock({ id: blockId, type: blockType });
    setQuotedText(selectedText || null);
    setShowCommentPanel(true);
  }, []);

  const handleAddComment = useCallback(async (blockId: string, blockType: string, text: string, parentId?: string) => {
    await addComment(blockId, blockType as BlockType, text, parentId);
  }, [addComment]);

  const handleCloseCommentPanel = useCallback(() => {
    setShowCommentPanel(false);
    setQuotedText(null);
  }, []);

  const handleOpenCommentPanel = useCallback(() => {
    setActiveBlock(null); // Show all comments, not filtered by block
    setQuotedText(null);
    setShowCommentPanel(true);
  }, []);

  // Total comment count for the badge
  const totalCommentCount = getAllThreads().reduce(
    (sum, thread) => sum + 1 + thread.replies.length,
    0
  );

  // Comment helpers for section components
  const commentHelpers = {
    getBlockStats,
    onCommentClick: handleCommentClick,
  };

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
    return () => {
      cancelled = true;
    };
  }, [currentEssayId, isSharedEssay, loadSharingInfo]);

  const purposeCollapsed = collapsedState.purpose ?? false;
  const outlineCollapsed = collapsedState.outline ?? false;
  const paragraphCollapsed = collapsedState.paragraph ?? false;

  useEffect(() => {
    if (id && id !== currentEssayId) {
      selectEssay(id);
    }
  }, [id, currentEssayId, selectEssay]);

  const handleRenameEssay = (newTitle: string) => {
    if (currentEssayId) {
      renameEssay(currentEssayId, newTitle);
    }
  };

  const toggleCollapse = (key: string, isSection = false) => {
    let newState: CollapsedState;
    if (isSection) {
      const newSections = { ...collapsedState.sections, [key]: !(collapsedState.sections?.[key] ?? false) };
      newState = { ...collapsedState, sections: newSections };
    } else {
      newState = { ...collapsedState, [key]: !collapsedState[key as keyof CollapsedState] };
    }
    setCollapsedState(newState);
    saveCollapsedState(newState);
  };

  const isSectionCollapsed = (sectionKey: string) => collapsedState.sections?.[sectionKey] ?? false;

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
        onCommentsClick={handleOpenCommentPanel}
        commentCount={totalCommentCount}
        isSharedEssay={isSharedEssay}
        readOnly={readOnly}
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

      <CommentPanel
        isOpen={showCommentPanel}
        onClose={handleCloseCommentPanel}
        threads={getAllThreads()}
        activeBlockId={activeBlock?.id ?? null}
        activeBlockType={activeBlock?.type ?? null}
        quotedText={quotedText}
        onClearQuote={() => setQuotedText(null)}
        currentUserId={user?.uid ?? ''}
        essayOwnerId={ownerUid ?? user?.uid ?? ''}
        onAddComment={handleAddComment}
        onEditComment={editComment}
        onDeleteComment={deleteComment}
        onResolveThread={resolveThread}
      />

      <main
        className={[
          'essay-grid',
          purposeCollapsed && 'purpose-collapsed',
          outlineCollapsed && 'outline-collapsed',
          paragraphCollapsed && 'paragraph-collapsed',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="header-row">
          <div className="header-cell"></div>
          {[
            { key: 'purpose', label: 'Purpose', short: 'P', collapsed: purposeCollapsed },
            { key: 'outline', label: 'Outline', short: 'O', collapsed: outlineCollapsed },
            { key: 'paragraph', label: 'Paragraph', short: '¶', collapsed: paragraphCollapsed },
          ].map((col) => (
            <div
              key={col.key}
              className="header-cell header-cell-collapsible"
              onClick={() => toggleCollapse(col.key)}
            >
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
          commentHelpers={commentHelpers}
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
            commentHelpers={commentHelpers}
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
          commentHelpers={commentHelpers}
        />
      </main>
    </>
  );
}

interface UnifiedEssayRouteProps {
  essay: Essay;
  essays: EssayDocument[];
  currentEssayId: string | null;
  lastSaved: Date | null;
  currentTitle: string;
  updateIntro: (field: keyof Intro, value: Intro[keyof Intro]) => void;
  addClaim: () => void;
  updateClaim: (claimId: string, text: string) => void;
  removeClaim: (claimId: string) => void;
  updateBodyParagraph: (bodyId: string, field: keyof BodyParagraph, value: BodyParagraph[keyof BodyParagraph]) => void;
  addProofBlock: (bodyId: string) => void;
  updateProofBlock: (bodyId: string, proofBlockId: string, field: keyof ProofBlock, value: string) => void;
  removeProofBlock: (bodyId: string, proofBlockId: string) => void;
  updateConclusion: (field: keyof Conclusion, value: string) => void;
  getClaimById: (claimId: string) => Claim | undefined;
  renameEssay: (essayId: string, newTitle: string) => Promise<void>;
  selectEssay: (essayId: string) => Promise<void>;
  sharingInfo: SharingInfo | null;
  isSharedEssay: boolean;
  loadSharingInfo: () => Promise<void>;
  saveSharing: (params: { collaborators: SharingInfo['collaborators']; isPublic: boolean; publicPermission: 'viewer' | 'editor' }) => Promise<void>;
  user: User | null;
}

function UnifiedEssayRoute({
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
}: UnifiedEssayRouteProps) {
  const { id } = useParams<{ id: string }>();
  const [externalEssay, setExternalEssay] = useState<EssayDocument | null>(null);
  const [externalPermission, setExternalPermission] = useState<Permission | null>(null);
  const [externalOwnerUid, setExternalOwnerUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEssay = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      if (user) {
        if (essays && essays.some((e) => e.id === id)) {
          setExternalEssay(null);
          setExternalPermission(null);
          setExternalOwnerUid(null);
          setLoading(false);
          return;
        }

        try {
          const result = await getEssayWithPermissions(id, user.uid, user.email);
          if (result.essay) {
            if (result.permission === 'owner') {
              setExternalEssay(null);
              setExternalPermission(null);
              setExternalOwnerUid(null);
            } else {
              setExternalEssay(result.essay);
              setExternalPermission(result.permission);
              setExternalOwnerUid(result.ownerUid);
            }
            setLoading(false);
            return;
          }
        } catch (err) {
          console.log('Permission check failed, trying as owner:', (err as Error).message);
        }

        setExternalEssay(null);
        setExternalPermission(null);
        setExternalOwnerUid(null);
        setLoading(false);
        return;
      }

      try {
        const result = await getEssayWithPermissions(id, null, null);
        if (result.essay && result.permission) {
          setExternalEssay(result.essay);
          setExternalPermission(result.permission);
          setExternalOwnerUid(result.ownerUid);
        } else {
          setError('Essay not found or is not public');
        }
      } catch {
        setError('Essay not found or is not public');
      }

      setLoading(false);
    };

    loadEssay();
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
          <Link to="/" className="btn-go-home">
            Go to Essay Helper
          </Link>
        </div>
      </div>
    );
  }

  if (externalEssay && externalPermission && externalOwnerUid) {
    return (
      <ExternalEssayEditor
        externalEssay={externalEssay}
        externalPermission={externalPermission}
        externalOwnerUid={externalOwnerUid}
      />
    );
  }

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
      ownerUid={null}
    />
  );
}

interface HomePageWrapperProps {
  essays: EssayDocument[];
  sharedEssays: SharedEssayRef[];
  onNewEssay: () => string;
  deleteEssay: (essayId: string) => Promise<void>;
  selectSharedEssay: (ownerUid: string, essayId: string, permission: Permission) => Promise<void>;
  isLoggedIn: boolean;
}

function HomePageWrapper({
  essays,
  sharedEssays,
  onNewEssay,
  deleteEssay,
  selectSharedEssay,
  isLoggedIn,
}: HomePageWrapperProps) {
  const navigate = useNavigate();

  const handleSelectEssay = (essayId: string) => {
    navigate(`/essay/${essayId}`);
  };

  const handleSelectSharedEssay = async (ownerUid: string, essayId: string, permission: Permission) => {
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
        onShareClick={null}
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
    sharedEssays,
    sharingInfo,
    isSharedEssay,
    selectSharedEssay,
    loadSharingInfo,
    saveSharing,
  } = useEssay();

  const currentEssay = essays?.find((e) => e.id === currentEssayId);
  const currentTitle = currentEssay?.title || 'Untitled';
  const lastSaved = lastSavedAt || (currentEssay?.updatedAt as Date) || null;

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
          <button onClick={dismissSaveError} className="save-error-dismiss">
            ×
          </button>
        </div>
      )}

      {showMigrationPrompt && <MigrationPrompt onMigrate={handleMigrate} onSkip={handleSkipMigration} />}

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
