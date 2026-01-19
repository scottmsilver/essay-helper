import { OutlineCell, ParagraphCell, PurposeCell, SectionLabel } from './Cells';
import { AddRemoveActions } from './AddRemoveActions';

export function IntroSection({
  intro,
  updateIntro,
  addClaim,
  updateClaim,
  removeClaim,
  paragraphCollapsed,
  onExpandParagraph,
}) {
  const rowCount = 3 + intro.claims.length; // hook, background, thesis, + claims

  return (
    <div className="section section-intro">
      <div className="section-grid" style={{ gridTemplateRows: `repeat(${rowCount}, auto)` }}>
        {/* Row 1: Hook */}
        <SectionLabel rowSpan={rowCount}>Intro</SectionLabel>
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
          collapsed={paragraphCollapsed}
          onExpand={onExpandParagraph}
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
            removeClaim={removeClaim}
            isLast={index === intro.claims.length - 1}
            addClaim={addClaim}
          />
        ))}
      </div>
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

  return (
    <>
      <PurposeCell label={`Claim ${index + 1}`} actions={actions}>
        Because... (reason {index + 1} why <em>{thesis || '[thesis]'}</em> is true)
      </PurposeCell>
      <OutlineCell
        value={claim.text}
        onChange={(value) => updateClaim(claim.id, value)}
        placeholder={`Claim ${index + 1}: Why is "${thesis || '[thesis]'}" true?`}
      />
    </>
  );
}
