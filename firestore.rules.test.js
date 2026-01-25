/**
 * Firestore Security Rules Tests
 *
 * Run with: firebase emulators:exec --only firestore "npm run test:rules"
 *
 * These tests verify that security rules correctly:
 * 1. Restrict essay access to owners, collaborators, editors, and public viewers
 * 2. Prevent editors from modifying sharing settings
 * 3. Validate comment author matches authenticated user
 * 4. Restrict users to only edit/delete their own comments
 * 5. Protect sharedWithMe, publicEssays, and essayIndex collections
 */

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { createServer } from 'net';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

let testEnv;

// Find a free port dynamically
async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

const OWNER_UID = 'owner123';
const OWNER_EMAIL = 'owner@example.com';
const COLLABORATOR_UID = 'collaborator456';
const COLLABORATOR_EMAIL = 'collaborator@example.com';
const EDITOR_UID = 'editor789';
const EDITOR_EMAIL = 'editor@example.com';
const RANDOM_UID = 'random999';
const RANDOM_EMAIL = 'random@example.com';
const ESSAY_ID = 'essay123';

// Helper to create authenticated context
function getAuthedDb(uid, email) {
  return testEnv.authenticatedContext(uid, { email }).firestore();
}

function getUnauthDb() {
  return testEnv.unauthenticatedContext().firestore();
}

// Helper to get essay doc ref
function essayRef(db, userId = OWNER_UID, essayId = ESSAY_ID) {
  return doc(db, 'users', userId, 'essays', essayId);
}

// Helper to get comment doc ref
function commentRef(db, commentId, userId = OWNER_UID, essayId = ESSAY_ID) {
  return doc(db, 'users', userId, 'essays', essayId, 'comments', commentId);
}

describe('Firestore Security Rules', () => {
  let firestorePort;

  beforeAll(async () => {
    // Get a free port for the Firestore emulator
    firestorePort = await getFreePort();

    testEnv = await initializeTestEnvironment({
      projectId: 'essay-helper-test-' + Date.now(),
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: firestorePort,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('Essay Access', () => {
    beforeEach(async () => {
      // Set up test essay with sharing config
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(essayRef(db), {
          title: 'Test Essay',
          data: { intro: {}, bodyParagraphs: [], conclusion: {} },
          sharing: {
            isPublic: false,
            publicToken: null,
            collaboratorEmails: [COLLABORATOR_EMAIL, EDITOR_EMAIL],
            editorEmails: [EDITOR_EMAIL],
          },
        });
      });
    });

    it('allows owner to read their essay', async () => {
      const db = getAuthedDb(OWNER_UID, OWNER_EMAIL);
      await assertSucceeds(getDoc(essayRef(db)));
    });

    it('allows owner to write their essay', async () => {
      const db = getAuthedDb(OWNER_UID, OWNER_EMAIL);
      await assertSucceeds(updateDoc(essayRef(db), { title: 'Updated' }));
    });

    it('allows collaborator to read essay', async () => {
      const db = getAuthedDb(COLLABORATOR_UID, COLLABORATOR_EMAIL);
      await assertSucceeds(getDoc(essayRef(db)));
    });

    it('denies collaborator from writing essay', async () => {
      const db = getAuthedDb(COLLABORATOR_UID, COLLABORATOR_EMAIL);
      await assertFails(updateDoc(essayRef(db), { title: 'Hacked' }));
    });

    it('allows editor to read essay', async () => {
      const db = getAuthedDb(EDITOR_UID, EDITOR_EMAIL);
      await assertSucceeds(getDoc(essayRef(db)));
    });

    it('allows editor to update essay data', async () => {
      const db = getAuthedDb(EDITOR_UID, EDITOR_EMAIL);
      await assertSucceeds(updateDoc(essayRef(db), { title: 'Editor Update' }));
    });

    it('denies editor from modifying sharing settings', async () => {
      const db = getAuthedDb(EDITOR_UID, EDITOR_EMAIL);
      await assertFails(updateDoc(essayRef(db), {
        sharing: { isPublic: true }
      }));
    });

    it('denies random user from reading private essay', async () => {
      const db = getAuthedDb(RANDOM_UID, RANDOM_EMAIL);
      await assertFails(getDoc(essayRef(db)));
    });

    it('denies unauthenticated user from reading private essay', async () => {
      const db = getUnauthDb();
      await assertFails(getDoc(essayRef(db)));
    });
  });

  describe('Public Essay Access', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(essayRef(db), {
          title: 'Public Essay',
          data: {},
          sharing: {
            isPublic: true,
            publicToken: 'abc123',
            publicPermission: 'editor',
            collaboratorEmails: [],
            editorEmails: [],
          },
        });
      });
    });

    it('allows anyone to read public essay', async () => {
      const db = getUnauthDb();
      await assertSucceeds(getDoc(essayRef(db)));
    });

    it('allows authenticated public editor to update essay', async () => {
      const db = getAuthedDb(RANDOM_UID, RANDOM_EMAIL);
      await assertSucceeds(updateDoc(essayRef(db), { title: 'Public Update' }));
    });

    it('denies public editor from modifying sharing settings', async () => {
      const db = getAuthedDb(RANDOM_UID, RANDOM_EMAIL);
      await assertFails(updateDoc(essayRef(db), {
        sharing: { isPublic: false }
      }));
    });
  });

  describe('Comment Permissions', () => {
    const COMMENT_ID = 'comment123';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        // Create essay with editor
        await setDoc(essayRef(db), {
          title: 'Test Essay',
          data: {},
          sharing: {
            isPublic: false,
            collaboratorEmails: [EDITOR_EMAIL],
            editorEmails: [EDITOR_EMAIL],
          },
        });
        // Create a comment by the editor
        await setDoc(commentRef(db, COMMENT_ID), {
          blockId: 'block1',
          blockType: 'intro',
          authorUid: EDITOR_UID,
          authorEmail: EDITOR_EMAIL,
          text: 'Editor comment',
        });
      });
    });

    it('allows owner to read comments', async () => {
      const db = getAuthedDb(OWNER_UID, OWNER_EMAIL);
      await assertSucceeds(getDoc(commentRef(db, COMMENT_ID)));
    });

    it('allows owner to create comment with valid author', async () => {
      const db = getAuthedDb(OWNER_UID, OWNER_EMAIL);
      await assertSucceeds(setDoc(commentRef(db, 'new-comment'), {
        blockId: 'block1',
        blockType: 'intro',
        authorUid: OWNER_UID,
        authorEmail: OWNER_EMAIL,
        text: 'Owner comment',
      }));
    });

    it('denies owner from creating comment with spoofed author', async () => {
      const db = getAuthedDb(OWNER_UID, OWNER_EMAIL);
      await assertFails(setDoc(commentRef(db, 'spoofed-comment'), {
        blockId: 'block1',
        blockType: 'intro',
        authorUid: EDITOR_UID, // Spoofed!
        authorEmail: EDITOR_EMAIL,
        text: 'Spoofed comment',
      }));
    });

    it('allows owner to delete any comment', async () => {
      const db = getAuthedDb(OWNER_UID, OWNER_EMAIL);
      await assertSucceeds(deleteDoc(commentRef(db, COMMENT_ID)));
    });

    it('allows editor to read comments', async () => {
      const db = getAuthedDb(EDITOR_UID, EDITOR_EMAIL);
      await assertSucceeds(getDoc(commentRef(db, COMMENT_ID)));
    });

    it('allows editor to create comment with valid author', async () => {
      const db = getAuthedDb(EDITOR_UID, EDITOR_EMAIL);
      await assertSucceeds(setDoc(commentRef(db, 'editor-new'), {
        blockId: 'block1',
        blockType: 'intro',
        authorUid: EDITOR_UID,
        authorEmail: EDITOR_EMAIL,
        text: 'New editor comment',
      }));
    });

    it('denies editor from creating comment with spoofed author', async () => {
      const db = getAuthedDb(EDITOR_UID, EDITOR_EMAIL);
      await assertFails(setDoc(commentRef(db, 'spoofed'), {
        blockId: 'block1',
        blockType: 'intro',
        authorUid: OWNER_UID, // Spoofed!
        authorEmail: OWNER_EMAIL,
        text: 'Spoofed',
      }));
    });

    it('allows editor to delete their own comment', async () => {
      const db = getAuthedDb(EDITOR_UID, EDITOR_EMAIL);
      await assertSucceeds(deleteDoc(commentRef(db, COMMENT_ID)));
    });

    it('denies editor from deleting another user\'s comment', async () => {
      // First create owner's comment
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(commentRef(db, 'owner-comment'), {
          blockId: 'block1',
          blockType: 'intro',
          authorUid: OWNER_UID,
          authorEmail: OWNER_EMAIL,
          text: 'Owner comment',
        });
      });

      const db = getAuthedDb(EDITOR_UID, EDITOR_EMAIL);
      await assertFails(deleteDoc(commentRef(db, 'owner-comment')));
    });
  });

  describe('sharedWithMe Collection', () => {
    it('allows user to read their own shared items', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'sharedWithMe', COLLABORATOR_EMAIL, 'essays', 'doc1'), {
          essayId: ESSAY_ID,
          ownerUid: OWNER_UID,
        });
      });

      const db = getAuthedDb(COLLABORATOR_UID, COLLABORATOR_EMAIL);
      await assertSucceeds(getDoc(doc(db, 'sharedWithMe', COLLABORATOR_EMAIL, 'essays', 'doc1')));
    });

    it('denies user from reading another user\'s shared items', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'sharedWithMe', COLLABORATOR_EMAIL, 'essays', 'doc1'), {
          essayId: ESSAY_ID,
          ownerUid: OWNER_UID,
        });
      });

      const db = getAuthedDb(RANDOM_UID, RANDOM_EMAIL);
      await assertFails(getDoc(doc(db, 'sharedWithMe', COLLABORATOR_EMAIL, 'essays', 'doc1')));
    });
  });

  describe('publicEssays Collection', () => {
    it('allows anyone to read public essay lookup', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'publicEssays', 'token123'), {
          essayId: ESSAY_ID,
          ownerUid: OWNER_UID,
        });
      });

      const db = getUnauthDb();
      await assertSucceeds(getDoc(doc(db, 'publicEssays', 'token123')));
    });

    it('allows authenticated user to create public essay entry', async () => {
      const db = getAuthedDb(OWNER_UID, OWNER_EMAIL);
      await assertSucceeds(setDoc(doc(db, 'publicEssays', 'new-token'), {
        essayId: ESSAY_ID,
        ownerUid: OWNER_UID,
      }));
    });

    it('allows owner to delete their public essay entry', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'publicEssays', 'token123'), {
          essayId: ESSAY_ID,
          ownerUid: OWNER_UID,
        });
      });

      const db = getAuthedDb(OWNER_UID, OWNER_EMAIL);
      await assertSucceeds(deleteDoc(doc(db, 'publicEssays', 'token123')));
    });

    it('denies non-owner from deleting public essay entry', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'publicEssays', 'token123'), {
          essayId: ESSAY_ID,
          ownerUid: OWNER_UID,
        });
      });

      const db = getAuthedDb(RANDOM_UID, RANDOM_EMAIL);
      await assertFails(deleteDoc(doc(db, 'publicEssays', 'token123')));
    });
  });

  describe('essayIndex Collection', () => {
    it('allows anyone to read essay index', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'essayIndex', ESSAY_ID), {
          ownerUid: OWNER_UID,
        });
      });

      const db = getUnauthDb();
      await assertSucceeds(getDoc(doc(db, 'essayIndex', ESSAY_ID)));
    });

    it('allows user to create index entry for themselves', async () => {
      const db = getAuthedDb(OWNER_UID, OWNER_EMAIL);
      await assertSucceeds(setDoc(doc(db, 'essayIndex', 'new-essay'), {
        ownerUid: OWNER_UID,
      }));
    });

    it('denies user from creating index entry for another user', async () => {
      const db = getAuthedDb(RANDOM_UID, RANDOM_EMAIL);
      await assertFails(setDoc(doc(db, 'essayIndex', 'hijacked'), {
        ownerUid: OWNER_UID, // Trying to point to owner's data
      }));
    });

    it('allows owner to delete their index entry', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'essayIndex', ESSAY_ID), {
          ownerUid: OWNER_UID,
        });
      });

      const db = getAuthedDb(OWNER_UID, OWNER_EMAIL);
      await assertSucceeds(deleteDoc(doc(db, 'essayIndex', ESSAY_ID)));
    });

    it('denies non-owner from deleting index entry', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'essayIndex', ESSAY_ID), {
          ownerUid: OWNER_UID,
        });
      });

      const db = getAuthedDb(RANDOM_UID, RANDOM_EMAIL);
      await assertFails(deleteDoc(doc(db, 'essayIndex', ESSAY_ID)));
    });
  });
});
