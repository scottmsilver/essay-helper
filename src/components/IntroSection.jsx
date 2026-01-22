import { useState } from 'react';
import { OutlineCell, ParagraphCell, PurposeCell, SectionLabel } from './Cells';
import { AddRemoveActions } from './AddRemoveActions';
import { ConfirmDialog } from './ConfirmDialog';

export function IntroSection({
  intro,
  updateIntro,
  addClaim,
  updateClaim,
  removeClaim,
  sectionCollapsed,
  onToggleSection,
}) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const rowCount = 3 + intro.claims.length; // hook, background, thesis, + claims

  const handleRemoveClaim = (claimId) => {
    const claim = intro.claims.find(c => c.id === claimId);
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
        {/* Row 1: Hook */}
        <SectionLabel rowSpan={rowCount} onClick={onToggleSection} collapsed={sectionCollapsed}>Intro</SectionLabel>
        <PurposeCell label="Hook">Grab the reader</PurposeCell>
        <OutlineCell
          value={intro.hook}
          onChange={(value) => updateIntro('hook', value)}
          placeholder="How will you hook the reader?"
        />
        <ParagraphCell
          rowSpan={rowCount}
          value={intro.paragraph}
          onChange={(value) => updateIntro('paragraph', value)}
          placeholder="Write your introduction paragraph here, weaving together your hook, background, thesis, and claims..."
        />

        {/* Row 2: Background */}
        <PurposeCell label="Background">Provide context and background</PurposeCell>
        <OutlineCell
          value={intro.background}
          onChange={(value) => updateIntro('background', value)}
          placeholder="What context does the reader need?"
        />

        {/* Row 3: Thesis */}
        <PurposeCell label="Thesis">The new idea that is true</PurposeCell>
        <OutlineCell
          value={intro.thesis}
          onChange={(value) => updateIntro('thesis', value)}
          placeholder="What is the new idea you're arguing is true?"
        />

        {/* Claims rows */}
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

function ClaimRow({ claim, index, thesis, isOnly, updateClaim, removeClaim, isLast, addClaim }) {
  const actions = (
    <AddRemoveActions
      canRemove={!isOnly}
      canAdd={isLast}
      onRemove={() => removeClaim(claim.id)}
      onAdd={addClaim}
      removeTitle="Remove claim"
      addTitle="Add claim"
    />
  );

  const thesisText = thesis || '[thesis]';
  return (
    <>
      <PurposeCell label={`Claim ${index + 1}`} actions={actions}>
        Because... (reason {index + 1} why <span className="ref">{thesisText}</span> is true)
      </PurposeCell>
      <OutlineCell
        value={claim.text}
        onChange={(value) => updateClaim(claim.id, value)}
        placeholderContent={<>Claim {index + 1}: Why is <span className="ref">{thesisText}</span> true?</>}
      />
    </>
  );
}
