import { OutlineCell, ParagraphCell, PurposeCell, SectionLabel } from './Cells';
import { makeCommentProps, type CommentHelpers } from './Comments';
import type { Conclusion, Claim } from '../models/essay';

interface ConclusionSectionProps {
  conclusion: Conclusion;
  thesis: string;
  claims: Claim[];
  updateConclusion: (field: keyof Conclusion, value: string) => void;
  sectionCollapsed: boolean;
  onToggleSection: () => void;
  readOnly?: boolean;
  commentHelpers?: CommentHelpers;
}

export function ConclusionSection({
  conclusion, thesis, claims, updateConclusion,
  sectionCollapsed, onToggleSection, readOnly = false, commentHelpers,
}: ConclusionSectionProps) {
  const cp = (blockId: string) => makeCommentProps(commentHelpers, blockId, 'conclusion');
  const thesisText = thesis || '[Thesis]';
  const claimTexts = claims.map((c, i) => c.text || `[Claim ${i + 1}]`);
  const ClaimRefs = () => <>{claimTexts.map((ct, i) => <span key={i} className="ref">{ct}{i < claimTexts.length - 1 ? ', ' : ''}</span>)}</>;

  return (
    <div className={`section section-conclusion ${sectionCollapsed ? 'section-collapsed' : ''}`}>
      <div className="section-grid" style={{ gridTemplateRows: 'repeat(2, auto)' }}>
        <SectionLabel rowSpan={2} onClick={onToggleSection} collapsed={sectionCollapsed}>Conclusion</SectionLabel>

        <PurposeCell label="Restatement">
          <span className="ref">{thesisText}</span> because <ClaimRefs />
        </PurposeCell>
        <OutlineCell
          value={conclusion.restatement || ''}
          onChange={(v) => updateConclusion('restatement', v)}
          placeholderContent={<>How will you restate <span className="ref">{thesisText}</span> and your claims (<ClaimRefs />) in your own words?</>}
          readOnly={readOnly}
          {...cp('conclusion-restatement')}
        />
        <ParagraphCell
          rowSpan={2}
          value={conclusion.paragraph}
          onChange={(v) => updateConclusion('paragraph', v)}
          placeholder={`Write your conclusion restating "${thesis || '[thesis]'}" and explaining why it matters...`}
          readOnly={readOnly}
          {...cp('conclusion-paragraph')}
        />

        <PurposeCell label="So What">
          Future implications of <span className="ref">{thesisText}</span> being true
        </PurposeCell>
        <OutlineCell
          value={conclusion.soWhat}
          onChange={(v) => updateConclusion('soWhat', v)}
          placeholderContent={<>What are the future implications of <span className="ref">{thesisText}</span> being true?</>}
          readOnly={readOnly}
          {...cp('conclusion-soWhat')}
        />
      </div>
    </div>
  );
}
