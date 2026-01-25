import { useState } from 'react';
import { OutlineCell, ParagraphCell, PurposeCell, SectionLabel } from './Cells';
import { AddRemoveActions } from './AddRemoveActions';
import { ConfirmDialog } from './ConfirmDialog';
import { makeCommentProps, type CommentHelpers, type CommentProps } from './Comments';
import type { Intro, Claim } from '../models/essay';

interface IntroSectionProps {
  intro: Intro;
  updateIntro: (field: keyof Intro, value: Intro[keyof Intro]) => void;
  addClaim: () => void;
  updateClaim: (claimId: string, text: string) => void;
  removeClaim: (claimId: string) => void;
  sectionCollapsed: boolean;
  onToggleSection: () => void;
  readOnly?: boolean;
  commentHelpers?: CommentHelpers;
}

export function IntroSection({
  intro, updateIntro, addClaim, updateClaim, removeClaim,
  sectionCollapsed, onToggleSection, readOnly = false, commentHelpers,
}: IntroSectionProps) {
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string } | null>(null);
  const rowCount = 3 + intro.claims.length;
  const cp = (blockId: string, blockType: 'intro' | 'claim') => makeCommentProps(commentHelpers, blockId, blockType);

  const handleRemoveClaim = (claimId: string) => {
    const claim = intro.claims.find((c) => c.id === claimId);
    claim?.text?.trim() ? setConfirmDelete({ type: 'claim', id: claimId }) : removeClaim(claimId);
  };

  return (
    <div className={`section section-intro ${sectionCollapsed ? 'section-collapsed' : ''}`}>
      <div className="section-grid" style={{ gridTemplateRows: `repeat(${rowCount}, auto)` }}>
        <SectionLabel rowSpan={rowCount} onClick={onToggleSection} collapsed={sectionCollapsed}>Intro</SectionLabel>

        <PurposeCell label="Hook">Grab the reader</PurposeCell>
        <OutlineCell
          value={intro.hook}
          onChange={(v) => updateIntro('hook', v)}
          placeholder="How will you hook the reader?"
          readOnly={readOnly}
          {...cp('intro-hook', 'intro')}
        />
        <ParagraphCell
          rowSpan={rowCount}
          value={intro.paragraph}
          onChange={(v) => updateIntro('paragraph', v)}
          placeholder="Write your introduction paragraph here, weaving together your hook, background, thesis, and claims..."
          readOnly={readOnly}
          {...cp('intro-paragraph', 'intro')}
        />

        <PurposeCell label="Background">Provide context and background</PurposeCell>
        <OutlineCell
          value={intro.background}
          onChange={(v) => updateIntro('background', v)}
          placeholder="What context does the reader need?"
          readOnly={readOnly}
          {...cp('intro-background', 'intro')}
        />

        <PurposeCell label="Thesis">The new idea that is true</PurposeCell>
        <OutlineCell
          value={intro.thesis}
          onChange={(v) => updateIntro('thesis', v)}
          placeholder="What is the new idea you're arguing is true?"
          readOnly={readOnly}
          {...cp('intro-thesis', 'intro')}
        />

        {intro.claims.map((claim, i) => (
          <ClaimRow
            key={claim.id}
            claim={claim}
            index={i}
            thesis={intro.thesis}
            isOnly={intro.claims.length === 1}
            updateClaim={updateClaim}
            removeClaim={handleRemoveClaim}
            isLast={i === intro.claims.length - 1}
            addClaim={addClaim}
            readOnly={readOnly}
            commentProps={cp(claim.id, 'claim')}
          />
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete Claim?"
        message="This claim has content. Are you sure you want to delete it?"
        onConfirm={() => { if (confirmDelete) { removeClaim(confirmDelete.id); setConfirmDelete(null); } }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

interface ClaimRowProps {
  claim: Claim;
  index: number;
  thesis: string;
  isOnly: boolean;
  updateClaim: (claimId: string, text: string) => void;
  removeClaim: (claimId: string) => void;
  isLast: boolean;
  addClaim: () => void;
  readOnly?: boolean;
  commentProps?: CommentProps;
}

function ClaimRow({ claim, index, thesis, isOnly, updateClaim, removeClaim, isLast, addClaim, readOnly = false, commentProps }: ClaimRowProps) {
  const thesisText = thesis || '[thesis]';
  return (
    <>
      <PurposeCell label={`Claim ${index + 1}`} actions={!readOnly ? (
        <AddRemoveActions
          canRemove={!isOnly}
          canAdd={isLast}
          onRemove={() => removeClaim(claim.id)}
          onAdd={addClaim}
          removeTitle="Remove claim"
          addTitle="Add claim"
        />
      ) : null}>
        Because... (reason {index + 1} why <span className="ref">{thesisText}</span> is true)
      </PurposeCell>
      <OutlineCell
        value={claim.text}
        onChange={(v) => updateClaim(claim.id, v)}
        placeholderContent={<>Claim {index + 1}: Why is <span className="ref">{thesisText}</span> true?</>}
        readOnly={readOnly}
        {...commentProps}
      />
    </>
  );
}
