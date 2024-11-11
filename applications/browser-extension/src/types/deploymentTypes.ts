/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import type { ModDefinition } from "@/types/modDefinitionTypes";
import type { Deployment } from "@/types/contract";
import type { UUID } from "@/types/stringTypes";

/**
 * A deployment and its associated mod definition (for exact package and version).
 *
 * Introduced in 1.8.10 to support dropping the mod definition from the Deployment heartbeat payload returned from
 * the server.
 *
 * @since 1.8.10
 */
export type ActivatableDeployment = {
  deployment: Deployment;
  modDefinition: ModDefinition;
};

type BaseDeploymentMetadata = {
  /**
   * Unique id of the deployment
   */
  id: UUID;

  /**
   * `updated_at` timestamp of the deployment object from the server (in ISO format). Used to determine whether the
   * client has the latest deployment configuration activated.
   */
  timestamp: string;

  /**
   * False iff the deployment is temporarily disabled.
   *
   * If undefined, is considered active for backward compatability
   *
   * @since 1.4.0
   */
  active?: boolean;
};

/**
 * Context about a team or personal mod Deployment that automatically activated the mod.
 * Prefer ModComponentBase[_deployment] vs. direct use of this type where possible to make usage clearer.
 */
export type DeploymentMetadata =
  | (BaseDeploymentMetadata & {
      /**
       * Indicates if the deployment is a personal deployment.
       * If true, the organization property should be undefined.
       * @since 2.1.2
       */
      isPersonalDeployment: true;
      organization?: undefined;
    })
  | (BaseDeploymentMetadata & {
      isPersonalDeployment?: false;
      /**
       * Context about the organization that the deployment is associated with.
       * @since 2.1.2
       */
      organization?: {
        /**
         * UUID of the organization
         */
        id: UUID;

        /**
         * Name of the organization
         */
        name: string;
      };
    });
