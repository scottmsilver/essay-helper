import { OutlineCell, ParagraphCell, PurposeCell, SectionLabel } from './Cells';

export function BodySection({
  bodyParagraph,
  bodyIndex,
  claim,
  updateBodyParagraph,
  addProofBlock,
  updateProofBlock,
  removeProofBlock,
}) {
  // Rows: purpose + (3 rows per proof block) + recap = 1 + 3*n + 1
  const rowCount = 2 + bodyParagraph.proofBlocks.length * 3;

  return (
    <div className={`section section-body section-body-${bodyIndex % 3}`}>
      <div className="section-grid" style={{ gridTemplateRows: `repeat(${rowCount}, auto)` }}>
        {/* Row 1: Purpose */}
        <SectionLabel rowSpan={rowCount}>Body {bodyIndex + 1}</SectionLabel>
        <div className="component-label">Purpose</div>
        <PurposeCell>
          Proving: <em>{claim?.text || `[Claim ${bodyIndex + 1}]`}</em>
        </PurposeCell>
        <div className="outline-cell purpose-display">-</div>
        <ParagraphCell
          rowSpan={rowCount}
          value={bodyParagraph.paragraph}
          onChange={(value) => updateBodyParagraph(bodyParagraph.id, 'paragraph', value)}
          placeholder={`Write your body paragraph proving "${claim?.text || `[Claim ${bodyIndex + 1}]`}", weaving together your evidence, analysis, and connection...`}
        />

        {/* Proof blocks */}
        {bodyParagraph.proofBlocks.map((proofBlock, pbIndex) => (
          <ProofBlockRows
            key={proofBlock.id}
            proofBlock={proofBlock}
            pbIndex={pbIndex}
            bodyId={bodyParagraph.id}
            claim={claim}
            bodyIndex={bodyIndex}
            isOnly={bodyParagraph.proofBlocks.length === 1}
            isLast={pbIndex === bodyParagraph.proofBlocks.length - 1}
            updateProofBlock={updateProofBlock}
            removeProofBlock={removeProofBlock}
            addProofBlock={addProofBlock}
          />
        ))}

        {/* Recap row */}
        <div className="component-label">Recap</div>
        <PurposeCell>
          Tie it together showing why <em>{claim?.text || `[Claim ${bodyIndex + 1}]`}</em> is true, referencing your analysis
        </PurposeCell>
        <OutlineCell
          value={bodyParagraph.recap}
          onChange={(value) => updateBodyParagraph(bodyParagraph.id, 'recap', value)}
          placeholder={`How do all your proof blocks connect to prove "${claim?.text || `[Claim ${bodyIndex + 1}]`}"?`}
        />
      </div>
    </div>
  );
}

function ProofBlockRows({
  proofBlock,
  pbIndex,
  bodyId,
  claim,
  bodyIndex,
  isOnly,
  isLast,
  updateProofBlock,
  removeProofBlock,
  addProofBlock,
}) {
  const proofBlockClass = `proof-block proof-block-${pbIndex % 2}`;

  return (
    <>
      {/* Quote row */}
      <div className={`component-label ${proofBlockClass} proof-block-first`}>
        <span className="proof-block-label">Proof {pbIndex + 1}</span>
        <span className="sub-label">Quote</span>
        <div className="claim-actions">
          {!isOnly && (
            <button
              className="btn-remove"
              onClick={() => removeProofBlock(bodyId, proofBlock.id)}
              title="Remove proof block"
            >
              -
            </button>
          )}
          {isLast && (
            <button
              className="btn-add"
              onClick={() => addProofBlock(bodyId)}
              title="Add proof block"
            >
              +
            </button>
          )}
        </div>
      </div>
      <PurposeCell className={proofBlockClass}>Evidence / Quote</PurposeCell>
      <OutlineCell
        value={proofBlock.quote}
        onChange={(value) => updateProofBlock(bodyId, proofBlock.id, 'quote', value)}
        placeholder={`What evidence or quote supports "${claim?.text || `[Claim ${bodyIndex + 1}]`}"?`}
        className={proofBlockClass}
      />

      {/* Analysis row */}
      <div className={`component-label ${proofBlockClass} proof-block-middle`}>
        <span className="sub-label">Analysis</span>
      </div>
      <PurposeCell className={proofBlockClass}>What this means</PurposeCell>
      <OutlineCell
        value={proofBlock.analysis}
        onChange={(value) => updateProofBlock(bodyId, proofBlock.id, 'analysis', value)}
        placeholder="What does this evidence mean? Explain the quote."
        className={proofBlockClass}
      />

      {/* Connection row */}
      <div className={`component-label ${proofBlockClass} proof-block-last`}>
        <span className="sub-label">Connection</span>
      </div>
      <PurposeCell className={proofBlockClass}>
        Why this proves <em>{claim?.text || `[Claim ${bodyIndex + 1}]`}</em>
      </PurposeCell>
      <OutlineCell
        value={proofBlock.connection}
        onChange={(value) => updateProofBlock(bodyId, proofBlock.id, 'connection', value)}
        placeholder={`How does this prove "${claim?.text || `[Claim ${bodyIndex + 1}]`}"?`}
        className={proofBlockClass}
      />
    </>
  );
}
