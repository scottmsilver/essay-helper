import { useState, ReactNode } from 'react';
import { OutlineCell, ParagraphCell, PurposeCell, SectionLabel } from './Cells';
import { AddRemoveActions } from './AddRemoveActions';
import { ConfirmDialog } from './ConfirmDialog';
import { makeCommentProps, type CommentHelpers, type CommentProps } from './Comments';
import type { BodyParagraph, Claim, ProofBlock } from '../models/essay';

interface BodySectionProps {
  bodyParagraph: BodyParagraph;
  bodyIndex: number;
  thesis: string;
  claim: Claim | undefined;
  updateBodyParagraph: (bodyId: string, field: keyof BodyParagraph, value: BodyParagraph[keyof BodyParagraph]) => void;
  addProofBlock: (bodyId: string) => void;
  updateProofBlock: (bodyId: string, proofBlockId: string, field: keyof ProofBlock, value: string) => void;
  removeProofBlock: (bodyId: string, proofBlockId: string) => void;
  sectionCollapsed: boolean;
  onToggleSection: () => void;
  readOnly?: boolean;
  commentHelpers?: CommentHelpers;
}

interface DeleteConfirm {
  bodyId: string;
  proofBlockId: string;
}

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
  readOnly = false,
  commentHelpers,
}: BodySectionProps) {
  const [confirmDelete, setConfirmDelete] = useState<DeleteConfirm | null>(null);
  const rowCount = 2 + bodyParagraph.proofBlocks.length * 4;
  const claimText = claim?.text || `[Claim ${bodyIndex + 1}]`;
  const thesisText = thesis || '[Thesis]';
  const cp = (blockId: string) => makeCommentProps(commentHelpers, blockId, 'bodyParagraph');

  const getProofSummary = (proofBlock: ProofBlock, index: number): string => {
    const connection = proofBlock.connection?.trim();
    return connection ? `Summary of "${connection}"` : `[Proof ${index + 1}]`;
  };
  const proofSummaries = bodyParagraph.proofBlocks.map((pb, i) => getProofSummary(pb, i));

  const handleRemoveProofBlock = (bodyId: string, proofBlockId: string) => {
    const proofBlock = bodyParagraph.proofBlocks.find((pb) => pb.id === proofBlockId);
    const hasContent =
      proofBlock?.quote?.trim() || proofBlock?.analysis?.trim() || proofBlock?.connection?.trim();
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
    <div
      className={`section section-body section-body-${bodyIndex % 3} ${sectionCollapsed ? 'section-collapsed' : ''}`}
    >
      <div className="section-grid" style={{ gridTemplateRows: `repeat(${rowCount}, auto)` }}>
        <SectionLabel rowSpan={rowCount} onClick={onToggleSection} collapsed={sectionCollapsed}>
          Body {bodyIndex + 1}
        </SectionLabel>
        <PurposeCell label="Purpose">
          Topic sentence: introduce that you will prove <span className="ref">{claimText}</span>
        </PurposeCell>
        <OutlineCell
          value={bodyParagraph.purpose}
          onChange={(value) => updateBodyParagraph(bodyParagraph.id, 'purpose', value)}
          placeholderContent={
            <>
              e.g., This paragraph will show that <span className="ref">{claimText}</span>.
            </>
          }
          readOnly={readOnly}
          {...cp(`${bodyParagraph.id}-purpose`)}
        />
        <ParagraphCell
          rowSpan={rowCount}
          value={bodyParagraph.paragraph}
          onChange={(value) => updateBodyParagraph(bodyParagraph.id, 'paragraph', value)}
          placeholder={`Write your body paragraph proving "${claimText}", weaving together your evidence, analysis, and connection...`}
          readOnly={readOnly}
          {...cp(`${bodyParagraph.id}-paragraph`)}
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
            readOnly={readOnly}
            commentHelpers={commentHelpers}
          />
        ))}

        <PurposeCell label="Recap">
          Tie body together to say <span className="ref">{thesisText}</span> is true because{' '}
          <span className="ref">{claimText}</span> is true because{' '}
          {proofSummaries
            .map<ReactNode>((summary, i) => (
              <span key={i} className="ref">
                {summary}
              </span>
            ))
            .reduce<ReactNode[]>((prev, curr, i) => (i === 0 ? [curr] : [...prev, ' ', curr]), [])}{' '}
          are true
        </PurposeCell>
        <OutlineCell
          value={bodyParagraph.recap}
          onChange={(value) => updateBodyParagraph(bodyParagraph.id, 'recap', value)}
          placeholderContent={
            <>
              e.g.,{' '}
              {proofSummaries.map((summary, i) => (
                <span key={i}>
                  <span className="ref">{summary}</span>
                  {i < proofSummaries.length - 1 ? ', ' : ' '}
                </span>
              ))}
              show that <span className="ref">{claimText}</span> is true which shows that{' '}
              <span className="ref">{thesisText}</span> is true.
            </>
          }
          readOnly={readOnly}
          {...cp(`${bodyParagraph.id}-recap`)}
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

interface ProofBlockRowsProps {
  proofBlock: ProofBlock;
  pbIndex: number;
  bodyId: string;
  claimText: string;
  isOnly: boolean;
  isLast: boolean;
  updateProofBlock: (bodyId: string, proofBlockId: string, field: keyof ProofBlock, value: string) => void;
  removeProofBlock: (bodyId: string, proofBlockId: string) => void;
  addProofBlock: (bodyId: string) => void;
  readOnly?: boolean;
  commentHelpers?: CommentHelpers;
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
  readOnly = false,
  commentHelpers,
}: ProofBlockRowsProps) {
  const depthClass = `proof-depth-${Math.min(pbIndex, 4)}`;
  const cp = (blockId: string) => makeCommentProps(commentHelpers, blockId, 'proofBlock');

  return (
    <>
      <div className={`proof-header ${depthClass}`}>
        <span className="proof-header-text">PROOF {pbIndex + 1}</span>
        {!readOnly && (
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
        )}
      </div>

      <PurposeCell label="Evidence" className={depthClass}>
        Supporting evidence
      </PurposeCell>
      <OutlineCell
        value={proofBlock.quote}
        onChange={(value) => updateProofBlock(bodyId, proofBlock.id, 'quote', value)}
        placeholderContent={
          <>
            What quote or other evidence supports <span className="ref">{claimText}</span>?
          </>
        }
        className={depthClass}
        readOnly={readOnly}
        {...cp(`${proofBlock.id}-quote`)}
      />

      <PurposeCell label="Analysis" className={depthClass}>
        Interpret the evidence
      </PurposeCell>
      <OutlineCell
        value={proofBlock.analysis}
        onChange={(value) => updateProofBlock(bodyId, proofBlock.id, 'analysis', value)}
        placeholder="What does this evidence show? Explain its significance."
        className={depthClass}
        readOnly={readOnly}
        {...cp(`${proofBlock.id}-analysis`)}
      />

      <PurposeCell label="Connection" className={`${depthClass} proof-last-row`}>
        Why this proves <span className="ref">{claimText}</span>
      </PurposeCell>
      <OutlineCell
        value={proofBlock.connection}
        onChange={(value) => updateProofBlock(bodyId, proofBlock.id, 'connection', value)}
        placeholderContent={
          <>
            How does this prove <span className="ref">{claimText}</span>?
          </>
        }
        className={`${depthClass} proof-last-row`}
        readOnly={readOnly}
        {...cp(`${proofBlock.id}-connection`)}
      />
    </>
  );
}
