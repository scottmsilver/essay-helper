import { OutlineCell, ParagraphCell, PurposeCell, SectionLabel } from './Cells';

export function ConclusionSection({
  conclusion,
  thesis,
  claims,
  updateConclusion,
  sectionCollapsed,
  onToggleSection,
}) {
  const rowCount = 2; // restatement + so what

  // Build the restatement purpose from thesis and claims
  const thesisText = thesis || '[Thesis]';
  const claimTexts = claims.map((c, i) => c.text || `[Claim ${i + 1}]`);

  return (
    <div className={`section section-conclusion ${sectionCollapsed ? 'section-collapsed' : ''}`}>
      <div className="section-grid" style={{ gridTemplateRows: `repeat(${rowCount}, auto)` }}>
        {/* Row 1: Restatement */}
        <SectionLabel rowSpan={rowCount} onClick={onToggleSection} collapsed={sectionCollapsed}>Conclusion</SectionLabel>
        <PurposeCell label="Restatement">
          <span className="ref">{thesisText}</span> because {claimTexts.map((ct, i) => <span key={i} className="ref">{ct}{i < claimTexts.length - 1 ? ', ' : ''}</span>)}
        </PurposeCell>
        <OutlineCell
          value={conclusion.restatement || ''}
          onChange={(value) => updateConclusion('restatement', value)}
          placeholderContent={<>How will you restate <span className="ref">{thesisText}</span> and your claims ({claimTexts.map((ct, i) => <span key={i}><span className="ref">{ct}</span>{i < claimTexts.length - 1 ? ', ' : ''}</span>)}) in your own words?</>}
        />
        <ParagraphCell
          rowSpan={rowCount}
          value={conclusion.paragraph}
          onChange={(value) => updateConclusion('paragraph', value)}
          placeholder={`Write your conclusion restating "${thesis || '[thesis]'}" and explaining why it matters...`}
        />

        {/* Row 2: So What */}
        <PurposeCell label="So What">
          Future implications of <span className="ref">{thesisText}</span> being true
        </PurposeCell>
        <OutlineCell
          value={conclusion.soWhat}
          onChange={(value) => updateConclusion('soWhat', value)}
          placeholderContent={<>What are the future implications of <span className="ref">{thesisText}</span> being true?</>}
        />
      </div>
    </div>
  );
}
