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

import { castArray, pick } from "lodash";
import { useCallback } from "react";
import { useHistory } from "react-router";
import { push } from "connected-react-router";
import { useDispatch } from "react-redux";
import { type EditorValues } from "./Editor";
import { type BrickValidationResult, validateSchema } from "./validate";
import useRefreshRegistries from "@/hooks/useRefreshRegistries";
import useReactivateMod from "@/extensionConsole/pages/mods/utils/useReactivateMod";
import notify from "@/utils/notify";
import { Events } from "@/telemetry/events";
import { clearIntegrationRegistry } from "@/background/messenger/api";
import { loadBrickYaml } from "@/runtime/brickYaml";
import {
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
} from "@/data/service/api";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { type UUID } from "@/types/stringTypes";
import { type UnsavedModDefinition } from "@/types/modDefinitionTypes";
import { type Definition, DefinitionKinds } from "@/types/registryTypes";
import useUserAction from "@/hooks/useUserAction";
import { useModals } from "@/components/ConfirmationModal";
import { CancelError } from "@/errors/businessErrors";
import { reloadModsEveryTab } from "@/contentScript/messenger/api";

type SubmitOptions = {
  create: boolean;
};

type SubmitCallbacks = {
  validate: (values: EditorValues) => Promise<BrickValidationResult>;
  remove: (({ id, name }: { id: UUID; name: string }) => Promise<void>) | null;
  submit: (
    values: EditorValues & { id: UUID },
    helpers: { setErrors: (errors: unknown) => void },
  ) => Promise<void>;
};

function useSubmitPackage({ create = false }: SubmitOptions): SubmitCallbacks {
  const [, refresh] = useRefreshRegistries({ refreshOnMount: false });
  const modals = useModals();
  const reinstall = useReactivateMod();
  const history = useHistory();
  const dispatch = useDispatch();

  const validate = useCallback(
    async (values: EditorValues) => validateSchema(values.config),
    [],
  );

  const [createPackage] = useCreatePackageMutation();
  const [updatePackage] = useUpdatePackageMutation();
  const [deletePackage] = useDeletePackageMutation();

  const remove = useUserAction(
    async ({ id, name }: { id: UUID; name?: string }) => {
      const confirm = await modals.showConfirmation({
        title: "Permanently Delete Package",
        message: `Permanently delete ${
          name ?? "package"
        } from the server? This action cannot be undone.`,
        cancelCaption: "Cancel",
        submitCaption: "Permanently Delete",
        submitVariant: "danger",
      });

      if (!confirm) {
        throw new CancelError("User cancelled delete");
      }

      await deletePackage({ id }).unwrap();

      dispatch(push("/workshop"));
    },
    {
      successMessage: "Deleted package",
      errorMessage: "Error deleting package",
      event: Events.PACKAGE_DELETE,
    },
    [dispatch, deletePackage, modals],
  );

  const submit = useCallback(
    async (
      values: EditorValues & { id: UUID },
      {
        setErrors,
        resetForm,
      }: {
        setErrors: (errors: unknown) => void;
        resetForm: (form: { values: EditorValues & { id: UUID } }) => void;
      },
    ) => {
      const { config, reactivate: reactivateMod } = values;

      const unsavedPackageJson = loadBrickYaml(String(config)) as
        | Definition
        | UnsavedModDefinition;
      const { kind, metadata } = unsavedPackageJson;

      try {
        const data = await (create
          ? createPackage({ ...values, kind })
          : updatePackage({ ...values, kind })
        ).unwrap();

        // We attach the handler below, and don't want it to block the save
        void (async () => {
          try {
            if (kind === DefinitionKinds.MOD && reactivateMod) {
              // TypeScript doesn't have enough information that kind === PackageKinds.MOD distinguishes ModDefinition
              // from Definition
              const unsavedModDefinition =
                unsavedPackageJson as UnsavedModDefinition;
              await reinstall({
                ...unsavedModDefinition,
                sharing: pick(data, ["organizations", "public"]),
                ...pick(data, ["updated_at"]),
              });
            } else {
              await refresh();
            }

            if (kind === DefinitionKinds.INTEGRATION) {
              // Clear the background page's service cache after refreshing so
              // it's forced to read the updated service definition.
              await clearIntegrationRegistry();
            }

            reloadModsEveryTab();
          } catch (error) {
            notify.warning({
              message: "Error re-activating mod",
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
    [history, refresh, reinstall, create, createPackage, updatePackage],
  );

  return { submit, validate, remove: create ? null : remove };
}

export default useSubmitPackage;
