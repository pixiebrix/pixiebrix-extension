/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
