import { OutlineCell, ParagraphCell, PurposeCell, SectionLabel } from './Cells';

export function IntroSection({
  intro,
  updateIntro,
  addClaim,
  updateClaim,
  removeClaim,
}) {
  const rowCount = 3 + intro.claims.length; // hook, background, thesis, + claims

  return (
    <div className="section section-intro">
      <div className="section-grid" style={{ gridTemplateRows: `repeat(${rowCount}, auto)` }}>
        {/* Row 1: Hook */}
        <SectionLabel rowSpan={rowCount}>Intro</SectionLabel>
        <div className="component-label">Hook</div>
        <PurposeCell>Grab the Reader</PurposeCell>
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
        <div className="component-label">Background</div>
        <PurposeCell>Provide context and background</PurposeCell>
        <OutlineCell
          value={intro.background}
          onChange={(value) => updateIntro('background', value)}
          placeholder="What context does the reader need?"
        />

        {/* Row 3: Thesis */}
        <div className="component-label">Thesis</div>
        <PurposeCell>The new idea that is true</PurposeCell>
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
  return (
    <>
      <div className="component-label">
        Claim {index + 1}
        <div className="claim-actions">
          {!isOnly && (
            <button
              className="btn-remove"
              onClick={() => removeClaim(claim.id)}
              title="Remove claim"
            >
              -
            </button>
          )}
          {isLast && (
            <button
              className="btn-add"
              onClick={addClaim}
              title="Add claim"
            >
              +
            </button>
          )}
        </div>
      </div>
      <PurposeCell>
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
