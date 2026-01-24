# Storage Abstraction Issues

## 1. Timestamp Leak

**Location:** `src/hooks/useEssay.ts`

The hook imports `Timestamp` from `firebase/firestore` and contains Firestore-specific conversion logic:

```typescript
import { Timestamp } from 'firebase/firestore';
// ...
const savedTime =
  (essayData.updatedAt as Timestamp)?.toDate?.() ||
  (essayData.updatedAt as Date) ||
  new Date();
```

**Problem:** The hook layer knows about Firestore's internal `Timestamp` type. The storage abstraction is leaking.

**Fix:**
- Storage layer should normalize `Timestamp` to `Date` before returning
- `EssayDocument.updatedAt` should be typed as just `Date` (external contract)
- Remove `firebase/firestore` import from hooks

## 2. JSON.stringify for Change Detection

**Location:** `src/hooks/useEssay.ts`

```typescript
lastSavedEssayRef.current = JSON.stringify(loadedData);
// ...
const currentEssayJson = JSON.stringify(currentEssay);
const hasChanges = currentEssayJson !== lastSavedEssayRef.current;
```

**Problems:**
- Breaks if `Timestamp` objects leak into essay data (they serialize incorrectly)
- Fragile - JSON.stringify key ordering not guaranteed in all edge cases
- Performance - serializes entire essay on every change check

**Fix:**
- Extract to utility function (e.g., `essayEquals(a, b)` or `hashEssay(essay)`)
- Or use version number incremented on save
- Ensure data is always JSON-safe (no Timestamps in Essay type)
