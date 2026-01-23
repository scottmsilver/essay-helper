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
