/**
 * Persistence wrapper types for essays
 *
 * These types represent the external contract for essay documents.
 * All timestamp fields use standard Date objects - storage implementations
 * are responsible for normalizing their internal representations.
 */

import type { Essay } from './essay';

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
  addedAt: Date;
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
  updatedAt: Date;
  createdAt?: Date;
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
  sharedAt: Date;
}

export interface EssayWithPermissions {
  essay: EssayDocument | null;
  permission: Permission | null;
  ownerUid: string | null;
}
