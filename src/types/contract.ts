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

// ServiceSerializer
export interface RemoteService {
  // the id is the internal uuid in pixiebrix
  id: string;
  // the name field stores the "id" in pixiebrix world
  name: string;
  config: ServiceDefinition;
}

// ConfigurableAuthSerializer
export interface ConfigurableAuth {
  id: string;
  editable?: boolean;
  label: string | undefined;
  organization?: string;
  config: ServiceConfig;
  service: RemoteService;
}

// ReadonlyAuthSerializer
export interface ReadOnlyAuth {
  id: string;
  organization?: string;
  service: RemoteService;
}
