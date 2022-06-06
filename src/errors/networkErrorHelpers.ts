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

import { isObject } from "@/utils";
import { Except } from "type-fest";
import { AxiosError, AxiosResponse } from "axios";
import { isEmpty, isPlainObject } from "lodash";
import { getReasonPhrase } from "http-status-codes";

/**
 * Axios offers its own serialization method, but it doesn't include the response.
 * By deleting toJSON, the serialize-error library will use its default serialization
 */
export type SerializableAxiosError = Except<AxiosError, "toJSON">;

// Copy of axios.isAxiosError, without risking to import the whole untreeshakeable axios library
export function isAxiosError(error: unknown): error is SerializableAxiosError {
  if (isObject(error) && Boolean(error.isAxiosError)) {
    // Axios offers its own serialization method, but it doesn't include the response.
    // By deleting toJSON, the serialize-error library will use its default serialization
    delete error.toJSON;
    return true;
  }

  return false;
}

export const NO_INTERNET_MESSAGE =
  "No response received. You are not connected to the internet.";
export const NO_RESPONSE_MESSAGE =
  "No response received. Your browser may have blocked the request. See https://docs.pixiebrix.com/network-errors for troubleshooting information";

export function selectNetworkErrorMessage(error: unknown): string | null {
  if (
    (isAxiosError(error) && error.response == null) ||
    (typeof (error as any).message === "string" &&
      (error as { message: string }).message.toLowerCase() === "network error")
  ) {
    if (!navigator.onLine) {
      return NO_INTERNET_MESSAGE;
    }

    return NO_RESPONSE_MESSAGE;
  }

  return null;
}

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

/**
 * Heuristically select the most user-friendly error message for an Axios response.
 *
 * Tries to handle:
 * - Errors produced by our backed (Django Rest Framework style)
 * - Common response body patterns of other APIs
 * - HTTP standards in statusText/status
 *
 * enrichBusinessRequestError is a related method which wraps an AxiosError in an Error subclass that encodes information
 * about why the request failed.
 *
 * @param response Response from the server. Must not be null
 *
 * @deprecated DO NOT CALL DIRECTLY. Call getErrorMessage
 * @see getErrorMessage
 * @see enrichBusinessRequestError
 */
export function selectServerErrorMessage(
  response: AxiosResponse
): string | null {
  if (response == null) {
    throw new Error("Expected response to be defined");
  }

  // For examples of DRF errors, see the pixiebrix-app repository:
  // http://github.com/pixiebrix/pixiebrix-app/blob/5ef1e4e414be6485fae999440b69f2b6da993668/api/tests/test_errors.py#L15-L15

  // Handle 400 responses created by DRF serializers
  if (isBadRequestResponse(response)) {
    const data = Array.isArray(response.data)
      ? response.data.find((x) => isEmpty(x))
      : response.data;

    // Prefer object-level errors
    if (data?.non_field_errors) {
      return data.non_field_errors[0];
    }

    // Take an arbitrary field
    const fieldMessages = Object.values(data)[0];

    // Take an arbitrary message
    return fieldMessages[0];
  }

  // Handle 4XX responses created by DRF
  if (isClientErrorResponse(response)) {
    return response.data.detail;
  }

  // Handle other likely API JSON body response formats
  // Some servers produce an HTML document for server responses even if you requested JSON. Check the response headers
  // to avoid dumping JSON to the user
  if (
    typeof response.data === "string" &&
    ["text/plain", "application/json"].includes(
      response.headers["content-type"]
    )
  ) {
    return response.data;
  }

  // Handle common keys from other APIs
  for (const messageKey of ["message", "reason"]) {
    // eslint-disable-next-line security/detect-object-injection -- constant defined above
    const message = response.data?.[messageKey];
    if (typeof message === "string" && !isEmpty(message)) {
      return message;
    }
  }

  // Otherwise, rely on HTTP REST statusText/status
  if (!isEmpty(response.statusText)) {
    return response.statusText;
  }

  return safeGuessStatusText(response.status);
}
