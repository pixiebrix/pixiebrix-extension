/**
 * Type contract between the backend and front-end.
 */
import { ServiceDefinition } from "@/types/definitions";
import { ServiceConfig } from "@/core";

export enum MemberRole {
  Member = 1,
  Admin = 2,
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Member {
  id: string;
  role: MemberRole;
  user: User;
}

export interface Invitation {
  id: string;
  role: MemberRole;
  email: string;
}

export interface Organization {
  id: string;
  name: string;
  members: Member[];
  invitations: Invitation[];
}

export interface PendingInvitation {
  id: string;
  inviter: User;
  organization: Organization;
}

export interface RemoteService {
  /**
   * Internal UUID on PixieBrix backend.
   */
  id: string;

  /**
   * Unique identifier, including scope and collection.
   */
  name: string;

  config: ServiceDefinition;
}

export interface OrganizationMeta {
  id: string;
  name: string;
}

export interface SanitizedAuth {
  /**
   * UUID of the auth configuration
   */
  id: string;

  organization: OrganizationMeta | undefined;

  label: string | undefined;

  /**
   * True if the user has edit-permissions for the configuration
   */
  editable: boolean;

  /**
   * Configuration excluding any secrets/keys.
   */
  config: SanitizedAuth;

  /**
   * Service definition.
   */
  service: RemoteService;
}

export interface ConfigurableAuth {
  id: string;
  editable?: boolean;
  label: string | undefined;
  organization?: string;
  config: ServiceConfig;
  service: RemoteService;
}

export interface ReadOnlyAuth {
  id: string;
  organization?: string;
  service: RemoteService;
}
