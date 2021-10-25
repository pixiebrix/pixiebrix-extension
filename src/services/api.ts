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

import { RegistryId } from "@/core";
import { BaseQueryFn, createApi } from "@reduxjs/toolkit/query/react";
import { ServiceDefinition } from "@/types/definitions";
import { AxiosRequestConfig } from "axios";
import { getApiClient, getLinkedApiClient } from "@/services/apiClient";
import { isAxiosError } from "@/errors";
import {
  Database,
  MarketplaceListing,
  Organization,
  SanitizedAuth,
} from "@/types/contract";
import { components } from "@/types/swagger";

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
  tagTypes: [
    "Databases",
    "Services",
    "ServiceAuths",
    "Organizations",
    "MarketplaceListings",
  ],
  endpoints: (builder) => ({
    getDatabases: builder.query<Database[], void>({
      query: () => ({ url: "/api/databases/", method: "get" }),
      providesTags: ["Databases"],
    }),
    createDatabase: builder.mutation<
      Database,
      { name: string; organizationId: string }
    >({
      query: ({ name, organizationId }) => ({
        url: organizationId
          ? `/api/organizations/${organizationId}/databases/`
          : "/api/databases/",
        method: "POST",
        data: { name },
      }),
      invalidatesTags: ["Databases"],
    }),
    getServices: builder.query<ServiceDefinition[], void>({
      query: () => ({ url: "/api/services/", method: "get" }),
      providesTags: ["Services"],
    }),
    getServiceAuths: builder.query<SanitizedAuth[], void>({
      query: () => ({ url: "/api/services/shared/?meta=1", method: "get" }),
      providesTags: ["ServiceAuths"],
    }),
    getOrganizations: builder.query<Organization[], void>({
      query: () => ({ url: "/api/organizations/", method: "get" }),
      providesTags: ["Organizations"],
      transformResponse: (
        baseQueryReturnValue: Array<components["schemas"]["Organization"]>
      ): Organization[] =>
        baseQueryReturnValue.map((apiOrganization) => ({
          ...apiOrganization,
          /*
           * We need to know the user role in the organization.
           * Currently API returns all members only for the organization where the user is an admin,
           * hence if the user is an admin, they will have role === 2,
           * otherwise there will be no other members listed (no member with role === 2).
           */
          /* eslint-disable @typescript-eslint/no-explicit-any -- `organization.members` is about to be removed */
          isAdmin: (apiOrganization as any).members?.some(
            (member: { role: number }) => member.role === 2
          ),
          /* eslint-enable @typescript-eslint/no-explicit-any */
        })),
    }),
    getMarketplaceListings: builder.query<
      Record<RegistryId, MarketplaceListing>,
      void
    >({
      query: () => ({
        url: "/api/marketplace/listings/?show_detail=true",
        method: "get",
      }),
      providesTags: ["MarketplaceListings"],
      transformResponse(
        baseQueryReturnValue: MarketplaceListing[]
      ): Record<RegistryId, MarketplaceListing> {
        return Object.fromEntries(
          baseQueryReturnValue.map((x) => [x.package.name as RegistryId, x])
        );
      },
    }),
  }),
});

export const {
  useGetDatabasesQuery,
  useCreateDatabaseMutation,
  useGetServicesQuery,
  useGetServiceAuthsQuery,
  useGetMarketplaceListingsQuery,
  useGetOrganizationsQuery,
} = appApi;
