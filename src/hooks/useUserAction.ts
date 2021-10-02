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

import { DependencyList, useCallback } from "react";
import useNotifications from "@/hooks/useNotifications";
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

    const data = response.data?.__all__ ?? response.data;
    if (Array.isArray(data) && typeof data[0] === "string") {
      return data[0];
    }
  }

  return response.statusText;
}

export function getHumanDetail(error: unknown): string {
  if (isAxiosError(error)) {
    return selectResponseText(error.response);
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
  const notify = useNotifications();
  const { event, successMessage, errorMessage = "An error occurred" } = options;

  // @ts-expect-error -- need to figure out how to correct the types on this
  const enhancedCallback: T = async (...args) => {
    try {
      const rv = await callback(...args);

      if (successMessage) {
        notify.success(successMessage);
      }

      if (event) {
        reportEvent(event);
      }

      return rv;
    } catch (error: unknown) {
      if (error instanceof CancelError) {
        return;
      }

      const detail = getHumanDetail(error);
      notify.error(`${errorMessage}: ${detail}`, {
        error,
      });
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally leaving callback out of deps
  return useCallback<T>(enhancedCallback, [
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is a `DependencyList`
    ...deps,
    notify,
    options,
    errorMessage,
    event,
    successMessage,
  ]);
}

export default useUserAction;
