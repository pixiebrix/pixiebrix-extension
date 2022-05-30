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
import { AxiosError, AxiosResponse } from "axios";
import { isPlainObject } from "lodash";
import { isObject } from "@/utils";
import { isAxiosError } from "@/errors";

/**
 * Version of getReasonPhrase that returns null for unknown status codes (i.e., instead of throwing an error)
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
 * Django Rest Framework (DRF) response payload for 400 validation error response for single object.
 */
type BadRequestObjectData = {
  // XXX: is it also still possible for __all__ to be returned if the Django (not DRF) throws an error when cleaning
  // the model? See: https://github.com/encode/django-rest-framework/issues/1450
  // If __all__ the  only key, it will still end up getting reported as the error message in getErrorMessage
  non_field_errors?: string[];
  [field: string]: string[];
};

// If an array of objects is passed to an endpoint, DRF will return an array of BadRequestObjectData
type BadRequestData = BadRequestObjectData | BadRequestObjectData[];

/**
 * Django Rest Framework (DRF) response payload for 4XX error that's not associated with a serializer.
 */
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

export function isClientErrorData(data: unknown): data is ClientErrorData {
  // We could check for status > 400 and < 500 here, but might as well just go with duck typing on the body
  return isObject(data) && typeof data.detail === "string";
}

/**
 * Return true if response is a 400 Bad Request from the PixieBrix API.
 * @param response the API response
 */
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

/**
 * Return true if error is a 400 Bad Request error for a single object from the PixieBrix API.
 *
 * @param error the API error
 */
export function isSingleObjectBadRequestError(
  error: unknown
): error is AxiosError<BadRequestObjectData> {
  return (
    isAxiosError(error) &&
    isBadRequestResponse(error.response) &&
    !Array.isArray(error.response.data)
  );
}

/**
 * Return true if response is a 4XX request error from the PixieBrix API.
 *
 * Use isBadRequestResponse for 400 request errors.
 *
 * @param response the API response
 * @see isBadRequestResponse
 */
export function isClientErrorResponse(
  response: AxiosResponse
): response is AxiosResponse<ClientErrorData> {
  return isClientErrorData(response.data);
}
