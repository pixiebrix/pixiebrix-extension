/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { RecipeDefinition } from "@/types/definitions";
import notify from "@/utils/notify";
import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import { FormikHelpers } from "formik";
import { WizardValues } from "@/options/pages/marketplace/wizardTypes";
import { selectedExtensions } from "@/options/pages/marketplace/ConfigureBody";
import { uniq } from "lodash";
import {
  containsPermissions,
  reactivateEveryTab,
} from "@/background/messenger/api";
import { collectPermissions } from "@/permissions";
import { push } from "connected-react-router";
import { resolveRecipe } from "@/registry/internal";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import extensionsSlice from "@/store/extensionsSlice";
import useFlags from "@/hooks/useFlags";
import { selectSettings } from "@/store/settingsSelectors";

const { installRecipe } = extensionsSlice.actions;

type InstallRecipe = (
  values: WizardValues,
  helpers: FormikHelpers<WizardValues>
) => Promise<void>;

function useInstall(recipe: RecipeDefinition): InstallRecipe {
  const dispatch = useDispatch();
  const { flagOn } = useFlags();
  const { isBlueprintsPageEnabled } = useSelector(selectSettings);

  return useCallback(
    async (values, { setSubmitting }: FormikHelpers<WizardValues>) => {
      console.debug("Wizard form values", values);

      const selected = selectedExtensions(values, recipe.extensionPoints);
      const requiredServiceIds = uniq(
        selected
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
          await resolveRecipe(recipe, selected),
          configuredAuths
        )
      );

      if (selected.length === 0) {
        notify.error({
          message: "Select at least one brick to activate",
          reportError: false,
        });
        setSubmitting(false);
        return;
      }

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
        dispatch(
          installRecipe({
            recipe,
            extensionPoints: selected,
            services: Object.fromEntries(
              values.services.map(({ id, config }) => [id, config])
            ),
            optionsArgs: values.optionsArgs,
          })
        );

        notify.success(`Installed ${recipe.metadata.name}`);
        reportEvent("InstallBlueprint");

        setSubmitting(false);

        reactivateEveryTab();

        if (isBlueprintsPageEnabled) {
          dispatch(push("/blueprints"));
        } else {
          dispatch(push("/installed"));
        }
      } catch (error) {
        notify.error({
          message: `Error installing ${recipe.metadata.name}`,
          error,
        });
        setSubmitting(false);
      }
    },
    [flagOn, dispatch, recipe]
  );
}

export default useInstall;
