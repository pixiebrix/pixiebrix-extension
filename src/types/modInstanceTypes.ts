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
import type { OptionsArgs } from "@/types/runtimeTypes";
import type { IntegrationDependency } from "@/integrations/integrationTypes";
import type { Timestamp, UUID } from "@/types/stringTypes";
import type { DeploymentMetadata } from "@/types/deploymentTypes";
import type { Tagged } from "type-fest";

/**
 * A unique identifier for a mod instance activation. Tagged to prevent mixing with mod component id.
 */
export type ModInstanceId = Tagged<UUID, "ModInstanceId">;

/**
 * An activated mod instance.
 * @since 2.1.3
 */
export type ModInstance = {
  /**
   * A unique identifier for the mod instance. Used to differentiate instances across activations.
   *
   * NOTE: at this time, a device can only have one instance of a mod active at a time.
   */
  id: ModInstanceId;

  /**
   * Mod component instance ids. Array order corresponds to the order of the ModDefinition.extensionPoints.
   *
   * Required to be able to track and correlate mod components across contexts (e.g., content script, page editor,
   * extension console), e.g., for logging, error handling.
   *
   * In the future, we might consider eliminating by using a predictable id based on the mod instance id and position
   * in the mod definition. But that's not possible today because the ids use a UUID format.
   */
  modComponentIds: UUID[];

  /**
   * The deployment metadata for the mod instance, or undefined if the mod instance is not managed via a
   * team or personal deployment
   */
  deploymentMetadata: DeploymentMetadata | undefined;

  /**
   * The mod definition.
   */
  definition: ModDefinition;

  /**
   * Validated options args for the mod instance.
   *
   * Validated at activation time, but might no longer be valid, e.g., if a referenced database or Google Sheet
   * no longer exists.
   */
  optionsArgs: OptionsArgs;

  /**
   * Integration configurations for the mod instance.
   *
   * Validated at activation time, but might no longer be valid, e.g., if a configuration no longer exists.
   *
   * NOTE: in the future, integration configuration will likely be moved into mod options to allow multiple integrations
   * of the same type to use different configurations (e.g., for data transfer use cases).
   */
  integrationsArgs: IntegrationDependency[];

  /**
   * The timestamp when the mod instance was created or last reconfigured locally.
   */
  updatedAt: Timestamp;
};
