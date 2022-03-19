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

import { getReasonPhrase } from "http-status-codes";
import { AxiosResponse } from "axios";
import { isPlainObject } from "lodash";
import { isObject } from "@/utils";

/**
 * Version of getReasonPhrase that returns null for unknown status codes
 * @param code the HTML status code
 * @see getReasonPhrase statusText from the HTML standard
 */
export function safeGuessStatusText(code: string | number): string | null {
  try {
    return getReasonPhrase(code);
  } catch {
    return null;
  }
}

/**
 * DRF error shape for bad request for single object.
 */
type BadRequestObjectData = {
  // XXX: is it also still possible for __all__ to be returned if the Django (not DRF) throws an error when cleaning
  // the model? https://github.com/encode/django-rest-framework/issues/1450
  non_field_errors?: string[];
  [field: string]: string[];
};

type BadRequestData = BadRequestObjectData | BadRequestObjectData[];

type ClientErrorData = {
  detail: string;
};

function isBadRequestObjectData(data: unknown): data is BadRequestObjectData {
  if (!isPlainObject(data)) {
    return false;
  }

  return Object.values(data).every(
    (errors) =>
      Array.isArray(errors) &&
      errors.every((error) => typeof error === "string")
  );
}

function isClientErrorData(data: unknown): data is ClientErrorData {
  // We could check for status > 400 and < 500 here, but might as well just go with duck typing on the body
  return isObject(data) && typeof data.detail === "string";
}

export function isBadRequestResponse(
  response: AxiosResponse
): response is AxiosResponse<BadRequestData> {
  if (response.status !== 400) {
    return false;
  }

  if (Array.isArray(response.data)) {
    return response.data.every((item) => isBadRequestObjectData(item));
  }

  return isBadRequestObjectData(response.data);
}

export function isClientErrorResponse(
  response: AxiosResponse
): response is AxiosResponse<ClientErrorData> {
  return isClientErrorData(response.data);
}
