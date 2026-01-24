import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  CollectionReference,
  DocumentReference,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Essay } from '../models/essay';

// =============================================================================
// Types
// =============================================================================

export interface Collaborator {
  email: string;
  permission: 'viewer' | 'editor';
  addedAt: Date | Timestamp;
}

export interface SharingInfo {
  isPublic: boolean;
  publicToken: string | null;
  publicPermission?: 'viewer' | 'editor' | null;
  collaborators: Collaborator[];
  collaboratorEmails?: string[];
  editorEmails?: string[];
}

export interface EssayDocument {
  id: string;
  title: string;
  data: Essay;
  updatedAt: Timestamp | Date;
  createdAt?: Timestamp | Date;
  sharing?: SharingInfo;
  ownerUid?: string;
}

export interface SharedEssayRef {
  id: string;
  essayId: string;
  ownerUid: string;
  ownerEmail: string;
  ownerDisplayName: string;
  title: string;
  permission: 'viewer' | 'editor';
  sharedAt: Timestamp;
}

export type Permission = 'owner' | 'editor' | 'viewer';

export interface EssayWithPermissions {
  essay: EssayDocument | null;
  permission: Permission | null;
  ownerUid: string | null;
}

// =============================================================================
// Internal Helpers
// =============================================================================

function getUserEssaysCollection(userId: string): CollectionReference {
  return collection(db, 'users', userId, 'essays');
}

function getEssayDocRef(userId: string, essayId: string): DocumentReference {
  return doc(db, 'users', userId, 'essays', essayId);
}

function generatePublicToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// =============================================================================
// Essay CRUD
// =============================================================================

export async function listEssays(userId: string): Promise<EssayDocument[]> {
  const essaysRef = getUserEssaysCollection(userId);
  const snapshot = await getDocs(essaysRef);

  const essays = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as EssayDocument[];

  return essays.sort((a, b) => {
    const aTime = (a.updatedAt as Timestamp)?.toMillis?.() ?? 0;
    const bTime = (b.updatedAt as Timestamp)?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

export async function getEssay(userId: string, essayId: string): Promise<EssayDocument | null> {
  const docRef = getEssayDocRef(userId, essayId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as EssayDocument;
}

export async function saveEssay(
  userId: string,
  essayId: string,
  essayData: Essay,
  title = 'Untitled Essay'
): Promise<string> {
  const docRef = getEssayDocRef(userId, essayId);

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Save timeout after 10 seconds')), 10000);
  });

  const savePromise = setDoc(
    docRef,
    {
      title,
      data: essayData,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  await Promise.race([savePromise, timeoutPromise]);

  const indexRef = doc(db, 'essayIndex', essayId);
  await setDoc(indexRef, { ownerUid: userId }, { merge: true });

  return essayId;
}

export async function deleteEssay(userId: string, essayId: string): Promise<void> {
  const docRef = getEssayDocRef(userId, essayId);
  await deleteDoc(docRef);

  const indexRef = doc(db, 'essayIndex', essayId);
  await deleteDoc(indexRef);
}

export async function updateEssayTitle(userId: string, essayId: string, title: string): Promise<void> {
  const docRef = getEssayDocRef(userId, essayId);
  await setDoc(
    docRef,
    {
      title,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// =============================================================================
// Sharing
// =============================================================================

export async function getEssaySharingInfo(ownerUid: string, essayId: string): Promise<SharingInfo | null> {
  const docRef = getEssayDocRef(ownerUid, essayId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return (
    data.sharing || {
      isPublic: false,
      publicToken: null,
      collaborators: [],
    }
  );
}

export async function shareEssay(
  ownerUid: string,
  essayId: string,
  email: string,
  permission: 'viewer' | 'editor',
  ownerEmail: string,
  ownerDisplayName: string,
  essayTitle: string
): Promise<void> {
  const essayDocRef = getEssayDocRef(ownerUid, essayId);

  const collaborator: Collaborator = {
    email,
    permission,
    addedAt: new Date(),
  };

  const essaySnap = await getDoc(essayDocRef);
  const essayData = essaySnap.data();

  const currentCollaborators: Collaborator[] = essayData?.sharing?.collaborators || [];
  const filtered = currentCollaborators.filter((c) => c.email !== email);
  const newCollaborators = [...filtered, collaborator];

  const collaboratorEmails = newCollaborators.map((c) => c.email);
  const editorEmails = newCollaborators.filter((c) => c.permission === 'editor').map((c) => c.email);

  if (!essayData?.sharing) {
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

export async function unshareEssay(ownerUid: string, essayId: string, email: string): Promise<void> {
  const essayDocRef = getEssayDocRef(ownerUid, essayId);

  const essaySnap = await getDoc(essayDocRef);
  const essayData = essaySnap.data();

  if (essayData?.sharing?.collaborators) {
    const filtered = essayData.sharing.collaborators.filter(
      (c: Collaborator) => c.email !== email
    );
    const collaboratorEmails = filtered.map((c: Collaborator) => c.email);
    const editorEmails = filtered
      .filter((c: Collaborator) => c.permission === 'editor')
      .map((c: Collaborator) => c.email);

    await updateDoc(essayDocRef, {
      'sharing.collaborators': filtered,
      'sharing.collaboratorEmails': collaboratorEmails,
      'sharing.editorEmails': editorEmails,
    });
  }

  const sharedDocRef = doc(db, 'sharedWithMe', email, 'essays', `${ownerUid}_${essayId}`);
  await deleteDoc(sharedDocRef);
}

export async function setPublicSharing(
  ownerUid: string,
  essayId: string,
  isPublic: boolean
): Promise<string | null> {
  const essayDocRef = getEssayDocRef(ownerUid, essayId);

  const essaySnap = await getDoc(essayDocRef);
  const essayData = essaySnap.data();
  const currentSharing: SharingInfo = essayData?.sharing || { isPublic: false, publicToken: null, collaborators: [] };

  if (isPublic) {
    const publicToken = generatePublicToken();

    await updateDoc(essayDocRef, {
      'sharing.isPublic': true,
      'sharing.publicToken': publicToken,
    });

    const publicDocRef = doc(db, 'publicEssays', publicToken);
    await setDoc(publicDocRef, {
      essayId,
      ownerUid,
      createdAt: serverTimestamp(),
    });

    return publicToken;
  } else {
    const oldToken = currentSharing.publicToken;

    await updateDoc(essayDocRef, {
      'sharing.isPublic': false,
      'sharing.publicToken': null,
    });

    if (oldToken) {
      const publicDocRef = doc(db, 'publicEssays', oldToken);
      await deleteDoc(publicDocRef);
    }

    return null;
  }
}

export async function listSharedWithMe(userEmail: string): Promise<SharedEssayRef[]> {
  const normalizedEmail = userEmail.toLowerCase();
  const sharedRef = collection(db, 'sharedWithMe', normalizedEmail, 'essays');
  const snapshot = await getDocs(sharedRef);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as SharedEssayRef[];
}

export async function getPublicEssay(token: string): Promise<EssayDocument | null> {
  const publicDocRef = doc(db, 'publicEssays', token);
  const publicSnap = await getDoc(publicDocRef);

  if (!publicSnap.exists()) {
    return null;
  }

  const { essayId, ownerUid } = publicSnap.data() as { essayId: string; ownerUid: string };

  const essayDocRef = getEssayDocRef(ownerUid, essayId);
  const essaySnap = await getDoc(essayDocRef);

  if (!essaySnap.exists()) {
    return null;
  }

  const essayData = essaySnap.data();

  if (!essayData.sharing?.isPublic) {
    return null;
  }

  return {
    id: essayId,
    ownerUid,
    ...essayData,
  } as EssayDocument;
}

export async function getSharedEssay(ownerUid: string, essayId: string): Promise<EssayDocument | null> {
  const docRef = getEssayDocRef(ownerUid, essayId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ownerUid,
    ...snapshot.data(),
  } as EssayDocument;
}

export async function saveSharingSettings(
  ownerUid: string,
  essayId: string,
  newCollaborators: Collaborator[],
  isPublic: boolean,
  publicPermission: 'viewer' | 'editor',
  ownerEmail: string,
  ownerDisplayName: string,
  essayTitle: string
): Promise<string | null> {
  const essayDocRef = getEssayDocRef(ownerUid, essayId);

  const essaySnap = await getDoc(essayDocRef);
  const essayData = essaySnap.exists() ? essaySnap.data() : {};
  const currentSharing: SharingInfo = essayData.sharing || {
    collaborators: [],
    isPublic: false,
    publicToken: null,
  };
  const currentCollaborators: Collaborator[] = currentSharing.collaborators || [];

  const collaboratorEmails = newCollaborators.map((c) => c.email);
  const editorEmails = newCollaborators.filter((c) => c.permission === 'editor').map((c) => c.email);

  let publicToken = currentSharing.publicToken;
  if (isPublic && !publicToken) {
    publicToken = generatePublicToken();
    const publicDocRef = doc(db, 'publicEssays', publicToken);
    await setDoc(publicDocRef, {
      essayId,
      ownerUid,
      createdAt: serverTimestamp(),
    });
  } else if (!isPublic && publicToken) {
    const publicDocRef = doc(db, 'publicEssays', publicToken);
    await deleteDoc(publicDocRef);
    publicToken = null;
  }

  await setDoc(
    essayDocRef,
    {
      sharing: {
        isPublic,
        publicToken,
        publicPermission: isPublic ? publicPermission : null,
        collaborators: newCollaborators,
        collaboratorEmails,
        editorEmails,
      },
    },
    { merge: true }
  );

  const currentEmails = currentCollaborators.map((c) => c.email);
  const newEmails = newCollaborators.map((c) => c.email);

  const removedEmails = currentEmails.filter((e) => !newEmails.includes(e));
  const addedOrUpdated = newCollaborators.filter((c) => {
    const existing = currentCollaborators.find((ec) => ec.email === c.email);
    return !existing || existing.permission !== c.permission;
  });

  for (const email of removedEmails) {
    const normalizedEmail = email.toLowerCase();
    const sharedDocRef = doc(db, 'sharedWithMe', normalizedEmail, 'essays', `${ownerUid}_${essayId}`);
    await deleteDoc(sharedDocRef);
  }

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

export async function saveSharedEssay(
  ownerUid: string,
  essayId: string,
  essayData: Essay,
  title: string
): Promise<string> {
  const docRef = getEssayDocRef(ownerUid, essayId);

  await setDoc(
    docRef,
    {
      title,
      data: essayData,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return essayId;
}

export async function savePublicEssay(
  ownerUid: string,
  essayId: string,
  essayData: Essay,
  title: string
): Promise<string> {
  const docRef = getEssayDocRef(ownerUid, essayId);

  await setDoc(
    docRef,
    {
      title,
      data: essayData,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return essayId;
}

export async function getEssayWithPermissions(
  essayId: string,
  currentUserUid: string | null,
  currentUserEmail: string | null
): Promise<EssayWithPermissions> {
  const indexRef = doc(db, 'essayIndex', essayId);
  const indexSnap = await getDoc(indexRef);

  if (!indexSnap.exists()) {
    return { essay: null, permission: null, ownerUid: null };
  }

  const { ownerUid } = indexSnap.data() as { ownerUid: string };

  const essayDocRef = getEssayDocRef(ownerUid, essayId);
  const essaySnap = await getDoc(essayDocRef);

  if (!essaySnap.exists()) {
    return { essay: null, permission: null, ownerUid: null };
  }

  const essayData = essaySnap.data();

  if (currentUserUid && currentUserUid === ownerUid) {
    return {
      essay: { id: essayId, ownerUid, ...essayData } as EssayDocument,
      permission: 'owner',
      ownerUid,
    };
  }

  if (currentUserEmail && essayData.sharing?.collaboratorEmails) {
    const normalizedEmail = currentUserEmail.toLowerCase();
    if (essayData.sharing.collaboratorEmails.map((e: string) => e.toLowerCase()).includes(normalizedEmail)) {
      const isEditor = essayData.sharing.editorEmails
        ?.map((e: string) => e.toLowerCase())
        .includes(normalizedEmail);
      return {
        essay: { id: essayId, ownerUid, ...essayData } as EssayDocument,
        permission: isEditor ? 'editor' : 'viewer',
        ownerUid,
      };
    }
  }

  if (essayData.sharing?.isPublic) {
    const publicPermission = essayData.sharing.publicPermission || 'viewer';
    return {
      essay: { id: essayId, ownerUid, ...essayData } as EssayDocument,
      permission: publicPermission,
      ownerUid,
    };
  }

  return { essay: null, permission: null, ownerUid: null };
}
