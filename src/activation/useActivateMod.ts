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
import extensionsSlice from "@/store/extensionsSlice";
import reportEvent from "@/telemetry/reportEvent";
import { getErrorMessage } from "@/errors/errorHelpers";
import { uninstallMod } from "@/store/uninstallUtils";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";
import { ensurePermissionsFromUserGesture } from "@/permissions/permissionsUtils";
import { checkModDefinitionPermissions } from "@/modDefinitions/modDefinitionPermissionsHelpers";
import { useCreateDatabaseMutation } from "@/data/service/api";
import { Events } from "@/telemetry/events";
import { reloadModsEveryTab } from "@/contentScript/messenger/api";
import { autoCreateDatabaseOptionsArgsInPlace } from "@/activation/modOptionsHelpers";

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

function selectActivateEventData(modDefinition: ModDefinition) {
  return {
    modId: modDefinition.metadata.id,
    modComponents: modDefinition.extensionPoints.map((x) => x.label),
  };
}

/**
 * React hook to install a mod.
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
  const activatedModComponents = useSelector(selectActivatedModComponents);

  const [createDatabase] = useCreateDatabaseMutation();

  return useCallback(
    async (formValues: WizardValues, modDefinition: ModDefinition) => {
      const isReactivate = activatedModComponents.some(
        (x) => x._recipe?.id === modDefinition.metadata.id,
      );

      if (source === "extensionConsole") {
        // Note: The prefix "Marketplace" on the telemetry event name
        // here is legacy terminology from before the public marketplace
        // was created. It refers to the mod-list part of the extension
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
              // was created. It refers to the mod-list part of the extension
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

        const existingModComponents = activatedModComponents.filter(
          (x) => x._recipe?.id === modDefinition.metadata.id,
        );

        await uninstallMod(
          modDefinition.metadata.id,
          existingModComponents,
          dispatch,
        );

        dispatch(
          extensionsSlice.actions.activateMod({
            modDefinition,
            configuredDependencies: integrationDependencies,
            optionsArgs,
            screen: source,
            isReactivate: existingModComponents.length > 0,
          }),
        );

        reloadModsEveryTab();
      } catch (error) {
        const errorMessage = getErrorMessage(error);

        console.error(`Error activating mod: ${modDefinition.metadata.id}`, {
          error,
        });

        if (typeof errorMessage === "string") {
          return {
            success: false,
            error: errorMessage,
          };
        }
      }

      return {
        success: true,
      };
    },
    [createDatabase, dispatch, activatedModComponents, source],
  );
}

export default useActivateMod;
