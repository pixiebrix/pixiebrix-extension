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
import type { NetworkRequestConfig } from "../../types/networkTypes";
import { type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import { serializeError } from "serialize-error";
import { isAxiosError } from "@/errors/networkErrorHelpers";
import { getApiClient, getLinkedApiClient } from "./apiClient";

type QueryArgs = {
  /**
   * The relative PixieBrix URL. The client will apply the configured base service URL.
   */
  url: string;

  /**
   * The REST method
   */
  method: NetworkRequestConfig["method"];

  /**
   * The REST JSON data
   */
  data?: NetworkRequestConfig["data"];

  /**
   * True if a Token is required to make the request.
   * @see isLinked
   */
  requireLinked?: boolean;

  /**
   * Optional additional metadata to pass through to the result.
   */
  meta?: UnknownObject;

  /**
   * Optional URL parameters to be sent with the request
   */
  params?: NetworkRequestConfig["params"];

  /**
   * Optional headers to be sent with the request
   */
  headers?: NetworkRequestConfig["headers"];
};

// https://redux-toolkit.js.org/rtk-query/usage/customizing-queries#axios-basequery
const baseQuery: BaseQueryFn<QueryArgs> = async ({
  url,
  method,
  data,
  requireLinked = true,
  meta,
  params,
  headers,
}) => {
  try {
    const client = await (requireLinked
      ? getLinkedApiClient()
      : getApiClient());
    const result = await client({ url, method, data, params, headers });

    return { data: result.data, meta };
  } catch (error) {
    if (isAxiosError(error)) {
      // Was running into issues with AxiosError generation in axios-mock-adapter where the prototype was AxiosError
      // but the Error name was Error and there was no isAxiosError present after serializeError
      // See line here: https://github.com/axios/axios/blob/v0.27.2/lib/core/AxiosError.js#L79
      error.name = "AxiosError";
      return {
        // Axios offers its own serialization method, but it reshapes the Error object (doesn't include the response, puts the status on the root level). `useToJSON: false` skips that.
        error: serializeError(error, { useToJSON: false }),
      };
    }

    return {
      error: serializeError(error),
    };
  }
};

export default baseQuery;
