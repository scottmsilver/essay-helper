/**
 * Persistence wrapper types for essays stored in Firestore
 */

import type { Essay } from './essay';
import type { Timestamp } from 'firebase/firestore';

// =============================================================================
// Permission Types
// =============================================================================

export type PermissionLevel = 'viewer' | 'editor';
export type Permission = 'owner' | 'editor' | 'viewer';

// =============================================================================
// Collaborator & Sharing Types
// =============================================================================

export interface Collaborator {
  email: string;
  permission: PermissionLevel;
  addedAt: Date | Timestamp;
}

export interface SharingInfo {
  isPublic: boolean;
  publicToken: string | null;
  publicPermission?: PermissionLevel | null;
  collaborators: Collaborator[];
  collaboratorEmails?: string[];
  editorEmails?: string[];
}

// =============================================================================
// Essay Document Types
// =============================================================================

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
  permission: PermissionLevel;
  sharedAt: Timestamp;
}

export interface EssayWithPermissions {
  essay: EssayDocument | null;
  permission: Permission | null;
  ownerUid: string | null;
}
