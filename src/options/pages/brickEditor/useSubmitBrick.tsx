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
import isPlainObject from "lodash/isPlainObject";
import castArray from "lodash/castArray";
import { useCallback } from "react";
import { useHistory } from "react-router";
import { useToasts } from "react-toast-notifications";
import { EditorValues } from "./Editor";
import { validateSchema } from "./validate";
import { proxyService } from "@/background/requests";
import { pixieServiceFactory } from "@/services/locator";

interface SubmitOptions {
  create: boolean;
  url: string;
}

interface SubmitCallbacks {
  validate: (values: EditorValues) => Promise<any>;
  submit: (
    values: EditorValues,
    helpers: { setErrors: (errors: any) => void }
  ) => Promise<void>;
}

function useSubmitBrick({
  create = false,
  url,
}: SubmitOptions): SubmitCallbacks {
  const history = useHistory();
  const { addToast } = useToasts();

  const validate = useCallback(
    async (values: EditorValues) => await validateSchema(values.config),
    []
  );

  const submit = useCallback(
    async (values, { setErrors }) => {
      const { kind, metadata } = yaml.safeLoad(values.config) as any;
      try {
        const { data } = (await proxyService(await pixieServiceFactory(), {
          url: await makeURL(url),
          method: create ? "post" : "put",
          data: { ...values, kind },
        })) as any;
        addToast(`${create ? "Created" : "Updated"} ${metadata.name}`, {
          appearance: "success",
          autoDismiss: true,
        });
        if (create) {
          history.push(`/workshop/bricks/${data.id}/`);
        }
      } catch (ex) {
        if (isPlainObject(ex.response?.data)) {
          castArray(ex.response.data.__all__ ?? []).map((message) => {
            addToast(`Error: ${message} `, {
              appearance: "error",
              autoDismiss: true,
            });
          });
          setErrors(ex.response.data);
        } else {
          addToast(ex.toString(), {
            appearance: "error",
            autoDismiss: true,
          });
        }
      }
    },
    [url, create]
  );

  return { submit, validate };
}

export default useSubmitBrick;
