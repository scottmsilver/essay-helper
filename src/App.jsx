import { useEssay } from './hooks/useEssay';
import { IntroSection, BodySection, ConclusionSection } from './components';
import './App.css';

function App() {
  const {
    essay,
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
    resetEssay,
  } = useEssay();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Essay Helper</h1>
        <button className="btn-reset" onClick={resetEssay}>
          Start New Essay
        </button>
      </header>

      <main className="essay-grid">
        {/* Column headers */}
        <div className="header-row">
          <div className="header-cell">Section</div>
          <div className="header-cell">Component</div>
          <div className="header-cell">Purpose</div>
          <div className="header-cell">Outline</div>
          <div className="header-cell">Paragraph</div>
        </div>

        {/* Introduction Section */}
        <IntroSection
          intro={essay.intro}
          updateIntro={updateIntro}
          addClaim={addClaim}
          updateClaim={updateClaim}
          removeClaim={removeClaim}
        />

        {/* Body Sections - one per claim */}
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
          />
        ))}

        {/* Conclusion Section */}
        <ConclusionSection
          conclusion={essay.conclusion}
          thesis={essay.intro.thesis}
          claims={essay.intro.claims}
          updateConclusion={updateConclusion}
        />
      </main>
    </div>
  );
}

export default App;
