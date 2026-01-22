import { useState } from 'react';
import { OutlineCell, ParagraphCell, PurposeCell, SectionLabel } from './Cells';
import { AddRemoveActions } from './AddRemoveActions';
import { ConfirmDialog } from './ConfirmDialog';

export function BodySection({
  bodyParagraph,
  bodyIndex,
  thesis,
  claim,
  updateBodyParagraph,
  addProofBlock,
  updateProofBlock,
  removeProofBlock,
  sectionCollapsed,
  onToggleSection,
}) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const rowCount = 2 + bodyParagraph.proofBlocks.length * 4;
  const claimText = claim?.text || `[Claim ${bodyIndex + 1}]`;
  const thesisText = thesis || '[Thesis]';

  // Generate proof summaries from connection fields
  const getProofSummary = (proofBlock, index) => {
    const connection = proofBlock.connection?.trim();
    return connection ? `Summary of "${connection}"` : `[Proof ${index + 1}]`;
  };
  const proofSummaries = bodyParagraph.proofBlocks.map((pb, i) => getProofSummary(pb, i));

  const handleRemoveProofBlock = (bodyId, proofBlockId) => {
    const proofBlock = bodyParagraph.proofBlocks.find(pb => pb.id === proofBlockId);
    const hasContent = proofBlock?.quote?.trim() || proofBlock?.analysis?.trim() || proofBlock?.connection?.trim();
    if (hasContent) {
      setConfirmDelete({ bodyId, proofBlockId });
    } else {
      removeProofBlock(bodyId, proofBlockId);
    }
  };

  const handleConfirmDelete = () => {
    if (confirmDelete) {
      removeProofBlock(confirmDelete.bodyId, confirmDelete.proofBlockId);
      setConfirmDelete(null);
    }
  };

  return (
    <div className={`section section-body section-body-${bodyIndex % 3} ${sectionCollapsed ? 'section-collapsed' : ''}`}>
      <div className="section-grid" style={{ gridTemplateRows: `repeat(${rowCount}, auto)` }}>
        <SectionLabel rowSpan={rowCount} onClick={onToggleSection} collapsed={sectionCollapsed}>Body {bodyIndex + 1}</SectionLabel>
        <PurposeCell label="Purpose">
          State that <span className="ref">{claimText}</span> supports <span className="ref">{thesisText}</span>
        </PurposeCell>
        <OutlineCell
          value={bodyParagraph.purpose}
          onChange={(value) => updateBodyParagraph(bodyParagraph.id, 'purpose', value)}
          placeholderContent={<>e.g., <span className="ref">{thesisText}</span> is true because <span className="ref">{claimText}</span>.</>}
        />
        <ParagraphCell
          rowSpan={rowCount}
          value={bodyParagraph.paragraph}
          onChange={(value) => updateBodyParagraph(bodyParagraph.id, 'paragraph', value)}
          placeholder={`Write your body paragraph proving "${claimText}", weaving together your evidence, analysis, and connection...`}
        />

        {bodyParagraph.proofBlocks.map((proofBlock, pbIndex) => (
          <ProofBlockRows
            key={proofBlock.id}
            proofBlock={proofBlock}
            pbIndex={pbIndex}
            bodyId={bodyParagraph.id}
            claimText={claimText}
            isOnly={bodyParagraph.proofBlocks.length === 1}
            isLast={pbIndex === bodyParagraph.proofBlocks.length - 1}
            updateProofBlock={updateProofBlock}
            removeProofBlock={handleRemoveProofBlock}
            addProofBlock={addProofBlock}
          />
        ))}

        <PurposeCell label="Recap">
          Tie body together to say <span className="ref">{thesisText}</span> is true because <span className="ref">{claimText}</span> is true because {proofSummaries.map((summary, i) => <span key={i} className="ref">{summary}</span>).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, ' ', curr], [])} are true
        </PurposeCell>
        <OutlineCell
          value={bodyParagraph.recap}
          onChange={(value) => updateBodyParagraph(bodyParagraph.id, 'recap', value)}
          placeholderContent={<>e.g., {proofSummaries.map((summary, i) => <span key={i}><span className="ref">{summary}</span>{i < proofSummaries.length - 1 ? ', ' : ' '}</span>)}show that <span className="ref">{claimText}</span> is true which shows that <span className="ref">{thesisText}</span> is true.</>}
        />
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete Proof Block?"
        message="This proof block has content. Are you sure you want to delete it?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function ProofBlockRows({
  proofBlock,
  pbIndex,
  bodyId,
  claimText,
  isOnly,
  isLast,
  updateProofBlock,
  removeProofBlock,
  addProofBlock,
}) {
  const depthClass = `proof-depth-${Math.min(pbIndex, 4)}`;

  return (
    <>
      <div className={`proof-header ${depthClass}`}>
        <span className="proof-header-text">PROOF {pbIndex + 1}</span>
        <div className="proof-header-actions">
          <AddRemoveActions
            canRemove={!isOnly}
            canAdd={isLast}
            onRemove={() => removeProofBlock(bodyId, proofBlock.id)}
            onAdd={() => addProofBlock(bodyId)}
            removeTitle="Remove proof block"
            addTitle="Add proof block"
          />
        </div>
      </div>

      <PurposeCell label="Quote" className={depthClass}>
        Evidence / Quote
      </PurposeCell>
      <OutlineCell
        value={proofBlock.quote}
        onChange={(value) => updateProofBlock(bodyId, proofBlock.id, 'quote', value)}
        placeholderContent={<>What evidence or quote supports <span className="ref">{claimText}</span>?</>}
        className={depthClass}
      />

      <PurposeCell label="Analysis" className={depthClass}>
        What this means
      </PurposeCell>
      <OutlineCell
        value={proofBlock.analysis}
        onChange={(value) => updateProofBlock(bodyId, proofBlock.id, 'analysis', value)}
        placeholder="What does this evidence mean? Explain the quote."
        className={depthClass}
      />

      <PurposeCell label="Connection" className={`${depthClass} proof-last-row`}>
        Why this proves <span className="ref">{claimText}</span>
      </PurposeCell>
      <OutlineCell
        value={proofBlock.connection}
        onChange={(value) => updateProofBlock(bodyId, proofBlock.id, 'connection', value)}
        placeholderContent={<>How does this prove <span className="ref">{claimText}</span>?</>}
        className={`${depthClass} proof-last-row`}
      />
    </>
  );
}
