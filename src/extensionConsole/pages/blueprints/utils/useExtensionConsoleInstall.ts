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

import { reportEvent } from "@/telemetry/events";
import { type RecipeDefinition } from "@/types/recipeTypes";
import notify from "@/utils/notify";
import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import { type FormikHelpers } from "formik";
import { type WizardValues } from "@/activation/wizardTypes";
import { reactivateEveryTab } from "@/background/messenger/api";
import { push } from "connected-react-router";
import useMilestones from "@/hooks/useMilestones";
import { useCreateMilestoneMutation } from "@/services/api";
import blueprintsSlice from "@/extensionConsole/pages/blueprints/blueprintsSlice";
import { BLUEPRINTS_PAGE_TABS } from "@/extensionConsole/pages/blueprints/BlueprintsPageSidebar";
import { uninstallRecipe } from "@/store/uninstallUtils";
import { actions as extensionActions } from "@/store/extensionsSlice";
import { selectExtensionsForRecipe } from "@/store/extensionsSelectors";
import { getRequiredServiceIds } from "@/utils/recipeUtils";
import { checkRecipePermissions } from "@/recipes/recipePermissionsHelpers";

type InstallRecipeFormCallback = (
  values: WizardValues,
  helpers: FormikHelpers<WizardValues>
) => Promise<void>;

/**
 * React hook to install a recipe, suitable for using as a Formik `onSubmit` handler.
 *
 * NOTE: the user should have already granted required permissions before installing the recipe.
 *
 * Checks/Performs:
 * - That integration configurations have been selected for all required services
 * - That PixieBrix has all required permissions for the mod
 * - Uninstalls mod IExtensions if any are already installed
 * - Install the mod
 * - Redirects to the active mods screen
 *
 * @param recipe the blueprint definition to install
 * @see useEnsurePermissions
 * @see useMarketplaceActivateRecipe
 */
function useExtensionConsoleInstall(
  recipe: RecipeDefinition
): InstallRecipeFormCallback {
  const dispatch = useDispatch();
  const [createMilestone] = useCreateMilestoneMutation();
  const { hasMilestone } = useMilestones();

  const recipeId = recipe.metadata.id;
  const activeRecipeExtensions = useSelector(
    selectExtensionsForRecipe(recipeId)
  );

  return useCallback(
    async (values, { setSubmitting }: FormikHelpers<WizardValues>) => {
      console.debug("Wizard form values", values);

      const requiredServiceIds = getRequiredServiceIds(recipe);
      const missingServiceIds = values.services
        .filter(
          ({ id, config }) => requiredServiceIds.includes(id) && config == null
        )
        .map((x) => x.id);

      const configuredAuths = values.services.filter(({ config }) => config);

      const { hasPermissions } = await checkRecipePermissions(
        recipe,
        configuredAuths
      );

      if (missingServiceIds.length > 0) {
        const missing = missingServiceIds.join(", ");
        notify.error({
          message: `You must select a configuration for each integration: ${missing}`,
          reportError: false,
        });
        setSubmitting(false);
        return;
      }

      if (!hasPermissions) {
        notify.error({
          message:
            "You must accept browser permissions for the selected bricks",
          reportError: false,
        });
        setSubmitting(false);
        return;
      }

      try {
        await uninstallRecipe(recipeId, activeRecipeExtensions, dispatch);

        dispatch(
          extensionActions.installRecipe({
            recipe,
            extensionPoints: recipe.extensionPoints,
            services: Object.fromEntries(
              values.services.map(({ id, config }) => [id, config])
            ),
            optionsArgs: values.optionsArgs,
          })
        );

        notify.success(`Installed ${recipe.metadata.name}`);

        reportEvent("InstallBlueprint", {
          blueprintId: recipeId,
          screen: "extensionConsole",
          reinstall: activeRecipeExtensions.length > 0,
        });

        if (!hasMilestone("first_time_public_blueprint_install")) {
          await createMilestone({
            key: "first_time_public_blueprint_install",
            metadata: {
              blueprintId: recipeId,
            },
          });

          dispatch(
            blueprintsSlice.actions.setActiveTab(
              BLUEPRINTS_PAGE_TABS.getStarted
            )
          );
        }

        setSubmitting(false);

        reactivateEveryTab();

        dispatch(push("/mods"));
      } catch (error) {
        notify.error({
          message: `Error installing ${recipe.metadata.name}`,
          error,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [
      createMilestone,
      dispatch,
      hasMilestone,
      recipe,
      activeRecipeExtensions,
      recipeId,
    ]
  );
}

export default useExtensionConsoleInstall;
