import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

function getUserEssaysCollection(userId) {
  return collection(db, 'users', userId, 'essays');
}

function getEssayDocRef(userId, essayId) {
  return doc(db, 'users', userId, 'essays', essayId);
}

export async function listEssays(userId) {
  const essaysRef = getUserEssaysCollection(userId);
  const snapshot = await getDocs(essaysRef);

  const essays = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Sort client-side by updatedAt descending (faster for small collections)
  return essays.sort((a, b) => {
    const aTime = a.updatedAt?.toMillis?.() || a.updatedAt?.getTime?.() || 0;
    const bTime = b.updatedAt?.toMillis?.() || b.updatedAt?.getTime?.() || 0;
    return bTime - aTime;
  });
}

export async function getEssay(userId, essayId) {
  const docRef = getEssayDocRef(userId, essayId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function saveEssay(userId, essayId, essayData, title = 'Untitled Essay') {
  const docRef = getEssayDocRef(userId, essayId);

  // Add timeout to prevent hanging forever on quota exceeded
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Save timeout after 10 seconds')), 10000);
  });

  const savePromise = setDoc(docRef, {
    title,
    data: essayData,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });

  await Promise.race([savePromise, timeoutPromise]);

  // Update essay index for unified lookup
  const indexRef = doc(db, 'essayIndex', essayId);
  await setDoc(indexRef, { ownerUid: userId }, { merge: true });

  return essayId;
}

export async function deleteEssay(userId, essayId) {
  const docRef = getEssayDocRef(userId, essayId);
  await deleteDoc(docRef);

  // Clean up essay index
  const indexRef = doc(db, 'essayIndex', essayId);
  await deleteDoc(indexRef);
}

export async function updateEssayTitle(userId, essayId, title) {
  const docRef = getEssayDocRef(userId, essayId);
  await setDoc(docRef, {
    title,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// Generate a short random token for public links
function generatePublicToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Get sharing info for an essay
export async function getEssaySharingInfo(ownerUid, essayId) {
  const docRef = getEssayDocRef(ownerUid, essayId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return data.sharing || {
    isPublic: false,
    publicToken: null,
    collaborators: [],
  };
}

// Share essay with a user by email
export async function shareEssay(ownerUid, essayId, email, permission, ownerEmail, ownerDisplayName, essayTitle) {
  const essayDocRef = getEssayDocRef(ownerUid, essayId);

  // Add collaborator to the essay's sharing.collaborators array
  const collaborator = {
    email,
    permission,
    addedAt: new Date(),
  };

  // Get current essay to check if sharing field exists
  const essaySnap = await getDoc(essayDocRef);
  const essayData = essaySnap.data();

  // Build email lists for security rules
  const currentCollaborators = essayData.sharing?.collaborators || [];
  const filtered = currentCollaborators.filter(c => c.email !== email);
  const newCollaborators = [...filtered, collaborator];

  // Build email arrays for rules checking
  const collaboratorEmails = newCollaborators.map(c => c.email);
  const editorEmails = newCollaborators.filter(c => c.permission === 'editor').map(c => c.email);

  if (!essayData.sharing) {
    // Initialize sharing field
    await updateDoc(essayDocRef, {
      sharing: {
        isPublic: false,
        publicToken: null,
        collaborators: newCollaborators,
        collaboratorEmails,
        editorEmails,
      },
    });
  } else {
    await updateDoc(essayDocRef, {
      'sharing.collaborators': newCollaborators,
      'sharing.collaboratorEmails': collaboratorEmails,
      'sharing.editorEmails': editorEmails,
    });
  }

  // Create shared reference for the recipient
  const sharedDocRef = doc(db, 'sharedWithMe', email, 'essays', `${ownerUid}_${essayId}`);
  await setDoc(sharedDocRef, {
    essayId,
    ownerUid,
    ownerEmail,
    ownerDisplayName,
    title: essayTitle,
    permission,
    sharedAt: serverTimestamp(),
  });
}

// Remove share from a user
export async function unshareEssay(ownerUid, essayId, email) {
  const essayDocRef = getEssayDocRef(ownerUid, essayId);

  // Get current collaborators
  const essaySnap = await getDoc(essayDocRef);
  const essayData = essaySnap.data();

  if (essayData.sharing && essayData.sharing.collaborators) {
    const filtered = essayData.sharing.collaborators.filter(c => c.email !== email);
    // Rebuild email arrays
    const collaboratorEmails = filtered.map(c => c.email);
    const editorEmails = filtered.filter(c => c.permission === 'editor').map(c => c.email);

    await updateDoc(essayDocRef, {
      'sharing.collaborators': filtered,
      'sharing.collaboratorEmails': collaboratorEmails,
      'sharing.editorEmails': editorEmails,
    });
  }

  // Remove shared reference
  const sharedDocRef = doc(db, 'sharedWithMe', email, 'essays', `${ownerUid}_${essayId}`);
  await deleteDoc(sharedDocRef);
}

// Toggle public sharing
export async function setPublicSharing(ownerUid, essayId, isPublic) {
  const essayDocRef = getEssayDocRef(ownerUid, essayId);

  // Get current essay
  const essaySnap = await getDoc(essayDocRef);
  const essayData = essaySnap.data();
  const currentSharing = essayData.sharing || { collaborators: [] };

  if (isPublic) {
    // Generate new token if enabling
    const publicToken = generatePublicToken();

    await updateDoc(essayDocRef, {
      'sharing.isPublic': true,
      'sharing.publicToken': publicToken,
    });

    // Create public essay lookup entry
    const publicDocRef = doc(db, 'publicEssays', publicToken);
    await setDoc(publicDocRef, {
      essayId,
      ownerUid,
      createdAt: serverTimestamp(),
    });

    return publicToken;
  } else {
    // Remove public access
    const oldToken = currentSharing.publicToken;

    await updateDoc(essayDocRef, {
      'sharing.isPublic': false,
      'sharing.publicToken': null,
    });

    // Remove public essay lookup entry if it existed
    if (oldToken) {
      const publicDocRef = doc(db, 'publicEssays', oldToken);
      await deleteDoc(publicDocRef);
    }

    return null;
  }
}

// List essays shared with a user
export async function listSharedWithMe(userEmail) {
  // Normalize email to lowercase for consistent paths
  const normalizedEmail = userEmail.toLowerCase();
  const sharedRef = collection(db, 'sharedWithMe', normalizedEmail, 'essays');
  const snapshot = await getDocs(sharedRef);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Get public essay by token (kept for backward compatibility)
export async function getPublicEssay(token) {
  // First lookup the token to get essay location
  const publicDocRef = doc(db, 'publicEssays', token);
  const publicSnap = await getDoc(publicDocRef);

  if (!publicSnap.exists()) {
    return null;
  }

  const { essayId, ownerUid } = publicSnap.data();

  // Fetch the actual essay
  const essayDocRef = getEssayDocRef(ownerUid, essayId);
  const essaySnap = await getDoc(essayDocRef);

  if (!essaySnap.exists()) {
    return null;
  }

  const essayData = essaySnap.data();

  // Verify it's still public
  if (!essayData.sharing?.isPublic) {
    return null;
  }

  return {
    id: essayId,
    ownerUid,
    ...essayData,
  };
}

// Get a shared essay (for viewing/editing)
export async function getSharedEssay(ownerUid, essayId) {
  const docRef = getEssayDocRef(ownerUid, essayId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ownerUid,
    ...snapshot.data(),
  };
}

// Save all sharing settings at once (batch save)
export async function saveSharingSettings(ownerUid, essayId, newCollaborators, isPublic, publicPermission, ownerEmail, ownerDisplayName, essayTitle) {
  const essayDocRef = getEssayDocRef(ownerUid, essayId);

  // Get current sharing info to compare
  const essaySnap = await getDoc(essayDocRef);
  const essayData = essaySnap.exists() ? essaySnap.data() : {};
  const currentSharing = essayData.sharing || { collaborators: [], isPublic: false, publicToken: null };
  const currentCollaborators = currentSharing.collaborators || [];

  // Build email arrays for rules checking
  const collaboratorEmails = newCollaborators.map(c => c.email);
  const editorEmails = newCollaborators.filter(c => c.permission === 'editor').map(c => c.email);

  // Handle public token
  let publicToken = currentSharing.publicToken;
  if (isPublic && !publicToken) {
    // Generate new token
    publicToken = generatePublicToken();
    // Create public essay lookup entry
    const publicDocRef = doc(db, 'publicEssays', publicToken);
    await setDoc(publicDocRef, {
      essayId,
      ownerUid,
      createdAt: serverTimestamp(),
    });
  } else if (!isPublic && publicToken) {
    // Remove public essay lookup entry
    const publicDocRef = doc(db, 'publicEssays', publicToken);
    await deleteDoc(publicDocRef);
    publicToken = null;
  }

  // Update the essay's sharing field (use setDoc with merge to handle case where doc doesn't exist yet)
  await setDoc(essayDocRef, {
    sharing: {
      isPublic,
      publicToken,
      publicPermission: isPublic ? publicPermission : null,
      collaborators: newCollaborators,
      collaboratorEmails,
      editorEmails,
    },
  }, { merge: true });

  // Handle sharedWithMe collection updates
  // Find removed collaborators
  const currentEmails = currentCollaborators.map(c => c.email);
  const newEmails = newCollaborators.map(c => c.email);

  const removedEmails = currentEmails.filter(e => !newEmails.includes(e));
  const addedOrUpdated = newCollaborators.filter(c => {
    const existing = currentCollaborators.find(ec => ec.email === c.email);
    return !existing || existing.permission !== c.permission;
  });

  // Remove sharedWithMe entries for removed collaborators
  for (const email of removedEmails) {
    const normalizedEmail = email.toLowerCase();
    const sharedDocRef = doc(db, 'sharedWithMe', normalizedEmail, 'essays', `${ownerUid}_${essayId}`);
    await deleteDoc(sharedDocRef);
  }

  // Add/update sharedWithMe entries for new/updated collaborators
  for (const collab of addedOrUpdated) {
    const normalizedEmail = collab.email.toLowerCase();
    const sharedDocRef = doc(db, 'sharedWithMe', normalizedEmail, 'essays', `${ownerUid}_${essayId}`);
    await setDoc(sharedDocRef, {
      essayId,
      ownerUid,
      ownerEmail,
      ownerDisplayName,
      title: essayTitle,
      permission: collab.permission,
      sharedAt: serverTimestamp(),
    });
  }

  return publicToken;
}

// Save a shared essay (for editors only)
export async function saveSharedEssay(ownerUid, essayId, essayData, title) {
  const docRef = getEssayDocRef(ownerUid, essayId);

  await setDoc(docRef, {
    title,
    data: essayData,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return essayId;
}

// Save a public essay (for public editors)
export async function savePublicEssay(ownerUid, essayId, essayData, title) {
  const docRef = getEssayDocRef(ownerUid, essayId);

  await setDoc(docRef, {
    title,
    data: essayData,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return essayId;
}

// Create a share for an essay (simplified API for UI)
export async function createShare(ownerUid, essayId, email, permission, essayTitle, ownerEmail, ownerDisplayName) {
  const normalizedEmail = email.toLowerCase();
  const essayDocRef = getEssayDocRef(ownerUid, essayId);

  // Get current collaborators
  const essaySnap = await getDoc(essayDocRef);
  const essayData = essaySnap.exists() ? essaySnap.data() : {};
  const currentCollaborators = essayData.sharing?.collaborators || [];

  // Add or update collaborator
  const collaborator = {
    email: normalizedEmail,
    permission,
    addedAt: new Date(),
  };

  const filtered = currentCollaborators.filter(c => c.email.toLowerCase() !== normalizedEmail);
  const newCollaborators = [...filtered, collaborator];

  // Build email arrays for rules checking
  const collaboratorEmails = newCollaborators.map(c => c.email);
  const editorEmails = newCollaborators.filter(c => c.permission === 'editor').map(c => c.email);

  // Update essay document
  await setDoc(essayDocRef, {
    sharing: {
      ...essayData.sharing,
      collaborators: newCollaborators,
      collaboratorEmails,
      editorEmails,
    },
  }, { merge: true });

  // Create sharedWithMe reference for the recipient (triggers email notification)
  const sharedDocRef = doc(db, 'sharedWithMe', normalizedEmail, 'essays', `${ownerUid}_${essayId}`);
  await setDoc(sharedDocRef, {
    essayId,
    ownerUid,
    ownerEmail,
    ownerDisplayName,
    title: essayTitle,
    permission,
    sharedAt: serverTimestamp(),
  });

  // Also create in top-level shares collection for easier querying
  const shareDocRef = doc(db, 'shares', `${ownerUid}_${essayId}_${normalizedEmail}`);
  await setDoc(shareDocRef, {
    essayId,
    ownerUid,
    recipientEmail: normalizedEmail,
    permission,
    essayTitle,
    ownerEmail,
    ownerDisplayName,
    createdAt: serverTimestamp(),
  });

  return { email: normalizedEmail, permission };
}

// Get all shares for an essay
export async function getEssayShares(ownerUid, essayId) {
  const essayDocRef = getEssayDocRef(ownerUid, essayId);
  const essaySnap = await getDoc(essayDocRef);

  if (!essaySnap.exists()) {
    return [];
  }

  const essayData = essaySnap.data();
  const collaborators = essayData.sharing?.collaborators || [];

  return collaborators.map(c => ({
    email: c.email,
    permission: c.permission,
    addedAt: c.addedAt,
  }));
}

// Delete a share from an essay
export async function deleteShare(ownerUid, essayId, email) {
  const normalizedEmail = email.toLowerCase();
  const essayDocRef = getEssayDocRef(ownerUid, essayId);

  // Get current collaborators
  const essaySnap = await getDoc(essayDocRef);
  const essayData = essaySnap.exists() ? essaySnap.data() : {};

  if (essayData.sharing && essayData.sharing.collaborators) {
    const filtered = essayData.sharing.collaborators.filter(
      c => c.email.toLowerCase() !== normalizedEmail
    );
    const collaboratorEmails = filtered.map(c => c.email);
    const editorEmails = filtered.filter(c => c.permission === 'editor').map(c => c.email);

    await updateDoc(essayDocRef, {
      'sharing.collaborators': filtered,
      'sharing.collaboratorEmails': collaboratorEmails,
      'sharing.editorEmails': editorEmails,
    });
  }

  // Remove sharedWithMe reference
  const sharedDocRef = doc(db, 'sharedWithMe', normalizedEmail, 'essays', `${ownerUid}_${essayId}`);
  await deleteDoc(sharedDocRef);

  // Remove from top-level shares collection
  const shareDocRef = doc(db, 'shares', `${ownerUid}_${essayId}_${normalizedEmail}`);
  await deleteDoc(shareDocRef);
}

// Get essay with unified permission checking
// Returns: { essay, permission: 'owner' | 'editor' | 'viewer' | null, ownerUid }
export async function getEssayWithPermissions(essayId, currentUserUid, currentUserEmail) {
  // First, look up the owner from the essay index
  const indexRef = doc(db, 'essayIndex', essayId);
  const indexSnap = await getDoc(indexRef);

  if (!indexSnap.exists()) {
    return { essay: null, permission: null, ownerUid: null };
  }

  const { ownerUid } = indexSnap.data();

  // Load the essay
  const essayDocRef = getEssayDocRef(ownerUid, essayId);
  const essaySnap = await getDoc(essayDocRef);

  if (!essaySnap.exists()) {
    return { essay: null, permission: null, ownerUid: null };
  }

  const essayData = essaySnap.data();

  // Check permissions in order of priority
  // 1. Is this the owner?
  if (currentUserUid && currentUserUid === ownerUid) {
    return {
      essay: { id: essayId, ownerUid, ...essayData },
      permission: 'owner',
      ownerUid,
    };
  }

  // 2. Is this user a collaborator?
  if (currentUserEmail && essayData.sharing?.collaboratorEmails) {
    const normalizedEmail = currentUserEmail.toLowerCase();
    if (essayData.sharing.collaboratorEmails.map(e => e.toLowerCase()).includes(normalizedEmail)) {
      const isEditor = essayData.sharing.editorEmails?.map(e => e.toLowerCase()).includes(normalizedEmail);
      return {
        essay: { id: essayId, ownerUid, ...essayData },
        permission: isEditor ? 'editor' : 'viewer',
        ownerUid,
      };
    }
  }

  // 3. Is this essay public?
  if (essayData.sharing?.isPublic) {
    const publicPermission = essayData.sharing.publicPermission || 'viewer';
    return {
      essay: { id: essayId, ownerUid, ...essayData },
      permission: publicPermission,
      ownerUid,
    };
  }

  // No access
  return { essay: null, permission: null, ownerUid: null };
}
