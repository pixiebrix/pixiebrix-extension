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

/* eslint-disable promise/prefer-await-to-then -- TODO: This can probably be refactored to be more linear */

import { castArray, pick } from "lodash";
import { useCallback } from "react";
import { useHistory } from "react-router";
import { push } from "connected-react-router";
import { useDispatch } from "react-redux";
import { EditorValues } from "./Editor";
import { BrickValidationResult, validateSchema } from "./validate";
import useRefresh from "@/hooks/useRefresh";
import { Definition, UnsavedRecipeDefinition } from "@/types/definitions";
import useReinstall from "@/options/pages/blueprints/utils/useReinstall";
import notify from "@/utils/notify";
import { reportEvent } from "@/telemetry/events";
import { getLinkedApiClient } from "@/services/apiClient";
import {
  clearServiceCache,
  reactivateEveryTab,
} from "@/background/messenger/api";
import { loadBrickYaml } from "@/runtime/brickYaml";
import { PackageUpsertResponse } from "@/types/contract";
import { appApi } from "@/services/api";
import { isSingleObjectBadRequestError } from "@/types/errorContract";

type SubmitOptions = {
  create: boolean;
  url: string;
};

type SubmitCallbacks = {
  validate: (values: EditorValues) => Promise<BrickValidationResult>;
  remove: () => Promise<void>;
  submit: (
    values: EditorValues,
    helpers: { setErrors: (errors: unknown) => void }
  ) => Promise<void>;
};

function useSubmitBrick({
  create = false,
  url,
}: SubmitOptions): SubmitCallbacks {
  const [, refresh] = useRefresh({ refreshOnMount: false });
  const reinstall = useReinstall();
  const history = useHistory();
  const dispatch = useDispatch();

  const validate = useCallback(
    async (values: EditorValues) => validateSchema(values.config),
    []
  );

  const remove = useCallback(async () => {
    try {
      const client = await getLinkedApiClient();
      await client.delete(url);
    } catch (error) {
      notify.error({ message: "Error deleting brick", error });
      return;
    }

    notify.success("Deleted brick");
    reportEvent("BrickDelete");

    dispatch(appApi.util.invalidateTags(["Recipes", "EditablePackages"]));
    dispatch(push("/workshop"));
  }, [url, dispatch]);

  const submit = useCallback(
    async (values, { setErrors, resetForm }) => {
      const { config, reactivate: reinstallBlueprint } = values;

      const unsavedBrickJson = loadBrickYaml(config) as
        | Definition
        | UnsavedRecipeDefinition;
      const { kind, metadata } = unsavedBrickJson;

      try {
        const client = await getLinkedApiClient();
        const { data } = await client[
          create ? "post" : "put"
        ]<PackageUpsertResponse>(url, {
          ...values,
          kind,
        });

        // We attach the handler below, and don't want it to block the save
        let refreshPromise: Promise<void>;
        if (kind === "recipe" && reinstallBlueprint) {
          // TypeScript doesn't have enough information to kind === "recipe" distinguishes RecipeDefinition from
          // Definition
          const unsavedRecipeDefinition =
            unsavedBrickJson as UnsavedRecipeDefinition;
          refreshPromise = reinstall({
            ...unsavedRecipeDefinition,
            sharing: pick(data, ["organizations", "public"]),
            ...pick(data, ["updated_at"]),
          });
        } else if (kind === "service") {
          // Fetch the remote definitions, then clear the background page's service cache so it's forced to read the
          // updated service definition.
          refreshPromise = refresh().then(async () => clearServiceCache());
        } else {
          refreshPromise = refresh();
        }

        notify.success(`${create ? "Created" : "Updated"} ${metadata.name}`);

        refreshPromise
          .then(() => {
            reactivateEveryTab();
          })
          .catch((error) => {
            notify.warning({
              message: "Error re-activating bricks",
              error,
            });
          });

        // Reset initial values of the form so dirty=false
        resetForm({ values });

        dispatch(appApi.util.invalidateTags(["Recipes", "EditablePackages"]));

        if (create) {
          history.push(`/workshop/bricks/${data.id}/`);
        }
      } catch (error) {
        console.debug("Got validation error", error);

        if (isSingleObjectBadRequestError(error)) {
          for (const message of castArray(error.response.data.__all__ ?? [])) {
            notify.error(message);
          }

          setErrors(error.response.data);
        } else {
          notify.error({ error });
        }
      }
    },
    [dispatch, history, refresh, reinstall, url, create]
  );

  return { submit, validate, remove: create ? null : remove };
}

export default useSubmitBrick;
