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

import { castArray, pick } from "lodash";
import { useCallback } from "react";
import { useHistory } from "react-router";
import { push } from "connected-react-router";
import { useDispatch } from "react-redux";
import { type EditorValues } from "./Editor";
import { type BrickValidationResult, validateSchema } from "./validate";
import useRefreshRegistries from "@/hooks/useRefreshRegistries";
import useReinstall from "@/extensionConsole/pages/blueprints/utils/useReinstall";
import notify from "@/utils/notify";
import { reportEvent } from "@/telemetry/events";
import {
  clearServiceCache,
  reactivateEveryTab,
} from "@/background/messenger/api";
import { loadBrickYaml } from "@/runtime/brickYaml";
import {
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
} from "@/services/api";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { type UUID } from "@/types/stringTypes";
import { type UnsavedRecipeDefinition } from "@/types/recipeTypes";
import { type Definition } from "@/types/registryTypes";

type SubmitOptions = {
  create: boolean;
};

type SubmitCallbacks = {
  validate: (values: EditorValues) => Promise<BrickValidationResult>;
  remove: (id: UUID) => Promise<void>;
  submit: (
    values: EditorValues,
    helpers: { setErrors: (errors: unknown) => void }
  ) => Promise<void>;
};

function useSubmitBrick({ create = false }: SubmitOptions): SubmitCallbacks {
  const [, refresh] = useRefreshRegistries({ refreshOnMount: false });
  const reinstall = useReinstall();
  const history = useHistory();
  const dispatch = useDispatch();

  const validate = useCallback(
    async (values: EditorValues) => validateSchema(values.config),
    []
  );

  const [createPackage] = useCreatePackageMutation();
  const [updatePackage] = useUpdatePackageMutation();
  const [deletePackage] = useDeletePackageMutation();

  const remove = useCallback(
    async (id: UUID) => {
      try {
        await deletePackage({ id }).unwrap();
      } catch (error) {
        notify.error({ message: "Error deleting brick", error });
        return;
      }

      notify.success("Deleted brick");
      reportEvent("BrickDelete");

      dispatch(push("/workshop"));
    },
    [dispatch, deletePackage]
  );

  const submit = useCallback(
    async (values, { setErrors, resetForm }) => {
      const { config, reactivate: reinstallBlueprint } = values;

      const unsavedBrickJson = loadBrickYaml(config) as
        | Definition
        | UnsavedRecipeDefinition;
      const { kind, metadata } = unsavedBrickJson;

      try {
        const data = await (create
          ? createPackage({ ...values, kind })
          : updatePackage({ ...values, kind })
        ).unwrap();

        // We attach the handler below, and don't want it to block the save
        void (async () => {
          try {
            if (kind === "recipe" && reinstallBlueprint) {
              // TypeScript doesn't have enough information to kind === "recipe" distinguishes RecipeDefinition from
              // Definition
              const unsavedRecipeDefinition =
                unsavedBrickJson as UnsavedRecipeDefinition;
              await reinstall({
                ...unsavedRecipeDefinition,
                sharing: pick(data, ["organizations", "public"]),
                ...pick(data, ["updated_at"]),
              });
            } else {
              await refresh();
            }

            if (kind === "service") {
              // Clear the background page's service cache after refreshing so
              // it's forced to read the updated service definition.
              await clearServiceCache();
            }

            reactivateEveryTab();
          } catch (error) {
            notify.warning({
              message: "Error re-activating bricks",
              error,
            });
          }
        })();

        notify.success(`${create ? "Created" : "Updated"} ${metadata.name}`);

        // Reset initial values of the form so dirty=false
        resetForm({ values });

        if (create) {
          history.push(`/workshop/bricks/${data.id}/`);
        }
      } catch (error) {
        console.debug("Got validation error", error);

        if (isSingleObjectBadRequestError(error)) {
          // Backend returns non_field_errors for DRF validation errors and __all__ for Django errors. The backend
          // should not longer be returning __all__ errors, but we keep it here to be defensive
          const {
            config: configErrors,
            non_field_errors = [],
            __all__ = [],
            ...otherErrors
          } = error.response.data;

          for (const message of [...non_field_errors, ...__all__]) {
            notify.error(message);
          }

          if (configErrors) {
            setErrors({ config: configErrors });
          }

          for (const [field, messages] of Object.entries(otherErrors)) {
            for (const message of castArray(messages)) {
              notify.error({
                message: `Invalid ${field}`,
                error: new Error(message),
              });
            }
          }
        } else {
          notify.error({ error });
        }
      }
    },
    [history, refresh, reinstall, create, createPackage, updatePackage]
  );

  return { submit, validate, remove: create ? null : remove };
}

export default useSubmitBrick;
