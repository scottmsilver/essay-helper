/**
 * Abstract storage interface for essay persistence
 */

import type { Essay } from '../models/essay';
import type {
  EssayDocument,
  SharedEssayRef,
  SharingInfo,
  Collaborator,
  EssayWithPermissions,
  PermissionLevel,
} from '../models/document';

export interface EssayStorage {
  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * List all essays for a user, sorted by updatedAt descending
   */
  listEssays(userId: string): Promise<EssayDocument[]>;

  /**
   * Get a single essay by ID
   */
  getEssay(userId: string, essayId: string): Promise<EssayDocument | null>;

  /**
   * Save an essay (create or update)
   */
  saveEssay(userId: string, essayId: string, data: Essay, title: string): Promise<string>;

  /**
   * Delete an essay
   */
  deleteEssay(userId: string, essayId: string): Promise<void>;

  /**
   * Update only the title of an essay
   */
  updateEssayTitle(userId: string, essayId: string, title: string): Promise<void>;

  // ==========================================================================
  // Sharing Operations
  // ==========================================================================

  /**
   * Get sharing information for an essay
   */
  getEssaySharingInfo(ownerUid: string, essayId: string): Promise<SharingInfo | null>;

  /**
   * Share an essay with a specific user
   */
  shareEssay(
    ownerUid: string,
    essayId: string,
    email: string,
    permission: PermissionLevel,
    ownerEmail: string,
    ownerDisplayName: string,
    essayTitle: string
  ): Promise<void>;

  /**
   * Remove sharing for a specific user
   */
  unshareEssay(ownerUid: string, essayId: string, email: string): Promise<void>;

  /**
   * Enable or disable public sharing
   */
  setPublicSharing(ownerUid: string, essayId: string, isPublic: boolean): Promise<string | null>;

  /**
   * Save complete sharing settings (collaborators + public access)
   */
  saveSharingSettings(
    ownerUid: string,
    essayId: string,
    newCollaborators: Collaborator[],
    isPublic: boolean,
    publicPermission: PermissionLevel,
    ownerEmail: string,
    ownerDisplayName: string,
    essayTitle: string
  ): Promise<string | null>;

  // ==========================================================================
  // Shared Access Operations
  // ==========================================================================

  /**
   * List all essays shared with a user
   */
  listSharedWithMe(userEmail: string): Promise<SharedEssayRef[]>;

  /**
   * Get an essay that has been shared with the current user
   */
  getSharedEssay(ownerUid: string, essayId: string): Promise<EssayDocument | null>;

  /**
   * Get a publicly shared essay by token
   */
  getPublicEssay(token: string): Promise<EssayDocument | null>;

  /**
   * Save changes to a shared essay (requires editor permission)
   */
  saveSharedEssay(ownerUid: string, essayId: string, data: Essay, title: string): Promise<string>;

  /**
   * Save changes to a public essay (requires editor permission)
   */
  savePublicEssay(ownerUid: string, essayId: string, data: Essay, title: string): Promise<string>;

  // ==========================================================================
  // Unified Access
  // ==========================================================================

  /**
   * Get an essay with permission resolution for the current user
   */
  getEssayWithPermissions(
    essayId: string,
    uid: string | null,
    email: string | null
  ): Promise<EssayWithPermissions>;
}
