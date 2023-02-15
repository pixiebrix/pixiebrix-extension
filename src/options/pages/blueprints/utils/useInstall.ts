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
import { type RecipeDefinition } from "@/types/definitions";
import notify from "@/utils/notify";
import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import { type FormikHelpers } from "formik";
import { type WizardValues } from "@/options/pages/marketplace/wizardTypes";
import { uniq } from "lodash";
import {
  containsPermissions,
  reactivateEveryTab,
} from "@/background/messenger/api";
import { collectPermissions } from "@/permissions";
import { push } from "connected-react-router";
import { resolveRecipe } from "@/registry/internal";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import useMilestones from "@/hooks/useMilestones";
import { useCreateMilestoneMutation } from "@/services/api";
import blueprintsSlice from "@/options/pages/blueprints/blueprintsSlice";
import { BLUEPRINTS_PAGE_TABS } from "@/options/pages/blueprints/BlueprintsPageSidebar";
import { uninstallRecipe } from "./uninstallRecipe";
import { actions as extensionActions } from "@/store/extensionsSlice";
import { selectExtensionsForRecipe } from "@/store/extensionsSelectors";

type InstallRecipe = (
  values: WizardValues,
  helpers: FormikHelpers<WizardValues>
) => Promise<void>;

function useInstall(recipe: RecipeDefinition): InstallRecipe {
  const dispatch = useDispatch();
  const [createMilestone] = useCreateMilestoneMutation();
  const { hasMilestone } = useMilestones();
  const { setActiveTab } = blueprintsSlice.actions;

  const recipeId = recipe.metadata.id;
  const recipeExtensions = useSelector(selectExtensionsForRecipe(recipeId));

  return useCallback(
    async (values, { setSubmitting }: FormikHelpers<WizardValues>) => {
      console.debug("Wizard form values", values);

      const requiredServiceIds = uniq(
        recipe.extensionPoints
          .flatMap((x) => Object.values(x.services ?? {}))
          .filter((x) => x !== PIXIEBRIX_SERVICE_ID)
      );
      const missingServiceIds = values.services
        .filter(
          ({ id, config }) => requiredServiceIds.includes(id) && config == null
        )
        .map((x) => x.id);

      const configuredAuths = values.services.filter(({ config }) => config);

      const enabled = await containsPermissions(
        await collectPermissions(
          await resolveRecipe(recipe, recipe.extensionPoints),
          configuredAuths
        )
      );

      if (missingServiceIds.length > 0) {
        const missing = missingServiceIds.join(", ");
        notify.error({
          message: `You must select a configuration for each service: ${missing}`,
          reportError: false,
        });
        setSubmitting(false);
        return;
      }

      if (!enabled) {
        notify.error({
          message:
            "You must accept browser permissions for the selected bricks",
          reportError: false,
        });
        setSubmitting(false);
        return;
      }

      try {
        await uninstallRecipe(recipeId, recipeExtensions, dispatch);

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
        reportEvent("InstallBlueprint");

        if (!hasMilestone("first_time_public_blueprint_install")) {
          await createMilestone({
            key: "first_time_public_blueprint_install",
            metadata: {
              blueprintId: recipeId,
            },
          });

          dispatch(setActiveTab(BLUEPRINTS_PAGE_TABS.getStarted));
        }

        setSubmitting(false);

        reactivateEveryTab();

        dispatch(push("/blueprints"));
      } catch (error) {
        notify.error({
          message: `Error installing ${recipe.metadata.name}`,
          error,
        });
        setSubmitting(false);
      }
    },
    [
      createMilestone,
      dispatch,
      hasMilestone,
      recipe,
      recipeExtensions,
      recipeId,
      setActiveTab,
    ]
  );
}

export default useInstall;
