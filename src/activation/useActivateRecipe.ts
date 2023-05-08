/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type RecipeDefinition } from "@/types/recipeTypes";
import { useCallback } from "react";
import { reactivateEveryTab } from "@/background/messenger/api";
import { useDispatch, useSelector } from "react-redux";
import extensionsSlice from "@/store/extensionsSlice";
import { reportEvent } from "@/telemetry/events";
import { getErrorMessage } from "@/errors/errorHelpers";
import { uninstallRecipe } from "@/store/uninstallUtils";
import { selectExtensions } from "@/store/extensionsSelectors";
import { ensurePermissionsFromUserGesture } from "@/permissions/permissionsUtils";
import { checkRecipePermissions } from "@/recipes/recipePermissionsHelpers";
import { isEmpty } from "lodash";

export type ActivateResult = {
  success: boolean;
  error?: string;
};

export type ActivateRecipeFormCallback =
  /**
   * Callback for activating a recipe.
   *
   * @param {WizardValues} formValues - The form values for recipe configuration options
   * @param {RecipeDefinition} recipe - The recipe definition to install
   * @returns {Promise<ActivateResult>} a promise that resolves to an ActivateResult
   */
  (
    formValues: WizardValues,
    recipe: RecipeDefinition
  ) => Promise<ActivateResult>;

type ActivationSource = "marketplace" | "extensionConsole";

function selectActivateEventData(recipe: RecipeDefinition) {
  return {
    blueprintId: recipe.metadata.id,
    extensions: recipe.extensionPoints.map((x) => x.label),
  };
}

/**
 * React hook to install a recipe.
 *
 * Prompts the user to grant permissions if PixieBrix does not already have the required permissions.
 *
 * @param {ActivationSource} source - The source of the activation, only used for reporting purposes
 * @returns {ActivateRecipeFormCallback} - A callback that can be used to activate a recipe
 * @see useWizard
 */
function useActivateRecipe(
  source: ActivationSource
): ActivateRecipeFormCallback {
  const dispatch = useDispatch();
  const extensions = useSelector(selectExtensions);

  return useCallback(
    async (formValues: WizardValues, recipe: RecipeDefinition) => {
      const recipeExtensions = extensions.filter(
        (extension) => extension._recipe?.id === recipe.metadata.id
      );
      const isReactivate = !isEmpty(recipeExtensions);

      if (source === "extensionConsole") {
        // Note: The prefix "Marketplace" on the telemetry event name
        // here is legacy terminology from before the public marketplace
        // was created. It refers to the mod-list part of the extension
        // console, to distinguish that from the workshop.
        // It's being kept to keep our metrics history clean.
        reportEvent("MarketplaceActivate", {
          ...selectActivateEventData(recipe),
          reactivate: isReactivate,
        });
      }

      const serviceAuths = formValues.services.filter(({ config }) =>
        Boolean(config)
      );

      try {
        if (
          !(await ensurePermissionsFromUserGesture(
            await checkRecipePermissions(recipe, serviceAuths)
          ))
        ) {
          if (source === "extensionConsole") {
            // Note: The prefix "Marketplace" on the telemetry event name
            // here is legacy terminology from before the public marketplace
            // was created. It refers to the mod-list part of the extension
            // console, to distinguish that from the workshop.
            // It's being kept like this so our metrics history stays clean.
            reportEvent("MarketplaceRejectPermissions", {
              ...selectActivateEventData(recipe),
              reactivate: isReactivate,
            });
          }

          return {
            success: false,
            error: "You must accept browser permissions to activate.",
          };
        }

        await uninstallRecipe(recipe.metadata.id, recipeExtensions, dispatch);

        dispatch(
          extensionsSlice.actions.installRecipe({
            recipe,
            extensionPoints: recipe.extensionPoints,
            services: Object.fromEntries(
              formValues.services.map(({ id, config }) => [id, config])
            ),
            optionsArgs: formValues.optionsArgs,
          })
        );

        reportEvent("InstallBlueprint", {
          blueprintId: recipe.metadata.id,
          screen: source,
          reinstall: recipeExtensions.length > 0,
        });

        reactivateEveryTab();
      } catch (error) {
        const errorMessage = getErrorMessage(error);
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
    [dispatch, extensions, source]
  );
}

export default useActivateRecipe;
