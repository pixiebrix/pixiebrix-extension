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

import { BaseQueryFn, createApi } from "@reduxjs/toolkit/query/react";
import { ServiceDefinition } from "@/types/definitions";
import { AxiosRequestConfig } from "axios";
import { getApiClient, getLinkedApiClient } from "@/services/apiClient";
import { isAxiosError } from "@/errors";
import { MarketplaceListing, SanitizedAuth } from "@/types/contract";

// https://redux-toolkit.js.org/rtk-query/usage/customizing-queries#axios-basequery
const appBaseQuery = (): BaseQueryFn<{
  url: string;
  method: AxiosRequestConfig["method"];
  data?: AxiosRequestConfig["data"];
  requireLinked?: boolean;
}> => async ({ url, method, data, requireLinked = false }) => {
  try {
    const client = await (requireLinked
      ? getLinkedApiClient()
      : getApiClient());
    const result = await client({ url, method, data });
    return { data: result.data };
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      return {
        error: { status: error.response?.status, data: error.response?.data },
      };
    }

    throw error;
  }
};

export const appApi = createApi({
  reducerPath: "appApi",
  baseQuery: appBaseQuery(),
  endpoints: (builder) => ({
    getServices: builder.query<ServiceDefinition[], void>({
      query: () => ({ url: "/api/services/", method: "get" }),
    }),
    getServiceAuths: builder.query<SanitizedAuth[], void>({
      query: () => ({ url: "/api/services/shared/?meta=1", method: "get" }),
    }),
    getMarketplaceListings: builder.query<MarketplaceListing[], void>({
      query: () => ({
        url: "/api/marketplace/listings/?show_detail=true",
        method: "get",
      }),
    }),
  }),
});

export const {
  useGetServicesQuery,
  useGetServiceAuthsQuery,
  useGetMarketplaceListingsQuery,
} = appApi;
