# UI Guidelines

## Iconography

- **Minimal and monochrome**: Icons use simple line drawings with `stroke="currentColor"`
- **No fill colors**: Icons should be outlined, not filled
- **Consistent sizing**: Use viewBox="0 0 24 24" with width/height of 16-20px depending on context
- **Stroke width**: Use strokeWidth="2" for consistency
- **Line caps/joins**: Use strokeLinecap="round" and strokeLinejoin="round" for softer appearance

Example icon pattern:
```tsx
<svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  {/* icon paths here */}
</svg>
```

## Color Usage

- Icons inherit text color via `currentColor`
- No colorful icons - rely on the surrounding text color
- Use CSS variables for any color values (e.g., `var(--color-text-light)`)

## Status Indicators

- **Save status**: Show relative timestamps (e.g., "Saved 5 min ago") rather than status words
- **Read-only indicator**: Use a small lock icon next to text, not a colored badge
- Avoid uppercase badges or pill-shaped status indicators for routine states

## Typography for Status Text

- Use 0.7rem font size for status/metadata text
- Use `var(--color-text-light)` or `var(--color-text-muted)` for secondary text
