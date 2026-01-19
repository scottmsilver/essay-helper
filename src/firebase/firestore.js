import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
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

  return essayId;
}

export async function deleteEssay(userId, essayId) {
  const docRef = getEssayDocRef(userId, essayId);
  await deleteDoc(docRef);
}

export async function updateEssayTitle(userId, essayId, title) {
  const docRef = getEssayDocRef(userId, essayId);
  await setDoc(docRef, {
    title,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
