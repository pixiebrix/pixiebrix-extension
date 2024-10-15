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

import { isDatabasePreviewField } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { isEmpty } from "lodash";
import { isUUID } from "@/types/helpers";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import type { UUID } from "@/types/stringTypes";
import type { OptionsArgs } from "@/types/runtimeTypes";
import type { Schema } from "@/types/schemaTypes";
import type { Deployment, DeploymentPayload } from "@/types/contract";
import { getIsPersonalDeployment } from "@/store/modComponents/modInstanceUtils";
import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";
import notify from "@/utils/notify";
import {
  appApi,
  useCreateUserDeploymentMutation,
  useDeleteUserDeploymentMutation,
} from "@/data/service/api";
import { useCallback } from "react";
import { type ModInstance } from "@/types/modInstanceTypes";
import type { WizardValues } from "@/activation/wizardTypes";

/**
 * Returns the default database name for an auto-created database.
 */
export function makeDatabasePreviewName(
  modDefinition: ModDefinition,
  optionSchema: Schema,
  name: string,
): string {
  return `${modDefinition.metadata.name} - ${optionSchema.title ?? name}`;
}

/**
 * Create databases for any mod options database fields where the schema format is "preview", and the field value
 * is a string to use as the database name.
 *
 * Modifies optionsArgs in place.
 *
 * @param modDefinition the mod definition
 * @param optionsArgs the current mod options
 * @param databaseFactory function to create a database
 * @throws {Error} if any of the databases cannot be created
 */
export async function autoCreateDatabaseOptionsArgsInPlace(
  modDefinition: ModDefinition,
  optionsArgs: OptionsArgs,
  databaseFactory: (args: { name: string }) => Promise<UUID | undefined>,
): Promise<OptionsArgs> {
  const optionsProperties = Object.entries(
    modDefinition.options?.schema.properties ?? {},
  )
    .filter(
      ([name, fieldSchema]) =>
        isDatabasePreviewField(fieldSchema) &&
        !isEmpty(optionsArgs[name]) &&
        // If the value is a UUID, then it's a database ID for an existing database
        !isUUID(optionsArgs[name] as string),
    )
    .map(([name]) => ({
      name,
      // Known to be string due to filter above
      databaseName: optionsArgs[name] as string,
    }));

  // Create the databases in parallel
  await Promise.all(
    optionsProperties.map(async ({ name, databaseName }) => {
      try {
        optionsArgs[name] = await databaseFactory({ name: databaseName });
      } catch (error) {
        throw new Error("Error creating database", { cause: error });
      }
    }),
  );

  return optionsArgs;
}

/**
 * Handles the logic for creating or deleting a personal deployment for a mod instance
 * when activating it. Handles the cases where:
 * - The mod instance is already a personal deployment and the user wants to keep it
 * (we refetch the deployment and return it since the whole deployment metadata is required for activation)
 * - The mod instance is already a personal deployment and the user wants to remove it
 * (the deployment is deleted, and we return undefined)
 * - The mod instance is not a personal deployment and the user wants to create one
 * (a new deployment is created, and we return it)
 * - The mod instance is not a personal deployment and the user does not want to create one
 * (no action is taken, and we return undefined)
 * TODO: Handle activating a mod that is updating to a newer version and update the personal deployment to point to the new mod version
 */
export function useHandlePersonalDeploymentOption() {
  const [createUserDeployment] = useCreateUserDeploymentMutation();
  const [deleteUserDeployment] = useDeleteUserDeploymentMutation();
  const [getUserDeployment] = appApi.endpoints.getUserDeployment.useLazyQuery();

  return useCallback(
    async (
      modInstance: ModInstance | undefined,
      modDefinition: ModDefinition,
      {
        personalDeployment,
        integrationDependencies,
        optionsArgs,
      }: WizardValues,
    ) => {
      let userDeployment: Deployment | undefined;
      if (getIsPersonalDeployment(modInstance)) {
        if (personalDeployment) {
          userDeployment = await getUserDeployment({
            id: modInstance.deploymentMetadata.id,
          }).unwrap();
        } else {
          await deleteUserDeployment({
            id: modInstance.deploymentMetadata.id,
          });
        }
      } else if (personalDeployment) {
        const data: DeploymentPayload = {
          name: `Personal deployment for ${modDefinition.metadata.name}, version ${modDefinition.metadata.version}`,
          services: integrationDependencies.flatMap((integrationDependency) =>
            integrationDependency.integrationId === PIXIEBRIX_INTEGRATION_ID ||
            integrationDependency.configId == null
              ? []
              : [{ auth: integrationDependency.configId }],
          ),
          options_config: optionsArgs,
        };
        const result = await createUserDeployment({
          modDefinition,
          data,
        });

        if ("error" in result) {
          notify.error({
            message: `Error setting up device synchronization for ${modDefinition.metadata.name}. Please try reactivating.`,
            error: result.error,
          });
        } else {
          userDeployment = result.data;
        }
      }

      return userDeployment;
    },
    [createUserDeployment, deleteUserDeployment, getUserDeployment],
  );
}
