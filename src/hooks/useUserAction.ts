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

import { DependencyList, useCallback } from "react";
import notify from "@/utils/notify";
import { CancelError, getErrorMessage, isAxiosError } from "@/errors";
import { reportEvent } from "@/telemetry/events";
import { AxiosResponse } from "axios";

type Options = {
  event?: string;
  errorMessage?: string;
  successMessage?: string;
};

function selectResponseText(response: AxiosResponse): string {
  if (response.status === 400) {
    // Do some basic parsing of Django/DRF 400 messages

    if (typeof response.data === "string") {
      return response.data;
    }

    if (
      typeof response.data === "object" &&
      "__all__" in response.data &&
      Array.isArray(response.data.__all__)
    ) {
      return response.data.__all__[0];
    }

    if (Array.isArray(response.data) && typeof response.data[0] === "string") {
      return response.data[0];
    }
  }

  return response.statusText;
}

export function getHumanDetail(error: unknown): string {
  try {
    if (isAxiosError(error)) {
      return selectResponseText(error.response);
    }
  } catch {
    // We tried - just fall back to our default message extraction
  }

  return getErrorMessage(error);
}

/**
 * Replacement for useCallback that handles success/error notifications and telemetry.
 */
function useUserAction<T extends (...args: never[]) => unknown>(
  callback: T,
  options: Options,
  deps: DependencyList
): T {
  const { event, successMessage, errorMessage = "An error occurred" } = options;

  const enhancedCallback = (async (...args) => {
    try {
      const rv = await callback(...args);

      if (successMessage) {
        notify.success(successMessage);
      }

      if (event) {
        reportEvent(event);
      }

      return rv;
    } catch (error) {
      if (error instanceof CancelError) {
        return;
      }

      const detail = getHumanDetail(error);
      notify.error(`${errorMessage}: ${detail}`, {
        error,
      });
    }
  }) as T;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally leaving callback out of deps
  return useCallback<T>(enhancedCallback, [
    ...deps,
    options,
    errorMessage,
    event,
    successMessage,
  ]);
}

export default useUserAction;
