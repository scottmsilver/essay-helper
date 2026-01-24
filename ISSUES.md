# Storage Abstraction Issues

## Summary

Firebase implementation details are leaking outside the `firebase/` directory. The storage layer should fully contain Firestore-specific types and logic.

---

## Tasks

### 1. Normalize Timestamps in Storage Layer

**File:** `src/firebase/firestore.ts`

Convert all `Timestamp` fields to `Date` before returning from any function:
- `listEssays()` - convert `updatedAt`, `createdAt`
- `getEssay()` - convert `updatedAt`, `createdAt`
- `getSharedEssay()` - convert `updatedAt`, `createdAt`
- `getPublicEssay()` - convert `updatedAt`, `createdAt`
- `getEssayWithPermissions()` - convert `updatedAt`, `createdAt`
- `listSharedWithMe()` - convert `sharedAt`
- `getEssaySharingInfo()` - convert `addedAt` in collaborators

Add helper function like:
```typescript
function normalizeTimestamp(ts: Timestamp | Date | undefined): Date | undefined {
  if (!ts) return undefined;
  return ts instanceof Date ? ts : ts.toDate();
}
```

**Tests:** Verify all functions return `Date` objects, not `Timestamp`.

---

### 2. Update Document Types

**File:** `src/models/document.ts`

Change types to use `Date` only:
```typescript
// Before
updatedAt: Timestamp | Date;
createdAt?: Timestamp | Date;
addedAt: Date | Timestamp;
sharedAt: Timestamp;

// After
updatedAt: Date;
createdAt?: Date;
addedAt: Date;
sharedAt: Date;
```

Remove the `import type { Timestamp } from 'firebase/firestore';`

---

### 3. Remove Timestamp from useEssay Hook

**File:** `src/hooks/useEssay.ts`

- Remove `import { Timestamp } from 'firebase/firestore';`
- Remove conversion logic at lines ~153, ~381, ~419:
  ```typescript
  // Before
  const savedTime =
    (essayData.updatedAt as Timestamp)?.toDate?.() ||
    (essayData.updatedAt as Date) ||
    new Date();

  // After
  const savedTime = essayData.updatedAt ?? new Date();
  ```

---

### 4. Fix formatDate Utility

**File:** `src/utils/formatDate.ts`

- Remove `import type { Timestamp } from 'firebase/firestore';`
- Change type to not include Timestamp:
  ```typescript
  // Before
  type TimestampLike = Timestamp | Date | string | number | null | undefined;

  // After
  type DateLike = Date | string | number | null | undefined;
  ```
- Remove the `'toDate' in timestamp` check (no longer needed)

**Tests:** Update `src/utils/formatDate.test.js` to remove Firestore Timestamp test case.

---

### 5. Extract Change Detection Utility

**File:** Create `src/utils/essayEquals.ts`

The current approach uses `JSON.stringify` for dirty checking:
```typescript
lastSavedEssayRef.current = JSON.stringify(loadedData);
const hasChanges = currentEssayJson !== lastSavedEssayRef.current;
```

Create a proper utility:
```typescript
export function essayEquals(a: Essay, b: Essay): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Or for better performance:
export function hashEssay(essay: Essay): string {
  return JSON.stringify(essay);
}
```

**File:** Update `src/hooks/useEssay.ts` to use the utility.

**Tests:** Write tests for the utility.

---

### 6. (Optional) Fix Auth Leaks

**Files:** `src/contexts/AuthContext.tsx`, `src/App.tsx`

These import `User` from `firebase/auth`. Similar pattern - could create an app-level `User` type.

Lower priority since auth is simpler than storage.

---

## Verification

After all changes:
1. `npm run build` - compiles without errors
2. `npm test` - all tests pass
3. `grep -r "firebase/firestore" src/ --include="*.ts" --include="*.tsx"` - only matches in `src/firebase/`
