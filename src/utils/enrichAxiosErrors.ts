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

import axios from "axios";
import { expectContext } from "@/utils/expectContext";
import { getErrorMessage, isAxiosError } from "@/errors";
import { assertHttpsUrl } from "@/utils";
import {
  ClientNetworkError,
  ClientNetworkPermissionError,
  RemoteServiceError,
} from "@/services/errors";

// eslint-disable-next-line prefer-destructuring -- It breaks EnvironmentPlugin
const SERVICE_URL = process.env.SERVICE_URL;

export default function enrichAxiosErrors(): void {
  expectContext("extension");

  // Automatically wraps common Axios errors whenever possible
  // https://axios-http.com/docs/interceptors
  axios.interceptors.response.use(undefined, enrichBusinessRequestError);
}

/**
 * Turn AxiosErrors into BusinessErrors whenever possible
 */
async function enrichBusinessRequestError(error: unknown): Promise<never> {
  console.trace("enrichBusinessError", { error });

  // Exclude unrelated errors and app errors
  if (!isAxiosError(error) || error.config.url.startsWith(SERVICE_URL)) {
    throw error;
  }

  // This should have already been called before attempting the request because Axios does not actually catch invalid URLs
  const url = assertHttpsUrl(error.config.url);

  if (error.response) {
    throw new RemoteServiceError(getErrorMessage(error), error);
  }

  const hasPermissions = await browser.permissions.contains({
    origins: [url.href],
  });

  if (!hasPermissions) {
    throw new ClientNetworkPermissionError(
      "Insufficient browser permissions to make request.",
      error
    );
  }

  throw new ClientNetworkError(
    "No response received. Your browser may have blocked the request. See https://docs.pixiebrix.com/network-errors for troubleshooting information",
    error
  );
}
