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
import { uninstallRecipe } from "@/store/uninstallUtils";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";
import { ensurePermissionsFromUserGesture } from "@/permissions/permissionsUtils";
import { checkModDefinitionPermissions } from "@/modDefinitions/modDefinitionPermissionsHelpers";
import { useCreateDatabaseMutation } from "@/data/service/api";
import { Events } from "@/telemetry/events";
import { reactivateEveryTab } from "@/contentScript/messenger/strict/api";
import { autoCreateDatabaseOptionsArgsInPlace } from "@/activation/modOptionsHelpers";

export type ActivateResult = {
  success: boolean;
  error?: string;
};

export type ActivateRecipeFormCallback =
  /**
   * Callback for activating a recipe.
   *
   * @param formValues The form values for recipe configuration options
   * @param recipe The recipe definition to install
   * @returns a promise that resolves to an ActivateResult
   */
  (formValues: WizardValues, recipe: ModDefinition) => Promise<ActivateResult>;

type ActivationSource = "marketplace" | "extensionConsole";

function selectActivateEventData(recipe: ModDefinition) {
  return {
    blueprintId: recipe.metadata.id,
    extensions: recipe.extensionPoints.map((x) => x.label),
  };
}

/**
 * React hook to install a recipe.
 *
 * Prompts the user to grant permissions if PixieBrix does not already have the required permissions.
 * @param source The source of the activation, only used for reporting purposes
 * @param checkPermissions Whether to check for permissions before activating the recipe
 * @returns A callback that can be used to activate a recipe
 * @see useActivateRecipeWizard
 */
function useActivateRecipe(
  source: ActivationSource,
  { checkPermissions = true }: { checkPermissions?: boolean } = {},
): ActivateRecipeFormCallback {
  const dispatch = useDispatch();
  const extensions = useSelector(selectActivatedModComponents);

  const [createDatabase] = useCreateDatabaseMutation();

  return useCallback(
    async (formValues: WizardValues, recipe: ModDefinition) => {
      const isReactivate = extensions.some(
        (extension) => extension._recipe?.id === recipe.metadata.id,
      );

      if (source === "extensionConsole") {
        // Note: The prefix "Marketplace" on the telemetry event name
        // here is legacy terminology from before the public marketplace
        // was created. It refers to the mod-list part of the extension
        // console, to distinguish that from the workshop.
        // It's being kept to keep our metrics history clean.
        reportEvent(Events.MARKETPLACE_ACTIVATE, {
          ...selectActivateEventData(recipe),
          reactivate: isReactivate,
        });
      }

      const configuredDependencies = formValues.integrationDependencies.filter(
        ({ configId }) => Boolean(configId),
      );

      try {
        const recipePermissions = await checkModDefinitionPermissions(
          recipe,
          configuredDependencies,
        );

        if (checkPermissions) {
          const isPermissionsAcceptedByUser =
            await ensurePermissionsFromUserGesture(recipePermissions);

          if (!isPermissionsAcceptedByUser) {
            if (source === "extensionConsole") {
              // Note: The prefix "Marketplace" on the telemetry event name
              // here is legacy terminology from before the public marketplace
              // was created. It refers to the mod-list part of the extension
              // console, to distinguish that from the workshop.
              // It's being kept like this so our metrics history stays clean.
              reportEvent(Events.MARKETPLACE_REJECT_PERMISSIONS, {
                ...selectActivateEventData(recipe),
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
          recipe,
          optionsArgs,
          async (args) => {
            const result = await createDatabase(args).unwrap();
            return result.id;
          },
        );

        const recipeExtensions = extensions.filter(
          (extension) => extension._recipe?.id === recipe.metadata.id,
        );

        await uninstallRecipe(recipe.metadata.id, recipeExtensions, dispatch);

        dispatch(
          extensionsSlice.actions.activateMod({
            modDefinition: recipe,
            configuredDependencies: integrationDependencies,
            optionsArgs,
            screen: source,
            isReactivate: recipeExtensions.length > 0,
          }),
        );

        reactivateEveryTab();
      } catch (error) {
        const errorMessage = getErrorMessage(error);

        console.error(`Error activating mod: ${recipe.metadata.id}`, {
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
    [createDatabase, dispatch, extensions, source],
  );
}

export default useActivateRecipe;
