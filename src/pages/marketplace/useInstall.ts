/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { RecipeDefinition } from "@/types/definitions";
import useNotifications from "@/hooks/useNotifications";
import { useDispatch } from "react-redux";
import { useParams } from "react-router";
import { useCallback } from "react";
import { FormikHelpers } from "formik";
import { WizardValues } from "@/options/pages/marketplace/wizard";
import { selectedExtensions } from "@/options/pages/marketplace/ConfigureBody";
import { pickBy, uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/registry";
import { containsPermissions, mergePermissions } from "@/utils/permissions";
import { collectPermissions } from "@/permissions";
import { reactivate } from "@/background/navigation";
import { push } from "connected-react-router";
import { optionsSlice } from "@/options/slices";

const { installRecipe } = optionsSlice.actions;

type InstallRecipe = (
  values: WizardValues,
  helpers: FormikHelpers<WizardValues>
) => Promise<void>;

function useInstall(recipe: RecipeDefinition): InstallRecipe {
  const notify = useNotifications();
  const dispatch = useDispatch();
  const { sourcePage } = useParams<{ sourcePage: string }>();

  return useCallback(
    async (values, { setSubmitting }: FormikHelpers<WizardValues>) => {
      console.debug("Wizard form values", values);

      const selected = selectedExtensions(values, recipe.extensionPoints);
      const requiredServiceIds = uniq(
        selected
          .flatMap((x) => Object.values(x.services ?? {}))
          .filter((x) => x !== PIXIEBRIX_SERVICE_ID)
      );
      const missingServiceIds = Object.keys(
        pickBy(
          values.services,
          (v, k) => requiredServiceIds.includes(k) && v == null
        )
      );

      const configuredAuths = Object.entries(values.services)
        .filter((x) => x[1])
        .map(([id, config]) => ({ id, config }));

      const enabled = await containsPermissions(
        mergePermissions(await collectPermissions(selected, configuredAuths))
      );

      if (selected.length === 0) {
        notify.error("Select at least one brick to activate", {
          report: false,
        });
        setSubmitting(false);
        return;
      }

      if (missingServiceIds.length > 0) {
        const missing = missingServiceIds.join(", ");
        notify.error(
          `You must select a configuration for each service: ${missing}`,
          {
            report: false,
          }
        );
        setSubmitting(false);
        return;
      }

      if (!enabled) {
        notify.error(
          "You must grant browser permissions for the selected bricks",
          {
            report: false,
          }
        );
        setSubmitting(false);
        return;
      }

      try {
        dispatch(
          installRecipe({
            recipe,
            extensionPoints: selected,
            services: values.services,
            optionsArgs: values.optionsArgs,
          })
        );

        notify.success(`Installed ${recipe.metadata.name}`);

        setSubmitting(false);

        void reactivate();

        dispatch(
          push(sourcePage === "templates" ? "/templates" : "/installed")
        );
      } catch (error: unknown) {
        notify.error(`Error installing ${recipe.metadata.name}`, {
          error,
        });
        setSubmitting(false);
      }
    },
    [notify, dispatch, sourcePage, recipe]
  );
}

export default useInstall;
