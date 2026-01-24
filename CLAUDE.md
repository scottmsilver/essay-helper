# Essay Helper

A structured essay writing tool with real-time collaboration support.

## Guidelines

See [UI_GUIDELINES.md](./UI_GUIDELINES.md) for iconography and visual design standards.

## Tech Stack

- React + TypeScript
- Firebase (Auth, Firestore)
- Vite
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server with hot reload
npm run build        # Production build to dist/
npm run test         # Run Vitest tests once
npm run test:watch   # Run tests in watch mode
npm run lint         # ESLint check
npm run preview      # Preview production build locally
```

## Architecture

This is a React 19 + TypeScript essay writing app with Firebase backend (Auth + Firestore). The codebase follows a layered architecture with strict separation of concerns:

**Layer Structure:**
1. **Models** (`src/models/`) - Pure data types and immutable transformation functions. No React, no side effects.
2. **Storage** (`src/storage/interface.ts`) - Abstract `EssayStorage` interface defining the persistence contract.
3. **Firebase** (`src/firebase/`) - Firestore implementation of storage interface, plus auth.
4. **Hooks** (`src/hooks/`) - React hooks that orchestrate state + storage + model transformations.
5. **Components** (`src/components/`) - Presentational React components consuming hooks.

**Key Files:**
- `src/models/essay.ts` - Essay type definitions and pure transformation functions
- `src/models/document.ts` - Firestore persistence wrapper types
- `src/storage/interface.ts` - Abstract storage contract
- `src/firebase/firestore.ts` - Firestore CRUD + sharing logic
- `src/hooks/useEssay.ts` - Main essay state management
- `src/App.tsx` - Router and essay editor layout

**Routing:**
- `/` - Home page with essay list and sharing dashboard
- `/essay/:id` - Essay editor (handles owned and shared essays)

## TypeScript

Strict TypeScript is enforced:
- `allowJs: false` - No JavaScript files allowed in src/
- `strict: true` - All strict checks enabled
- `noUnusedLocals` and `noUnusedParameters` enabled

## Testing

Tests use Vitest with jsdom environment and React Testing Library. Test files live alongside source files (e.g., `Component.test.tsx`).

## Storage Layer

The Firebase storage layer normalizes all Firestore `Timestamp` values to JavaScript `Date` objects at the boundary. This keeps Firebase-specific types contained within `src/firebase/`. Change detection uses `serializeEssay()` from `src/utils/essayEquals.ts`.
