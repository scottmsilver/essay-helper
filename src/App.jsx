import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useEssay } from './hooks/useEssay';
import { useAuth } from './hooks/useAuth';
import { IntroSection, BodySection, ConclusionSection } from './components';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { MigrationPrompt } from './components/MigrationPrompt';
import './App.css';

function getFullEssayText(essay) {
  return [
    essay.intro.paragraph,
    ...essay.bodyParagraphs.map(b => b.paragraph),
    essay.conclusion.paragraph,
  ]
    .map(p => p?.trim())
    .filter(Boolean)
    .join('\n\n');
}

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
}) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [collapsedState, setCollapsedState] = useState(loadCollapsedState);

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
        onRenameEssay={handleRenameEssay}
        onGoHome={() => navigate('/')}
        showEditor={true}
      />

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
          />
        ))}

        <ConclusionSection
          conclusion={essay.conclusion}
          thesis={essay.intro.thesis}
          claims={essay.intro.claims}
          updateConclusion={updateConclusion}
          sectionCollapsed={isSectionCollapsed('conclusion')}
          onToggleSection={() => toggleCollapse('conclusion', true)}
        />
      </main>
    </>
  );
}

function HomePageWrapper({ essays, onNewEssay, deleteEssay, isLoggedIn }) {
  const navigate = useNavigate();

  const handleSelectEssay = (essayId) => {
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
      />
      <HomePage
        essays={essays}
        onSelectEssay={handleSelectEssay}
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
              onNewEssay={createNewEssay}
              deleteEssay={deleteEssay}
              isLoggedIn={!!user}
            />
          }
        />
        <Route
          path="/essay/:id"
          element={
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
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
