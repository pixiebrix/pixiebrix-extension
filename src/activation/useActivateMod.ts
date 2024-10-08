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

import { type WizardValues } from "@/activation/wizardTypes";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import reportEvent from "@/telemetry/reportEvent";
import { getErrorMessage } from "@/errors/errorHelpers";
import { deactivateMod } from "@/store/deactivateUtils";
import { ensurePermissionsFromUserGesture } from "@/permissions/permissionsUtils";
import { checkModDefinitionPermissions } from "@/modDefinitions/modDefinitionPermissionsHelpers";
import {
  useCreateDatabaseMutation,
  useCreateUserDeploymentMutation,
} from "@/data/service/api";
import { Events } from "@/telemetry/events";
import { reloadModsEveryTab } from "@/contentScript/messenger/api";
import { autoCreateDatabaseOptionsArgsInPlace } from "@/activation/modOptionsHelpers";
import { type ReportEventData } from "@/telemetry/telemetryTypes";
import { type Deployment, type DeploymentPayload } from "@/types/contract";
import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";
import notify from "@/utils/notify";
import { selectModInstanceMap } from "@/store/modComponents/modInstanceSelectors";
import { getIsPersonalDeployment } from "@/store/modComponents/modInstanceUtils";

export type ActivateResult = {
  success: boolean;
  error?: string;
};

export type ActivateModFormCallback =
  /**
   * Callback for activating a mod.
   *
   * @param formValues The form values for mod configuration options
   * @param modDefinition The mod definition to activate
   * @returns a promise that resolves to an ActivateResult
   */
  (
    formValues: WizardValues,
    modDefinition: ModDefinition,
  ) => Promise<ActivateResult>;

type ActivationSource = "marketplace" | "extensionConsole";

function selectActivateEventData(
  modDefinition: ModDefinition,
): ReportEventData {
  return {
    modId: modDefinition.metadata.id,
    modComponents: modDefinition.extensionPoints.map((x) => x.label),
  };
}

/**
 * React hook to activate a mod.
 *
 * Prompts the user to grant permissions if PixieBrix does not already have the required permissions.
 * @param source The source of the activation, only used for reporting purposes
 * @param checkPermissions Whether to check for permissions before activating the mod
 * @returns A callback that can be used to activate a mod
 * @see useActivateModWizard
 */
function useActivateMod(
  source: ActivationSource,
  { checkPermissions = true }: { checkPermissions?: boolean } = {},
): ActivateModFormCallback {
  const dispatch = useDispatch();
  const modInstanceMap = useSelector(selectModInstanceMap);

  const [createDatabase] = useCreateDatabaseMutation();
  const [createUserDeployment] = useCreateUserDeploymentMutation();

  return useCallback(
    async (formValues: WizardValues, modDefinition: ModDefinition) => {
      const modInstance = modInstanceMap.get(modDefinition.metadata.id);
      const isReactivate = Boolean(modInstance);

      if (source === "extensionConsole") {
        // Note: The prefix "Marketplace" on the telemetry event name
        // here is legacy terminology from before the public marketplace
        // was created. It refers to the mod-list part of the mod component
        // console, to distinguish that from the workshop.
        // It's being kept to keep our metrics history clean.
        reportEvent(Events.MARKETPLACE_ACTIVATE, {
          ...selectActivateEventData(modDefinition),
          reactivate: isReactivate,
        });
      }

      const configuredDependencies = formValues.integrationDependencies.filter(
        ({ configId }) => Boolean(configId),
      );

      try {
        const modPermissions = await checkModDefinitionPermissions(
          modDefinition,
          configuredDependencies,
        );

        if (checkPermissions) {
          const isPermissionsAcceptedByUser =
            await ensurePermissionsFromUserGesture(modPermissions);

          if (!isPermissionsAcceptedByUser) {
            if (source === "extensionConsole") {
              // Note: The prefix "Marketplace" on the telemetry event name
              // here is legacy terminology from before the public marketplace
              // was created. It refers to the mod-list part of the mod component
              // console, to distinguish that from the workshop.
              // It's being kept like this so our metrics history stays clean.
              reportEvent(Events.MARKETPLACE_REJECT_PERMISSIONS, {
                ...selectActivateEventData(modDefinition),
                reactivate: isReactivate,
              });
            }

            return {
              success: false,
              error: "You must accept browser permissions to activate.",
            };
          }
        }

        const { optionsArgs, integrationDependencies } = formValues;

        await autoCreateDatabaseOptionsArgsInPlace(
          modDefinition,
          optionsArgs,
          async (args) => {
            const result = await createDatabase(args).unwrap();
            return result.id;
          },
        );

        await deactivateMod(
          modDefinition.metadata.id,
          modInstance?.modComponentIds ?? [],
          dispatch,
        );

        // TODO: handle updating a deployment from a previous version to the new version and
        //  handle deleting a deployment if the user turns off personal deployment
        //  https://github.com/pixiebrix/pixiebrix-extension/issues/9092
        let createdUserDeployment: Deployment | undefined;
        if (
          formValues.personalDeployment &&
          // Avoid creating a personal deployment if the mod is already associated with one
          !getIsPersonalDeployment(modInstance)
        ) {
          const data: DeploymentPayload = {
            name: `Personal deployment for ${modDefinition.metadata.name}, version ${modDefinition.metadata.version}`,
            services: integrationDependencies.flatMap(
              (integrationDependency) =>
                integrationDependency.integrationId ===
                  PIXIEBRIX_INTEGRATION_ID ||
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
            createdUserDeployment = result.data;
          }
        }

        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            configuredDependencies: integrationDependencies,
            optionsArgs,
            screen: source,
            isReactivate,
            deployment: createdUserDeployment,
          }),
        );

        reloadModsEveryTab();
      } catch (error) {
        const errorMessage = getErrorMessage(error);

        console.error(`Error activating mod: ${modDefinition.metadata.id}`, {
          error,
        });

        return {
          success: false,
          error: errorMessage,
        };
      }

      return {
        success: true,
      };
    },
    [
      modInstanceMap,
      source,
      checkPermissions,
      dispatch,
      createDatabase,
      createUserDeployment,
    ],
  );
}

export default useActivateMod;
