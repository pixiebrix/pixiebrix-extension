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

import { type WizardValues } from "@/options/pages/marketplace/wizardTypes";
import { type RecipeDefinition } from "@/types/definitions";
import { useCallback } from "react";
import { reactivateEveryTab } from "@/background/messenger/api";
import { useDispatch, useSelector } from "react-redux";
import extensionsSlice from "@/store/extensionsSlice";
import { reportEvent } from "@/telemetry/events";
import { getErrorMessage } from "@/errors/errorHelpers";
import { uninstallRecipe } from "@/store/uninstallUtils";
import { selectExtensions } from "@/store/extensionsSelectors";
import ensureRecipePermissions from "@/hooks/activateRecipe/ensureRecipePermissions";

type ActivateResult = {
  success: boolean;
  error?: string;
};

type ActivateRecipe = (
  formValues: WizardValues,
  recipe: RecipeDefinition
) => Promise<ActivateResult>;

function useActivateRecipe(): ActivateRecipe {
  const dispatch = useDispatch();
  const extensions = useSelector(selectExtensions);

  return useCallback(
    async (formValues: WizardValues, recipe: RecipeDefinition) => {
      const serviceAuths = formValues.services.filter(({ config }) =>
        Boolean(config)
      );
      if (!(await ensureRecipePermissions(recipe, serviceAuths))) {
        return {
          success: false,
          error: "You must accept browser permissions to activate.",
        };
      }

      try {
        const recipeExtensions = extensions.filter(
          (extension) => extension._recipe?.id === recipe.metadata.id
        );

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

        reportEvent("InstallBlueprint");

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
    [dispatch]
  );
}

export default useActivateRecipe;
