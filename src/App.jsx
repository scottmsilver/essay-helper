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
  const paragraphs = [];

  if (essay.intro.paragraph?.trim()) {
    paragraphs.push(essay.intro.paragraph.trim());
  }

  for (const body of essay.bodyParagraphs) {
    if (body.paragraph?.trim()) {
      paragraphs.push(body.paragraph.trim());
    }
  }

  if (essay.conclusion.paragraph?.trim()) {
    paragraphs.push(essay.conclusion.paragraph.trim());
  }

  return paragraphs.join('\n\n');
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
  const [paragraphCollapsed, setParagraphCollapsed] = useState(true);

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

  const toggleParagraphColumn = () => {
    setParagraphCollapsed(!paragraphCollapsed);
  };

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

      <main className={`essay-grid ${paragraphCollapsed ? 'paragraph-collapsed' : ''}`}>
        <div className="header-row">
          <div className="header-cell"></div>
          <div className="header-cell">Purpose</div>
          <div className="header-cell">Outline</div>
          <div className="header-cell header-cell-paragraph" onClick={toggleParagraphColumn}>
            <span className="paragraph-toggle-icon">{paragraphCollapsed ? '◀' : '▶'}</span>
            <span className={paragraphCollapsed ? 'header-text-vertical' : ''}>Paragraph</span>
          </div>
        </div>

        <IntroSection
          intro={essay.intro}
          updateIntro={updateIntro}
          addClaim={addClaim}
          updateClaim={updateClaim}
          removeClaim={removeClaim}
          paragraphCollapsed={paragraphCollapsed}
          onExpandParagraph={() => setParagraphCollapsed(false)}
        />

        {essay.bodyParagraphs.map((bodyParagraph, index) => (
          <BodySection
            key={bodyParagraph.id}
            bodyParagraph={bodyParagraph}
            bodyIndex={index}
            claim={getClaimById(bodyParagraph.provingClaimId)}
            updateBodyParagraph={updateBodyParagraph}
            addProofBlock={addProofBlock}
            updateProofBlock={updateProofBlock}
            removeProofBlock={removeProofBlock}
            paragraphCollapsed={paragraphCollapsed}
            onExpandParagraph={() => setParagraphCollapsed(false)}
          />
        ))}

        <ConclusionSection
          conclusion={essay.conclusion}
          thesis={essay.intro.thesis}
          claims={essay.intro.claims}
          updateConclusion={updateConclusion}
          paragraphCollapsed={paragraphCollapsed}
          onExpandParagraph={() => setParagraphCollapsed(false)}
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
