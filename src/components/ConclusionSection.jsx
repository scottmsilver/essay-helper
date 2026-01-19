import { OutlineCell, ParagraphCell, PurposeCell, SectionLabel } from './Cells';

export function ConclusionSection({
  conclusion,
  thesis,
  claims,
  updateConclusion,
  paragraphCollapsed,
  onExpandParagraph,
}) {
  const rowCount = 2; // restatement + so what

  // Build the restatement purpose text from thesis and claims
  const claimsList = claims.map((c, i) => c.text || `[Claim ${i + 1}]`).join(', ');
  const restatementPurpose = thesis
    ? `"${thesis}" because ${claimsList}`
    : `[Thesis] because ${claimsList}`;

  return (
    <div className="section section-conclusion">
      <div className="section-grid" style={{ gridTemplateRows: `repeat(${rowCount}, auto)` }}>
        {/* Row 1: Restatement */}
        <SectionLabel rowSpan={rowCount}>Conclusion</SectionLabel>
        <PurposeCell label="Restatement">
          <span className="restatement-purpose">{restatementPurpose}</span>
        </PurposeCell>
        <OutlineCell
          value={conclusion.restatement || ''}
          onChange={(value) => updateConclusion('restatement', value)}
          placeholder={`How will you restate "${thesis || '[thesis]'}" and your claims (${claimsList}) in your own words?`}
        />
        <ParagraphCell
          rowSpan={rowCount}
          value={conclusion.paragraph}
          onChange={(value) => updateConclusion('paragraph', value)}
          placeholder={`Write your conclusion restating "${thesis || '[thesis]'}" and explaining why it matters...`}
          collapsed={paragraphCollapsed}
          onExpand={onExpandParagraph}
        />

        {/* Row 2: So What */}
        <PurposeCell label="So What">
          Future implications of <em>{thesis || '[thesis]'}</em> being true
        </PurposeCell>
        <OutlineCell
          value={conclusion.soWhat}
          onChange={(value) => updateConclusion('soWhat', value)}
          placeholder={`What are the future implications of "${thesis || '[thesis]'}" being true?`}
        />
      </div>
    </div>
  );
}
