/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import yaml from "js-yaml";
import { makeURL } from "@/hooks/fetch";
import { castArray, isPlainObject } from "lodash";
import { useCallback } from "react";
import { useHistory } from "react-router";
import { push } from "connected-react-router";
import { useDispatch } from "react-redux";
import { useToasts } from "react-toast-notifications";
import { EditorValues } from "./Editor";
import { validateSchema } from "./validate";
import axios from "axios";
import { getExtensionToken } from "@/auth/token";
import { useRefresh } from "@/hooks/refresh";
import { reactivate } from "@/background/navigation";
import { useReinstall } from "@/options/pages/marketplace/ActivateWizard";
import { RecipeDefinition, Definition } from "@/types/definitions";
import { reportError } from "@/telemetry/logging";

interface SubmitOptions {
  create: boolean;
  url: string;
}

interface SubmitCallbacks {
  validate: (values: EditorValues) => Promise<any>;
  remove: () => Promise<void>;
  submit: (
    values: EditorValues,
    helpers: { setErrors: (errors: any) => void }
  ) => Promise<void>;
}

function useSubmitBrick({
  create = false,
  url,
}: SubmitOptions): SubmitCallbacks {
  const [, refresh] = useRefresh(false);
  const reinstall = useReinstall();
  const history = useHistory();
  const { addToast } = useToasts();
  const dispatch = useDispatch();

  const validate = useCallback(
    async (values: EditorValues) => validateSchema(values.config),
    []
  );

  const remove = useCallback(async () => {
    try {
      await axios({
        url: await makeURL(url),
        method: "delete",
        headers: { Authorization: `Token ${await getExtensionToken()}` },
      });
    } catch {
      addToast("Error deleting brick", {
        appearance: "success",
        autoDismiss: true,
      });
      return;
    }
    addToast("Deleted brick", {
      appearance: "success",
      autoDismiss: true,
    });
    dispatch(push("/workshop"));
  }, [addToast, url, dispatch]);

  const submit = useCallback(
    async (values, { setErrors, resetForm }) => {
      const { config, reactivate: reinstallBlueprint } = values;

      const json = yaml.load(config) as Definition | RecipeDefinition;
      const { kind, metadata } = json;

      try {
        const response = await axios({
          url: await makeURL(url),
          method: create ? "post" : "put",
          data: { ...values, kind },
          headers: { Authorization: `Token ${await getExtensionToken()}` },
        });

        const { data } = response;

        // We attach the handler below, and don't want it to block the save
        // noinspection ES6MissingAwait
        const refreshPromise =
          kind === "recipe" && reinstallBlueprint
            ? reinstall(json as RecipeDefinition)
            : refresh();

        addToast(`${create ? "Created" : "Updated"} ${metadata.name}`, {
          appearance: "success",
          autoDismiss: true,
        });

        refreshPromise
          .then(() => reactivate())
          .catch((error) => {
            reportError(error);
            console.warn("An error occurred when re-activating bricks", error);
            addToast(`Error re-activating bricks: ${error}`, {
              appearance: "warning",
              autoDismiss: true,
            });
          });

        // reset initial values of the form so dirty=false
        resetForm({ values });

        if (create) {
          history.push(`/workshop/bricks/${data.id}/`);
        }
      } catch (error) {
        console.debug("Got validation error", error);
        if (isPlainObject(error.response?.data)) {
          castArray(error.response.data.__all__ ?? []).map((message) => {
            addToast(`Error: ${message} `, {
              appearance: "error",
              autoDismiss: true,
            });
          });
          setErrors(error.response.data);
        } else {
          addToast(error.toString(), {
            appearance: "error",
            autoDismiss: true,
          });
        }
      }
    },
    [history, refresh, reinstall, url, create, addToast]
  );

  return { submit, validate, remove: !create ? remove : null };
}

export default useSubmitBrick;
