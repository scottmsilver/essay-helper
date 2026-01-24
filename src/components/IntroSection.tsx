import { useState } from 'react';
import { OutlineCell, ParagraphCell, PurposeCell, SectionLabel } from './Cells';
import { AddRemoveActions } from './AddRemoveActions';
import { ConfirmDialog } from './ConfirmDialog';
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
}

export function IntroSection({
  intro,
  updateIntro,
  addClaim,
  updateClaim,
  removeClaim,
  sectionCollapsed,
  onToggleSection,
  readOnly = false,
}: IntroSectionProps) {
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string } | null>(null);
  const rowCount = 3 + intro.claims.length;

  const handleRemoveClaim = (claimId: string) => {
    const claim = intro.claims.find((c) => c.id === claimId);
    if (claim?.text?.trim()) {
      setConfirmDelete({ type: 'claim', id: claimId });
    } else {
      removeClaim(claimId);
    }
  };

  const handleConfirmDelete = () => {
    if (confirmDelete) {
      removeClaim(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  return (
    <div className={`section section-intro ${sectionCollapsed ? 'section-collapsed' : ''}`}>
      <div className="section-grid" style={{ gridTemplateRows: `repeat(${rowCount}, auto)` }}>
        <SectionLabel rowSpan={rowCount} onClick={onToggleSection} collapsed={sectionCollapsed}>
          Intro
        </SectionLabel>
        <PurposeCell label="Hook">Grab the reader</PurposeCell>
        <OutlineCell
          value={intro.hook}
          onChange={(value) => updateIntro('hook', value)}
          placeholder="How will you hook the reader?"
          readOnly={readOnly}
        />
        <ParagraphCell
          rowSpan={rowCount}
          value={intro.paragraph}
          onChange={(value) => updateIntro('paragraph', value)}
          placeholder="Write your introduction paragraph here, weaving together your hook, background, thesis, and claims..."
          readOnly={readOnly}
        />

        <PurposeCell label="Background">Provide context and background</PurposeCell>
        <OutlineCell
          value={intro.background}
          onChange={(value) => updateIntro('background', value)}
          placeholder="What context does the reader need?"
          readOnly={readOnly}
        />

        <PurposeCell label="Thesis">The new idea that is true</PurposeCell>
        <OutlineCell
          value={intro.thesis}
          onChange={(value) => updateIntro('thesis', value)}
          placeholder="What is the new idea you're arguing is true?"
          readOnly={readOnly}
        />

        {intro.claims.map((claim, index) => (
          <ClaimRow
            key={claim.id}
            claim={claim}
            index={index}
            thesis={intro.thesis}
            isOnly={intro.claims.length === 1}
            updateClaim={updateClaim}
            removeClaim={handleRemoveClaim}
            isLast={index === intro.claims.length - 1}
            addClaim={addClaim}
            readOnly={readOnly}
          />
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete Claim?"
        message="This claim has content. Are you sure you want to delete it?"
        onConfirm={handleConfirmDelete}
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
}

function ClaimRow({
  claim,
  index,
  thesis,
  isOnly,
  updateClaim,
  removeClaim,
  isLast,
  addClaim,
  readOnly = false,
}: ClaimRowProps) {
  const actions = !readOnly ? (
    <AddRemoveActions
      canRemove={!isOnly}
      canAdd={isLast}
      onRemove={() => removeClaim(claim.id)}
      onAdd={addClaim}
      removeTitle="Remove claim"
      addTitle="Add claim"
    />
  ) : null;

  const thesisText = thesis || '[thesis]';
  return (
    <>
      <PurposeCell label={`Claim ${index + 1}`} actions={actions}>
        Because... (reason {index + 1} why <span className="ref">{thesisText}</span> is true)
      </PurposeCell>
      <OutlineCell
        value={claim.text}
        onChange={(value) => updateClaim(claim.id, value)}
        placeholderContent={
          <>
            Claim {index + 1}: Why is <span className="ref">{thesisText}</span> true?
          </>
        }
        readOnly={readOnly}
      />
    </>
  );
}
