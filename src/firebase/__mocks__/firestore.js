// Mock Firestore functions for testing
import { vi } from 'vitest';

// Mock data store
let mockData = {
  users: {},
  sharedWithMe: {},
  publicEssays: {},
};

export const resetMockData = () => {
  mockData = {
    users: {},
    sharedWithMe: {},
    publicEssays: {},
  };
};

export const setMockEssay = (userId, essayId, data) => {
  if (!mockData.users[userId]) {
    mockData.users[userId] = { essays: {} };
  }
  mockData.users[userId].essays[essayId] = data;
};

export const setMockPublicEssay = (token, data) => {
  mockData.publicEssays[token] = data;
};

export const getMockData = () => mockData;

// Mock implementations
export const listEssays = vi.fn(async (userId) => {
  const userEssays = mockData.users[userId]?.essays || {};
  return Object.entries(userEssays).map(([id, data]) => ({ id, ...data }));
});

export const getEssay = vi.fn(async (userId, essayId) => {
  const essay = mockData.users[userId]?.essays?.[essayId];
  return essay ? { id: essayId, ...essay } : null;
});

export const saveEssay = vi.fn(async (userId, essayId, essayData, title) => {
  if (!mockData.users[userId]) {
    mockData.users[userId] = { essays: {} };
  }
  mockData.users[userId].essays[essayId] = {
    title,
    data: essayData,
    updatedAt: new Date(),
  };
  return essayId;
});

export const deleteEssay = vi.fn(async (userId, essayId) => {
  if (mockData.users[userId]?.essays) {
    delete mockData.users[userId].essays[essayId];
  }
});

export const updateEssayTitle = vi.fn(async (userId, essayId, title) => {
  if (mockData.users[userId]?.essays?.[essayId]) {
    mockData.users[userId].essays[essayId].title = title;
  }
});

export const getEssaySharingInfo = vi.fn(async (ownerUid, essayId) => {
  const essay = mockData.users[ownerUid]?.essays?.[essayId];
  return essay?.sharing || { isPublic: false, publicToken: null, collaborators: [] };
});

export const saveSharingSettings = vi.fn(async (
  ownerUid, essayId, collaborators, isPublic, publicPermission, ownerEmail, ownerDisplayName, essayTitle
) => {
  if (!mockData.users[ownerUid]?.essays?.[essayId]) {
    throw new Error('Essay not found');
  }

  const publicToken = isPublic ? 'mock-token-' + Math.random().toString(36).substr(2, 8) : null;

  mockData.users[ownerUid].essays[essayId].sharing = {
    isPublic,
    publicToken,
    publicPermission: isPublic ? publicPermission : null,
    collaborators,
    collaboratorEmails: collaborators.map(c => c.email),
    editorEmails: collaborators.filter(c => c.permission === 'editor').map(c => c.email),
  };

  if (isPublic && publicToken) {
    mockData.publicEssays[publicToken] = { essayId, ownerUid };
  }

  // Update sharedWithMe for collaborators
  for (const collab of collaborators) {
    const email = collab.email.toLowerCase();
    if (!mockData.sharedWithMe[email]) {
      mockData.sharedWithMe[email] = { essays: {} };
    }
    mockData.sharedWithMe[email].essays[`${ownerUid}_${essayId}`] = {
      essayId,
      ownerUid,
      ownerEmail,
      ownerDisplayName,
      title: essayTitle,
      permission: collab.permission,
    };
  }

  return publicToken;
});

export const listSharedWithMe = vi.fn(async (userEmail) => {
  const normalizedEmail = userEmail.toLowerCase();
  const sharedEssays = mockData.sharedWithMe[normalizedEmail]?.essays || {};
  return Object.entries(sharedEssays).map(([id, data]) => ({ id, ...data }));
});

export const getPublicEssay = vi.fn(async (token) => {
  const publicEntry = mockData.publicEssays[token];
  if (!publicEntry) return null;

  const { essayId, ownerUid } = publicEntry;
  const essay = mockData.users[ownerUid]?.essays?.[essayId];

  if (!essay || !essay.sharing?.isPublic) return null;

  return {
    id: essayId,
    ownerUid,
    ...essay,
  };
});

export const getSharedEssay = vi.fn(async (ownerUid, essayId) => {
  const essay = mockData.users[ownerUid]?.essays?.[essayId];
  return essay ? { id: essayId, ownerUid, ...essay } : null;
});

export const saveSharedEssay = vi.fn(async (ownerUid, essayId, essayData, title) => {
  if (mockData.users[ownerUid]?.essays?.[essayId]) {
    mockData.users[ownerUid].essays[essayId].data = essayData;
    mockData.users[ownerUid].essays[essayId].title = title;
  }
  return essayId;
});

export const savePublicEssay = vi.fn(async (ownerUid, essayId, essayData, title) => {
  if (mockData.users[ownerUid]?.essays?.[essayId]) {
    mockData.users[ownerUid].essays[essayId].data = essayData;
    mockData.users[ownerUid].essays[essayId].title = title;
  }
  return essayId;
});

// Create a share for an essay
export const createShare = vi.fn(async (ownerUid, essayId, email, permission, essayTitle, ownerEmail, ownerDisplayName) => {
  const normalizedEmail = email.toLowerCase();

  if (!mockData.users[ownerUid]?.essays?.[essayId]) {
    throw new Error('Essay not found');
  }

  const essay = mockData.users[ownerUid].essays[essayId];
  const currentCollaborators = essay.sharing?.collaborators || [];

  const collaborator = {
    email: normalizedEmail,
    permission,
    addedAt: new Date(),
  };

  const filtered = currentCollaborators.filter(c => c.email.toLowerCase() !== normalizedEmail);
  const newCollaborators = [...filtered, collaborator];

  essay.sharing = {
    ...essay.sharing,
    collaborators: newCollaborators,
    collaboratorEmails: newCollaborators.map(c => c.email),
    editorEmails: newCollaborators.filter(c => c.permission === 'editor').map(c => c.email),
  };

  // Update sharedWithMe
  if (!mockData.sharedWithMe[normalizedEmail]) {
    mockData.sharedWithMe[normalizedEmail] = { essays: {} };
  }
  mockData.sharedWithMe[normalizedEmail].essays[`${ownerUid}_${essayId}`] = {
    essayId,
    ownerUid,
    ownerEmail,
    ownerDisplayName,
    title: essayTitle,
    permission,
  };

  return { email: normalizedEmail, permission };
});

// Get all shares for an essay
export const getEssayShares = vi.fn(async (ownerUid, essayId) => {
  const essay = mockData.users[ownerUid]?.essays?.[essayId];
  if (!essay) {
    return [];
  }

  const collaborators = essay.sharing?.collaborators || [];
  return collaborators.map(c => ({
    email: c.email,
    permission: c.permission,
    addedAt: c.addedAt,
  }));
});

// Delete a share from an essay
export const deleteShare = vi.fn(async (ownerUid, essayId, email) => {
  const normalizedEmail = email.toLowerCase();
  const essay = mockData.users[ownerUid]?.essays?.[essayId];

  if (essay?.sharing?.collaborators) {
    const filtered = essay.sharing.collaborators.filter(
      c => c.email.toLowerCase() !== normalizedEmail
    );
    essay.sharing.collaborators = filtered;
    essay.sharing.collaboratorEmails = filtered.map(c => c.email);
    essay.sharing.editorEmails = filtered.filter(c => c.permission === 'editor').map(c => c.email);
  }

  // Remove from sharedWithMe
  if (mockData.sharedWithMe[normalizedEmail]?.essays) {
    delete mockData.sharedWithMe[normalizedEmail].essays[`${ownerUid}_${essayId}`];
  }
});
